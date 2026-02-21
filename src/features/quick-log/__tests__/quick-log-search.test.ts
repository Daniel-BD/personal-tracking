import { describe, it, expect } from 'vitest';
import type { Item, Entry, EntryType } from '@/shared/lib/types';
import { makeItem, makeEntry } from '@/shared/store/__tests__/fixtures';

/**
 * Tests for the pure logic extracted from useQuickLogSearch hook.
 * We replicate the core algorithms here to test without React hooks.
 */

interface UnifiedItem {
	item: Item;
	type: EntryType;
}

function mergeItems(activityItems: Item[], foodItems: Item[]): UnifiedItem[] {
	return [
		...activityItems.map((item) => ({ item, type: 'activity' as EntryType })),
		...foodItems.map((item) => ({ item, type: 'food' as EntryType })),
	];
}

function searchItems(allItems: UnifiedItem[], query: string): UnifiedItem[] {
	if (!query.trim()) return [];
	return allItems.filter((u) => u.item.name.toLowerCase().includes(query.toLowerCase()));
}

function getFavorites(activityItems: Item[], foodItems: Item[], favoriteIds: string[]): UnifiedItem[] {
	if (favoriteIds.length === 0) return [];
	const itemMap = new Map<string, UnifiedItem>();
	for (const item of activityItems) itemMap.set(item.id, { item, type: 'activity' });
	for (const item of foodItems) itemMap.set(item.id, { item, type: 'food' });
	const result: UnifiedItem[] = [];
	for (const itemId of favoriteIds) {
		const unified = itemMap.get(itemId);
		if (unified) result.push(unified);
	}
	return result;
}

function hasExactMatch(results: UnifiedItem[], query: string): boolean {
	return results.some((u) => u.item.name.toLowerCase() === query.trim().toLowerCase());
}

function getRecentItems(activityItems: Item[], foodItems: Item[], entries: Entry[], limit = 20): UnifiedItem[] {
	if (entries.length === 0) return [];

	const itemMap = new Map<string, UnifiedItem>();
	for (const item of activityItems) itemMap.set(item.id, { item, type: 'activity' });
	for (const item of foodItems) itemMap.set(item.id, { item, type: 'food' });

	const sorted = [...entries].sort((a, b) => {
		const dateA = a.time ? `${a.date}T${a.time}` : a.date;
		const dateB = b.time ? `${b.date}T${b.time}` : b.date;
		return dateB.localeCompare(dateA);
	});

	const seen = new Set<string>();
	const result: UnifiedItem[] = [];
	for (const entry of sorted) {
		const key = `${entry.type}-${entry.itemId}`;
		if (seen.has(key)) continue;
		seen.add(key);
		const unified = itemMap.get(entry.itemId);
		if (unified) result.push(unified);
		if (result.length >= limit) break;
	}
	return result;
}

describe('mergeItems', () => {
	it('combines activity and food items with correct types', () => {
		const actItems = [makeItem({ id: 'a1', name: 'Running' })];
		const foodItems = [makeItem({ id: 'f1', name: 'Apple' })];

		const result = mergeItems(actItems, foodItems);

		expect(result).toHaveLength(2);
		expect(result[0]).toEqual({ item: actItems[0], type: 'activity' });
		expect(result[1]).toEqual({ item: foodItems[0], type: 'food' });
	});

	it('returns empty array when both lists are empty', () => {
		expect(mergeItems([], [])).toEqual([]);
	});
});

describe('searchItems', () => {
	const allItems: UnifiedItem[] = [
		{ item: makeItem({ id: 'a1', name: 'Running' }), type: 'activity' },
		{ item: makeItem({ id: 'a2', name: 'Swimming' }), type: 'activity' },
		{ item: makeItem({ id: 'f1', name: 'Apple' }), type: 'food' },
		{ item: makeItem({ id: 'f2', name: 'Pineapple' }), type: 'food' },
	];

	it('returns empty for blank query', () => {
		expect(searchItems(allItems, '')).toEqual([]);
		expect(searchItems(allItems, '   ')).toEqual([]);
	});

	it('filters by partial name match (case-insensitive)', () => {
		const result = searchItems(allItems, 'apple');
		expect(result).toHaveLength(2);
		expect(result.map((u) => u.item.name)).toEqual(['Apple', 'Pineapple']);
	});

	it('returns single match', () => {
		const result = searchItems(allItems, 'run');
		expect(result).toHaveLength(1);
		expect(result[0].item.name).toBe('Running');
		expect(result[0].type).toBe('activity');
	});

	it('returns empty when nothing matches', () => {
		expect(searchItems(allItems, 'xyz')).toEqual([]);
	});
});

