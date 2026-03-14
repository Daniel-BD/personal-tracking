import { useMemo } from 'react';
import {
	useActivityCategories,
	useActivityItems,
	useFavoriteItems,
	useFoodCategories,
	useFoodItems,
} from '@/shared/store/hooks';
import {
	buildCategoriesByType,
	buildFavoriteItemIdSet,
	buildItemCountsByCategoryId,
	buildTypedCategoriesById,
} from '../utils/library-indexes';
import type {
	CategoriesByType,
	FavoriteItemIdSet,
	ItemCountsByCategoryId,
	TypedCategoryById,
} from '../utils/library-indexes';

interface LibraryIndexes {
	categoriesById: TypedCategoryById;
	categoriesByType: CategoriesByType;
	favoriteItemIdSet: FavoriteItemIdSet;
	itemCountsByCategoryId: ItemCountsByCategoryId;
}

export function useLibraryIndexes(): LibraryIndexes {
	const activityItems = useActivityItems();
	const foodItems = useFoodItems();
	const activityCategories = useActivityCategories();
	const foodCategories = useFoodCategories();
	const favoriteItemIds = useFavoriteItems();

	const categoriesById = useMemo(
		() => buildTypedCategoriesById(activityCategories, foodCategories),
		[activityCategories, foodCategories],
	);
	const categoriesByType = useMemo(
		() => buildCategoriesByType(activityCategories, foodCategories),
		[activityCategories, foodCategories],
	);
	const favoriteItemIdSet = useMemo(() => buildFavoriteItemIdSet(favoriteItemIds), [favoriteItemIds]);
	const itemCountsByCategoryId = useMemo(
		() => buildItemCountsByCategoryId(activityItems, foodItems),
		[activityItems, foodItems],
	);

	return {
		categoriesById,
		categoriesByType,
		favoriteItemIdSet,
		itemCountsByCategoryId,
	};
}
