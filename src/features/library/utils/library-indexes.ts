import type { Category, EntryType, Item } from '@/shared/lib/types';
import { buildCategoryById } from '@/features/tracking';
import type { TypedCategory, TypedItem } from '../types';

export type CategoriesByType = Record<EntryType, TypedCategory[]>;
export type TypedCategoryById = Map<string, TypedCategory>;
export type FavoriteItemIdSet = Set<string>;
export type ItemCountsByCategoryId = Map<string, number>;

function compareByName<T extends { name: string }>(left: T, right: T): number {
	return left.name.localeCompare(right.name);
}

export function buildTypedItems(activityItems: Item[], foodItems: Item[]): TypedItem[] {
	return [
		...activityItems.map((item) => ({ ...item, type: 'activity' as const })),
		...foodItems.map((item) => ({ ...item, type: 'food' as const })),
	].sort(compareByName);
}

export function buildTypedCategories(activityCategories: Category[], foodCategories: Category[]): TypedCategory[] {
	return [
		...activityCategories.map((category) => ({ ...category, type: 'activity' as const })),
		...foodCategories.map((category) => ({ ...category, type: 'food' as const })),
	].sort(compareByName);
}

export function buildTypedCategoriesById(
	activityCategories: Category[],
	foodCategories: Category[],
): TypedCategoryById {
	const categoryById = buildCategoryById(activityCategories, foodCategories);
	const activityCategoryIds = new Set(activityCategories.map((category) => category.id));

	return new Map(
		Array.from(categoryById.values()).map((category) => [
			category.id,
			{
				...category,
				type: activityCategoryIds.has(category.id) ? 'activity' : 'food',
			},
		]),
	);
}

export function buildCategoriesByType(activityCategories: Category[], foodCategories: Category[]): CategoriesByType {
	return {
		activity: activityCategories.map((category) => ({ ...category, type: 'activity' as const })).sort(compareByName),
		food: foodCategories.map((category) => ({ ...category, type: 'food' as const })).sort(compareByName),
	};
}

export function buildFavoriteItemIdSet(favoriteItemIds: string[]): FavoriteItemIdSet {
	return new Set(favoriteItemIds);
}

export function buildItemCountsByCategoryId(activityItems: Item[], foodItems: Item[]): ItemCountsByCategoryId {
	const counts: ItemCountsByCategoryId = new Map();

	for (const item of [...activityItems, ...foodItems]) {
		for (const categoryId of new Set(item.categories)) {
			counts.set(categoryId, (counts.get(categoryId) ?? 0) + 1);
		}
	}

	return counts;
}