describe('getFavorites', () => {
	const actItems = [makeItem({ id: 'a1', name: 'Running' })];
	const foodItems = [makeItem({ id: 'f1', name: 'Apple' }), makeItem({ id: 'f2', name: 'Banana' })];

	it('returns empty for no favorite IDs', () => {
		expect(getFavorites(actItems, foodItems, [])).toEqual([]);
	});

	it('returns matching items in order of favorite IDs', () => {
		const result = getFavorites(actItems, foodItems, ['f2', 'a1']);
		expect(result).toHaveLength(2);
		expect(result[0].item.name).toBe('Banana');
		expect(result[1].item.name).toBe('Running');
		expect(result[1].type).toBe('activity');
	});

	it('ignores invalid favorite IDs', () => {
		const result = getFavorites(actItems, foodItems, ['nonexistent', 'f1']);
		expect(result).toHaveLength(1);
		expect(result[0].item.name).toBe('Apple');
	});

	it('food items override activity items with same ID', () => {
		const dupeAct = [makeItem({ id: 'shared', name: 'Act Version' })];
		const dupeFood = [makeItem({ id: 'shared', name: 'Food Version' })];
		const result = getFavorites(dupeAct, dupeFood, ['shared']);
		expect(result).toHaveLength(1);
		expect(result[0].item.name).toBe('Food Version');
		expect(result[0].type).toBe('food');
	});
});

describe('getRecentItems', () => {
	const actItems = [makeItem({ id: 'a1', name: 'Running' })];
	const foodItems = [makeItem({ id: 'f1', name: 'Apple' }), makeItem({ id: 'f2', name: 'Banana' })];

	it('returns empty when entries list is empty', () => {
		expect(getRecentItems(actItems, foodItems, [])).toEqual([]);
	});

	it('returns items sorted by most recent first (date+time)', () => {
		const entries = [
			makeEntry({ type: 'food', itemId: 'f1', date: '2025-01-10', time: '08:00' }),
			makeEntry({ type: 'food', itemId: 'f2', date: '2025-01-12', time: '09:00' }),
		];
		const result = getRecentItems(actItems, foodItems, entries);
		expect(result.map((u) => u.item.id)).toEqual(['f2', 'f1']);
	});

	it('uses date only when time is absent', () => {
		const entries = [
			makeEntry({ type: 'food', itemId: 'f1', date: '2025-01-10', time: null }),
			makeEntry({ type: 'food', itemId: 'f2', date: '2025-01-12', time: null }),
		];
		const result = getRecentItems(actItems, foodItems, entries);
		expect(result[0].item.id).toBe('f2');
	});

	it('deduplicates by type+itemId, keeping only the most recent occurrence', () => {
		const entries = [
			makeEntry({ type: 'food', itemId: 'f1', date: '2025-01-10', time: '08:00' }),
			makeEntry({ type: 'food', itemId: 'f1', date: '2025-01-12', time: '09:00' }), // newer duplicate
		];
		const result = getRecentItems(actItems, foodItems, entries);
		expect(result).toHaveLength(1);
		expect(result[0].item.id).toBe('f1');
	});

	it('treats same itemId with different types as distinct', () => {
		const sharedActItems = [makeItem({ id: 'shared', name: 'Act Version' })];
		const sharedFoodItems = [makeItem({ id: 'shared', name: 'Food Version' })];
		const entries = [
			makeEntry({ type: 'activity', itemId: 'shared', date: '2025-01-10', time: '08:00' }),
			makeEntry({ type: 'food', itemId: 'shared', date: '2025-01-11', time: '08:00' }),
		];
		const result = getRecentItems(sharedActItems, sharedFoodItems, entries);
		expect(result).toHaveLength(2);
	});

	it('respects the 20-item limit', () => {
		const manyFoodItems = Array.from({ length: 25 }, (_, i) => makeItem({ id: `f${i}`, name: `Item ${i}` }));
		const entries = manyFoodItems.map((item, i) =>
			makeEntry({ type: 'food', itemId: item.id, date: `2025-01-${String(i + 1).padStart(2, '0')}`, time: '12:00' }),
		);
		const result = getRecentItems([], manyFoodItems, entries);
		expect(result).toHaveLength(20);
	});

	it('skips entries whose item no longer exists', () => {
		const entries = [makeEntry({ type: 'food', itemId: 'deleted-item', date: '2025-01-10', time: '08:00' })];
		const result = getRecentItems(actItems, foodItems, entries);
		expect(result).toHaveLength(0);
	});

	it('sorts correctly when insertion order differs from chronological order', () => {
		// Entries appended in reverse date order (simulates past-date logging)
		const entries = [
			makeEntry({ type: 'food', itemId: 'f2', date: '2025-01-05', time: '10:00' }), // oldest, appended first
			makeEntry({ type: 'food', itemId: 'f1', date: '2025-01-15', time: '10:00' }), // newest, appended second
		];
		const result = getRecentItems(actItems, foodItems, entries);
		expect(result[0].item.id).toBe('f1'); // most recent date wins, not insertion order
	});
});

describe('hasExactMatch', () => {
	const results: UnifiedItem[] = [
		{ item: makeItem({ id: 'f1', name: 'Apple' }), type: 'food' },
		{ item: makeItem({ id: 'f2', name: 'Pineapple' }), type: 'food' },
	];

	it('returns true for exact match (case-insensitive)', () => {
		expect(hasExactMatch(results, 'apple')).toBe(true);
		expect(hasExactMatch(results, 'APPLE')).toBe(true);
	});

	it('returns false for partial match only', () => {
		expect(hasExactMatch(results, 'app')).toBe(false);
	});

	it('trims whitespace from query', () => {
		expect(hasExactMatch(results, '  Apple  ')).toBe(true);
	});
});
