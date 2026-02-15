import type { Entry, TrackerData, EntryType } from '@/shared/lib/types';
import { getEntryCategoryIds } from './category-utils';

export interface DateRange {
	start: string;
	end: string;
}

export function filterEntriesByDateRange(entries: Entry[], range: DateRange): Entry[] {
	return entries.filter((entry) => entry.date >= range.start && entry.date <= range.end);
}

export function filterEntriesByType(entries: Entry[], type: EntryType): Entry[] {
	return entries.filter((entry) => entry.type === type);
}

export function filterEntriesByItem(entries: Entry[], itemId: string): Entry[] {
	return entries.filter((entry) => entry.itemId === itemId);
}

export function filterEntriesByItems(entries: Entry[], itemIds: string[]): Entry[] {
	if (itemIds.length === 0) return entries;
	return entries.filter((entry) => itemIds.includes(entry.itemId));
}

export function filterEntriesByCategory(entries: Entry[], categoryId: string, data: TrackerData): Entry[] {
	return entries.filter((entry) => {
		return getEntryCategoryIds(entry, data).includes(categoryId);
	});
}

export function filterEntriesByCategories(entries: Entry[], categoryIds: string[], data: TrackerData): Entry[] {
	if (categoryIds.length === 0) return entries;
	return entries.filter((entry) => {
		const entryCatIds = getEntryCategoryIds(entry, data);
		return categoryIds.some((catId) => entryCatIds.includes(catId));
	});
}
