import { describe, it, expect, beforeEach } from 'vitest';
import {
	countEntriesByItem,
	countEntriesByCategory,
	getEntriesGroupedByDate,
	groupEntriesByWeek,
	getMonthRange,
	getPreviousMonthRange,
	getWeekRange,
	compareMonths,
	compareMonthsForItem,
	getItemTotals,
	getCategoryTotals,
} from '../utils/entry-grouping';
import { makeEntry, makeItem, makeCategory, makeValidData, resetIdCounter } from '@/shared/store/__tests__/fixtures';

beforeEach(() => resetIdCounter());

describe('countEntriesByItem', () => {
	it('counts entries per item', () => {
		const entries = [
			makeEntry({ itemId: 'a' }),
			makeEntry({ itemId: 'b' }),
			makeEntry({ itemId: 'a' }),
			makeEntry({ itemId: 'a' }),
		];
		const counts = countEntriesByItem(entries);
		expect(counts.get('a')).toBe(3);
		expect(counts.get('b')).toBe(1);
	});

	it('returns empty map for empty entries', () => {
		expect(countEntriesByItem([]).size).toBe(0);
	});
});

describe('countEntriesByCategory', () => {
	it('counts entries per category name', () => {
		const cat1 = makeCategory({ id: 'cat-1', name: 'Fruits' });
		const cat2 = makeCategory({ id: 'cat-2', name: 'Veggies' });
		const item1 = makeItem({ id: 'item-1', categories: ['cat-1'] });
		const item2 = makeItem({ id: 'item-2', categories: ['cat-2'] });
		const data = makeValidData({
			foodItems: [item1, item2],
			foodCategories: [cat1, cat2],
		});
		const entries = [
			makeEntry({ type: 'food', itemId: 'item-1' }),
			makeEntry({ type: 'food', itemId: 'item-1' }),
			makeEntry({ type: 'food', itemId: 'item-2' }),
		];
		const counts = countEntriesByCategory(entries, data);
		expect(counts.get('Fruits')).toBe(2);
		expect(counts.get('Veggies')).toBe(1);
	});

	it('counts by category name not ID, skipping unknown categories', () => {
		const item = makeItem({ id: 'item-1', categories: ['unknown-cat'] });
		const data = makeValidData({ foodItems: [item] });
		const entries = [makeEntry({ type: 'food', itemId: 'item-1' })];
		const counts = countEntriesByCategory(entries, data);
		expect(counts.size).toBe(0);
	});

	it('handles entries with multiple categories', () => {
		const cat1 = makeCategory({ id: 'c1', name: 'A' });
		const cat2 = makeCategory({ id: 'c2', name: 'B' });
		const item = makeItem({ id: 'item-1', categories: ['c1', 'c2'] });
		const data = makeValidData({
			foodItems: [item],
			foodCategories: [cat1, cat2],
		});
		const entries = [makeEntry({ type: 'food', itemId: 'item-1' })];
		const counts = countEntriesByCategory(entries, data);
		expect(counts.get('A')).toBe(1);
		expect(counts.get('B')).toBe(1);
	});
});

describe('getEntriesGroupedByDate', () => {
	it('groups entries by date, newest date first', () => {
		const entries = [
			makeEntry({ date: '2025-01-10' }),
			makeEntry({ date: '2025-01-12' }),
			makeEntry({ date: '2025-01-10' }),
		];
		const grouped = getEntriesGroupedByDate(entries);
		const dates = [...grouped.keys()];
		expect(dates).toEqual(['2025-01-12', '2025-01-10']);
		expect(grouped.get('2025-01-10')).toHaveLength(2);
	});

	it('sorts entries within a day by time (latest first)', () => {
		const entries = [
			makeEntry({ date: '2025-01-10', time: '08:00' }),
			makeEntry({ date: '2025-01-10', time: '14:00' }),
			makeEntry({ date: '2025-01-10', time: '10:00' }),
		];
		const grouped = getEntriesGroupedByDate(entries);
		const dayEntries = grouped.get('2025-01-10')!;
		expect(dayEntries.map((e) => e.time)).toEqual(['14:00', '10:00', '08:00']);
	});

	it('puts entries without time after entries with time', () => {
		const entries = [
			makeEntry({ date: '2025-01-10', time: null }),
			makeEntry({ date: '2025-01-10', time: '09:00' }),
			makeEntry({ date: '2025-01-10', time: null }),
		];
		const grouped = getEntriesGroupedByDate(entries);
		const dayEntries = grouped.get('2025-01-10')!;
		expect(dayEntries[0].time).toBe('09:00');
		expect(dayEntries[1].time).toBeNull();
		expect(dayEntries[2].time).toBeNull();
	});

	it('returns empty map for empty entries', () => {
		const grouped = getEntriesGroupedByDate([]);
		expect(grouped.size).toBe(0);
	});
});

