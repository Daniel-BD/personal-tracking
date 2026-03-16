import type { TrackerData, Entry, EntryType } from '../src/shared/lib/types';
import { expectDateGroupToContain } from './support/assertions';
import { expect, test } from './support/fixtures';
import { getDateKeyOffset, getLogEntryCount, getLogEntryRow } from './support/log-helpers';

function getUniqueDateKeys(entries: Entry[]): string[] {
	return [...new Set(entries.map((entry) => entry.date))].sort((left, right) => right.localeCompare(left));
}

function getItemName(data: TrackerData, entry: Entry): string {
	const items = entry.type === 'activity' ? data.activityItems : data.foodItems;
	const item = items.find((candidate) => candidate.id === entry.itemId);

	if (!item) {
		throw new Error(`Missing item ${entry.itemId} for entry ${entry.id}`);
	}

	return item.name;
}

function getEntryCategoryIds(data: TrackerData, entry: Entry): string[] {
	if (entry.categoryOverrides) {
		return entry.categoryOverrides;
	}

	const items = entry.type === 'activity' ? data.activityItems : data.foodItems;
	return items.find((candidate) => candidate.id === entry.itemId)?.categories ?? [];
}

function getEntryCountForType(data: TrackerData, type: EntryType): number {
	return data.entries.filter((entry) => entry.type === type).length;
}

function getCategoryFilterScenario(data: TrackerData): { categoryName: string; expectedCount: number } {
	const counts = new Map<string, number>();

	for (const entry of data.entries) {
		for (const categoryId of getEntryCategoryIds(data, entry)) {
			counts.set(categoryId, (counts.get(categoryId) ?? 0) + 1);
		}
	}

	const candidate = [...counts.entries()]
		.filter(([, count]) => count > 0 && count < data.entries.length)
		.sort((left, right) => right[1] - left[1])[0];

	if (!candidate) {
		throw new Error('Could not find a seeded category with a partial entry match');
	}

	const [categoryId, expectedCount] = candidate;
	const category = [...data.activityCategories, ...data.foodCategories].find((item) => item.id === categoryId);

	if (!category) {
		throw new Error(`Missing category ${categoryId}`);
	}

	return { categoryName: category.name, expectedCount };
}

async function createAndLogActivityItem(page: Parameters<typeof getLogEntryCount>[0], itemName: string, note?: string) {
	await page.goto('/library');
	await page.getByRole('button', { name: 'Add item' }).click();

	const addDialog = page.getByRole('dialog', { name: 'Add Activity Item' });
	await expect(addDialog).toBeVisible();
	await addDialog.getByLabel('Name').fill(itemName);
	await addDialog.getByRole('button', { name: 'Add', exact: true }).first().click();

	await page.goto('/');
	await page.getByPlaceholder('Log item').fill(itemName);
	await page.getByRole('button', { name: itemName, exact: true }).click();

	const logDialog = page.getByRole('dialog', { name: `Log ${itemName}` });
	await expect(logDialog).toBeVisible();

	if (note) {
		await logDialog.getByLabel('Note').fill(note);
	}

	await logDialog.getByRole('button', { name: 'Log', exact: true }).click();
}

