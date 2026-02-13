import { describe, it, expect, beforeEach } from 'vitest';
import {
	filterEntriesByDateRange,
	filterEntriesByType,
	filterEntriesByItem,
	filterEntriesByItems,
	filterEntriesByCategory,
	filterEntriesByCategories,
} from '../utils/entry-filters';
import { makeEntry, makeItem, makeCategory, makeValidData, resetIdCounter } from '@/shared/store/__tests__/fixtures';

beforeEach(() => resetIdCounter());

describe('filterEntriesByDateRange', () => {
	it('returns entries within the range (inclusive)', () => {
		const entries = [
			makeEntry({ date: '2025-01-10' }),
			makeEntry({ date: '2025-01-15' }),
			makeEntry({ date: '2025-01-20' }),
		];
		const result = filterEntriesByDateRange(entries, { start: '2025-01-10', end: '2025-01-15' });
		expect(result).toHaveLength(2);
		expect(result.map((e) => e.date)).toEqual(['2025-01-10', '2025-01-15']);
	});

	it('returns empty array when no entries match', () => {
		const entries = [makeEntry({ date: '2025-01-01' })];
		const result = filterEntriesByDateRange(entries, { start: '2025-02-01', end: '2025-02-28' });
		expect(result).toEqual([]);
	});

	it('handles empty entries array', () => {
		const result = filterEntriesByDateRange([], { start: '2025-01-01', end: '2025-12-31' });
		expect(result).toEqual([]);
	});

	it('handles single-day range', () => {
		const entries = [
			makeEntry({ date: '2025-01-15' }),
			makeEntry({ date: '2025-01-16' }),
		];
		const result = filterEntriesByDateRange(entries, { start: '2025-01-15', end: '2025-01-15' });
		expect(result).toHaveLength(1);
		expect(result[0].date).toBe('2025-01-15');
	});

	it('includes entries on boundary dates', () => {
		const entries = [
			makeEntry({ date: '2025-03-01' }),
			makeEntry({ date: '2025-03-15' }),
			makeEntry({ date: '2025-03-31' }),
		];
		const result = filterEntriesByDateRange(entries, { start: '2025-03-01', end: '2025-03-31' });
		expect(result).toHaveLength(3);
	});
});

describe('filterEntriesByType', () => {
	it('filters food entries', () => {
		const entries = [
			makeEntry({ type: 'food' }),
			makeEntry({ type: 'activity' }),
			makeEntry({ type: 'food' }),
		];
		const result = filterEntriesByType(entries, 'food');
		expect(result).toHaveLength(2);
		expect(result.every((e) => e.type === 'food')).toBe(true);
	});

	it('filters activity entries', () => {
		const entries = [
			makeEntry({ type: 'food' }),
			makeEntry({ type: 'activity' }),
		];
		const result = filterEntriesByType(entries, 'activity');
		expect(result).toHaveLength(1);
		expect(result[0].type).toBe('activity');
	});

	it('returns empty array when no entries match type', () => {
		const entries = [makeEntry({ type: 'food' })];
		const result = filterEntriesByType(entries, 'activity');
		expect(result).toEqual([]);
	});

	it('handles empty entries array', () => {
		expect(filterEntriesByType([], 'food')).toEqual([]);
	});
});

describe('filterEntriesByItem', () => {
	it('returns entries matching the item ID', () => {
		const entries = [
			makeEntry({ itemId: 'item-a' }),
			makeEntry({ itemId: 'item-b' }),
			makeEntry({ itemId: 'item-a' }),
		];
		const result = filterEntriesByItem(entries, 'item-a');
		expect(result).toHaveLength(2);
		expect(result.every((e) => e.itemId === 'item-a')).toBe(true);
	});

	it('returns empty array when item ID does not match', () => {
		const entries = [makeEntry({ itemId: 'item-a' })];
		expect(filterEntriesByItem(entries, 'item-x')).toEqual([]);
	});

	it('handles empty entries array', () => {
		expect(filterEntriesByItem([], 'item-a')).toEqual([]);
	});
});

