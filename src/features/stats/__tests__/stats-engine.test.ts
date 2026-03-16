import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
	getWeekStartDate,
	getLastNWeeks,
	getDaysElapsedInCurrentWeek,
	getDaysSinceMostRecentEntry,
	processFoodEntriesByWeek,
	processFoodEntriesByWeekFromIndexes,
	calculateBalanceScore,
	getScoreChange,
	getTopCategories,
	buildCategoryColorMap,
	groupCategoriesForWeek,
	groupTopCategoriesForWeek,
	getTopLimitCategories,
	getWeekNumber,
	getDailyBreakdown,
	calcActualDeltaPercent,
	formatChangeText,
	getDeltaSummaryParts,
	getItemAccentColor,
	SENTIMENT_COLORS,
	type WeeklyData,
} from '../utils/stats-engine';
import { buildCategoryById, buildEntriesByWeek, buildItemCategoryIdsByItemId } from '@/features/tracking';
import { makeEntry, makeItem, makeCategory, makeValidData, resetIdCounter } from '@/shared/store/__tests__/fixtures';

beforeEach(() => resetIdCounter());
afterEach(() => vi.useRealTimers());

// --- helpers ---

/** Build a simple week descriptor for testing. */
function makeWeek(key: string, startStr: string, endStr: string) {
	return {
		key,
		start: new Date(startStr + 'T00:00:00'),
		end: new Date(endStr + 'T23:59:59'),
	};
}

describe('getWeekStartDate', () => {
	it('returns a Monday', () => {
		const result = getWeekStartDate(2025, 3);
		expect(result.getDay()).toBe(1); // Monday
	});

	it('returns correct date for week 1 of 2025', () => {
		// ISO week 1 of 2025 starts on Monday Dec 30, 2024
		const result = getWeekStartDate(2025, 1);
		expect(result.getFullYear()).toBe(2024);
		expect(result.getMonth()).toBe(11); // December
		expect(result.getDate()).toBe(30);
	});
});

describe('getLastNWeeks', () => {
	it('uses the ISO year when deriving week boundaries around New Year', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2025-12-31T12:00:00'));

		const [week] = getLastNWeeks(1);

		expect(week.key).toBe('2026-W01');
		expect(week.start.getFullYear()).toBe(2025);
		expect(week.start.getMonth()).toBe(11);
		expect(week.start.getDate()).toBe(29);
		expect(week.end.getFullYear()).toBe(2026);
		expect(week.end.getMonth()).toBe(0);
		expect(week.end.getDate()).toBe(4);
	});
});

describe('getDaysElapsedInCurrentWeek', () => {
	it('returns 1 on the first day of the week (Monday)', () => {
		const monday = new Date('2026-02-16T00:00:00'); // a Monday
		expect(getDaysElapsedInCurrentWeek(monday, monday)).toBe(1);
	});

	it('returns 3 on Wednesday of the same week', () => {
		const monday = new Date('2026-02-16T00:00:00');
		const wednesday = new Date('2026-02-18T00:00:00');
		expect(getDaysElapsedInCurrentWeek(monday, wednesday)).toBe(3);
	});

	it('returns 7 on Sunday (last day of the week)', () => {
		const monday = new Date('2026-02-16T00:00:00');
		const sunday = new Date('2026-02-22T00:00:00');
		expect(getDaysElapsedInCurrentWeek(monday, sunday)).toBe(7);
	});

	it('clamps to 7 if today is after the week end', () => {
		const monday = new Date('2026-02-09T00:00:00');
		const nextMonday = new Date('2026-02-16T00:00:00');
		expect(getDaysElapsedInCurrentWeek(monday, nextMonday)).toBe(7);
	});

	it('clamps to 1 if today is before the week start', () => {
		const monday = new Date('2026-02-16T00:00:00');
		const beforeStart = new Date('2026-02-15T00:00:00');
		expect(getDaysElapsedInCurrentWeek(monday, beforeStart)).toBe(1);
	});
});

