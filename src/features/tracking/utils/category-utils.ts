import type { Entry, TrackerData, Category } from '@/shared/lib/types';
import { getItems } from '@/shared/lib/types';

export function getEntryCategoryIds(entry: Entry, data: TrackerData): string[] {
	if (entry.categoryOverrides) {
		return entry.categoryOverrides;
	}

	const item = getItems(data, entry.type).find((i) => i.id === entry.itemId);
	return item?.categories ?? [];
}

export function getCategoryNameById(categoryId: string, data: TrackerData): string {
	const activityCat = data.activityCategories.find((c) => c.id === categoryId);
	if (activityCat) return activityCat.name;
	const foodCat = data.foodCategories.find((c) => c.id === categoryId);
	if (foodCat) return foodCat.name;
	return '';
}

export function getEntryCategoryNames(entry: Entry, data: TrackerData): string[] {
	const categoryIds = getEntryCategoryIds(entry, data);
	return categoryIds.map((id) => getCategoryNameById(id, data)).filter(Boolean);
}

export function getCategorySentimentCounts(
	categoryIds: string[],
	categories: Category[]
): { positive: number; limit: number } {
	const categoryMap = new Map(categories.map((c) => [c.id, c.sentiment]));
	let positive = 0;
	let limit = 0;
	for (const id of categoryIds) {
		const sentiment = categoryMap.get(id);
		if (sentiment === 'positive') positive++;
		else if (sentiment === 'limit') limit++;
	}
	return { positive, limit };
}