describe('groupEntriesByWeek', () => {
	it('groups entries by week', () => {
		const entries = [
			makeEntry({ date: '2025-01-06' }), // Monday, week 2
			makeEntry({ date: '2025-01-07' }), // Tuesday, same week
			makeEntry({ date: '2025-01-13' }), // Monday, week 3
		];
		const result = groupEntriesByWeek(entries, null);
		expect(result.length).toBeGreaterThanOrEqual(2);
		// Find the week with 2 entries
		const weekWith2 = result.find((w) => w.value === 2);
		expect(weekWith2).toBeDefined();
	});

	it('fills in empty weeks when range is provided', () => {
		const entries = [makeEntry({ date: '2025-01-06' })];
		const result = groupEntriesByWeek(entries, { start: '2025-01-01', end: '2025-01-31' });
		// Should have multiple weeks even though only 1 entry
		expect(result.length).toBeGreaterThan(1);
		// Verify some weeks have 0 entries
		const emptyWeeks = result.filter((w) => w.value === 0);
		expect(emptyWeeks.length).toBeGreaterThan(0);
	});

	it('returns sorted by date ascending', () => {
		const entries = [makeEntry({ date: '2025-01-20' }), makeEntry({ date: '2025-01-06' })];
		const result = groupEntriesByWeek(entries, null);
		for (let i = 1; i < result.length; i++) {
			expect(result[i].date >= result[i - 1].date).toBe(true);
		}
	});

	it('handles empty entries with no range', () => {
		expect(groupEntriesByWeek([], null)).toEqual([]);
	});
});

describe('getMonthRange', () => {
	it('returns correct range for a specific date', () => {
		const date = new Date(2025, 0, 15); // January 15, 2025
		const range = getMonthRange(date);
		expect(range.start).toBe('2025-01-01');
		expect(range.end).toBe('2025-01-31');
	});

	it('handles February correctly', () => {
		const date = new Date(2025, 1, 10); // February 10, 2025
		const range = getMonthRange(date);
		expect(range.start).toBe('2025-02-01');
		expect(range.end).toBe('2025-02-28');
	});

	it('handles leap year February', () => {
		const date = new Date(2024, 1, 10); // February 10, 2024 (leap year)
		const range = getMonthRange(date);
		expect(range.start).toBe('2024-02-01');
		expect(range.end).toBe('2024-02-29');
	});
});

describe('getPreviousMonthRange', () => {
	it('returns previous month range', () => {
		const date = new Date(2025, 1, 15); // February 2025
		const range = getPreviousMonthRange(date);
		expect(range.start).toBe('2025-01-01');
		expect(range.end).toBe('2025-01-31');
	});

	it('wraps to previous year from January', () => {
		const date = new Date(2025, 0, 15); // January 2025
		const range = getPreviousMonthRange(date);
		expect(range.start).toBe('2024-12-01');
		expect(range.end).toBe('2024-12-31');
	});
});

describe('getWeekRange', () => {
	it('returns Monday to Sunday range', () => {
		// Wednesday, Jan 15, 2025
		const date = new Date(2025, 0, 15);
		const range = getWeekRange(date);
		expect(range.start).toBe('2025-01-13'); // Monday
		expect(range.end).toBe('2025-01-19'); // Sunday
	});

	it('handles Monday correctly', () => {
		const date = new Date(2025, 0, 13); // Monday
		const range = getWeekRange(date);
		expect(range.start).toBe('2025-01-13');
		expect(range.end).toBe('2025-01-19');
	});

	it('handles Sunday correctly', () => {
		const date = new Date(2025, 0, 19); // Sunday
		const range = getWeekRange(date);
		expect(range.start).toBe('2025-01-13');
		expect(range.end).toBe('2025-01-19');
	});
});

