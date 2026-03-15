import type { Locator, Page } from '@playwright/test';
import type { Category, DashboardCard, Entry, EntryType, Item, TrackerData } from '../src/shared/lib/types';
import { getTodayDate } from '../src/shared/lib/types';
import { getDateNDaysAgo } from '../src/shared/lib/date-utils';
import { filterEntriesByDateRange, filterEntriesByType } from '../src/features/tracking';
import { formatWeekLabel, getLastNWeeks } from '../src/features/stats/utils/stats-engine';
import { expect, test } from './support/fixtures';

type RankedEntity = {
	id: string;
	name: string;
	count: number;
	type: EntryType;
};

const MOBILE_STATS_VIEWPORT = { width: 390, height: 844 };
const RESIZED_MOBILE_STATS_VIEWPORT = { width: 430, height: 844 };

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getItemMap(data: TrackerData): Map<string, Item> {
	return new Map([...data.activityItems, ...data.foodItems].map((item) => [item.id, item]));
}

function getCategoryMap(data: TrackerData): Map<string, Category> {
	return new Map([...data.activityCategories, ...data.foodCategories].map((category) => [category.id, category]));
}

function getEntryCategoryIds(data: TrackerData, entry: Entry): string[] {
	if (entry.categoryOverrides) {
		return entry.categoryOverrides;
	}

	return getItemMap(data).get(entry.itemId)?.categories ?? [];
}

function getDashboardCardName(data: TrackerData, card: DashboardCard): string {
	if (card.categoryId) {
		return getCategoryMap(data).get(card.categoryId)?.name ?? card.categoryId;
	}

	if (card.itemId) {
		return getItemMap(data).get(card.itemId)?.name ?? card.itemId;
	}

	throw new Error('Dashboard card is missing both categoryId and itemId');
}

function getUnusedDashboardCategory(data: TrackerData): Category {
	const addedIds = new Set(data.dashboardCards.map((card) => card.categoryId).filter(Boolean));
	const category = [...data.foodCategories, ...data.activityCategories].find(
		(candidate) => !addedIds.has(candidate.id),
	);

	if (!category) {
		throw new Error('Expected an unused category for dashboard tests');
	}

	return category;
}

function getUnusedDashboardItem(data: TrackerData): Item {
	const addedIds = new Set(data.dashboardCards.map((card) => card.itemId).filter(Boolean));
	const item = [...data.foodItems, ...data.activityItems].find((candidate) => !addedIds.has(candidate.id));

	if (!item) {
		throw new Error('Expected an unused item for dashboard tests');
	}

	return item;
}

function rankItems(entries: Entry[], data: TrackerData): RankedEntity[] {
	const itemMap = getItemMap(data);
	const counts = new Map<string, RankedEntity>();

	for (const entry of entries) {
		const existing = counts.get(entry.itemId);
		if (existing) {
			existing.count += 1;
			continue;
		}

		const item = itemMap.get(entry.itemId);
		counts.set(entry.itemId, {
			id: entry.itemId,
			name: item?.name ?? 'Unknown',
			count: 1,
			type: entry.type,
		});
	}

	return [...counts.values()].sort((left, right) => right.count - left.count);
}

function rankCategories(entries: Entry[], data: TrackerData): RankedEntity[] {
	const categoryMap = getCategoryMap(data);
	const counts = new Map<string, RankedEntity>();

	for (const entry of entries) {
		for (const categoryId of getEntryCategoryIds(data, entry)) {
			const existing = counts.get(categoryId);
			if (existing) {
				existing.count += 1;
				continue;
			}

			const category = categoryMap.get(categoryId);
			counts.set(categoryId, {
				id: categoryId,
				name: category?.name ?? 'Unknown',
				count: 1,
				type: entry.type,
			});
		}
	}

	return [...counts.values()].sort((left, right) => right.count - left.count);
}

function filterByTime(entries: Entry[], timePeriod: 'all' | '7d' | '30d'): Entry[] {
	if (timePeriod === 'all') {
		return entries;
	}

	const days = timePeriod === '7d' ? 7 : 30;
	return filterEntriesByDateRange(entries, {
		start: getDateNDaysAgo(days - 1),
		end: getTodayDate(),
	});
}

function getTopRankedEntity(
	data: TrackerData,
	options: {
		timePeriod: 'all' | '7d' | '30d';
		typeFilter: 'all' | 'activity' | 'food';
		viewMode: 'items' | 'categories';
	},
): RankedEntity {
	const timeFilteredEntries = filterByTime(data.entries, options.timePeriod);
	const filteredEntries =
		options.typeFilter === 'all' ? timeFilteredEntries : filterEntriesByType(timeFilteredEntries, options.typeFilter);
	const ranked =
		options.viewMode === 'items' ? rankItems(filteredEntries, data) : rankCategories(filteredEntries, data);
	const topEntity = ranked[0];

	if (!topEntity) {
		throw new Error(`Expected at least one ranked ${options.viewMode} result`);
	}

	return topEntity;
}

