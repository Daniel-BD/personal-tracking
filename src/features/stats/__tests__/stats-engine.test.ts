import { describe, it, expect, beforeEach } from 'vitest';
import {
	getWeekStartDate,
	processFoodEntriesByWeek,
	calculateBalanceScore,
	getScoreChange,
	getTopCategories,
	buildCategoryColorMap,
	groupCategoriesForWeek,
	getTopLimitCategories,
	getLaggingPositiveCategories,
	type WeeklyData,
} from '../utils/stats-engine';
import { makeEntry, makeItem, makeCategory, makeValidData, resetIdCounter } from '@/shared/store/__tests__/fixtures';

beforeEach(() => resetIdCounter());

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
		const weeks = [
			makeWeek('2025-W03', '2025-01-13', '2025-01-19'),
			makeWeek('2025-W04', '2025-01-20', '2025-01-26'),
		];
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
		const entries = [
			makeEntry({ type: 'food', date: '2025-01-14' }),
			makeEntry({ type: 'food', date: '2025-01-15' }),
		];
		const result = processFoodEntriesByWeek(entries, data, weeks);
		expect(result[0].hasLowData).toBe(true);
	});

	it('marks week as not hasLowData with 5+ entries', () => {
		const data = makeValidData();
		const weeks = [makeWeek('2025-W03', '2025-01-13', '2025-01-19')];
		const entries = Array.from({ length: 5 }, (_, i) =>
			makeEntry({ type: 'food', date: `2025-01-${13 + i}` })
		);
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
});

describe('calculateBalanceScore', () => {
	it('returns 100 when all positive', () => {
		const weekData: WeeklyData = {
			weekKey: 'test', start: new Date(), end: new Date(),
			entries: [], totalCount: 5, categories: [],
			sentimentCounts: { positive: 5, neutral: 2, limit: 0 },
			hasLowData: false,
		};
		expect(calculateBalanceScore(weekData)).toBe(100);
	});

	it('returns 0 when all limit', () => {
		const weekData: WeeklyData = {
			weekKey: 'test', start: new Date(), end: new Date(),
			entries: [], totalCount: 5, categories: [],
			sentimentCounts: { positive: 0, neutral: 2, limit: 5 },
			hasLowData: false,
		};
		expect(calculateBalanceScore(weekData)).toBe(0);
	});

	it('returns 50 for equal positive and limit', () => {
		const weekData: WeeklyData = {
			weekKey: 'test', start: new Date(), end: new Date(),
			entries: [], totalCount: 6, categories: [],
			sentimentCounts: { positive: 3, neutral: 2, limit: 3 },
			hasLowData: false,
		};
		expect(calculateBalanceScore(weekData)).toBe(50);
	});

	it('returns 0 when no positive or limit entries', () => {
		const weekData: WeeklyData = {
			weekKey: 'test', start: new Date(), end: new Date(),
			entries: [], totalCount: 0, categories: [],
			sentimentCounts: { positive: 0, neutral: 0, limit: 0 },
			hasLowData: true,
		};
		expect(calculateBalanceScore(weekData)).toBe(0);
	});

	it('ignores neutral entries in the calculation', () => {
		const weekData: WeeklyData = {
			weekKey: 'test', start: new Date(), end: new Date(),
			entries: [], totalCount: 10, categories: [],
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
			weekKey: 'w1', start: new Date(), end: new Date(),
			entries: [], totalCount: 0, hasLowData: false,
			sentimentCounts: { positive: 0, neutral: 0, limit: 0 },
			categories: [
				{ categoryId: 'a', categoryName: 'A', sentiment: 'neutral', count: 5 },
				{ categoryId: 'b', categoryName: 'B', sentiment: 'neutral', count: 10 },
			],
		};
		const week2: WeeklyData = {
			weekKey: 'w2', start: new Date(), end: new Date(),
			entries: [], totalCount: 0, hasLowData: false,
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
			weekKey: 'w', start: new Date(), end: new Date(),
			entries: [], totalCount: 0, hasLowData: false,
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
			weekKey: 'w', start: new Date(), end: new Date(),
			entries: [], totalCount: 0, hasLowData: false,
			sentimentCounts: { positive: 0, neutral: 0, limit: 0 },
			categories: [],
		};
		expect(getTopCategories([week])).toEqual([]);
	});
});

describe('buildCategoryColorMap', () => {
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
		weekKey: 'w', start: new Date(), end: new Date(),
		entries: [], totalCount: 0, hasLowData: false,
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
		const week = makeWeeklyData([
			{ categoryId: 'a', categoryName: 'A', sentiment: 'neutral', count: 5 },
		]);
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
			makeCategory({ id: `lim-${i}`, name: `Limit ${i}`, sentiment: 'limit' })
		);
		const items = Array.from({ length: 3 }, (_, i) => makeItem({ id: `i${i}` }));
		const data = makeValidData({ foodItems: items, foodCategories: cats });
		const weeks = [makeWeek('2025-W03', '2025-01-13', '2025-01-19')];
		const entries = cats.map((c, i) =>
			makeEntry({ type: 'food', itemId: `i${i}`, date: '2025-01-15', categoryOverrides: [c.id] })
		);
		const result = getTopLimitCategories(entries, data, weeks, 1);
		expect(result).toHaveLength(1);
	});
});

