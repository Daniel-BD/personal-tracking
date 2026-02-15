import { describe, it, expect } from 'vitest';
import type { Item, EntryType } from '@/shared/lib/types';
import { makeItem } from '@/shared/store/__tests__/fixtures';

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