describe('filterEntriesByItems', () => {
	it('returns entries matching any item in the list', () => {
		const entries = [
			makeEntry({ itemId: 'item-a' }),
			makeEntry({ itemId: 'item-b' }),
			makeEntry({ itemId: 'item-c' }),
		];
		const result = filterEntriesByItems(entries, ['item-a', 'item-c']);
		expect(result).toHaveLength(2);
		expect(result.map((e) => e.itemId)).toEqual(['item-a', 'item-c']);
	});

	it('returns all entries when item list is empty', () => {
		const entries = [makeEntry(), makeEntry()];
		const result = filterEntriesByItems(entries, []);
		expect(result).toHaveLength(2);
	});

	it('returns empty array when no entries match', () => {
		const entries = [makeEntry({ itemId: 'item-a' })];
		expect(filterEntriesByItems(entries, ['item-x'])).toEqual([]);
	});
});

describe('filterEntriesByCategory', () => {
	it('filters entries by category using item defaults', () => {
		const cat = makeCategory({ id: 'cat-1' });
		const item = makeItem({ id: 'item-1', categories: ['cat-1'] });
		const data = makeValidData({
			foodItems: [item],
			foodCategories: [cat],
		});
		const entries = [
			makeEntry({ type: 'food', itemId: 'item-1' }),
			makeEntry({ type: 'food', itemId: 'item-2' }),
		];
		const result = filterEntriesByCategory(entries, 'cat-1', data);
		expect(result).toHaveLength(1);
		expect(result[0].itemId).toBe('item-1');
	});

	it('uses category overrides when present', () => {
		const item = makeItem({ id: 'item-1', categories: ['cat-1'] });
		const data = makeValidData({ foodItems: [item] });
		const entries = [
			makeEntry({ type: 'food', itemId: 'item-1', categoryOverrides: ['cat-2'] }),
		];
		// Entry has override to cat-2, so filtering by cat-1 should NOT match
		expect(filterEntriesByCategory(entries, 'cat-1', data)).toEqual([]);
		// But filtering by cat-2 should match
		expect(filterEntriesByCategory(entries, 'cat-2', data)).toHaveLength(1);
	});

	it('handles empty entries', () => {
		const data = makeValidData();
		expect(filterEntriesByCategory([], 'cat-1', data)).toEqual([]);
	});
});

describe('filterEntriesByCategories', () => {
	it('returns entries matching any category in the list', () => {
		const item1 = makeItem({ id: 'item-1', categories: ['cat-1'] });
		const item2 = makeItem({ id: 'item-2', categories: ['cat-2'] });
		const item3 = makeItem({ id: 'item-3', categories: ['cat-3'] });
		const data = makeValidData({ foodItems: [item1, item2, item3] });
		const entries = [
			makeEntry({ type: 'food', itemId: 'item-1' }),
			makeEntry({ type: 'food', itemId: 'item-2' }),
			makeEntry({ type: 'food', itemId: 'item-3' }),
		];
		const result = filterEntriesByCategories(entries, ['cat-1', 'cat-3'], data);
		expect(result).toHaveLength(2);
	});

	it('returns all entries when category list is empty', () => {
		const data = makeValidData();
		const entries = [makeEntry(), makeEntry()];
		const result = filterEntriesByCategories(entries, [], data);
		expect(result).toHaveLength(2);
	});

	it('returns empty array when no entries match any category', () => {
		const item = makeItem({ id: 'item-1', categories: ['cat-1'] });
		const data = makeValidData({ foodItems: [item] });
		const entries = [makeEntry({ type: 'food', itemId: 'item-1' })];
		expect(filterEntriesByCategories(entries, ['cat-x'], data)).toEqual([]);
	});
});
