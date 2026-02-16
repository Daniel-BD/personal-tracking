import { describe, it, expect, beforeEach } from 'vitest';
import {
	getEntryCategoryIds,
	getCategoryNameById,
	getEntryCategoryNames,
	getCategorySentimentCounts,
	getDaySentimentCounts,
} from '../utils/category-utils';
import { makeEntry, makeItem, makeCategory, makeValidData, resetIdCounter } from '@/shared/store/__tests__/fixtures';

beforeEach(() => resetIdCounter());

describe('getEntryCategoryIds', () => {
	it('returns category overrides when present', () => {
		const entry = makeEntry({ categoryOverrides: ['cat-a', 'cat-b'] });
		const data = makeValidData();
		expect(getEntryCategoryIds(entry, data)).toEqual(['cat-a', 'cat-b']);
	});

	it('returns item default categories when no overrides', () => {
		const item = makeItem({ id: 'item-1', categories: ['cat-1', 'cat-2'] });
		const data = makeValidData({ foodItems: [item] });
		const entry = makeEntry({ type: 'food', itemId: 'item-1', categoryOverrides: null });
		expect(getEntryCategoryIds(entry, data)).toEqual(['cat-1', 'cat-2']);
	});

	it('returns empty array when item not found and no overrides', () => {
		const data = makeValidData();
		const entry = makeEntry({ itemId: 'nonexistent', categoryOverrides: null });
		expect(getEntryCategoryIds(entry, data)).toEqual([]);
	});

	it('returns empty overrides array as-is', () => {
		const entry = makeEntry({ categoryOverrides: [] });
		const data = makeValidData();
		expect(getEntryCategoryIds(entry, data)).toEqual([]);
	});

	it('looks up activity items for activity entries', () => {
		const item = makeItem({ id: 'act-1', categories: ['cat-act'] });
		const data = makeValidData({ activityItems: [item] });
		const entry = makeEntry({ type: 'activity', itemId: 'act-1', categoryOverrides: null });
		expect(getEntryCategoryIds(entry, data)).toEqual(['cat-act']);
	});

	it('returns item categories even when item has no categories', () => {
		const item = makeItem({ id: 'item-1', categories: [] });
		const data = makeValidData({ foodItems: [item] });
		const entry = makeEntry({ type: 'food', itemId: 'item-1', categoryOverrides: null });
		expect(getEntryCategoryIds(entry, data)).toEqual([]);
	});
});

describe('getCategoryNameById', () => {
	it('finds activity category by ID', () => {
		const cat = makeCategory({ id: 'cat-1', name: 'Running' });
		const data = makeValidData({ activityCategories: [cat] });
		expect(getCategoryNameById('cat-1', data)).toBe('Running');
	});

	it('finds food category by ID', () => {
		const cat = makeCategory({ id: 'cat-2', name: 'Fruits' });
		const data = makeValidData({ foodCategories: [cat] });
		expect(getCategoryNameById('cat-2', data)).toBe('Fruits');
	});

	it('prefers activity category when ID exists in both', () => {
		const actCat = makeCategory({ id: 'dup-id', name: 'Activity Version' });
		const foodCat = makeCategory({ id: 'dup-id', name: 'Food Version' });
		const data = makeValidData({
			activityCategories: [actCat],
			foodCategories: [foodCat],
		});
		expect(getCategoryNameById('dup-id', data)).toBe('Activity Version');
	});

	it('returns empty string for unknown category ID', () => {
		const data = makeValidData();
		expect(getCategoryNameById('nonexistent', data)).toBe('');
	});
});

describe('getEntryCategoryNames', () => {
	it('returns category names for entry with item defaults', () => {
		const cat1 = makeCategory({ id: 'cat-1', name: 'Fruits' });
		const cat2 = makeCategory({ id: 'cat-2', name: 'Vegetables' });
		const item = makeItem({ id: 'item-1', categories: ['cat-1', 'cat-2'] });
		const data = makeValidData({
			foodItems: [item],
			foodCategories: [cat1, cat2],
		});
		const entry = makeEntry({ type: 'food', itemId: 'item-1', categoryOverrides: null });
		expect(getEntryCategoryNames(entry, data)).toEqual(['Fruits', 'Vegetables']);
	});

	it('filters out categories with empty names (not found)', () => {
		const cat1 = makeCategory({ id: 'cat-1', name: 'Known' });
		const item = makeItem({ id: 'item-1', categories: ['cat-1', 'cat-unknown'] });
		const data = makeValidData({
			foodItems: [item],
			foodCategories: [cat1],
		});
		const entry = makeEntry({ type: 'food', itemId: 'item-1', categoryOverrides: null });
		expect(getEntryCategoryNames(entry, data)).toEqual(['Known']);
	});

	it('returns empty array when entry has no categories', () => {
		const item = makeItem({ id: 'item-1', categories: [] });
		const data = makeValidData({ foodItems: [item] });
		const entry = makeEntry({ type: 'food', itemId: 'item-1', categoryOverrides: null });
		expect(getEntryCategoryNames(entry, data)).toEqual([]);
	});

	it('uses category overrides when present', () => {
		const cat = makeCategory({ id: 'override-cat', name: 'Override' });
		const data = makeValidData({ foodCategories: [cat] });
		const entry = makeEntry({ categoryOverrides: ['override-cat'] });
		expect(getEntryCategoryNames(entry, data)).toEqual(['Override']);
	});
});

