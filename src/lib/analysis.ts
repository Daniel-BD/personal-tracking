import type { Entry, TrackerData, EntryType, Item } from '@/shared/lib/types';
import { getItems } from '@/shared/lib/types';
import { formatDateLocal } from '@/shared/lib/date-utils';

// Re-export formatting utilities so existing consumers don't break
export { formatDateLocal, formatTime, formatDate, formatDateWithYear, formatMonthYear, formatWeekLabel } from '@/shared/lib/date-utils';

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
		start: formatDateLocal(start),
		end: formatDateLocal(end)
	};
}

export function getPreviousMonthRange(date: Date = new Date()): DateRange {
	const year = date.getMonth() === 0 ? date.getFullYear() - 1 : date.getFullYear();
	const month = date.getMonth() === 0 ? 11 : date.getMonth() - 1;
	const start = new Date(year, month, 1);
	const end = new Date(year, month + 1, 0);

	return {
		start: formatDateLocal(start),
		end: formatDateLocal(end)
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
		start: formatDateLocal(start),
		end: formatDateLocal(end)
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

export function countEntriesByItem(entries: Entry[]): Map<string, number> {
	const counts = new Map<string, number>();
	entries.forEach((entry) => {
		counts.set(entry.itemId, (counts.get(entry.itemId) || 0) + 1);
	});
	return counts;
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

export function countEntriesByCategory(entries: Entry[], data: TrackerData): Map<string, number> {
	const counts = new Map<string, number>();

	entries.forEach((entry) => {
		const categoryIds = getEntryCategoryIds(entry, data);
		categoryIds.forEach((categoryId) => {
			const categoryName = getCategoryNameById(categoryId, data);
			if (categoryName) {
				counts.set(categoryName, (counts.get(categoryName) || 0) + 1);
			}
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

	const currentCount = filterEntriesByDateRange(entries, currentRange).length;
	const previousCount = filterEntriesByDateRange(entries, previousRange).length;

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
	items: Item[],
	range?: DateRange
): Array<{ item: Item; count: number }> {
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

/**
 * Get the Monday of a given week
 */
function getWeekStart(date: Date): string {
	const d = new Date(date);
	const day = d.getDay();
	const diff = d.getDate() - day + (day === 0 ? -6 : 1);
	d.setDate(diff);
	return formatDateLocal(d);
}

/**
 * Group entries by week and return chart data points
 */
export function groupEntriesByWeek(entries: Entry[], range: DateRange | null): { date: string; value: number }[] {
	const weekCounts = new Map<string, number>();

	// If we have a range, generate all weeks in the range first
	if (range) {
		const start = new Date(range.start + 'T00:00:00');
		const end = new Date(range.end + 'T00:00:00');
		const current = new Date(start);

		while (current <= end) {
			const weekStart = getWeekStart(current);
			if (!weekCounts.has(weekStart)) {
				weekCounts.set(weekStart, 0);
			}
			current.setDate(current.getDate() + 7);
		}
	}

	// Count entries per week
	entries.forEach((entry) => {
		const entryDate = new Date(entry.date + 'T00:00:00');
		const weekStart = getWeekStart(entryDate);
		weekCounts.set(weekStart, (weekCounts.get(weekStart) || 0) + 1);
	});

	// Convert to sorted array
	return Array.from(weekCounts.entries())
		.sort((a, b) => a[0].localeCompare(b[0]))
		.map(([date, value]) => ({ date, value }));
}
