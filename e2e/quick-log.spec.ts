import type { EntryType, TrackerData } from '../src/shared/lib/types';
import { expectDateGroupToContain, expectSyncPillTransition, expectToast } from './support/assertions';
import { TEST_GIST_ID } from './support/mock-app';
import { expect, test } from './support/fixtures';
import { getLogEntryCount, getLogEntryRow } from './support/log-helpers';

type SeededQuickLogItem = {
	id: string;
	name: string;
	type: EntryType;
};

function getTodayDateKey(): string {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const day = String(now.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function buildSeededItemLookup(data: TrackerData): Map<string, SeededQuickLogItem> {
	const map = new Map<string, SeededQuickLogItem>();

	for (const item of data.activityItems) {
		map.set(`activity-${item.id}`, { id: item.id, name: item.name, type: 'activity' });
	}

	for (const item of data.foodItems) {
		map.set(`food-${item.id}`, { id: item.id, name: item.name, type: 'food' });
	}

	return map;
}

function getFavoriteQuickLogItems(data: TrackerData): SeededQuickLogItem[] {
	const lookup = buildSeededItemLookup(data);
	const items: SeededQuickLogItem[] = [];

	for (const itemId of data.favoriteItems) {
		const item = lookup.get(`activity-${itemId}`) ?? lookup.get(`food-${itemId}`);
		if (item) {
			items.push(item);
		}
	}

	return items;
}

function getRecentQuickLogItems(data: TrackerData): SeededQuickLogItem[] {
	const lookup = buildSeededItemLookup(data);
	const sortedEntries = [...data.entries].sort((left, right) => {
		const leftDateTime = left.time ? `${left.date}T${left.time}` : left.date;
		const rightDateTime = right.time ? `${right.date}T${right.time}` : right.date;
		return rightDateTime.localeCompare(leftDateTime);
	});
	const seen = new Set<string>();
	const items: SeededQuickLogItem[] = [];

	for (const entry of sortedEntries) {
		const key = `${entry.type}-${entry.itemId}`;
		if (seen.has(key)) {
			continue;
		}

		seen.add(key);
		const item = lookup.get(key);
		if (item) {
			items.push(item);
		}

		if (items.length >= 20) {
			break;
		}
	}

	return items;
}

async function getVisibleQuickLogItemNames(page: Parameters<typeof getLogEntryCount>[0]): Promise<string[]> {
	return page.getByRole('button', { name: /^Quick log / }).evaluateAll((buttons) =>
		buttons
			.map(
				(button) =>
					button
						.getAttribute('aria-label')
						?.replace(/^Quick log /, '')
						.trim() ?? '',
			)
			.filter(Boolean),
	);
}

test.describe('Home quick log e2e @full-regression', () => {
	test('@smoke home renders from seeded mocked state', async ({ seededPage }) => {
		await expect(seededPage.getByText('Setup Required')).toHaveCount(0);
		await expect(seededPage.getByRole('button', { name: 'Favorites', exact: true })).toBeVisible();
		await expect(seededPage.getByRole('button', { name: 'Quick log Eggs' })).toBeVisible();
		await expect(seededPage.getByRole('button', { name: 'Quick log Run' })).toBeVisible();
	});

	test('favorites and recent tabs switch correctly with seeded data', async ({ appData, seededPage }) => {
		const favoriteNames = getFavoriteQuickLogItems(appData).map((item) => item.name);
		const recentNames = getRecentQuickLogItems(appData).map((item) => item.name);

		await expect(seededPage.getByRole('button', { name: 'Favorites', exact: true })).toBeVisible();
		await expect(seededPage.getByRole('button', { name: 'Remove from favorites' })).toHaveCount(favoriteNames.length);
		await expect.poll(() => getVisibleQuickLogItemNames(seededPage)).toEqual(favoriteNames);

		await seededPage.getByRole('button', { name: 'Recent', exact: true }).click();

		await expect(seededPage.getByRole('button', { name: 'Remove from favorites' })).toHaveCount(0);
		await expect.poll(() => getVisibleQuickLogItemNames(seededPage)).toEqual(recentNames);
	});

	test('quick log from favorites creates a new entry', async ({ seededPage }) => {
		await seededPage.goto('/log');
		const initialCount = await getLogEntryCount(seededPage);

		await seededPage.goto('/');
		await seededPage.getByRole('button', { name: 'Quick log Eggs' }).click();
		await expectToast(seededPage, 'Logged "Eggs"');

		await seededPage.getByRole('link', { name: 'Log' }).click();
		await expectDateGroupToContain(seededPage, getTodayDateKey(), 'Eggs');
		await expect.poll(() => getLogEntryCount(seededPage)).toBe(initialCount + 1);
	});

	test('quick-log toast undo removes the just-created entry', async ({ seededPage }) => {
		await seededPage.goto('/log');
		const initialCount = await getLogEntryCount(seededPage);

		await seededPage.goto('/');
		await seededPage.getByRole('button', { name: 'Quick log Eggs' }).click();
		await expectToast(seededPage, 'Logged "Eggs"');
		await seededPage.getByRole('button', { name: 'Undo' }).click();
		await expectToast(seededPage, 'Entry undone');

		await seededPage.getByRole('link', { name: 'Log' }).click();
		await expect.poll(() => getLogEntryCount(seededPage)).toBe(initialCount);
		await expect(getLogEntryRow(seededPage, 'Eggs', getTodayDateKey())).toHaveCount(0);
	});

	test('quick-log from recent creates a new entry and updates ordering as expected', async ({
		appData,
		seededPage,
	}) => {
		const recentItems = getRecentQuickLogItems(appData);
		const targetItem = recentItems[1];

		if (!targetItem) {
			throw new Error('Expected at least two seeded recent items');
		}

		await seededPage.goto('/log');
		const initialCount = await getLogEntryCount(seededPage);

		await seededPage.goto('/');
		await seededPage.getByRole('button', { name: 'Recent', exact: true }).click();
		await expect.poll(() => getVisibleQuickLogItemNames(seededPage)).toEqual(recentItems.map((item) => item.name));

		await seededPage.getByRole('button', { name: `Quick log ${targetItem.name}` }).click();
		await expectToast(seededPage, `Logged "${targetItem.name}"`);

		const expectedRecentOrder = [
			targetItem.name,
			...recentItems.filter((item) => item.id !== targetItem.id).map((item) => item.name),
		];
		await expect.poll(() => getVisibleQuickLogItemNames(seededPage)).toEqual(expectedRecentOrder);

		await seededPage.getByRole('link', { name: 'Log' }).click();
		await expectDateGroupToContain(seededPage, getTodayDateKey(), targetItem.name);
		await expect.poll(() => getLogEntryCount(seededPage)).toBe(initialCount + 1);
	});

	test('search with no exact match shows the create action', async ({ seededPage }) => {
		await seededPage.getByPlaceholder('Log item').fill('Egg');
		await expect(seededPage.getByRole('button', { name: /^Eggs\b/ })).toBeVisible();
		await expect(seededPage.getByRole('button', { name: 'Create "Egg"' })).toBeVisible();
	});

	test('search results close after selecting an existing item', async ({ seededPage }) => {
		const searchInput = seededPage.getByPlaceholder('Log item');

		await searchInput.fill('Egg');
		await expect(seededPage.getByRole('button', { name: 'Create "Egg"' })).toBeVisible();
		await seededPage.getByRole('button', { name: /^Eggs\b/ }).click();

		const logDialog = seededPage.getByRole('dialog', { name: 'Log Eggs' });
		await expect(logDialog).toBeVisible();
		await expect(searchInput).toHaveValue('');
		await expect(seededPage.getByRole('button', { name: 'Remove from favorites' }).first()).toBeVisible();
		await expect(seededPage.getByRole('button', { name: 'Create "Egg"' })).toHaveCount(0);

		await seededPage.keyboard.press('Escape');
		await expect(logDialog).toHaveCount(0);
	});

	test('searching an existing item can log through the bottom sheet', async ({ seededPage }) => {
		const uniqueNote = 'Playwright integration note';

		await seededPage.getByPlaceholder('Log item').fill('Run');
		await seededPage.getByRole('button', { name: 'Run' }).click();

		const logDialog = seededPage.getByRole('dialog', { name: 'Log Run' });
		await expect(logDialog).toBeVisible();
		await seededPage.getByLabel('Time picker').fill('09:15');
		await seededPage.getByLabel('Note').fill(uniqueNote);
		await logDialog.getByRole('button', { name: 'Log', exact: true }).click();

		await seededPage.getByRole('link', { name: 'Log' }).click();
		await expectDateGroupToContain(seededPage, getTodayDateKey(), 'Run');
		await expectDateGroupToContain(seededPage, getTodayDateKey(), uniqueNote);
	});

	test('existing-item log sheet persists note, custom time, and category overrides', async ({ seededPage }) => {
		const uniqueNote = 'Quick log override note';
		const customTime = '06:25';
		const overrideCategoryName = 'Recovery';

		await seededPage.getByPlaceholder('Log item').fill('Run');
		await seededPage.getByRole('button', { name: /^Run\b/ }).click();

		const logDialog = seededPage.getByRole('dialog', { name: 'Log Run' });
		await expect(logDialog).toBeVisible();
		await logDialog.locator('span').filter({ hasText: 'Endurance' }).getByRole('button').click();
		await logDialog.getByRole('button', { name: `+ ${overrideCategoryName}` }).click();
		await logDialog.getByLabel('Time picker').fill(customTime);
		await logDialog.getByLabel('Note').fill(uniqueNote);
		await logDialog.getByRole('button', { name: 'Log', exact: true }).click();

		await seededPage.getByRole('link', { name: 'Log' }).click();
		const loggedRow = getLogEntryRow(seededPage, 'Run', getTodayDateKey()).filter({
			has: seededPage.getByText(uniqueNote),
		});

		await expect(loggedRow).toBeVisible();
		await expect(loggedRow).toContainText(customTime);
		await expect(loggedRow).toContainText(overrideCategoryName);
		await expect(loggedRow).not.toContainText('Endurance');
	});

	test('home refresh button shows syncing state and returns to idle with mocked sync', async ({ seededPage }) => {
		await seededPage.route(`https://api.github.com/gists/${TEST_GIST_ID}`, async (route) => {
			if (route.request().method() === 'GET') {
				await new Promise((resolve) => setTimeout(resolve, 300));
			}

			await route.fallback();
		});

		const refreshButton = seededPage.getByRole('button', { name: 'Refresh' });
		await expectSyncPillTransition(seededPage, async () => {
			await refreshButton.click();
			await expect(refreshButton).toBeDisabled();
		});
		await expect(refreshButton).toBeEnabled();
	});

	test('home setup-required warning appears when seeded sync config is intentionally omitted', async ({
		seededPage,
	}) => {
		await seededPage.evaluate(() => {
			localStorage.removeItem('github_token');
			localStorage.removeItem('gist_id');
		});

		await seededPage.goto('/');

		await expect(seededPage.getByRole('heading', { name: 'Setup Required' })).toBeVisible();
		await expect(seededPage.getByText('Configure your GitHub token to start tracking.')).toBeVisible();
		await expect(seededPage.getByRole('link', { name: 'Go to Settings' })).toBeVisible();
		await expect(seededPage.getByPlaceholder('Log item')).toHaveCount(0);
	});
});
