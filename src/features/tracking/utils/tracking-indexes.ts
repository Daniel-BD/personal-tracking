import type { Category, Entry, Item } from '@/shared/lib/types';
import { getISOWeekAndYear } from '@/shared/lib/date-utils';

export type EntriesByItem = Map<string, Entry[]>;
export type EntriesByCategory = Map<string, Entry[]>;
export type EntriesByWeek = Map<string, Entry[]>;
export type ItemById = Map<string, Item>;
export type CategoryById = Map<string, Category>;
export type ItemCategoryIdsByItemId = Map<string, string[]>;
export type ItemCategoriesByItemId = Map<string, Category[]>;

function getWeekKey(dateString: string): string {
	const { year, week } = getISOWeekAndYear(new Date(`${dateString}T00:00:00`));
	return `${year}-W${String(week).padStart(2, '0')}`;
}

export function buildEntriesByItem(entries: Entry[]): EntriesByItem {
	const index: EntriesByItem = new Map();

	for (const entry of entries) {
		const bucket = index.get(entry.itemId);
		if (bucket) {
			bucket.push(entry);
			continue;
		}
		index.set(entry.itemId, [entry]);
	}

	return index;
}

export function buildEntriesByWeek(entries: Entry[]): EntriesByWeek {
	const index: EntriesByWeek = new Map();

	for (const entry of entries) {
		const weekKey = getWeekKey(entry.date);
		const bucket = index.get(weekKey);
		if (bucket) {
			bucket.push(entry);
			continue;
		}
		index.set(weekKey, [entry]);
	}

	return index;
}

export function buildItemById(activityItems: Item[], foodItems: Item[]): ItemById {
	return new Map([...activityItems, ...foodItems].map((item) => [item.id, item]));
}

export function buildCategoryById(activityCategories: Category[], foodCategories: Category[]): CategoryById {
	return new Map([...activityCategories, ...foodCategories].map((category) => [category.id, category]));
}

export function buildItemCategoryIdsByItemId(activityItems: Item[], foodItems: Item[]): ItemCategoryIdsByItemId {
	return new Map([...activityItems, ...foodItems].map((item) => [item.id, item.categories]));
}

export function buildEntriesByCategory(
	entries: Entry[],
	itemCategoryIdsByItemId: ItemCategoryIdsByItemId,
): EntriesByCategory {
	const index: EntriesByCategory = new Map();

	for (const entry of entries) {
		const categoryIds = entry.categoryOverrides ?? itemCategoryIdsByItemId.get(entry.itemId) ?? [];
		for (const categoryId of categoryIds) {
			const bucket = index.get(categoryId);
			if (bucket) {
				bucket.push(entry);
				continue;
			}
			index.set(categoryId, [entry]);
		}
	}

	return index;
}

export function buildItemCategoriesByItemId(
	itemCategoryIdsByItemId: ItemCategoryIdsByItemId,
	categoryById: CategoryById,
): ItemCategoriesByItemId {
	const index: ItemCategoriesByItemId = new Map();

	for (const [itemId, categoryIds] of itemCategoryIdsByItemId) {
		index.set(
			itemId,
			categoryIds
				.map((categoryId) => categoryById.get(categoryId))
				.filter((category): category is Category => !!category),
		);
	}

	return index;
}

export function getEntryCategoryIdsFromIndex(entry: Entry, itemCategoryIdsByItemId: ItemCategoryIdsByItemId): string[] {
	return entry.categoryOverrides ?? itemCategoryIdsByItemId.get(entry.itemId) ?? [];
}