describe('getLaggingPositiveCategories', () => {
	it('returns positive categories below average share', () => {
		const cat1 = makeCategory({ id: 'p1', name: 'Fruits', sentiment: 'positive' });
		const cat2 = makeCategory({ id: 'p2', name: 'Veggies', sentiment: 'positive' });
		const cat3 = makeCategory({ id: 'p3', name: 'Nuts', sentiment: 'positive' });
		const item1 = makeItem({ id: 'i1' });
		const item2 = makeItem({ id: 'i2' });
		const item3 = makeItem({ id: 'i3' });
		const data = makeValidData({
			foodItems: [item1, item2, item3],
			foodCategories: [cat1, cat2, cat3],
		});

		const weeks = [
			makeWeek('2025-W02', '2025-01-06', '2025-01-12'),
			makeWeek('2025-W03', '2025-01-13', '2025-01-19'),
			makeWeek('2025-W04', '2025-01-20', '2025-01-26'),
			makeWeek('2025-W05', '2025-01-27', '2025-02-02'),
		];

		const entries = [
			// Fruits: 5 entries (dominant)
			...Array.from({ length: 5 }, (_, i) =>
				makeEntry({ type: 'food', itemId: 'i1', date: `2025-01-${14 + i}`, categoryOverrides: ['p1'] })
			),
			// Veggies: 1 entry (lagging)
			makeEntry({ type: 'food', itemId: 'i2', date: '2025-01-20', categoryOverrides: ['p2'] }),
			// Nuts: 0 entries (most lagging)
		];

		const result = getLaggingPositiveCategories(entries, data, weeks);
		// Nuts (0 entries) should be most lagging, then Veggies (1 entry)
		expect(result.length).toBeGreaterThanOrEqual(2);
		expect(result[0].categoryName).toBe('Nuts');
		expect(result[1].categoryName).toBe('Veggies');
	});

	it('returns empty array when no positive categories exist', () => {
		const limCat = makeCategory({ id: 'lim', name: 'Candy', sentiment: 'limit' });
		const data = makeValidData({ foodCategories: [limCat] });
		const weeks = [makeWeek('2025-W03', '2025-01-13', '2025-01-19')];
		const entries = [makeEntry({ type: 'food', date: '2025-01-15', categoryOverrides: ['lim'] })];
		expect(getLaggingPositiveCategories(entries, data, weeks)).toEqual([]);
	});

	it('returns empty array when all positive categories are equally distributed', () => {
		const cat1 = makeCategory({ id: 'p1', name: 'A', sentiment: 'positive' });
		const cat2 = makeCategory({ id: 'p2', name: 'B', sentiment: 'positive' });
		const item1 = makeItem({ id: 'i1' });
		const item2 = makeItem({ id: 'i2' });
		const data = makeValidData({
			foodItems: [item1, item2],
			foodCategories: [cat1, cat2],
		});
		const weeks = [
			makeWeek('2025-W02', '2025-01-06', '2025-01-12'),
			makeWeek('2025-W03', '2025-01-13', '2025-01-19'),
			makeWeek('2025-W04', '2025-01-20', '2025-01-26'),
			makeWeek('2025-W05', '2025-01-27', '2025-02-02'),
		];
		const entries = [
			makeEntry({ type: 'food', itemId: 'i1', date: '2025-01-14', categoryOverrides: ['p1'] }),
			makeEntry({ type: 'food', itemId: 'i2', date: '2025-01-15', categoryOverrides: ['p2'] }),
		];
		const result = getLaggingPositiveCategories(entries, data, weeks);
		expect(result).toEqual([]);
	});

	it('respects limit parameter', () => {
		const cats = Array.from({ length: 5 }, (_, i) =>
			makeCategory({ id: `p${i}`, name: `Pos ${i}`, sentiment: 'positive' })
		);
		const items = [makeItem({ id: 'i0' })];
		const data = makeValidData({ foodItems: items, foodCategories: cats });
		const weeks = [
			makeWeek('2025-W02', '2025-01-06', '2025-01-12'),
			makeWeek('2025-W03', '2025-01-13', '2025-01-19'),
			makeWeek('2025-W04', '2025-01-20', '2025-01-26'),
			makeWeek('2025-W05', '2025-01-27', '2025-02-02'),
		];
		// Only one category has entries — the rest all lag
		const entries = Array.from({ length: 10 }, () =>
			makeEntry({ type: 'food', itemId: 'i0', date: '2025-01-15', categoryOverrides: ['p0'] })
		);
		const result = getLaggingPositiveCategories(entries, data, weeks, 2);
		expect(result).toHaveLength(2);
	});
});
