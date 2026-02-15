import { describe, it, expect } from 'vitest';
import type { Entry, Item, Category } from '@/shared/lib/types';
import { filterEntriesByType, filterEntriesByItems, filterEntriesByCategories } from '@/features/tracking';
import { makeEntry, makeItem, makeCategory, makeValidData } from '@/shared/store/__tests__/fixtures';

/**
 * Tests for the filter composition logic used by the Log page (useLogFilters hook).
 * We test the pipeline of filters and the helper logic for available items/categories.
 */

// Replicate the available categories/items logic from the hook
function getAvailableCategories(
	typeFilter: 'all' | 'activity' | 'food',
	activityCategories: Category[],
	foodCategories: Category[],
): Category[] {
	if (typeFilter === 'activity') return activityCategories;
	if (typeFilter === 'food') return foodCategories;
	return [...activityCategories, ...foodCategories];
}

function getAvailableItems(typeFilter: 'all' | 'activity' | 'food', activityItems: Item[], foodItems: Item[]): Item[] {
	if (typeFilter === 'activity') return activityItems;
	if (typeFilter === 'food') return foodItems;
	return [...activityItems, ...foodItems];
}

// Replicate the type-change cleanup logic
function cleanupSelectionsForType(
	newType: 'activity' | 'food',
	selectedCategories: string[],
	selectedItems: string[],
	activityCategories: Category[],
	foodCategories: Category[],
	activityItems: Item[],
	foodItems: Item[],
) {
	const cats = newType === 'activity' ? activityCategories : foodCategories;
	const items = newType === 'activity' ? activityItems : foodItems;
	return {
		categories: selectedCategories.filter((id) => cats.some((c) => c.id === id)),
		items: selectedItems.filter((id) => items.some((i) => i.id === id)),
	};
}

// Shared test data
const actCat = makeCategory({ id: 'ac1', name: 'Cardio' });
const foodCat = makeCategory({ id: 'fc1', name: 'Fruit' });
const actItem = makeItem({ id: 'ai1', name: 'Running', categories: ['ac1'] });
const foodItem = makeItem({ id: 'fi1', name: 'Apple', categories: ['fc1'] });

const actEntry = makeEntry({ id: 'e1', type: 'activity', itemId: 'ai1', date: '2025-01-15' });
const foodEntry = makeEntry({ id: 'e2', type: 'food', itemId: 'fi1', date: '2025-01-15' });
const foodEntry2 = makeEntry({ id: 'e3', type: 'food', itemId: 'fi1', date: '2025-01-16' });
const entries = [actEntry, foodEntry, foodEntry2];

describe('filter pipeline composition', () => {
	it('type filter "all" returns all entries', () => {
		const result = entries; // no filter applied for 'all'
		expect(result).toHaveLength(3);
	});

	it('type filter "activity" returns only activity entries', () => {
		const result = filterEntriesByType(entries, 'activity');
		expect(result).toHaveLength(1);
		expect(result[0].type).toBe('activity');
	});

	it('type filter "food" returns only food entries', () => {
		const result = filterEntriesByType(entries, 'food');
		expect(result).toHaveLength(2);
		result.forEach((e) => expect(e.type).toBe('food'));
	});

	it('item filter narrows results to specific items', () => {
		const result = filterEntriesByItems(entries, ['fi1']);
		expect(result).toHaveLength(2);
		result.forEach((e) => expect(e.itemId).toBe('fi1'));
	});

	it('category filter narrows results by category', () => {
		const data = makeValidData({
			activityItems: [actItem],
			foodItems: [foodItem],
			activityCategories: [actCat],
			foodCategories: [foodCat],
			entries,
		});

		const result = filterEntriesByCategories(entries, ['fc1'], data);
		expect(result.length).toBeGreaterThan(0);
		result.forEach((e) => expect(e.itemId).toBe('fi1'));
	});

	it('combined type + item filters work together', () => {
		let result = filterEntriesByType(entries, 'food');
		result = filterEntriesByItems(result, ['fi1']);
		expect(result).toHaveLength(2);
		result.forEach((e) => {
			expect(e.type).toBe('food');
			expect(e.itemId).toBe('fi1');
		});
	});

	it('returns empty when filters exclude everything', () => {
		let result = filterEntriesByType(entries, 'activity');
		result = filterEntriesByItems(result, ['fi1']); // food item with activity type filter
		expect(result).toHaveLength(0);
	});
});

describe('available categories/items logic', () => {
	it('returns only activity categories for activity filter', () => {
		const result = getAvailableCategories('activity', [actCat], [foodCat]);
		expect(result).toEqual([actCat]);
	});

	it('returns only food categories for food filter', () => {
		const result = getAvailableCategories('food', [actCat], [foodCat]);
		expect(result).toEqual([foodCat]);
	});

	it('returns combined categories for all filter', () => {
		const result = getAvailableCategories('all', [actCat], [foodCat]);
		expect(result).toEqual([actCat, foodCat]);
	});

	it('returns correct items by type', () => {
		expect(getAvailableItems('activity', [actItem], [foodItem])).toEqual([actItem]);
		expect(getAvailableItems('food', [actItem], [foodItem])).toEqual([foodItem]);
		expect(getAvailableItems('all', [actItem], [foodItem])).toEqual([actItem, foodItem]);
	});
});

describe('type change cleanup', () => {
	it('removes food selections when switching to activity', () => {
		const result = cleanupSelectionsForType(
			'activity',
			['ac1', 'fc1'], // mixed selections
			['ai1', 'fi1'],
			[actCat],
			[foodCat],
			[actItem],
			[foodItem],
		);
		expect(result.categories).toEqual(['ac1']);
		expect(result.items).toEqual(['ai1']);
	});

	it('removes activity selections when switching to food', () => {
		const result = cleanupSelectionsForType(
			'food',
			['ac1', 'fc1'],
			['ai1', 'fi1'],
			[actCat],
			[foodCat],
			[actItem],
			[foodItem],
		);
		expect(result.categories).toEqual(['fc1']);
		expect(result.items).toEqual(['fi1']);
	});

	it('returns empty when no matching selections remain', () => {
		const result = cleanupSelectionsForType(
			'activity',
			['fc1'], // only food category selected
			['fi1'], // only food item selected
			[actCat],
			[foodCat],
			[actItem],
			[foodItem],
		);
		expect(result.categories).toEqual([]);
		expect(result.items).toEqual([]);
	});
});