describe('compareMonths', () => {
	it('computes difference and percent change', () => {
		const date = new Date(2025, 1, 15); // February 2025
		const entries = [
			// January entries (previous month)
			makeEntry({ date: '2025-01-05' }),
			makeEntry({ date: '2025-01-10' }),
			// February entries (current month)
			makeEntry({ date: '2025-02-05' }),
			makeEntry({ date: '2025-02-10' }),
			makeEntry({ date: '2025-02-15' }),
		];
		const result = compareMonths(entries, date);
		expect(result.current).toBe(3);
		expect(result.previous).toBe(2);
		expect(result.difference).toBe(1);
		expect(result.percentChange).toBe(50);
	});

	it('returns null percentChange when previous is zero', () => {
		const date = new Date(2025, 1, 15);
		const entries = [makeEntry({ date: '2025-02-10' })];
		const result = compareMonths(entries, date);
		expect(result.previous).toBe(0);
		expect(result.percentChange).toBeNull();
	});

	it('handles no entries at all', () => {
		const result = compareMonths([], new Date(2025, 1, 15));
		expect(result.current).toBe(0);
		expect(result.previous).toBe(0);
		expect(result.difference).toBe(0);
		expect(result.percentChange).toBeNull();
	});
});

describe('compareMonthsForItem', () => {
	it('compares months for a specific item only', () => {
		const date = new Date(2025, 1, 15);
		const entries = [
			makeEntry({ date: '2025-01-05', itemId: 'target' }),
			makeEntry({ date: '2025-01-10', itemId: 'other' }),
			makeEntry({ date: '2025-02-05', itemId: 'target' }),
			makeEntry({ date: '2025-02-10', itemId: 'target' }),
		];
		const result = compareMonthsForItem(entries, 'target', date);
		expect(result.current).toBe(2);
		expect(result.previous).toBe(1);
		expect(result.difference).toBe(1);
	});
});

describe('getItemTotals', () => {
	it('returns items sorted by count descending', () => {
		const items = [
			makeItem({ id: 'a', name: 'Apple' }),
			makeItem({ id: 'b', name: 'Banana' }),
			makeItem({ id: 'c', name: 'Cherry' }),
		];
		const entries = [makeEntry({ itemId: 'b' }), makeEntry({ itemId: 'b' }), makeEntry({ itemId: 'a' })];
		const result = getItemTotals(entries, items);
		expect(result).toHaveLength(2); // Cherry has 0, excluded
		expect(result[0].item.id).toBe('b');
		expect(result[0].count).toBe(2);
		expect(result[1].item.id).toBe('a');
		expect(result[1].count).toBe(1);
	});

	it('excludes items with zero entries', () => {
		const items = [makeItem({ id: 'a' })];
		const result = getItemTotals([], items);
		expect(result).toEqual([]);
	});

	it('filters by date range when provided', () => {
		const items = [makeItem({ id: 'a' })];
		const entries = [makeEntry({ itemId: 'a', date: '2025-01-10' }), makeEntry({ itemId: 'a', date: '2025-02-10' })];
		const result = getItemTotals(entries, items, { start: '2025-01-01', end: '2025-01-31' });
		expect(result[0].count).toBe(1);
	});
});

describe('getCategoryTotals', () => {
	it('returns categories sorted by count descending', () => {
		const cat1 = makeCategory({ id: 'c1', name: 'Fruits' });
		const cat2 = makeCategory({ id: 'c2', name: 'Veggies' });
		const item1 = makeItem({ id: 'i1', categories: ['c1'] });
		const item2 = makeItem({ id: 'i2', categories: ['c2'] });
		const data = makeValidData({
			foodItems: [item1, item2],
			foodCategories: [cat1, cat2],
		});
		const entries = [
			makeEntry({ type: 'food', itemId: 'i1' }),
			makeEntry({ type: 'food', itemId: 'i2' }),
			makeEntry({ type: 'food', itemId: 'i2' }),
		];
		const result = getCategoryTotals(entries, data);
		expect(result[0].category).toBe('Veggies');
		expect(result[0].count).toBe(2);
		expect(result[1].category).toBe('Fruits');
		expect(result[1].count).toBe(1);
	});

	it('filters by date range when provided', () => {
		const cat = makeCategory({ id: 'c1', name: 'Cat' });
		const item = makeItem({ id: 'i1', categories: ['c1'] });
		const data = makeValidData({
			foodItems: [item],
			foodCategories: [cat],
		});
		const entries = [
			makeEntry({ type: 'food', itemId: 'i1', date: '2025-01-10' }),
			makeEntry({ type: 'food', itemId: 'i1', date: '2025-02-10' }),
		];
		const result = getCategoryTotals(entries, data, { start: '2025-02-01', end: '2025-02-28' });
		expect(result).toHaveLength(1);
		expect(result[0].count).toBe(1);
	});
});
