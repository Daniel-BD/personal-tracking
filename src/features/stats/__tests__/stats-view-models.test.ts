import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	buildCategoryById,
	buildEntriesByCategory,
	buildEntriesByItem,
	buildEntriesByWeek,
	buildItemById,
	buildItemCategoriesByItemId,
	buildItemCategoryIdsByItemId,
} from '@/features/tracking';
import { makeCategory, makeEntry, makeItem, resetIdCounter } from '@/shared/store/__tests__/fixtures';
import {
	buildCategoryDetailViewModel,
	buildDashboardCardDetailViewModel,
	buildGoalDashboardViewModels,
	buildItemAccentColorById,
	buildItemDetailViewModel,
	buildWeeklyEntityCounts,
	type WeekWindow,
} from '../utils/stats-view-models';

function makeWeek(key: string, start: string, end: string): WeekWindow {
	return {
		key,
		start: new Date(`${start}T00:00:00`),
		end: new Date(`${end}T23:59:59`),
	};
}

function addEntriesForDate(itemId: string, date: string, count: number) {
	return Array.from({ length: count }, (_, index) =>
		makeEntry({
			id: `${itemId}-${date}-${index}`,
			itemId,
			date,
			type: 'food',
			categoryOverrides: null,
		}),
	);
}

describe('stats view models', () => {
	beforeEach(() => {
		resetIdCounter();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('builds goal dashboard cards from weekly indexes without per-card filtering', () => {
		const positive = makeCategory({ id: 'positive', name: 'Fruit', sentiment: 'positive' });
		const limit = makeCategory({ id: 'limit', name: 'Candy', sentiment: 'limit' });
		const apple = makeItem({ id: 'apple', name: 'Apple', categories: ['positive'] });
		const candy = makeItem({ id: 'candy', name: 'Candy', categories: ['limit'] });
		const weeks = [
			makeWeek('2026-W01', '2025-12-29', '2026-01-04'),
			makeWeek('2026-W02', '2026-01-05', '2026-01-11'),
			makeWeek('2026-W03', '2026-01-12', '2026-01-18'),
			makeWeek('2026-W04', '2026-01-19', '2026-01-25'),
			makeWeek('2026-W05', '2026-01-26', '2026-02-01'),
			makeWeek('2026-W06', '2026-02-02', '2026-02-08'),
			makeWeek('2026-W07', '2026-02-09', '2026-02-15'),
			makeWeek('2026-W08', '2026-02-16', '2026-02-22'),
		];
		const entries = [
			...addEntriesForDate('apple', '2025-12-30', 1),
			...addEntriesForDate('apple', '2026-01-06', 2),
			...addEntriesForDate('apple', '2026-01-13', 3),
			...addEntriesForDate('apple', '2026-01-20', 4),
			...addEntriesForDate('apple', '2026-01-27', 5),
			...addEntriesForDate('apple', '2026-02-03', 6),
			...addEntriesForDate('apple', '2026-02-10', 7),
			...addEntriesForDate('apple', '2026-02-17', 3),
			...addEntriesForDate('candy', '2026-01-22', 1),
			...addEntriesForDate('candy', '2026-01-29', 1),
			...addEntriesForDate('candy', '2026-02-05', 2),
			...addEntriesForDate('candy', '2026-02-12', 2),
			...addEntriesForDate('candy', '2026-02-18', 1),
		];

		const itemById = buildItemById([], [apple, candy]);
		const categoryById = buildCategoryById([], [positive, limit]);
		const itemCategoryIdsByItemId = buildItemCategoryIdsByItemId([], [apple, candy]);
		const itemCategoriesByItemId = buildItemCategoriesByItemId(itemCategoryIdsByItemId, categoryById);
		const weeklyEntityCounts = buildWeeklyEntityCounts(weeks, buildEntriesByWeek(entries), itemCategoryIdsByItemId);

		const cards = buildGoalDashboardViewModels({
			dashboardCards: [
				{ itemId: 'apple', baseline: 'rolling_4_week_avg', comparison: 'last_week' },
				{ categoryId: 'limit', baseline: 'rolling_4_week_avg', comparison: 'last_week' },
			],
			weeks,
			daysElapsed: 3,
			itemById,
			categoryById,
			itemCategoriesByItemId,
			weeklyEntityCounts,
		});

		expect(cards).toHaveLength(2);
		expect(cards[0]).toMatchObject({
			cardId: 'apple',
			name: 'Apple',
			currentCount: 3,
			baselineAvg: 5.5,
			accentColor: 'var(--color-success)',
			navigateTo: '/stats/item/apple',
		});
		expect(cards[0].sparklineData.map((point) => point.count)).toEqual([1, 2, 3, 4, 5, 6, 7, 3]);
		expect(cards[0].deltaPercent).toBeCloseTo(0.2727, 4);

		expect(cards[1]).toMatchObject({
			cardId: 'limit',
			name: 'Candy',
			sentiment: 'limit',
			currentCount: 1,
			baselineAvg: 1.5,
			navigateTo: '/stats/category/limit',
		});
		expect(cards[1].sparklineData.map((point) => point.count)).toEqual([0, 0, 0, 1, 1, 2, 2, 1]);
		expect(cards[1].deltaPercent).toBeCloseTo(0.5556, 4);
	});

	it('builds the category detail view model from category and week indexes', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-02-20T12:00:00'));

		const limit = makeCategory({ id: 'limit', name: 'Candy', sentiment: 'limit' });
		const candy = makeItem({ id: 'candy', name: 'Candy', categories: ['limit'] });
		const weeks = [
			makeWeek('2026-W01', '2025-12-29', '2026-01-04'),
			makeWeek('2026-W02', '2026-01-05', '2026-01-11'),
			makeWeek('2026-W03', '2026-01-12', '2026-01-18'),
			makeWeek('2026-W04', '2026-01-19', '2026-01-25'),
			makeWeek('2026-W05', '2026-01-26', '2026-02-01'),
			makeWeek('2026-W06', '2026-02-02', '2026-02-08'),
			makeWeek('2026-W07', '2026-02-09', '2026-02-15'),
			makeWeek('2026-W08', '2026-02-16', '2026-02-22'),
		];
		const entries = [
			...addEntriesForDate('candy', '2026-01-22', 1),
			...addEntriesForDate('candy', '2026-01-29', 1),
			...addEntriesForDate('candy', '2026-02-05', 2),
			...addEntriesForDate('candy', '2026-02-12', 2),
			...addEntriesForDate('candy', '2026-02-18', 1),
		];

		const categoryById = buildCategoryById([], [limit]);
		const entriesByCategory = buildEntriesByCategory(entries, buildItemCategoryIdsByItemId([], [candy]));
		const viewModel = buildCategoryDetailViewModel({
			categoryId: 'limit',
			weeks,
			daysElapsed: 3,
			categoryById,
			entriesByCategory,
		});

		expect(viewModel).not.toBeNull();
		expect(viewModel?.category.name).toBe('Candy');
		expect(viewModel?.weeklyStats.map((week) => week.count)).toEqual([0, 0, 0, 1, 1, 2, 2, 1]);
		expect(viewModel?.baselineAvg).toBe(1.5);
		expect(viewModel?.currentCount).toBe(1);
		expect(viewModel?.delta).toBeCloseTo(0.3571, 4);
		expect(viewModel?.deltaPercent).toBeCloseTo(0.5556, 4);
		expect(viewModel?.daysSinceLastLogged).toBe(2);
	});

	it('builds the item detail view model with default categories and accent color', () => {
		const positive = makeCategory({ id: 'positive', name: 'Fruit', sentiment: 'positive' });
		const apple = makeItem({ id: 'apple', name: 'Apple', categories: ['positive'] });
		const weeks = [
			makeWeek('2026-W01', '2025-12-29', '2026-01-04'),
			makeWeek('2026-W02', '2026-01-05', '2026-01-11'),
			makeWeek('2026-W03', '2026-01-12', '2026-01-18'),
			makeWeek('2026-W04', '2026-01-19', '2026-01-25'),
			makeWeek('2026-W05', '2026-01-26', '2026-02-01'),
			makeWeek('2026-W06', '2026-02-02', '2026-02-08'),
			makeWeek('2026-W07', '2026-02-09', '2026-02-15'),
			makeWeek('2026-W08', '2026-02-16', '2026-02-22'),
		];
		const entries = [
			...addEntriesForDate('apple', '2025-12-30', 1),
			...addEntriesForDate('apple', '2026-01-06', 2),
			...addEntriesForDate('apple', '2026-01-13', 3),
			...addEntriesForDate('apple', '2026-01-20', 4),
			...addEntriesForDate('apple', '2026-01-27', 5),
			...addEntriesForDate('apple', '2026-02-03', 6),
			...addEntriesForDate('apple', '2026-02-10', 7),
			...addEntriesForDate('apple', '2026-02-17', 3),
		];

		const itemById = buildItemById([], [apple]);
		const categoryById = buildCategoryById([], [positive]);
		const itemCategoryIdsByItemId = buildItemCategoryIdsByItemId([], [apple]);
		const itemCategoriesByItemId = buildItemCategoriesByItemId(itemCategoryIdsByItemId, categoryById);
		const accentById = buildItemAccentColorById(itemById, itemCategoriesByItemId);
		const viewModel = buildItemDetailViewModel({
			itemId: 'apple',
			weeks,
			daysElapsed: 3,
			itemById,
			itemCategoriesByItemId,
			entriesByItem: buildEntriesByItem(entries),
		});

		expect(viewModel).not.toBeNull();
		expect(viewModel?.item.name).toBe('Apple');
		expect(viewModel?.defaultCategories.map((category) => category.name)).toEqual(['Fruit']);
		expect(viewModel?.accentColor).toBe('var(--color-success)');
		expect(accentById.get('apple')).toBe('var(--color-success)');
		expect(viewModel?.weeklyStats.map((week) => week.count)).toEqual([1, 2, 3, 4, 5, 6, 7, 3]);
		expect(viewModel?.baselineAvg).toBe(5.5);
		expect(viewModel?.currentCount).toBe(3);
		expect(viewModel?.deltaPercent).toBeCloseTo(0.2727, 4);
	});
	it('builds combined dashboard cards and a combined detail view model', () => {
		const positive = makeCategory({ id: 'positive', name: 'Fruit', sentiment: 'positive' });
		const neutral = makeCategory({ id: 'neutral', name: 'Beans', sentiment: 'neutral' });
		const apple = makeItem({ id: 'apple', name: 'Apple', categories: ['positive'] });
		const lentils = makeItem({ id: 'lentils', name: 'Lentils', categories: ['neutral'] });
		const weeks = [
			makeWeek('2026-W01', '2025-12-29', '2026-01-04'),
			makeWeek('2026-W02', '2026-01-05', '2026-01-11'),
			makeWeek('2026-W03', '2026-01-12', '2026-01-18'),
			makeWeek('2026-W04', '2026-01-19', '2026-01-25'),
			makeWeek('2026-W05', '2026-01-26', '2026-02-01'),
			makeWeek('2026-W06', '2026-02-02', '2026-02-08'),
			makeWeek('2026-W07', '2026-02-09', '2026-02-15'),
			makeWeek('2026-W08', '2026-02-16', '2026-02-22'),
		];
		const entries = [
			...addEntriesForDate('apple', '2026-01-27', 2),
			...addEntriesForDate('lentils', '2026-01-28', 1),
			...addEntriesForDate('apple', '2026-02-03', 3),
			...addEntriesForDate('lentils', '2026-02-04', 2),
			...addEntriesForDate('apple', '2026-02-17', 1),
			...addEntriesForDate('lentils', '2026-02-18', 4),
		];

		const itemById = buildItemById([], [apple, lentils]);
		const categoryById = buildCategoryById([], [positive, neutral]);
		const itemCategoryIdsByItemId = buildItemCategoryIdsByItemId([], [apple, lentils]);
		const itemCategoriesByItemId = buildItemCategoriesByItemId(itemCategoryIdsByItemId, categoryById);
		const entriesByItem = buildEntriesByItem(entries);
		const entriesByCategory = buildEntriesByCategory(entries, itemCategoryIdsByItemId);
		const weeklyEntityCounts = buildWeeklyEntityCounts(weeks, buildEntriesByWeek(entries), itemCategoryIdsByItemId);

		const cards = buildGoalDashboardViewModels({
			dashboardCards: [
				{
					id: 'combo-1',
					name: 'Healthy staples',
					entityType: 'item',
					entityIds: ['apple', 'lentils'],
					baseline: 'rolling_4_week_avg',
					comparison: 'last_week',
				},
			],
			weeks,
			daysElapsed: 3,
			itemById,
			categoryById,
			itemCategoriesByItemId,
			weeklyEntityCounts,
		});

		expect(cards[0]).toMatchObject({
			cardId: 'combo-1',
			name: 'Healthy staples',
			isCombined: true,
			navigateTo: '/stats/dashboard-card/combo-1',
			currentCount: 5,
		});
		expect(cards[0].members.map((member) => member.name)).toEqual(['Apple', 'Lentils']);
		expect(cards[0].sparklineData.map((point) => point.count)).toEqual([0, 0, 0, 0, 3, 5, 0, 5]);

		const detail = buildDashboardCardDetailViewModel({
			cardId: 'combo-1',
			dashboardCards: [
				{
					id: 'combo-1',
					name: 'Healthy staples',
					entityType: 'item',
					entityIds: ['apple', 'lentils'],
					baseline: 'rolling_4_week_avg',
					comparison: 'last_week',
				},
			],
			weeks,
			daysElapsed: 3,
			itemById,
			categoryById,
			itemCategoriesByItemId,
			entriesByItem,
			entriesByCategory,
		});

		expect(detail).not.toBeNull();
		expect(detail?.name).toBe('Healthy staples');
		expect(detail?.entries).toHaveLength(entries.length);
		expect(detail?.members.map((member) => member.name)).toEqual(['Apple', 'Lentils']);
		expect(detail?.weeklyStats.map((week) => week.count)).toEqual([0, 0, 0, 0, 3, 5, 0, 5]);
	});
});
