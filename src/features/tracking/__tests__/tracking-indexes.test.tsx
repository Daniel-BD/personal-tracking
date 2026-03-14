import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
	buildCategoryById,
	buildEntriesByCategory,
	buildEntriesByWeek,
	buildItemCategoriesByItemId,
	buildItemCategoryIdsByItemId,
	getEntryCategoryIdsFromIndex,
	useCategoryById,
	useEntriesByCategory,
	useEntriesByWeek,
	useItemById,
	useItemCategoriesByItemId,
} from '@/features/tracking';
import { importData } from '@/shared/store/store';
import { makeCategory, makeEntry, makeItem, makeValidData, resetIdCounter } from '@/shared/store/__tests__/fixtures';

function resetStore() {
	importData(JSON.stringify(makeValidData()));
}

describe('tracking indexes', () => {
	beforeEach(() => {
		localStorage.clear();
		resetIdCounter();
		resetStore();
	});

	it('builds entriesByCategory from item defaults and category overrides', () => {
		const positive = makeCategory({ id: 'positive', sentiment: 'positive' });
		const limit = makeCategory({ id: 'limit', sentiment: 'limit' });
		const foodItem = makeItem({ id: 'food-item', categories: ['positive'] });
		const itemCategoryIdsByItemId = buildItemCategoryIdsByItemId([], [foodItem]);
		const defaultEntry = makeEntry({ id: 'entry-default', itemId: 'food-item', categoryOverrides: null });
		const overrideEntry = makeEntry({ id: 'entry-override', itemId: 'food-item', categoryOverrides: ['limit'] });

		const entriesByCategory = buildEntriesByCategory([defaultEntry, overrideEntry], itemCategoryIdsByItemId);
		const categoryById = buildCategoryById([], [positive, limit]);

		expect(entriesByCategory.get('positive')).toEqual([defaultEntry]);
		expect(entriesByCategory.get('limit')).toEqual([overrideEntry]);
		expect(getEntryCategoryIdsFromIndex(defaultEntry, itemCategoryIdsByItemId)).toEqual(['positive']);
		expect(buildItemCategoriesByItemId(itemCategoryIdsByItemId, categoryById).get('food-item')).toEqual([positive]);
	});

	it('buckets entries by ISO week across new year boundaries', () => {
		const lastYearEntry = makeEntry({ id: 'entry-1', date: '2025-12-31' });
		const nextWeekEntry = makeEntry({ id: 'entry-2', date: '2026-01-05' });

		const entriesByWeek = buildEntriesByWeek([lastYearEntry, nextWeekEntry]);

		expect(entriesByWeek.get('2026-W01')).toEqual([lastYearEntry]);
		expect(entriesByWeek.get('2026-W02')).toEqual([nextWeekEntry]);
	});

	it('selector hooks expose derived maps from store slices', () => {
		const activityCategory = makeCategory({ id: 'activity-cat', name: 'Workout', sentiment: 'positive' });
		const foodCategory = makeCategory({ id: 'food-cat', name: 'Fruit', sentiment: 'positive' });
		const activityItem = makeItem({ id: 'activity-item', name: 'Run', categories: ['activity-cat'] });
		const foodItem = makeItem({ id: 'food-item', name: 'Apple', categories: ['food-cat'] });
		const entry = makeEntry({ id: 'entry-1', itemId: 'food-item', categoryOverrides: null, date: '2026-02-18' });

		act(() => {
			importData(
				JSON.stringify(
					makeValidData({
						activityCategories: [activityCategory],
						foodCategories: [foodCategory],
						activityItems: [activityItem],
						foodItems: [foodItem],
						entries: [entry],
					}),
				),
			);
		});

		const { result } = renderHook(() => ({
			itemById: useItemById(),
			categoryById: useCategoryById(),
			entriesByCategory: useEntriesByCategory(),
			entriesByWeek: useEntriesByWeek(),
			itemCategoriesByItemId: useItemCategoriesByItemId(),
		}));

		expect(result.current.itemById.get('food-item')?.name).toBe('Apple');
		expect(result.current.categoryById.get('activity-cat')?.name).toBe('Workout');
		expect(result.current.entriesByCategory.get('food-cat')).toEqual([entry]);
		expect(result.current.entriesByWeek.get('2026-W08')).toEqual([entry]);
		expect(result.current.itemCategoriesByItemId.get('food-item')).toEqual([foodCategory]);

		const updatedFoodCategory = makeCategory({ id: 'food-cat-2', name: 'Vegetables', sentiment: 'positive' });
		const updatedFoodItem = makeItem({ id: 'food-item-2', name: 'Carrot', categories: ['food-cat-2'] });
		const updatedEntry = makeEntry({
			id: 'entry-2',
			itemId: 'food-item-2',
			categoryOverrides: null,
			date: '2026-02-23',
		});

		act(() => {
			importData(
				JSON.stringify(
					makeValidData({
						foodCategories: [updatedFoodCategory],
						foodItems: [updatedFoodItem],
						entries: [updatedEntry],
					}),
				),
			);
		});

		expect(result.current.itemById.get('food-item')).toBeUndefined();
		expect(result.current.itemById.get('food-item-2')?.name).toBe('Carrot');
		expect(result.current.entriesByCategory.get('food-cat-2')).toEqual([updatedEntry]);
		expect(result.current.entriesByWeek.get('2026-W09')).toEqual([updatedEntry]);
	});
});