describe('getDaysSinceMostRecentEntry', () => {
	it('returns null when there are no entries', () => {
		expect(getDaysSinceMostRecentEntry([])).toBeNull();
	});

	it('returns 0 when latest entry is today', () => {
		const today = new Date('2026-02-20T00:00:00');
		const entries = [makeEntry({ date: '2026-02-20' }), makeEntry({ date: '2026-02-18' })];
		expect(getDaysSinceMostRecentEntry(entries, today)).toBe(0);
	});

	it('returns full-day difference from most recent entry', () => {
		const today = new Date('2026-02-20T00:00:00');
		const entries = [makeEntry({ date: '2026-02-12' }), makeEntry({ date: '2026-02-17' })];
		expect(getDaysSinceMostRecentEntry(entries, today)).toBe(3);
	});
});

describe('processFoodEntriesByWeek', () => {
	it('only processes food entries, ignoring activity', () => {
		const item = makeItem({ id: 'food-item' });
		const cat = makeCategory({ id: 'cat-1', name: 'Fruits', sentiment: 'positive' });
		const data = makeValidData({
			foodItems: [item],
			foodCategories: [cat],
		});
		const weeks = [makeWeek('2025-W03', '2025-01-13', '2025-01-19')];
		const entries = [
			makeEntry({ type: 'food', itemId: 'food-item', date: '2025-01-15', categoryOverrides: ['cat-1'] }),
			makeEntry({ type: 'activity', itemId: 'act-item', date: '2025-01-15' }),
		];
		const result = processFoodEntriesByWeek(entries, data, weeks);
		expect(result).toHaveLength(1);
		expect(result[0].totalCount).toBe(1);
	});

	it('groups entries into correct weeks', () => {
		const item = makeItem({ id: 'item-1' });
		const data = makeValidData({ foodItems: [item] });
		const weeks = [makeWeek('2025-W03', '2025-01-13', '2025-01-19'), makeWeek('2025-W04', '2025-01-20', '2025-01-26')];
		const entries = [
			makeEntry({ type: 'food', itemId: 'item-1', date: '2025-01-14' }),
			makeEntry({ type: 'food', itemId: 'item-1', date: '2025-01-15' }),
			makeEntry({ type: 'food', itemId: 'item-1', date: '2025-01-22' }),
		];
		const result = processFoodEntriesByWeek(entries, data, weeks);
		expect(result[0].totalCount).toBe(2);
		expect(result[1].totalCount).toBe(1);
	});

	it('calculates sentiment counts correctly', () => {
		const posCat = makeCategory({ id: 'pos', name: 'Fruits', sentiment: 'positive' });
		const limCat = makeCategory({ id: 'lim', name: 'Candy', sentiment: 'limit' });
		const neutCat = makeCategory({ id: 'neu', name: 'Grains', sentiment: 'neutral' });
		const item1 = makeItem({ id: 'i1' });
		const item2 = makeItem({ id: 'i2' });
		const item3 = makeItem({ id: 'i3' });
		const data = makeValidData({
			foodItems: [item1, item2, item3],
			foodCategories: [posCat, limCat, neutCat],
		});
		const weeks = [makeWeek('2025-W03', '2025-01-13', '2025-01-19')];
		const entries = [
			makeEntry({ type: 'food', itemId: 'i1', date: '2025-01-14', categoryOverrides: ['pos'] }),
			makeEntry({ type: 'food', itemId: 'i2', date: '2025-01-15', categoryOverrides: ['lim'] }),
			makeEntry({ type: 'food', itemId: 'i3', date: '2025-01-16', categoryOverrides: ['neu'] }),
		];
		const result = processFoodEntriesByWeek(entries, data, weeks);
		expect(result[0].sentimentCounts).toEqual({ positive: 1, neutral: 1, limit: 1 });
	});

	it('marks week as hasLowData when fewer than 5 entries', () => {
		const data = makeValidData();
		const weeks = [makeWeek('2025-W03', '2025-01-13', '2025-01-19')];
		const entries = [makeEntry({ type: 'food', date: '2025-01-14' }), makeEntry({ type: 'food', date: '2025-01-15' })];
		const result = processFoodEntriesByWeek(entries, data, weeks);
		expect(result[0].hasLowData).toBe(true);
	});

	it('marks week as not hasLowData with 5+ entries', () => {
		const data = makeValidData();
		const weeks = [makeWeek('2025-W03', '2025-01-13', '2025-01-19')];
		const entries = Array.from({ length: 5 }, (_, i) => makeEntry({ type: 'food', date: `2025-01-${13 + i}` }));
		const result = processFoodEntriesByWeek(entries, data, weeks);
		expect(result[0].hasLowData).toBe(false);
	});

	it('returns empty week data when no food entries match', () => {
		const data = makeValidData();
		const weeks = [makeWeek('2025-W03', '2025-01-13', '2025-01-19')];
		const result = processFoodEntriesByWeek([], data, weeks);
		expect(result[0].totalCount).toBe(0);
		expect(result[0].categories).toEqual([]);
		expect(result[0].sentimentCounts).toEqual({ positive: 0, neutral: 0, limit: 0 });
	});

	it('matches the index-backed weekly food stats calculation', () => {
		const positive = makeCategory({ id: 'positive', name: 'Fruit', sentiment: 'positive' });
		const limit = makeCategory({ id: 'limit', name: 'Candy', sentiment: 'limit' });
		const foodItem = makeItem({ id: 'food-item', categories: ['positive'] });
		const activityItem = makeItem({ id: 'activity-item', categories: [] });
		const data = makeValidData({
			foodCategories: [positive, limit],
			foodItems: [foodItem],
			activityItems: [activityItem],
		});
		const weeks = [makeWeek('2025-W03', '2025-01-13', '2025-01-19'), makeWeek('2025-W04', '2025-01-20', '2025-01-26')];
		const entries = [
			makeEntry({ id: 'food-1', type: 'food', itemId: 'food-item', date: '2025-01-14', categoryOverrides: null }),
			makeEntry({ id: 'food-2', type: 'food', itemId: 'food-item', date: '2025-01-21', categoryOverrides: ['limit'] }),
			makeEntry({ id: 'activity-1', type: 'activity', itemId: 'activity-item', date: '2025-01-22' }),
		];

		const legacy = processFoodEntriesByWeek(entries, data, weeks);
		const indexed = processFoodEntriesByWeekFromIndexes(
			buildEntriesByWeek(entries),
			buildCategoryById(data.activityCategories, data.foodCategories),
			buildItemCategoryIdsByItemId(data.activityItems, data.foodItems),
			weeks,
		);

		expect(indexed).toEqual(legacy);
	});
});

