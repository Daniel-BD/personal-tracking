import type { Entry, TrackerData, EntryType } from './types';
import { getItems } from './types';

export function filterEntriesByType(entries: Entry[], type: EntryType): Entry[] {
	return entries.filter((entry) => entry.type === type);
}

export function filterEntriesByItems(entries: Entry[], itemIds: string[]): Entry[] {
	if (itemIds.length === 0) return entries;
	return entries.filter((entry) => itemIds.includes(entry.itemId));
}

export function filterEntriesByCategory(
	entries: Entry[],
	categoryId: string,
	data: TrackerData
): Entry[] {
	return entries.filter((entry) => {
		return getEntryCategoryIds(entry, data).includes(categoryId);
	});
}

export function filterEntriesByCategories(
	entries: Entry[],
	categoryIds: string[],
	data: TrackerData
): Entry[] {
	if (categoryIds.length === 0) return entries;
	return entries.filter((entry) => {
		const entryCatIds = getEntryCategoryIds(entry, data);
		return categoryIds.some((catId) => entryCatIds.includes(catId));
	});
}

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

export function getEntriesGroupedByDate(entries: Entry[]): Map<string, Entry[]> {
	const grouped = new Map<string, Entry[]>();

	// Group entries by date
	entries.forEach((entry) => {
		const existing = grouped.get(entry.date) || [];
		grouped.set(entry.date, [...existing, entry]);
	});

	// Sort entries within each day by time (latest first)
	// Entries without time come after entries with time
	for (const [date, dateEntries] of grouped) {
		dateEntries.sort((a, b) => {
			if (a.time && b.time) {
				return b.time.localeCompare(a.time);
			}
			if (a.time && !b.time) return -1;
			if (!a.time && b.time) return 1;
			return 0;
		});
	}

	// Sort date keys (newest first) and rebuild the map
	const sortedDates = [...grouped.keys()].sort((a, b) => b.localeCompare(a));
	const sortedGrouped = new Map<string, Entry[]>();
	for (const date of sortedDates) {
		sortedGrouped.set(date, grouped.get(date)!);
	}

	return sortedGrouped;
}

export function formatDate(dateString: string): string {
	const date = new Date(dateString + 'T00:00:00');
	return date.toLocaleDateString('en-US', {
		weekday: 'short',
		month: 'short',
		day: 'numeric'
	});
}
