import { useMemo } from 'react';
import {
	useActivityCategories,
	useActivityItems,
	useEntries,
	useFoodCategories,
	useFoodItems,
} from '@/shared/store/hooks';
import {
	buildCategoryById,
	buildEntriesByCategory,
	buildEntriesByItem,
	buildEntriesByWeek,
	buildItemById,
	buildItemCategoriesByItemId,
	buildItemCategoryIdsByItemId,
} from '../utils/tracking-indexes';
import type {
	CategoryById,
	EntriesByCategory,
	EntriesByItem,
	EntriesByWeek,
	ItemById,
	ItemCategoriesByItemId,
	ItemCategoryIdsByItemId,
} from '../utils/tracking-indexes';

export function useEntriesByItem(): EntriesByItem {
	const entries = useEntries();
	return useMemo(() => buildEntriesByItem(entries), [entries]);
}

export function useEntriesByWeek(): EntriesByWeek {
	const entries = useEntries();
	return useMemo(() => buildEntriesByWeek(entries), [entries]);
}

export function useItemById(): ItemById {
	const activityItems = useActivityItems();
	const foodItems = useFoodItems();
	return useMemo(() => buildItemById(activityItems, foodItems), [activityItems, foodItems]);
}

export function useCategoryById(): CategoryById {
	const activityCategories = useActivityCategories();
	const foodCategories = useFoodCategories();
	return useMemo(() => buildCategoryById(activityCategories, foodCategories), [activityCategories, foodCategories]);
}

export function useItemCategoryIdsByItemId(): ItemCategoryIdsByItemId {
	const activityItems = useActivityItems();
	const foodItems = useFoodItems();
	return useMemo(() => buildItemCategoryIdsByItemId(activityItems, foodItems), [activityItems, foodItems]);
}

export function useEntriesByCategory(): EntriesByCategory {
	const entries = useEntries();
	const itemCategoryIdsByItemId = useItemCategoryIdsByItemId();
	return useMemo(() => buildEntriesByCategory(entries, itemCategoryIdsByItemId), [entries, itemCategoryIdsByItemId]);
}

export function useItemCategoriesByItemId(): ItemCategoriesByItemId {
	const itemCategoryIdsByItemId = useItemCategoryIdsByItemId();
	const categoryById = useCategoryById();
	return useMemo(
		() => buildItemCategoriesByItemId(itemCategoryIdsByItemId, categoryById),
		[itemCategoryIdsByItemId, categoryById],
	);
}