function getCategoryEntries(data: TrackerData, categoryId: string): Entry[] {
	return data.entries.filter((entry) => getEntryCategoryIds(data, entry).includes(categoryId));
}

function getMonthLabel(offset: number): string {
	const now = new Date();
	return new Date(now.getFullYear(), now.getMonth() + offset, 1).toLocaleDateString('en-US', {
		month: 'long',
		year: 'numeric',
	});
}

function getYearLabel(offset: number): string {
	return String(new Date().getFullYear() + offset);
}

function getGoalDashboardSection(page: Page): Locator {
	return page.getByRole('heading', { name: 'Goals & Trends' }).locator('xpath=../..');
}

function getFrequencyRankingSection(page: Page): Locator {
	return page.getByRole('heading', { name: 'Most logged', exact: true }).locator('xpath=..');
}

function getEntityButton(scope: Locator, name: string): Locator {
	return scope.getByRole('button', { name: new RegExp(`\\b${escapeRegExp(name)}\\b`) }).first();
}

function getExpectedWeeklyLabels(): string[] {
	return getLastNWeeks(8).map((week) => formatWeekLabel(week.start));
}

async function expectWeeklyLabelsVisible(chart: Locator, labels: string[]): Promise<void> {
	await expect(chart).toBeVisible();

	for (const label of labels) {
		await expect(chart.locator('text').filter({ hasText: new RegExp(`^${escapeRegExp(label)}$`) })).toBeVisible();
	}
}

async function forceMobileResizeReflow(page: Page): Promise<void> {
	await page.setViewportSize(RESIZED_MOBILE_STATS_VIEWPORT);
	await page.waitForTimeout(50);
	await page.evaluate(() => window.dispatchEvent(new Event('resize')));
}