describe('calculateBalanceScore', () => {
	it('returns 100 when all positive', () => {
		const weekData: WeeklyData = {
			weekKey: 'test',
			start: new Date(),
			end: new Date(),
			entries: [],
			totalCount: 5,
			categories: [],
			sentimentCounts: { positive: 5, neutral: 2, limit: 0 },
			hasLowData: false,
		};
		expect(calculateBalanceScore(weekData)).toBe(100);
	});

	it('returns 0 when all limit', () => {
		const weekData: WeeklyData = {
			weekKey: 'test',
			start: new Date(),
			end: new Date(),
			entries: [],
			totalCount: 5,
			categories: [],
			sentimentCounts: { positive: 0, neutral: 2, limit: 5 },
			hasLowData: false,
		};
		expect(calculateBalanceScore(weekData)).toBe(0);
	});

	it('returns 50 for equal positive and limit', () => {
		const weekData: WeeklyData = {
			weekKey: 'test',
			start: new Date(),
			end: new Date(),
			entries: [],
			totalCount: 6,
			categories: [],
			sentimentCounts: { positive: 3, neutral: 2, limit: 3 },
			hasLowData: false,
		};
		expect(calculateBalanceScore(weekData)).toBe(50);
	});

	it('returns 0 when no positive or limit entries', () => {
		const weekData: WeeklyData = {
			weekKey: 'test',
			start: new Date(),
			end: new Date(),
			entries: [],
			totalCount: 0,
			categories: [],
			sentimentCounts: { positive: 0, neutral: 0, limit: 0 },
			hasLowData: true,
		};
		expect(calculateBalanceScore(weekData)).toBe(0);
	});

	it('ignores neutral entries in the calculation', () => {
		const weekData: WeeklyData = {
			weekKey: 'test',
			start: new Date(),
			end: new Date(),
			entries: [],
			totalCount: 10,
			categories: [],
			sentimentCounts: { positive: 3, neutral: 100, limit: 1 },
			hasLowData: false,
		};
		expect(calculateBalanceScore(weekData)).toBe(75);
	});
});