describe('getCategorySentimentCounts', () => {
	it('counts positive and limit categories', () => {
		const categories = [
			makeCategory({ id: 'c1', sentiment: 'positive' }),
			makeCategory({ id: 'c2', sentiment: 'positive' }),
			makeCategory({ id: 'c3', sentiment: 'limit' }),
			makeCategory({ id: 'c4', sentiment: 'neutral' }),
		];
		const result = getCategorySentimentCounts(['c1', 'c2', 'c3', 'c4'], categories);
		expect(result).toEqual({ positive: 2, limit: 1 });
	});

	it('returns zeros when all categories are neutral', () => {
		const categories = [
			makeCategory({ id: 'c1', sentiment: 'neutral' }),
			makeCategory({ id: 'c2', sentiment: 'neutral' }),
		];
		const result = getCategorySentimentCounts(['c1', 'c2'], categories);
		expect(result).toEqual({ positive: 0, limit: 0 });
	});

	it('returns zeros for empty category IDs', () => {
		const categories = [makeCategory({ id: 'c1', sentiment: 'positive' })];
		const result = getCategorySentimentCounts([], categories);
		expect(result).toEqual({ positive: 0, limit: 0 });
	});

	it('ignores category IDs not found in categories list', () => {
		const categories = [makeCategory({ id: 'c1', sentiment: 'positive' })];
		const result = getCategorySentimentCounts(['c1', 'unknown-id'], categories);
		expect(result).toEqual({ positive: 1, limit: 0 });
	});

	it('handles all positive categories', () => {
		const categories = [
			makeCategory({ id: 'c1', sentiment: 'positive' }),
			makeCategory({ id: 'c2', sentiment: 'positive' }),
		];
		const result = getCategorySentimentCounts(['c1', 'c2'], categories);
		expect(result).toEqual({ positive: 2, limit: 0 });
	});

	it('handles all limit categories', () => {
		const categories = [makeCategory({ id: 'c1', sentiment: 'limit' }), makeCategory({ id: 'c2', sentiment: 'limit' })];
		const result = getCategorySentimentCounts(['c1', 'c2'], categories);
		expect(result).toEqual({ positive: 0, limit: 2 });
	});
});

describe('getDaySentimentCounts', () => {
	it('aggregates sentiment counts across multiple entries', () => {
		const foodCats = [
			makeCategory({ id: 'fc1', sentiment: 'positive' }),
			makeCategory({ id: 'fc2', sentiment: 'limit' }),
		];
		const item1 = makeItem({ id: 'fi1', categories: ['fc1'] });
		const item2 = makeItem({ id: 'fi2', categories: ['fc2'] });
		const data = makeValidData({ foodItems: [item1, item2], foodCategories: foodCats });
		const entries = [
			makeEntry({ type: 'food', itemId: 'fi1', categoryOverrides: null }),
			makeEntry({ type: 'food', itemId: 'fi2', categoryOverrides: null }),
		];
		expect(getDaySentimentCounts(entries, data)).toEqual({ positive: 1, limit: 1 });
	});

	it('aggregates across both activity and food entries', () => {
		const actCats = [makeCategory({ id: 'ac1', sentiment: 'positive' })];
		const foodCats = [makeCategory({ id: 'fc1', sentiment: 'limit' })];
		const actItem = makeItem({ id: 'ai1', categories: ['ac1'] });
		const foodItem = makeItem({ id: 'fi1', categories: ['fc1'] });
		const data = makeValidData({
			activityItems: [actItem],
			activityCategories: actCats,
			foodItems: [foodItem],
			foodCategories: foodCats,
		});
		const entries = [
			makeEntry({ type: 'activity', itemId: 'ai1', categoryOverrides: null }),
			makeEntry({ type: 'food', itemId: 'fi1', categoryOverrides: null }),
		];
		expect(getDaySentimentCounts(entries, data)).toEqual({ positive: 1, limit: 1 });
	});

	it('returns zeros when no entries have sentiment categories', () => {
		const foodCats = [makeCategory({ id: 'fc1', sentiment: 'neutral' })];
		const item = makeItem({ id: 'fi1', categories: ['fc1'] });
		const data = makeValidData({ foodItems: [item], foodCategories: foodCats });
		const entries = [makeEntry({ type: 'food', itemId: 'fi1', categoryOverrides: null })];
		expect(getDaySentimentCounts(entries, data)).toEqual({ positive: 0, limit: 0 });
	});

	it('returns zeros for empty entries array', () => {
		const data = makeValidData();
		expect(getDaySentimentCounts([], data)).toEqual({ positive: 0, limit: 0 });
	});

	it('counts multiple categories per entry', () => {
		const foodCats = [
			makeCategory({ id: 'fc1', sentiment: 'positive' }),
			makeCategory({ id: 'fc2', sentiment: 'positive' }),
			makeCategory({ id: 'fc3', sentiment: 'limit' }),
		];
		const item = makeItem({ id: 'fi1', categories: ['fc1', 'fc2', 'fc3'] });
		const data = makeValidData({ foodItems: [item], foodCategories: foodCats });
		const entries = [makeEntry({ type: 'food', itemId: 'fi1', categoryOverrides: null })];
		expect(getDaySentimentCounts(entries, data)).toEqual({ positive: 2, limit: 1 });
	});

	it('uses category overrides when present', () => {
		const foodCats = [
			makeCategory({ id: 'fc1', sentiment: 'positive' }),
			makeCategory({ id: 'fc2', sentiment: 'limit' }),
		];
		const item = makeItem({ id: 'fi1', categories: ['fc1'] });
		const data = makeValidData({ foodItems: [item], foodCategories: foodCats });
		const entries = [makeEntry({ type: 'food', itemId: 'fi1', categoryOverrides: ['fc2'] })];
		expect(getDaySentimentCounts(entries, data)).toEqual({ positive: 0, limit: 1 });
	});
});
