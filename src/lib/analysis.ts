import type { Entry, TrackerData, EntryType, ActivityItem, FoodItem } from './types';

export interface DateRange {
	start: string;
	end: string;
}

export function getMonthRange(date: Date = new Date()): DateRange {
	const year = date.getFullYear();
	const month = date.getMonth();
	const start = new Date(year, month, 1);
	const end = new Date(year, month + 1, 0);

	return {
		start: start.toISOString().split('T')[0],
		end: end.toISOString().split('T')[0]
	};
}

export function getPreviousMonthRange(date: Date = new Date()): DateRange {
	const year = date.getMonth() === 0 ? date.getFullYear() - 1 : date.getFullYear();
	const month = date.getMonth() === 0 ? 11 : date.getMonth() - 1;
	const start = new Date(year, month, 1);
	const end = new Date(year, month + 1, 0);

	return {
		start: start.toISOString().split('T')[0],
		end: end.toISOString().split('T')[0]
	};
}

export function getWeekRange(date: Date = new Date()): DateRange {
	const day = date.getDay();
	const diff = date.getDate() - day + (day === 0 ? -6 : 1);
	const start = new Date(date);
	start.setDate(diff);
	const end = new Date(start);
	end.setDate(start.getDate() + 6);

	return {
		start: start.toISOString().split('T')[0],
		end: end.toISOString().split('T')[0]
	};
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

export function filterEntriesByCategory(
	entries: Entry[],
	category: string,
	data: TrackerData
): Entry[] {
	return entries.filter((entry) => {
		if (entry.categoryOverrides) {
			return entry.categoryOverrides.includes(category);
		}

		const items = entry.type === 'activity' ? data.activityItems : data.foodItems;
		const item = items.find((i) => i.id === entry.itemId);
		return item?.categories.includes(category) ?? false;
	});
}

export function countEntries(entries: Entry[]): number {
	return entries.length;
}

export function countEntriesByItem(entries: Entry[]): Map<string, number> {
	const counts = new Map<string, number>();
	entries.forEach((entry) => {
		counts.set(entry.itemId, (counts.get(entry.itemId) || 0) + 1);
	});
	return counts;
}

export function getEntryCategories(entry: Entry, data: TrackerData): string[] {
	if (entry.categoryOverrides) {
		return entry.categoryOverrides;
	}

	const items = entry.type === 'activity' ? data.activityItems : data.foodItems;
	const item = items.find((i) => i.id === entry.itemId);
	return item?.categories ?? [];
}

export function countEntriesByCategory(entries: Entry[], data: TrackerData): Map<string, number> {
	const counts = new Map<string, number>();

	entries.forEach((entry) => {
		const categories = getEntryCategories(entry, data);
		categories.forEach((category) => {
			counts.set(category, (counts.get(category) || 0) + 1);
		});
	});

	return counts;
}

export interface ComparisonResult {
	current: number;
	previous: number;
	difference: number;
	percentChange: number | null;
}

export function compareMonths(entries: Entry[], currentDate: Date = new Date()): ComparisonResult {
	const currentRange = getMonthRange(currentDate);
	const previousRange = getPreviousMonthRange(currentDate);

	const currentCount = countEntries(filterEntriesByDateRange(entries, currentRange));
	const previousCount = countEntries(filterEntriesByDateRange(entries, previousRange));

	const difference = currentCount - previousCount;
	const percentChange = previousCount === 0 ? null : ((difference / previousCount) * 100);

	return {
		current: currentCount,
		previous: previousCount,
		difference,
		percentChange
	};
}

export function compareMonthsForItem(
	entries: Entry[],
	itemId: string,
	currentDate: Date = new Date()
): ComparisonResult {
	const itemEntries = filterEntriesByItem(entries, itemId);
	return compareMonths(itemEntries, currentDate);
}

export function getItemTotals(
	entries: Entry[],
	items: (ActivityItem | FoodItem)[],
	range?: DateRange
): Array<{ item: ActivityItem | FoodItem; count: number }> {
	const filteredEntries = range ? filterEntriesByDateRange(entries, range) : entries;
	const counts = countEntriesByItem(filteredEntries);

	return items
		.map((item) => ({
			item,
			count: counts.get(item.id) || 0
		}))
		.filter((result) => result.count > 0)
		.sort((a, b) => b.count - a.count);
}

export function getCategoryTotals(
	entries: Entry[],
	data: TrackerData,
	range?: DateRange
): Array<{ category: string; count: number }> {
	const filteredEntries = range ? filterEntriesByDateRange(entries, range) : entries;
	const counts = countEntriesByCategory(filteredEntries, data);

	return Array.from(counts.entries())
		.map(([category, count]) => ({ category, count }))
		.sort((a, b) => b.count - a.count);
}

export function getEntriesGroupedByDate(entries: Entry[]): Map<string, Entry[]> {
	const grouped = new Map<string, Entry[]>();

	entries
		.slice()
		.sort((a, b) => b.date.localeCompare(a.date))
		.forEach((entry) => {
			const existing = grouped.get(entry.date) || [];
			grouped.set(entry.date, [...existing, entry]);
		});

	return grouped;
}

export function formatDate(dateString: string): string {
	const date = new Date(dateString + 'T00:00:00');
	return date.toLocaleDateString('en-US', {
		weekday: 'short',
		month: 'short',
		day: 'numeric'
	});
}

export function formatMonthYear(date: Date = new Date()): string {
	return date.toLocaleDateString('en-US', {
		month: 'long',
		year: 'numeric'
	});
}