describe('getScoreChange', () => {
	it('returns up when current > previous', () => {
		const result = getScoreChange(80, 50);
		expect(result.direction).toBe('up');
		expect(result.percentChange).toBe(60);
	});

	it('returns down when current < previous', () => {
		const result = getScoreChange(30, 50);
		expect(result.direction).toBe('down');
		expect(result.percentChange).toBe(40);
	});

	it('returns stable when change is less than 1%', () => {
		const result = getScoreChange(100, 100.5);
		expect(result.direction).toBe('stable');
		expect(result.percentChange).toBe(0);
	});

	it('returns stable when previous is 0', () => {
		const result = getScoreChange(50, 0);
		expect(result.direction).toBe('stable');
		expect(result.percentChange).toBe(0);
	});
});

describe('getTopCategories', () => {
	it('returns category IDs sorted by total count across weeks', () => {
		const week1: WeeklyData = {
			weekKey: 'w1',
			start: new Date(),
			end: new Date(),
			entries: [],
			totalCount: 0,
			hasLowData: false,
			sentimentCounts: { positive: 0, neutral: 0, limit: 0 },
			categories: [
				{ categoryId: 'a', categoryName: 'A', sentiment: 'neutral', count: 5 },
				{ categoryId: 'b', categoryName: 'B', sentiment: 'neutral', count: 10 },
			],
		};
		const week2: WeeklyData = {
			weekKey: 'w2',
			start: new Date(),
			end: new Date(),
			entries: [],
			totalCount: 0,
			hasLowData: false,
			sentimentCounts: { positive: 0, neutral: 0, limit: 0 },
			categories: [
				{ categoryId: 'a', categoryName: 'A', sentiment: 'neutral', count: 8 },
				{ categoryId: 'c', categoryName: 'C', sentiment: 'neutral', count: 2 },
			],
		};
		const result = getTopCategories([week1, week2]);
		expect(result[0]).toBe('a'); // 13 total
		expect(result[1]).toBe('b'); // 10 total
		expect(result[2]).toBe('c'); // 2 total
	});

	it('respects the limit parameter', () => {
		const week: WeeklyData = {
			weekKey: 'w',
			start: new Date(),
			end: new Date(),
			entries: [],
			totalCount: 0,
			hasLowData: false,
			sentimentCounts: { positive: 0, neutral: 0, limit: 0 },
			categories: [
				{ categoryId: 'a', categoryName: 'A', sentiment: 'neutral', count: 5 },
				{ categoryId: 'b', categoryName: 'B', sentiment: 'neutral', count: 3 },
				{ categoryId: 'c', categoryName: 'C', sentiment: 'neutral', count: 1 },
			],
		};
		const result = getTopCategories([week], 2);
		expect(result).toHaveLength(2);
		expect(result).toEqual(['a', 'b']);
	});

	it('returns empty array when no categories', () => {
		const week: WeeklyData = {
			weekKey: 'w',
			start: new Date(),
			end: new Date(),
			entries: [],
			totalCount: 0,
			hasLowData: false,
			sentimentCounts: { positive: 0, neutral: 0, limit: 0 },
			categories: [],
		};
		expect(getTopCategories([week])).toEqual([]);
	});
});