test.describe('Log page e2e @full-regression', () => {
	test('@smoke log route shows seeded entries grouped by date', async ({ appData, seededPage }) => {
		await seededPage.goto('/log');

		const expectedDateKeys = getUniqueDateKeys(appData.entries);
		const firstGroupEntry = appData.entries.find((entry) => entry.date === expectedDateKeys[0]);

		if (!firstGroupEntry) {
			throw new Error('Expected at least one seeded entry');
		}

		await expect(seededPage.getByRole('heading', { name: 'Log' })).toBeVisible();
		await expect
			.poll(() => seededPage.locator('[data-testid^="entries-date-group-"]').count())
			.toBe(expectedDateKeys.length);
		await expectDateGroupToContain(seededPage, expectedDateKeys[0], getItemName(appData, firstGroupEntry));
		await expect(getLogEntryCount(seededPage)).resolves.toBe(appData.entries.length);
	});

	test('type segmented control filters between all, activities, and food', async ({ appData, seededPage }) => {
		await seededPage.goto('/log');

		const activityCount = getEntryCountForType(appData, 'activity');
		const foodCount = getEntryCountForType(appData, 'food');

		await seededPage.getByRole('button', { name: 'Activities' }).click();
		await expect(getLogEntryCount(seededPage)).resolves.toBe(activityCount);

		await seededPage.getByRole('button', { name: 'Food' }).click();
		await expect(getLogEntryCount(seededPage)).resolves.toBe(foodCount);

		await seededPage.getByRole('button', { name: 'All' }).click();
		await expect(getLogEntryCount(seededPage)).resolves.toBe(appData.entries.length);
	});

	test('category filters narrow entries, chips remove filters, and clear-all resets the result set', async ({
		appData,
		seededPage,
	}) => {
		await seededPage.goto('/log');

		const { categoryName, expectedCount } = getCategoryFilterScenario(appData);

		await seededPage.getByRole('button', { name: 'Open filters' }).click();

		const filterDialog = seededPage.getByRole('dialog', { name: 'Filters' });
		const categoryOption = filterDialog.getByRole('button', { name: new RegExp(categoryName) }).first();
		await expect(filterDialog).toBeVisible();
		await filterDialog.getByPlaceholder('Search categories...').fill(categoryName);
		await categoryOption.click();

		await seededPage.keyboard.press('Escape');
		await expect(filterDialog).toHaveCount(0);
		await expect(getLogEntryCount(seededPage)).resolves.toBe(expectedCount);
		await expect(seededPage.getByRole('button', { name: categoryName, exact: true })).toBeVisible();

		await seededPage.getByRole('button', { name: categoryName, exact: true }).click();
		await expect(seededPage.getByRole('button', { name: categoryName, exact: true })).toHaveCount(0);
		await expect(getLogEntryCount(seededPage)).resolves.toBe(appData.entries.length);

		await seededPage.getByRole('button', { name: 'Open filters' }).click();
		await expect(filterDialog).toBeVisible();
		await filterDialog.getByPlaceholder('Search categories...').fill(categoryName);
		await categoryOption.click();
		await filterDialog.getByRole('button', { name: 'Clear all filters' }).click();
		await seededPage.keyboard.press('Escape');
		await expect(filterDialog).toHaveCount(0);
		await expect(getLogEntryCount(seededPage)).resolves.toBe(appData.entries.length);
	});

	test('entry edit sheet updates date, time, notes, and category overrides', async ({ appData, seededPage }) => {
		const itemName = 'Playwright Log Edit Item';
		const updatedNote = 'Edited by Playwright';
		const updatedTime = '06:45';
		const updatedDateKey = getDateKeyOffset(1);
		const categoryName = appData.activityCategories[0]?.name;

		if (!categoryName) {
			throw new Error('Missing seeded activity category');
		}

		await createAndLogActivityItem(seededPage, itemName);

		await seededPage.goto('/log');
		const todayRow = getLogEntryRow(seededPage, itemName, getDateKeyOffset(0));
		await expect(todayRow).toBeVisible();
		await todayRow.getByRole('button', { name: 'Edit entry' }).click();

		const editDialog = seededPage.getByRole('dialog', { name: `Edit ${itemName}` });
		await expect(editDialog).toBeVisible();
		await editDialog.getByLabel('Date picker').fill(updatedDateKey);
		await editDialog.getByLabel('Time picker').fill(updatedTime);
		await editDialog.getByPlaceholder('Optional notes...').fill(updatedNote);
		await editDialog.getByRole('button', { name: `+ ${categoryName}` }).click();
		await editDialog.getByRole('button', { name: 'Save', exact: true }).click();

		await expect(getLogEntryRow(seededPage, itemName, getDateKeyOffset(0))).toHaveCount(0);

		const movedRow = getLogEntryRow(seededPage, itemName, updatedDateKey);
		await expect(movedRow).toBeVisible();
		await expect(movedRow).toContainText(updatedNote);
		await expect(movedRow).toContainText(updatedTime);
		await expect(movedRow).toContainText(categoryName);
	});

	test('entry delete flow removes an entry after confirmation', async ({ seededPage }) => {
		const itemName = 'Playwright Log Delete Item';

		await seededPage.goto('/log');
		const initialCount = await getLogEntryCount(seededPage);

		await createAndLogActivityItem(seededPage, itemName);

		await seededPage.goto('/log');
		await expect.poll(() => getLogEntryCount(seededPage)).toBe(initialCount + 1);

		const todayRow = getLogEntryRow(seededPage, itemName, getDateKeyOffset(0));
		await expect(todayRow).toBeVisible();
		await todayRow.getByRole('button', { name: 'Delete entry' }).click();

		const deleteDialog = seededPage.getByRole('dialog', { name: 'Delete Entry' });
		await expect(deleteDialog).toBeVisible();
		await deleteDialog.getByRole('button', { name: 'Delete', exact: true }).click();

		await expect(todayRow).toHaveCount(0);
		await expect.poll(() => getLogEntryCount(seededPage)).toBe(initialCount);
	});

	test('entry quick-add button duplicates an existing entry for today', async ({ appData, seededPage }) => {
		const eggsEntry = appData.entries.find((entry) => entry.type === 'food' && entry.itemId === 'fi-eggs');

		if (!eggsEntry) {
			throw new Error('Missing seeded Eggs entry');
		}

		await seededPage.goto('/log');
		const initialCount = await getLogEntryCount(seededPage);

		const sourceRow = getLogEntryRow(seededPage, getItemName(appData, eggsEntry), eggsEntry.date);
		await expect(sourceRow).toBeVisible();
		await sourceRow.getByRole('button', { name: 'Quick add entry' }).click();

		await expect(seededPage.getByText('Logged "Eggs"')).toBeVisible();
		await expect.poll(() => getLogEntryCount(seededPage)).toBe(initialCount + 1);
		await expect(seededPage.getByTestId(`entries-date-group-${getDateKeyOffset(0)}`)).toContainText('Eggs');
	});

	test('tapping an entry row opens the item detail route correctly', async ({ appData, seededPage }) => {
		const entry = appData.entries[0];

		if (!entry) {
			throw new Error('Expected at least one seeded entry');
		}

		const itemName = getItemName(appData, entry);

		await seededPage.goto('/log');
		const entryRow = getLogEntryRow(seededPage, itemName, entry.date);
		await expect(entryRow).toBeVisible();
		await entryRow.click();

		await expect(seededPage).toHaveURL(new RegExp(`/stats/item/${entry.itemId}`));
		await expect(seededPage.getByRole('heading', { level: 1, name: itemName })).toBeVisible();
	});
});