test.describe('Stats e2e @full-regression', () => {
	test('@smoke stats route renders seeded dashboard cards without the empty state', async ({ appData, seededPage }) => {
		await seededPage.goto('/stats');

		await expect(seededPage.getByRole('heading', { level: 1, name: 'Eating patterns' })).toBeVisible();
		await expect(seededPage.getByText('No food entries logged yet')).toHaveCount(0);
		await expect(seededPage.getByRole('heading', { level: 2, name: 'Goals & Trends' })).toBeVisible();

		for (const card of appData.dashboardCards) {
			await expect(
				getEntityButton(getGoalDashboardSection(seededPage), getDashboardCardName(appData, card)),
			).toBeVisible();
		}
	});

	test('frequency ranking toggles between items, categories, time windows, and type filters', async ({
		appData,
		seededPage,
	}) => {
		const rankingSection = getFrequencyRankingSection(seededPage);
		const allItems = getTopRankedEntity(appData, { timePeriod: 'all', typeFilter: 'all', viewMode: 'items' });
		const allCategories = getTopRankedEntity(appData, {
			timePeriod: 'all',
			typeFilter: 'all',
			viewMode: 'categories',
		});
		const sevenDayCategories = getTopRankedEntity(appData, {
			timePeriod: '7d',
			typeFilter: 'all',
			viewMode: 'categories',
		});
		const thirtyDayCategories = getTopRankedEntity(appData, {
			timePeriod: '30d',
			typeFilter: 'all',
			viewMode: 'categories',
		});
		const activityCategories = getTopRankedEntity(appData, {
			timePeriod: '30d',
			typeFilter: 'activity',
			viewMode: 'categories',
		});
		const foodCategories = getTopRankedEntity(appData, {
			timePeriod: '30d',
			typeFilter: 'food',
			viewMode: 'categories',
		});
		const foodItems = getTopRankedEntity(appData, { timePeriod: '30d', typeFilter: 'food', viewMode: 'items' });

		await seededPage.goto('/stats');

		await expect(getEntityButton(rankingSection, allItems.name)).toBeVisible();

		await rankingSection.getByRole('button', { name: 'Categories', exact: true }).click();
		await expect(getEntityButton(rankingSection, allCategories.name)).toBeVisible();

		await rankingSection.getByRole('button', { name: '7 days', exact: true }).click();
		await expect(getEntityButton(rankingSection, sevenDayCategories.name)).toBeVisible();

		await rankingSection.getByRole('button', { name: '30 days', exact: true }).click();
		await expect(getEntityButton(rankingSection, thirtyDayCategories.name)).toBeVisible();

		await rankingSection.getByRole('button', { name: 'Activities', exact: true }).click();
		await expect(getEntityButton(rankingSection, activityCategories.name)).toBeVisible();

		await rankingSection.getByRole('button', { name: 'Food', exact: true }).click();
		await expect(getEntityButton(rankingSection, foodCategories.name)).toBeVisible();

		await rankingSection.getByRole('button', { name: 'Items', exact: true }).click();
		await expect(getEntityButton(rankingSection, foodItems.name)).toBeVisible();
	});

	test('goal cards navigate to the expected detail routes', async ({ appData, seededPage }) => {
		const seededCategoryCard = appData.dashboardCards.find((card) => card.categoryId);
		const itemCard = getUnusedDashboardItem(appData);

		if (!seededCategoryCard?.categoryId) {
			throw new Error('Expected a seeded category dashboard card');
		}

		await seededPage.goto('/stats');

		const goalDashboard = getGoalDashboardSection(seededPage);
		await getEntityButton(goalDashboard, getDashboardCardName(appData, seededCategoryCard)).click();
		await expect(seededPage).toHaveURL(new RegExp(`/stats/category/${seededCategoryCard.categoryId}$`));
		await expect(
			seededPage.getByRole('heading', { level: 1, name: getDashboardCardName(appData, seededCategoryCard) }),
		).toBeVisible();

		await seededPage.goto('/stats');
		await seededPage.getByRole('button', { name: '+ Add to dashboard' }).click();

		const addDialog = seededPage.getByRole('dialog', { name: 'Add to Dashboard' });
		await expect(addDialog).toBeVisible();
		await addDialog.getByRole('button', { name: 'Items', exact: true }).click();
		await addDialog.getByPlaceholder('Search…').fill(itemCard.name);
		await addDialog.getByRole('button', { name: new RegExp(`^${escapeRegExp(itemCard.name)}\\b`) }).click();

		await expect(getEntityButton(goalDashboard, itemCard.name)).toBeVisible();
		await getEntityButton(goalDashboard, itemCard.name).click();
		await expect(seededPage).toHaveURL(new RegExp(`/stats/item/${itemCard.id}$`));
		await expect(seededPage.getByRole('heading', { level: 1, name: itemCard.name })).toBeVisible();
	});

	test('category detail route renders days-since, most-logged items, and period navigation', async ({
		appData,
		seededPage,
	}) => {
		const category = appData.foodCategories.find((candidate) => candidate.id === 'fc-sugar');
		const categoryEntries = category ? getCategoryEntries(appData, category.id) : [];
		const topItem = rankItems(categoryEntries, appData)[0];

		if (!category || !topItem) {
			throw new Error('Expected seeded Sugar category entries for detail route coverage');
		}

		await seededPage.goto(`/stats/category/${category.id}`);

		await expect(seededPage.getByRole('heading', { level: 1, name: category.name })).toBeVisible();
		await expect(seededPage.getByText(/days? since last logged/)).toBeVisible();
		await expect(seededPage.getByText(/This week: \d+ events?/)).toBeVisible();
		await expect(seededPage.getByRole('button', { name: 'Edit category' })).toBeVisible();
		await expect(seededPage.getByRole('heading', { level: 2, name: 'Most logged' })).toBeVisible();
		await expect(getEntityButton(getFrequencyRankingSection(seededPage), topItem.name)).toBeVisible();

		await expect(seededPage.getByText(getMonthLabel(0), { exact: true })).toBeVisible();
		await expect(seededPage.getByText(getYearLabel(0), { exact: true })).toBeVisible();
		await seededPage.getByRole('button', { name: 'Previous month' }).click();
		await seededPage.getByRole('button', { name: 'Previous year' }).click();
		await expect(seededPage.getByText(getMonthLabel(-1), { exact: true })).toBeVisible();
		await expect(seededPage.getByText(getYearLabel(-1), { exact: true })).toBeVisible();

		await seededPage.getByRole('button', { name: 'Edit category' }).click();
		await expect(seededPage).toHaveURL(/\/library(?:\?.*)?$/);
	});

	test('item detail route renders weekly summary and linked categories', async ({ appData, seededPage }) => {
		const item = appData.foodItems.find((candidate) => candidate.id === 'fi-chicken');

		if (!item || item.categories.length < 2) {
			throw new Error('Expected a seeded item with multiple default categories');
		}

		const [firstCategoryId, secondCategoryId] = item.categories;
		const firstCategoryName = getCategoryMap(appData).get(firstCategoryId)?.name;
		const secondCategoryName = getCategoryMap(appData).get(secondCategoryId)?.name;

		if (!firstCategoryName || !secondCategoryName) {
			throw new Error('Expected seeded category names for linked category assertions');
		}

		await seededPage.goto(`/stats/item/${item.id}`);

		await expect(seededPage.getByRole('heading', { level: 1, name: item.name })).toBeVisible();
		await expect(seededPage.getByRole('heading', { level: 3, name: 'Default categories' })).toBeVisible();
		await expect(seededPage.getByRole('button', { name: firstCategoryName, exact: true })).toBeVisible();
		await expect(seededPage.getByRole('button', { name: secondCategoryName, exact: true })).toBeVisible();
		await expect(seededPage.getByText(/This week: \d+ events?/)).toBeVisible();
		await expect(seededPage.getByRole('button', { name: 'Edit item' })).toBeVisible();

		await seededPage.getByRole('button', { name: 'Edit item' }).click();
		await expect(seededPage).toHaveURL(/\/library(?:\?.*)?$/);

		await seededPage.goto(`/stats/item/${item.id}`);
		await seededPage.getByRole('button', { name: firstCategoryName, exact: true }).click();
		await expect(seededPage).toHaveURL(new RegExp(`/stats/category/${firstCategoryId}$`));
		await expect(seededPage.getByRole('heading', { level: 1, name: firstCategoryName })).toBeVisible();
	});

	test('adding category and item dashboard cards persists across reloads', async ({ appData, seededPage }) => {
		const category = getUnusedDashboardCategory(appData);
		const item = getUnusedDashboardItem(appData);
		const goalDashboard = getGoalDashboardSection(seededPage);

		await seededPage.goto('/stats');
		await seededPage.getByRole('button', { name: '+ Add to dashboard' }).click();

		let addDialog = seededPage.getByRole('dialog', { name: 'Add to Dashboard' });
		await expect(addDialog).toBeVisible();
		await addDialog.getByPlaceholder('Search…').fill(category.name);
		await addDialog.getByRole('button', { name: new RegExp(`^${escapeRegExp(category.name)}\\b`) }).click();

		await expect(getEntityButton(goalDashboard, category.name)).toBeVisible();
		await seededPage.reload();
		await expect(getEntityButton(goalDashboard, category.name)).toBeVisible();

		await seededPage.getByRole('button', { name: '+ Add to dashboard' }).click();
		addDialog = seededPage.getByRole('dialog', { name: 'Add to Dashboard' });
		await expect(addDialog).toBeVisible();
		await addDialog.getByRole('button', { name: 'Items', exact: true }).click();
		await addDialog.getByPlaceholder('Search…').fill(item.name);
		await addDialog.getByRole('button', { name: new RegExp(`^${escapeRegExp(item.name)}\\b`) }).click();

		await expect(getEntityButton(goalDashboard, item.name)).toBeVisible();
		await seededPage.reload();
		await expect(getEntityButton(goalDashboard, category.name)).toBeVisible();
		await expect(getEntityButton(goalDashboard, item.name)).toBeVisible();
	});

	test('weekly chart labels remain visible after mobile resize reflow on overview and detail charts', async ({
		appData,
		seededPage,
	}) => {
		const weekLabels = getExpectedWeeklyLabels();
		const category =
			appData.foodCategories.find((candidate) => candidate.id === 'fc-sugar') ?? appData.foodCategories[0];

		if (!category) {
			throw new Error('Expected a seeded category for weekly chart label coverage');
		}

		await seededPage.setViewportSize(MOBILE_STATS_VIEWPORT);
		await seededPage.goto('/stats');

		const firstGoalCardChart = getGoalDashboardSection(seededPage)
			.locator('[role="button"]')
			.first()
			.locator('.recharts-responsive-container');
		const weeklyBreakdownChart = seededPage
			.getByRole('heading', { level: 3, name: 'Weekly Breakdown' })
			.locator('xpath=..')
			.locator('.recharts-responsive-container');

		await expectWeeklyLabelsVisible(firstGoalCardChart, weekLabels);
		await expectWeeklyLabelsVisible(weeklyBreakdownChart, weekLabels);

		await forceMobileResizeReflow(seededPage);

		await expectWeeklyLabelsVisible(firstGoalCardChart, weekLabels);
		await expectWeeklyLabelsVisible(weeklyBreakdownChart, weekLabels);

		await seededPage.setViewportSize(MOBILE_STATS_VIEWPORT);
		await seededPage.goto(`/stats/category/${category.id}`);

		const detailTrendChart = seededPage.locator('.recharts-responsive-container').first();

		await expectWeeklyLabelsVisible(detailTrendChart, weekLabels);

		await forceMobileResizeReflow(seededPage);

		await expectWeeklyLabelsVisible(detailTrendChart, weekLabels);
	});
});