describe('buildCategoryColorMap', () => {
	beforeEach(() => {
		// Set up CSS variables for chart colors in the test environment
		document.documentElement.style.setProperty('--chart-color-1', '#3b82f6');
		document.documentElement.style.setProperty('--chart-color-2', '#ef4444');
		document.documentElement.style.setProperty('--chart-color-3', '#10b981');
		document.documentElement.style.setProperty('--chart-color-4', '#f59e0b');
		document.documentElement.style.setProperty('--chart-color-5', '#8b5cf6');
		document.documentElement.style.setProperty('--chart-color-6', '#ec4899');
		document.documentElement.style.setProperty('--chart-color-7', '#06b6d4');
		document.documentElement.style.setProperty('--chart-color-8', '#f97316');
		document.documentElement.style.setProperty('--chart-color-9', '#6366f1');
	});

	it('assigns unique colors to each category', () => {
		const map = buildCategoryColorMap(['a', 'b', 'c']);
		expect(map.get('a')).toBeDefined();
		expect(map.get('b')).toBeDefined();
		expect(map.get('c')).toBeDefined();
		// All different colors
		const colors = new Set([map.get('a'), map.get('b'), map.get('c')]);
		expect(colors.size).toBe(3);
	});

	it('always includes OTHER key', () => {
		const map = buildCategoryColorMap([]);
		expect(map.has('OTHER')).toBe(true);
	});

	it('wraps colors for more than 9 categories', () => {
		const ids = Array.from({ length: 12 }, (_, i) => `cat-${i}`);
		const map = buildCategoryColorMap(ids);
		// cat-0 and cat-9 should have the same color (wrap at 9)
		expect(map.get('cat-0')).toBe(map.get('cat-9'));
	});
});

describe('groupCategoriesForWeek', () => {
	const makeWeeklyData = (categories: WeeklyData['categories']): WeeklyData => ({
		weekKey: 'w',
		start: new Date(),
		end: new Date(),
		entries: [],
		totalCount: 0,
		hasLowData: false,
		sentimentCounts: { positive: 0, neutral: 0, limit: 0 },
		categories,
	});

	it('groups non-top categories into Other', () => {
		const week = makeWeeklyData([
			{ categoryId: 'a', categoryName: 'A', sentiment: 'neutral', count: 5 },
			{ categoryId: 'b', categoryName: 'B', sentiment: 'neutral', count: 3 },
			{ categoryId: 'c', categoryName: 'C', sentiment: 'neutral', count: 1 },
		]);
		const result = groupCategoriesForWeek(week, ['a', 'b']);
		expect(result).toHaveLength(3); // a, b, Other
		const other = result.find((c) => c.categoryId === 'OTHER');
		expect(other).toBeDefined();
		expect(other!.count).toBe(1);
	});

	it('sorts by top category order with Other last', () => {
		const week = makeWeeklyData([
			{ categoryId: 'b', categoryName: 'B', sentiment: 'neutral', count: 3 },
			{ categoryId: 'a', categoryName: 'A', sentiment: 'neutral', count: 5 },
			{ categoryId: 'c', categoryName: 'C', sentiment: 'neutral', count: 2 },
		]);
		const result = groupCategoriesForWeek(week, ['a', 'b']);
		expect(result[0].categoryId).toBe('a');
		expect(result[1].categoryId).toBe('b');
		expect(result[2].categoryId).toBe('OTHER');
	});

	it('omits Other when all categories are in top list', () => {
		const week = makeWeeklyData([{ categoryId: 'a', categoryName: 'A', sentiment: 'neutral', count: 5 }]);
		const result = groupCategoriesForWeek(week, ['a', 'b']);
		expect(result).toHaveLength(1);
		expect(result[0].categoryId).toBe('a');
	});

	it('returns empty array for week with no categories', () => {
		const week = makeWeeklyData([]);
		const result = groupCategoriesForWeek(week, ['a']);
		expect(result).toEqual([]);
	});
});

