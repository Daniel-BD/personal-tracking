import type { Page } from '@playwright/test';
import type { Category, Item, TrackerData } from '../src/shared/lib/types';
import { expect, test } from './support/fixtures';

function getLibraryRow(page: Page, name: string) {
	return page
		.locator('[role="button"]')
		.filter({ has: page.getByText(name, { exact: true }) })
		.first();
}

function getSheetAction(dialog: ReturnType<Page['getByRole']>, label: string) {
	return dialog.locator('button.btn-primary', { hasText: label }).first();
}

function getSeededItem(data: TrackerData, itemId: string): Item {
	const item = [...data.activityItems, ...data.foodItems].find((candidate) => candidate.id === itemId);

	if (!item) {
		throw new Error(`Missing seeded item ${itemId}`);
	}

	return item;
}

function getSeededCategory(data: TrackerData, categoryId: string): Category {
	const category = [...data.activityCategories, ...data.foodCategories].find(
		(candidate) => candidate.id === categoryId,
	);

	if (!category) {
		throw new Error(`Missing seeded category ${categoryId}`);
	}

	return category;
}

function getTodayDateKey(): string {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const day = String(now.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

test.describe('Library e2e @full-regression', () => {
	test('@smoke library items tab renders seeded items across both types', async ({ appData, seededPage }) => {
		await seededPage.goto('/library');

		await expect(seededPage.getByRole('heading', { name: 'Library' })).toBeVisible();
		await expect(
			seededPage.getByText(`${appData.activityItems.length + appData.foodItems.length} items`),
		).toBeVisible();
		await expect(seededPage.getByText(appData.activityItems[0].name)).toBeVisible();
		await expect(seededPage.getByText(appData.foodItems[0].name)).toBeVisible();
	});

	test('library categories tab renders seeded categories across both types', async ({ appData, seededPage }) => {
		await seededPage.goto('/library');
		await seededPage.getByRole('button', { name: 'Categories', exact: true }).click();

		await expect(
			seededPage.getByText(`${appData.activityCategories.length + appData.foodCategories.length} categories`),
		).toBeVisible();
		await expect(seededPage.getByText(appData.activityCategories[0].name)).toBeVisible();
		await expect(seededPage.getByText(appData.foodCategories[0].name)).toBeVisible();
	});

	test('adding an item in the library makes it searchable from home', async ({ seededPage }) => {
		const itemName = 'Playwright Climb';

		await seededPage.goto('/library');
		await seededPage.getByRole('button', { name: 'Add item' }).click();

		const addDialog = seededPage.getByRole('dialog', { name: 'Add Activity Item' });
		await expect(addDialog).toBeVisible();
		await addDialog.getByLabel('Name').fill(itemName);
		await addDialog.getByRole('button', { name: 'Add', exact: true }).first().click();

		await expect(seededPage.getByText(itemName)).toBeVisible();

		await seededPage.goto('/');
		await seededPage.getByPlaceholder('Search or create item...').fill(itemName);
		await seededPage.getByRole('button', { name: itemName, exact: true }).click();
		await expect(seededPage.getByRole('dialog', { name: `Log ${itemName}` })).toBeVisible();
	});

	test('editing an item updates its name and categories', async ({ appData, seededPage }) => {
		const existingItem = getSeededItem(appData, 'ai-run');
		const addedCategory = appData.activityCategories.find((category) => !existingItem.categories.includes(category.id));

		if (!addedCategory) {
			throw new Error('Missing seeded activity category to add');
		}

		const updatedName = 'Run Intervals';

		await seededPage.goto('/library');
		await getLibraryRow(seededPage, existingItem.name).getByRole('button', { name: 'Edit item' }).click();

		const editDialog = seededPage.getByRole('dialog', { name: `Edit ${existingItem.name}` });
		await expect(editDialog).toBeVisible();
		await editDialog.getByLabel('Name').fill(updatedName);
		await editDialog.getByRole('button', { name: `+ ${addedCategory.name}` }).click();
		await getSheetAction(editDialog, 'Save').click();

		const updatedRow = getLibraryRow(seededPage, updatedName);
		await expect(updatedRow).toBeVisible();
		await expect(updatedRow).toContainText(addedCategory.name);
		await expect(seededPage.getByText(existingItem.name, { exact: true })).toHaveCount(0);
	});

	test('deleting an item removes the item row', async ({ seededPage }) => {
		const itemName = 'Playwright Temporary Item';

		await seededPage.goto('/library');
		await seededPage.getByRole('button', { name: 'Add item' }).click();

		const addDialog = seededPage.getByRole('dialog', { name: 'Add Activity Item' });
		await expect(addDialog).toBeVisible();
		await addDialog.getByLabel('Name').fill(itemName);
		await getSheetAction(addDialog, 'Add').click();
		await expect(getLibraryRow(seededPage, itemName)).toBeVisible();

		await getLibraryRow(seededPage, itemName).getByRole('button', { name: 'Delete item' }).click();

		const deleteDialog = seededPage.getByRole('dialog', { name: 'Delete Item' });
		await expect(deleteDialog).toBeVisible();
		await deleteDialog.getByRole('button', { name: 'Delete', exact: true }).click();

		await expect(seededPage.getByText(itemName, { exact: true })).toHaveCount(0);
	});

	test('favorite toggles in Library stay in sync with Home favorites', async ({ appData, seededPage }) => {
		const nonFavoriteItem = appData.activityItems.find((item) => !appData.favoriteItems.includes(item.id));

		if (!nonFavoriteItem) {
			throw new Error('Missing non-favorite seeded item');
		}

		const itemRow = getLibraryRow(seededPage, nonFavoriteItem.name);
		await seededPage.goto('/library');
		await itemRow.getByRole('button', { name: 'Add to favorites' }).click();
		await expect(itemRow.getByRole('button', { name: 'Remove from favorites' })).toBeVisible();

		await seededPage.goto('/');
		await expect(seededPage.getByRole('button', { name: `Quick log ${nonFavoriteItem.name}` })).toBeVisible();
	});

	test('adding, editing, and deleting a category persists its sentiment', async ({ appData, seededPage }) => {
		const createdName = 'Playwright Recovery';
		const updatedName = 'Playwright Recovery Updated';
		const baselineCategory = getSeededCategory(appData, 'fc-snack');

		await seededPage.goto('/library');
		await seededPage.getByRole('button', { name: 'Categories', exact: true }).click();
		await seededPage.getByRole('button', { name: 'Add category' }).click();

		let dialog = seededPage.getByRole('dialog', { name: 'Add Category' });
		await expect(dialog).toBeVisible();
		await dialog.getByRole('button', { name: 'Food' }).click();
		await dialog.getByLabel('Name').fill(createdName);
		await dialog.getByRole('button', { name: 'Limit', exact: true }).click();
		await getSheetAction(dialog, 'Add').click();

		await expect(getLibraryRow(seededPage, createdName)).toBeVisible();

		await getLibraryRow(seededPage, createdName).getByRole('button', { name: 'Edit category' }).click();
		dialog = seededPage.getByRole('dialog', { name: `Edit ${createdName}` });
		await expect(dialog).toBeVisible();
		await expect(dialog.getByRole('button', { name: 'Limit', exact: true })).toHaveClass(
			/bg-\[var\(--color-danger\)\]/,
		);
		await dialog.getByLabel('Name').fill(updatedName);
		await dialog.getByRole('button', { name: 'Positive', exact: true }).click();
		await getSheetAction(dialog, 'Save').click();

		await getLibraryRow(seededPage, updatedName).getByRole('button', { name: 'Edit category' }).click();
		dialog = seededPage.getByRole('dialog', { name: `Edit ${updatedName}` });
		await expect(dialog).toBeVisible();
		await expect(dialog.getByRole('button', { name: 'Positive', exact: true })).toHaveClass(
			/bg-\[var\(--color-success\)\]/,
		);
		await expect(seededPage.getByText(baselineCategory.name, { exact: true })).toBeVisible();
		await dialog.getByRole('button', { name: 'Delete Category' }).click();

		const deleteDialog = seededPage.getByRole('dialog', { name: 'Delete Category' });
		await expect(deleteDialog).toBeVisible();
		await deleteDialog.getByRole('button', { name: 'Delete', exact: true }).click();
		await expect(seededPage.getByText(updatedName, { exact: true })).toHaveCount(0);
	});

	test('library search filters visible items and categories', async ({ appData, seededPage }) => {
		const item = getSeededItem(appData, 'ai-lift');
		const hiddenItem = getSeededItem(appData, 'ai-run');
		const category = getSeededCategory(appData, 'fc-snack');
		const hiddenCategory = getSeededCategory(appData, 'fc-protein');

		await seededPage.goto('/library');

		const searchInput = seededPage.getByPlaceholder('Search…');
		await searchInput.fill('Strength');
		await expect(seededPage.getByText('1 item')).toBeVisible();
		await expect(seededPage.getByText(item.name, { exact: true })).toBeVisible();
		await expect(seededPage.getByText(hiddenItem.name, { exact: true })).toHaveCount(0);
		await seededPage.getByRole('button', { name: 'Clear search' }).click();

		await seededPage.getByRole('button', { name: 'Categories', exact: true }).click();
		await searchInput.fill('Snack');
		await expect(seededPage.getByText('1 category')).toBeVisible();
		await expect(seededPage.getByText(category.name, { exact: true })).toBeVisible();
		await expect(seededPage.getByText(hiddenCategory.name, { exact: true })).toHaveCount(0);
	});

	test('merging an item consolidates its entries into the target item', async ({ appData, seededPage }) => {
		const sourceItemName = 'Playwright Merge Source';
		const sourceEntryNote = 'Playwright merge source note';
		const mergeNote = 'Merged into the target item';
		const targetItem = getSeededItem(appData, 'ai-run');

		await seededPage.goto('/library');
		await seededPage.getByRole('button', { name: 'Add item' }).click();

		let dialog = seededPage.getByRole('dialog', { name: 'Add Activity Item' });
		await expect(dialog).toBeVisible();
		await dialog.getByLabel('Name').fill(sourceItemName);
		await getSheetAction(dialog, 'Add').click();
		await expect(getLibraryRow(seededPage, sourceItemName)).toBeVisible();

		await seededPage.goto('/');
		await seededPage.getByPlaceholder('Search or create item...').fill(sourceItemName);
		await seededPage.getByRole('button', { name: sourceItemName, exact: true }).click();

		dialog = seededPage.getByRole('dialog', { name: `Log ${sourceItemName}` });
		await expect(dialog).toBeVisible();
		await dialog.getByLabel('Note').fill(sourceEntryNote);
		await dialog.getByRole('button', { name: 'Log', exact: true }).click();
		await expect(seededPage.getByText(`Logged "${sourceItemName}"`)).toBeVisible();

		await seededPage.goto('/library');
		await getLibraryRow(seededPage, sourceItemName).getByRole('button', { name: 'Edit item' }).click();

		dialog = seededPage.getByRole('dialog', { name: `Edit ${sourceItemName}` });
		await expect(dialog).toBeVisible();
		await dialog.getByRole('button', { name: 'Merge into...' }).click();

		dialog = seededPage.getByRole('dialog', { name: 'Select Target Item' });
		await expect(dialog).toBeVisible();
		await dialog.getByPlaceholder('Search items...').fill(targetItem.name);
		await dialog.getByRole('button', { name: targetItem.name, exact: true }).click();

		dialog = seededPage.getByRole('dialog', { name: 'Merge Item' });
		await expect(dialog).toBeVisible();
		await dialog.getByLabel('Note to append to affected entries (optional)').fill(mergeNote);
		await dialog.getByRole('button', { name: 'Merge', exact: true }).click();

		await expect(getLibraryRow(seededPage, sourceItemName)).toHaveCount(0);

		await seededPage.goto('/log');
		const todayGroup = seededPage.getByTestId(`entries-date-group-${getTodayDateKey()}`);
		await expect(todayGroup).toContainText(targetItem.name);
		await expect(todayGroup).toContainText(sourceEntryNote);
		await expect(todayGroup).toContainText(mergeNote);
		await expect(todayGroup).not.toContainText(sourceItemName);
	});

	test('merging a category consolidates item references into the target category', async ({ appData, seededPage }) => {
		const sourceCategoryName = 'Playwright Merge Source Category';
		const sourceItemName = 'Playwright Merge Food';
		const targetCategory = getSeededCategory(appData, 'fc-snack');

		await seededPage.goto('/library');
		await seededPage.getByRole('button', { name: 'Categories', exact: true }).click();
		await seededPage.getByRole('button', { name: 'Add category' }).click();

		let dialog = seededPage.getByRole('dialog', { name: 'Add Category' });
		await expect(dialog).toBeVisible();
		await dialog.getByRole('button', { name: 'Food' }).click();
		await dialog.getByLabel('Name').fill(sourceCategoryName);
		await getSheetAction(dialog, 'Add').click();
		await expect(getLibraryRow(seededPage, sourceCategoryName)).toBeVisible();

		await seededPage.getByRole('button', { name: 'Items', exact: true }).click();
		await seededPage.getByRole('button', { name: 'Add item' }).click();

		dialog = seededPage.getByRole('dialog', { name: 'Add Activity Item' });
		await expect(dialog).toBeVisible();
		await dialog.getByRole('button', { name: 'Food' }).click();
		dialog = seededPage.getByRole('dialog', { name: 'Add Food Item' });
		await expect(dialog).toBeVisible();
		await dialog.getByLabel('Name').fill(sourceItemName);
		await dialog.getByRole('button', { name: `+ ${sourceCategoryName}` }).click();
		await getSheetAction(dialog, 'Add').click();

		const sourceItemRow = getLibraryRow(seededPage, sourceItemName);
		await expect(sourceItemRow).toContainText(sourceCategoryName);

		await seededPage.getByRole('button', { name: 'Categories', exact: true }).click();
		await getLibraryRow(seededPage, sourceCategoryName).getByRole('button', { name: 'Edit category' }).click();

		dialog = seededPage.getByRole('dialog', { name: `Edit ${sourceCategoryName}` });
		await expect(dialog).toBeVisible();
		await dialog.getByRole('button', { name: 'Merge into...' }).click();

		dialog = seededPage.getByRole('dialog', { name: 'Select Target Category' });
		await expect(dialog).toBeVisible();
		await dialog.getByPlaceholder('Search categories...').fill(targetCategory.name);
		await dialog.getByRole('button', { name: targetCategory.name, exact: true }).click();

		dialog = seededPage.getByRole('dialog', { name: 'Merge Category' });
		await expect(dialog).toBeVisible();
		await expect(dialog).toContainText('1 item will be updated.');
		await dialog.getByRole('button', { name: 'Merge', exact: true }).click();

		await expect(getLibraryRow(seededPage, sourceCategoryName)).toHaveCount(0);

		await seededPage.getByRole('button', { name: 'Items', exact: true }).click();
		await expect(sourceItemRow).toContainText(targetCategory.name);
		await expect(sourceItemRow).not.toContainText(sourceCategoryName);
	});
});
