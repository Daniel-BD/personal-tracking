import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	buildCategoriesByType,
	buildFavoriteItemIdSet,
	buildItemCountsByCategoryId,
	buildTypedCategoriesById,
	useLibraryIndexes,
} from '@/features/library';
import { importData } from '@/shared/store/store';
import { makeCategory, makeItem, makeValidData, resetIdCounter } from '@/shared/store/__tests__/fixtures';

vi.mock('@/shared/lib/github', () => ({
	isConfigured: () => false,
}));

vi.mock('@/shared/store/sync', () => ({
	pendingDeletions: {
		activityItems: new Set(),
		foodItems: new Set(),
		activityCategories: new Set(),
		foodCategories: new Set(),
		entries: new Set(),
		dashboardCards: new Set(),
		favoriteItems: new Set(),
	},
	persistPendingDeletions: vi.fn(),
	clearPendingDeletions: vi.fn(),
	pushToGist: vi.fn(),
	loadFromGistFn: vi.fn(),
	backupToGistFn: vi.fn(),
	restoreFromBackupGistFn: vi.fn(),
	addTombstone: vi.fn((data: unknown) => data),
	addTombstones: vi.fn((data: unknown) => data),
	removeTombstone: vi.fn((data: unknown) => data),
	markDashboardCardRestored: vi.fn(),
	clearDashboardCardRestored: vi.fn(),
}));

function resetStore() {
	importData(JSON.stringify(makeValidData()));
}

describe('library indexes', () => {
	beforeEach(() => {
		localStorage.clear();
		resetIdCounter();
		resetStore();
	});

	it('builds typed category, favorite, and item-count lookup maps', () => {
		const workout = makeCategory({ id: 'activity-cat', name: 'Workout', sentiment: 'positive' });
		const fruit = makeCategory({ id: 'food-cat', name: 'Fruit', sentiment: 'positive' });
		const activityItem = makeItem({ id: 'activity-item', categories: ['activity-cat'] });
		const foodItem = makeItem({ id: 'food-item', categories: ['food-cat', 'food-cat'] });
		const secondFoodItem = makeItem({ id: 'food-item-2', categories: ['food-cat'] });

		const categoriesById = buildTypedCategoriesById([workout], [fruit]);
		const categoriesByType = buildCategoriesByType([workout], [fruit]);
		const favoriteItemIdSet = buildFavoriteItemIdSet(['food-item', 'missing']);
		const itemCountsByCategoryId = buildItemCountsByCategoryId([activityItem], [foodItem, secondFoodItem]);

		expect(categoriesById.get('activity-cat')).toEqual({ ...workout, type: 'activity' });
		expect(categoriesById.get('food-cat')).toEqual({ ...fruit, type: 'food' });
		expect(categoriesByType.activity).toEqual([{ ...workout, type: 'activity' }]);
		expect(categoriesByType.food).toEqual([{ ...fruit, type: 'food' }]);
		expect(favoriteItemIdSet.has('food-item')).toBe(true);
		expect(itemCountsByCategoryId.get('activity-cat')).toBe(1);
		expect(itemCountsByCategoryId.get('food-cat')).toBe(2);
	});

	it('useLibraryIndexes exposes derived lookups from store slices', () => {
		const activityCategory = makeCategory({ id: 'activity-cat', name: 'Workout', sentiment: 'positive' });
		const foodCategory = makeCategory({ id: 'food-cat', name: 'Fruit', sentiment: 'positive' });
		const updatedFoodCategory = makeCategory({ id: 'food-cat-2', name: 'Vegetable', sentiment: 'neutral' });
		const activityItem = makeItem({ id: 'activity-item', name: 'Run', categories: ['activity-cat'] });
		const foodItem = makeItem({ id: 'food-item', name: 'Apple', categories: ['food-cat'] });
		const updatedFoodItem = makeItem({ id: 'food-item-2', name: 'Carrot', categories: ['food-cat-2'] });

		act(() => {
			importData(
				JSON.stringify(
					makeValidData({
						activityCategories: [activityCategory],
						foodCategories: [foodCategory],
						activityItems: [activityItem],
						foodItems: [foodItem],
						favoriteItems: ['food-item'],
					}),
				),
			);
		});

		const { result } = renderHook(() => useLibraryIndexes());

		expect(result.current.categoriesById.get('food-cat')?.name).toBe('Fruit');
		expect(result.current.categoriesByType.activity[0]?.name).toBe('Workout');
		expect(result.current.favoriteItemIdSet.has('food-item')).toBe(true);
		expect(result.current.itemCountsByCategoryId.get('food-cat')).toBe(1);

		act(() => {
			importData(
				JSON.stringify(
					makeValidData({
						foodCategories: [updatedFoodCategory],
						foodItems: [updatedFoodItem],
						favoriteItems: ['food-item-2'],
					}),
				),
			);
		});

		expect(result.current.categoriesById.get('food-cat')).toBeUndefined();
		expect(result.current.categoriesById.get('food-cat-2')?.name).toBe('Vegetable');
		expect(result.current.categoriesByType.food[0]?.name).toBe('Vegetable');
		expect(result.current.favoriteItemIdSet.has('food-item')).toBe(false);
		expect(result.current.favoriteItemIdSet.has('food-item-2')).toBe(true);
		expect(result.current.itemCountsByCategoryId.get('food-cat-2')).toBe(1);
	});
});