describe('groupTopCategoriesForWeek', () => {
	const makeWeeklyData = (categories: WeeklyData['categories']): WeeklyData => ({
		weekKey: 'w',
		start: new Date(),
		end: new Date(),
		entries: [],
		totalCount: 0,
		hasLowData: false,
		sentimentCounts: { positive: 0, neutral: 0, limit: 0 },
		categories,
	});

	it('sorts each week by largest category first', () => {
		const week = makeWeeklyData([
			{ categoryId: 'a', categoryName: 'A', sentiment: 'neutral', count: 2 },
			{ categoryId: 'b', categoryName: 'B', sentiment: 'neutral', count: 9 },
			{ categoryId: 'c', categoryName: 'C', sentiment: 'neutral', count: 4 },
		]);

		const result = groupTopCategoriesForWeek(week, 20);
		expect(result.map((category) => category.categoryId)).toEqual(['b', 'c', 'a']);
	});

	it('keeps the top 20 and groups the rest into Other', () => {
		const week = makeWeeklyData(
			Array.from({ length: 22 }, (_, index) => ({
				categoryId: `c-${index}`,
				categoryName: `C-${index}`,
				sentiment: 'neutral' as const,
				count: 22 - index,
			})),
		);

		const result = groupTopCategoriesForWeek(week, 20);
		expect(result).toHaveLength(21);
		expect(result[20]).toMatchObject({ categoryId: 'OTHER', count: 3 });
	});
});

describe('getTopLimitCategories', () => {
	it('returns limit categories sorted by share', () => {
		const limCat1 = makeCategory({ id: 'lim-1', name: 'Candy', sentiment: 'limit' });
		const limCat2 = makeCategory({ id: 'lim-2', name: 'Soda', sentiment: 'limit' });
		const posCat = makeCategory({ id: 'pos-1', name: 'Fruit', sentiment: 'positive' });
		const item1 = makeItem({ id: 'i1' });
		const item2 = makeItem({ id: 'i2' });
		const item3 = makeItem({ id: 'i3' });
		const data = makeValidData({
			foodItems: [item1, item2, item3],
			foodCategories: [limCat1, limCat2, posCat],
		});

		const weeks = [
			makeWeek('2025-W02', '2025-01-06', '2025-01-12'),
			makeWeek('2025-W03', '2025-01-13', '2025-01-19'),
			makeWeek('2025-W04', '2025-01-20', '2025-01-26'),
			makeWeek('2025-W05', '2025-01-27', '2025-02-02'),
		];

		const entries = [
			// Candy entries (3)
			makeEntry({ type: 'food', itemId: 'i1', date: '2025-01-14', categoryOverrides: ['lim-1'] }),
			makeEntry({ type: 'food', itemId: 'i1', date: '2025-01-20', categoryOverrides: ['lim-1'] }),
			makeEntry({ type: 'food', itemId: 'i1', date: '2025-01-28', categoryOverrides: ['lim-1'] }),
			// Soda entries (1)
			makeEntry({ type: 'food', itemId: 'i2', date: '2025-01-15', categoryOverrides: ['lim-2'] }),
			// Positive entry (should be ignored)
			makeEntry({ type: 'food', itemId: 'i3', date: '2025-01-16', categoryOverrides: ['pos-1'] }),
		];

		const result = getTopLimitCategories(entries, data, weeks);
		expect(result).toHaveLength(2);
		expect(result[0].categoryName).toBe('Candy');
		expect(result[0].count).toBe(3);
		expect(result[1].categoryName).toBe('Soda');
		expect(result[1].count).toBe(1);
	});

	it('returns empty array when no limit categories exist', () => {
		const posCat = makeCategory({ id: 'pos', name: 'Fruit', sentiment: 'positive' });
		const data = makeValidData({ foodCategories: [posCat] });
		const weeks = [makeWeek('2025-W03', '2025-01-13', '2025-01-19')];
		const entries = [makeEntry({ type: 'food', date: '2025-01-15', categoryOverrides: ['pos'] })];
		expect(getTopLimitCategories(entries, data, weeks)).toEqual([]);
	});

	it('returns empty array when no entries', () => {
		const limCat = makeCategory({ id: 'lim', name: 'Candy', sentiment: 'limit' });
		const data = makeValidData({ foodCategories: [limCat] });
		const weeks = [makeWeek('2025-W03', '2025-01-13', '2025-01-19')];
		expect(getTopLimitCategories([], data, weeks)).toEqual([]);
	});

	it('respects limit parameter', () => {
		const cats = Array.from({ length: 3 }, (_, i) =>
			makeCategory({ id: `lim-${i}`, name: `Limit ${i}`, sentiment: 'limit' }),
		);
		const items = Array.from({ length: 3 }, (_, i) => makeItem({ id: `i${i}` }));
		const data = makeValidData({ foodItems: items, foodCategories: cats });
		const weeks = [makeWeek('2025-W03', '2025-01-13', '2025-01-19')];
		const entries = cats.map((c, i) =>
			makeEntry({ type: 'food', itemId: `i${i}`, date: '2025-01-15', categoryOverrides: [c.id] }),
		);
		const result = getTopLimitCategories(entries, data, weeks, 1);
		expect(result).toHaveLength(1);
	});
});

describe('getWeekNumber', () => {
	it('extracts week number from standard key', () => {
		expect(getWeekNumber('2026-W09')).toBe(9);
	});

	it('extracts double-digit week number', () => {
		expect(getWeekNumber('2025-W41')).toBe(41);
	});

	it('returns 0 for invalid key', () => {
		expect(getWeekNumber('invalid')).toBe(0);
	});
});

describe('getDailyBreakdown', () => {
	it('returns 7 days (Mon–Sun) with correct counts', () => {
		const weekStart = new Date('2025-01-13T00:00:00'); // Monday
		const weekEnd = new Date('2025-01-19T23:59:59'); // Sunday
		const entries = [
			makeEntry({ date: '2025-01-13' }), // Monday
			makeEntry({ date: '2025-01-13' }), // Monday (2nd)
			makeEntry({ date: '2025-01-15' }), // Wednesday
			makeEntry({ date: '2025-01-17' }), // Friday
			makeEntry({ date: '2025-01-19' }), // Sunday
		];
		const result = getDailyBreakdown(entries, weekStart, weekEnd);
		expect(result).toHaveLength(7);
		expect(result.map((d) => d.day)).toEqual(['M', 'T', 'W', 'T', 'F', 'S', 'S']);
		expect(result[0].count).toBe(2); // Monday
		expect(result[1].count).toBe(0); // Tuesday
		expect(result[2].count).toBe(1); // Wednesday
		expect(result[3].count).toBe(0); // Thursday
		expect(result[4].count).toBe(1); // Friday
		expect(result[5].count).toBe(0); // Saturday
		expect(result[6].count).toBe(1); // Sunday
	});

	it('returns all zeros when no entries fall in the week', () => {
		const weekStart = new Date('2025-01-13T00:00:00');
		const weekEnd = new Date('2025-01-19T23:59:59');
		const entries = [makeEntry({ date: '2025-01-20' })]; // Outside range
		const result = getDailyBreakdown(entries, weekStart, weekEnd);
		expect(result.every((d) => d.count === 0)).toBe(true);
	});

	it('returns all zeros for empty entries', () => {
		const weekStart = new Date('2025-01-13T00:00:00');
		const weekEnd = new Date('2025-01-19T23:59:59');
		const result = getDailyBreakdown([], weekStart, weekEnd);
		expect(result).toHaveLength(7);
		expect(result.every((d) => d.count === 0)).toBe(true);
	});
});

describe('calcActualDeltaPercent', () => {
	it('returns positive ratio when current exceeds baseline', () => {
		expect(calcActualDeltaPercent(6, 4)).toBe(0.5);
	});

	it('returns negative ratio when current is below baseline', () => {
		expect(calcActualDeltaPercent(2, 4)).toBe(-0.5);
	});

	it('returns 0 when current equals baseline', () => {
		expect(calcActualDeltaPercent(4, 4)).toBe(0);
	});

	it('returns 1 when baseline is 0 and current > 0', () => {
		expect(calcActualDeltaPercent(3, 0)).toBe(1);
	});

	it('returns 0 when both are 0', () => {
		expect(calcActualDeltaPercent(0, 0)).toBe(0);
	});
});

describe('formatChangeText', () => {
	it('formats positive change', () => {
		expect(formatChangeText(0.25)).toBe('+25%');
	});

	it('formats negative change with unicode minus', () => {
		expect(formatChangeText(-0.1)).toBe('\u221210%');
	});

	it('formats zero change', () => {
		expect(formatChangeText(0)).toBe('\u22120%');
	});

	it('rounds to nearest integer percentage', () => {
		expect(formatChangeText(0.126)).toBe('+13%');
	});
});

describe('getDeltaSummaryParts', () => {
	it('returns stable summary for small changes under 10%', () => {
		const result = getDeltaSummaryParts(0.08, 0.2);
		expect(result).toEqual({
			isStable: true,
			changeText: '',
			deltaValueText: '0.2',
			sign: '+',
		});
	});

	it('returns signed rounded percent and integer delta text for increases', () => {
		const result = getDeltaSummaryParts(0.756, 3);
		expect(result).toEqual({
			isStable: false,
			changeText: '+76%',
			deltaValueText: '3',
			sign: '+',
		});
	});

	it('returns unicode minus and decimal delta text for decreases', () => {
		const result = getDeltaSummaryParts(-0.2, -1.5);
		expect(result).toEqual({
			isStable: false,
			changeText: '\u221220%',
			deltaValueText: '1.5',
			sign: '\u2212',
		});
	});
});

describe('getItemAccentColor', () => {
	it('returns positive color when positive > limit', () => {
		const catPos = makeCategory({ sentiment: 'positive' });
		const catPos2 = makeCategory({ sentiment: 'positive' });
		const catLim = makeCategory({ sentiment: 'limit' });
		const categories = [catPos, catPos2, catLim];
		expect(getItemAccentColor([catPos.id, catPos2.id, catLim.id], categories)).toBe(SENTIMENT_COLORS.positive);
	});

	it('returns limit color when limit > positive', () => {
		const catLim = makeCategory({ sentiment: 'limit' });
		const catLim2 = makeCategory({ sentiment: 'limit' });
		const catPos = makeCategory({ sentiment: 'positive' });
		const categories = [catLim, catLim2, catPos];
		expect(getItemAccentColor([catLim.id, catLim2.id, catPos.id], categories)).toBe(SENTIMENT_COLORS.limit);
	});

	it('returns neutral color when positive equals limit', () => {
		const catPos = makeCategory({ sentiment: 'positive' });
		const catLim = makeCategory({ sentiment: 'limit' });
		const categories = [catPos, catLim];
		expect(getItemAccentColor([catPos.id, catLim.id], categories)).toBe(SENTIMENT_COLORS.neutral);
	});

	it('returns neutral color when all categories are neutral', () => {
		const cat = makeCategory({ sentiment: 'neutral' });
		expect(getItemAccentColor([cat.id], [cat])).toBe(SENTIMENT_COLORS.neutral);
	});

	it('returns neutral color for empty category list', () => {
		expect(getItemAccentColor([], [])).toBe(SENTIMENT_COLORS.neutral);
	});

	it('ignores unknown category IDs', () => {
		const catPos = makeCategory({ sentiment: 'positive' });
		expect(getItemAccentColor(['unknown-id', catPos.id], [catPos])).toBe(SENTIMENT_COLORS.positive);
	});
});
