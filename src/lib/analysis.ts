import type { Entry, TrackerData, EntryType, ActivityItem, FoodItem } from './types';

export interface DateRange {
	start: string;
	end: string;
}

// Time range types for analytics
export type TimeRangeType = '7d' | '30d' | '90d' | 'all' | 'custom';

export interface TimeRange {
	type: TimeRangeType;
	startDate?: string;
	endDate?: string;
}

export interface ChartDataPoint {
	date: string;
	value: number;
}

export interface ChartSeries {
	id: string;
	label: string;
	points: ChartDataPoint[];
}

export interface Insight {
	id: string;
	text: string;
	target?: {
		type: 'activity' | 'food';
		entityType: 'item' | 'category';
		entityId: string;
	};
}

export interface RankedItem {
	id: string;
	label: string;
	count: number;
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
	categoryId: string,
	data: TrackerData
): Entry[] {
	return entries.filter((entry) => {
		if (entry.categoryOverrides) {
			return entry.categoryOverrides.includes(categoryId);
		}

		const items = entry.type === 'activity' ? data.activityItems : data.foodItems;
		const item = items.find((i) => i.id === entry.itemId);
		return item?.categories.includes(categoryId) ?? false;
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

export function getEntryCategoryIds(entry: Entry, data: TrackerData): string[] {
	if (entry.categoryOverrides) {
		return entry.categoryOverrides;
	}

	const items = entry.type === 'activity' ? data.activityItems : data.foodItems;
	const item = items.find((i) => i.id === entry.itemId);
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
			// Prepend to show most recently logged entries first within each day
			grouped.set(entry.date, [entry, ...existing]);
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

// ============================================
// Analytics Utilities for Stats Page
// ============================================

/**
 * Convert a TimeRange to a DateRange
 */
export function getDateRangeFromTimeRange(timeRange: TimeRange): DateRange | null {
	const today = new Date();
	const todayStr = today.toISOString().split('T')[0];

	switch (timeRange.type) {
		case '7d': {
			const start = new Date(today);
			start.setDate(start.getDate() - 6);
			return {
				start: start.toISOString().split('T')[0],
				end: todayStr
			};
		}
		case '30d': {
			const start = new Date(today);
			start.setDate(start.getDate() - 29);
			return {
				start: start.toISOString().split('T')[0],
				end: todayStr
			};
		}
		case '90d': {
			const start = new Date(today);
			start.setDate(start.getDate() - 89);
			return {
				start: start.toISOString().split('T')[0],
				end: todayStr
			};
		}
		case 'custom': {
			if (timeRange.startDate && timeRange.endDate) {
				return {
					start: timeRange.startDate,
					end: timeRange.endDate
				};
			}
			return null;
		}
		case 'all':
		default:
			return null;
	}
}

/**
 * Get the previous period of equal length for comparison
 */
export function getPreviousPeriodRange(timeRange: TimeRange): DateRange | null {
	const currentRange = getDateRangeFromTimeRange(timeRange);
	if (!currentRange) return null;

	const start = new Date(currentRange.start + 'T00:00:00');
	const end = new Date(currentRange.end + 'T00:00:00');
	const daysDiff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

	const prevEnd = new Date(start);
	prevEnd.setDate(prevEnd.getDate() - 1);
	const prevStart = new Date(prevEnd);
	prevStart.setDate(prevStart.getDate() - daysDiff + 1);

	return {
		start: prevStart.toISOString().split('T')[0],
		end: prevEnd.toISOString().split('T')[0]
	};
}

/**
 * Get the Monday of a given week
 */
function getWeekStart(date: Date): string {
	const d = new Date(date);
	const day = d.getDay();
	const diff = d.getDate() - day + (day === 0 ? -6 : 1);
	d.setDate(diff);
	return d.toISOString().split('T')[0];
}

/**
 * Group entries by week and return chart data points
 */
export function groupEntriesByWeek(entries: Entry[], range: DateRange | null): ChartDataPoint[] {
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

/**
 * Get frequency chart data with separate series for activities and food
 */
export function getFrequencyChartData(
	entries: Entry[],
	timeRange: TimeRange
): { activities: ChartSeries; food: ChartSeries } {
	const range = getDateRangeFromTimeRange(timeRange);
	const filteredEntries = range ? filterEntriesByDateRange(entries, range) : entries;

	const activityEntries = filterEntriesByType(filteredEntries, 'activity');
	const foodEntries = filterEntriesByType(filteredEntries, 'food');

	return {
		activities: {
			id: 'activities',
			label: 'Activities',
			points: groupEntriesByWeek(activityEntries, range)
		},
		food: {
			id: 'food',
			label: 'Food',
			points: groupEntriesByWeek(foodEntries, range)
		}
	};
}

/**
 * Get top logged items for a given type
 */
export function selectTopEntities(
	entries: Entry[],
	items: (ActivityItem | FoodItem)[],
	type: EntryType,
	limit: number = 5
): RankedItem[] {
	const typeEntries = filterEntriesByType(entries, type);
	const counts = countEntriesByItem(typeEntries);

	return items
		.map((item) => ({
			id: item.id,
			label: item.name,
			count: counts.get(item.id) || 0
		}))
		.filter((item) => item.count > 0)
		.sort((a, b) => b.count - a.count)
		.slice(0, limit);
}

/**
 * Compare periods and generate insights
 */
export function selectInsights(
	entries: Entry[],
	data: TrackerData,
	timeRange: TimeRange,
	threshold: number = 0.1
): Insight[] {
	const insights: Insight[] = [];
	const currentRange = getDateRangeFromTimeRange(timeRange);
	const previousRange = getPreviousPeriodRange(timeRange);

	// Can't generate insights for "all time" or without valid ranges
	if (!currentRange || !previousRange) {
		return [];
	}

	const currentEntries = filterEntriesByDateRange(entries, currentRange);
	const previousEntries = filterEntriesByDateRange(entries, previousRange);

	// Overall activity change
	const currentActivities = filterEntriesByType(currentEntries, 'activity').length;
	const previousActivities = filterEntriesByType(previousEntries, 'activity').length;

	if (previousActivities > 0) {
		const activityChange = (currentActivities - previousActivities) / previousActivities;
		if (Math.abs(activityChange) >= threshold) {
			const direction = activityChange > 0 ? 'up' : 'down';
			const percent = Math.abs(Math.round(activityChange * 100));
			insights.push({
				id: 'activity-overall',
				text: `Activity logging is ${direction} ${percent}% compared to the previous period`
			});
		}
	} else if (currentActivities > 0) {
		insights.push({
			id: 'activity-new',
			text: `You started logging activities this period (${currentActivities} entries)`
		});
	}

	// Overall food change
	const currentFood = filterEntriesByType(currentEntries, 'food').length;
	const previousFood = filterEntriesByType(previousEntries, 'food').length;

	if (previousFood > 0) {
		const foodChange = (currentFood - previousFood) / previousFood;
		if (Math.abs(foodChange) >= threshold) {
			const direction = foodChange > 0 ? 'up' : 'down';
			const percent = Math.abs(Math.round(foodChange * 100));
			insights.push({
				id: 'food-overall',
				text: `Food logging is ${direction} ${percent}% compared to the previous period`
			});
		}
	} else if (currentFood > 0) {
		insights.push({
			id: 'food-new',
			text: `You started logging food this period (${currentFood} entries)`
		});
	}

	// Find biggest item changes (activity items)
	const currentActivityCounts = countEntriesByItem(filterEntriesByType(currentEntries, 'activity'));
	const previousActivityCounts = countEntriesByItem(
		filterEntriesByType(previousEntries, 'activity')
	);

	for (const item of data.activityItems) {
		const current = currentActivityCounts.get(item.id) || 0;
		const previous = previousActivityCounts.get(item.id) || 0;

		if (previous > 0 && current > 0) {
			const change = (current - previous) / previous;
			if (Math.abs(change) >= threshold * 2) {
				// Higher threshold for individual items
				const direction = change > 0 ? 'up' : 'down';
				const percent = Math.abs(Math.round(change * 100));
				insights.push({
					id: `activity-item-${item.id}`,
					text: `"${item.name}" is ${direction} ${percent}% (${previous} → ${current})`,
					target: {
						type: 'activity',
						entityType: 'item',
						entityId: item.id
					}
				});
			}
		} else if (previous === 0 && current >= 3) {
			// New item with significant usage
			insights.push({
				id: `activity-item-new-${item.id}`,
				text: `New activity: "${item.name}" logged ${current} times`,
				target: {
					type: 'activity',
					entityType: 'item',
					entityId: item.id
				}
			});
		}
	}

	// Find biggest item changes (food items)
	const currentFoodCounts = countEntriesByItem(filterEntriesByType(currentEntries, 'food'));
	const previousFoodCounts = countEntriesByItem(filterEntriesByType(previousEntries, 'food'));

	for (const item of data.foodItems) {
		const current = currentFoodCounts.get(item.id) || 0;
		const previous = previousFoodCounts.get(item.id) || 0;

		if (previous > 0 && current > 0) {
			const change = (current - previous) / previous;
			if (Math.abs(change) >= threshold * 2) {
				const direction = change > 0 ? 'up' : 'down';
				const percent = Math.abs(Math.round(change * 100));
				insights.push({
					id: `food-item-${item.id}`,
					text: `"${item.name}" is ${direction} ${percent}% (${previous} → ${current})`,
					target: {
						type: 'food',
						entityType: 'item',
						entityId: item.id
					}
				});
			}
		} else if (previous === 0 && current >= 3) {
			insights.push({
				id: `food-item-new-${item.id}`,
				text: `New food: "${item.name}" logged ${current} times`,
				target: {
					type: 'food',
					entityType: 'item',
					entityId: item.id
				}
			});
		}
	}

	// Sort by significance (overall changes first, then by absolute change)
	insights.sort((a, b) => {
		// Overall changes come first
		if (a.id.includes('overall') && !b.id.includes('overall')) return -1;
		if (!a.id.includes('overall') && b.id.includes('overall')) return 1;
		return 0;
	});

	// Return top 3
	return insights.slice(0, 3);
}

/**
 * Format a week start date for display
 */
export function formatWeekLabel(dateString: string): string {
	const date = new Date(dateString + 'T00:00:00');
	return date.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric'
	});
}

/**
 * Get display label for a time range
 */
export function getTimeRangeLabel(timeRange: TimeRange): string {
	switch (timeRange.type) {
		case '7d':
			return 'Last 7 days';
		case '30d':
			return 'Last 30 days';
		case '90d':
			return 'Last 90 days';
		case 'all':
			return 'All time';
		case 'custom':
			if (timeRange.startDate && timeRange.endDate) {
				return `${formatDate(timeRange.startDate)} - ${formatDate(timeRange.endDate)}`;
			}
			return 'Custom range';
		default:
			return '';
	}
}

// ============================================
// Part 2: Individual Item/Category Analytics
// ============================================

export type Grouping = 'daily' | 'weekly' | 'monthly';
export type ChartType = 'bar' | 'line';
export type RollingAverageWindow = 'off' | '7d' | '30d';

export interface EntityRef {
	type: EntryType;
	entityType: 'item' | 'category';
	id: string;
}

export interface EntityStats {
	total: number;
	averagePerWeek: number;
	allTimeTotal: number;
}

/**
 * Get entries for a specific entity (item or category)
 */
export function getEntriesForEntity(
	entries: Entry[],
	entity: EntityRef,
	data: TrackerData
): Entry[] {
	const typeFiltered = filterEntriesByType(entries, entity.type);

	if (entity.entityType === 'item') {
		return filterEntriesByItem(typeFiltered, entity.id);
	} else {
		return filterEntriesByCategory(typeFiltered, entity.id, data);
	}
}

/**
 * Get entity name for display
 */
export function getEntityName(entity: EntityRef, data: TrackerData): string {
	if (entity.entityType === 'item') {
		const items = entity.type === 'activity' ? data.activityItems : data.foodItems;
		const item = items.find((i) => i.id === entity.id);
		return item?.name || 'Unknown';
	} else {
		return getCategoryNameById(entity.id, data) || 'Unknown';
	}
}

/**
 * Group entries by day and return chart data points
 */
export function groupEntriesByDay(entries: Entry[], range: DateRange | null): ChartDataPoint[] {
	const dayCounts = new Map<string, number>();

	// If we have a range, generate all days in the range first
	if (range) {
		const start = new Date(range.start + 'T00:00:00');
		const end = new Date(range.end + 'T00:00:00');
		const current = new Date(start);

		while (current <= end) {
			const dayStr = current.toISOString().split('T')[0];
			dayCounts.set(dayStr, 0);
			current.setDate(current.getDate() + 1);
		}
	}

	// Count entries per day
	entries.forEach((entry) => {
		dayCounts.set(entry.date, (dayCounts.get(entry.date) || 0) + 1);
	});

	// Convert to sorted array
	return Array.from(dayCounts.entries())
		.sort((a, b) => a[0].localeCompare(b[0]))
		.map(([date, value]) => ({ date, value }));
}

/**
 * Get the first day of a month
 */
function getMonthStart(date: Date): string {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
}

/**
 * Group entries by month and return chart data points
 */
export function groupEntriesByMonth(entries: Entry[], range: DateRange | null): ChartDataPoint[] {
	const monthCounts = new Map<string, number>();

	// If we have a range, generate all months in the range first
	if (range) {
		const start = new Date(range.start + 'T00:00:00');
		const end = new Date(range.end + 'T00:00:00');
		const current = new Date(start.getFullYear(), start.getMonth(), 1);

		while (current <= end) {
			const monthStart = getMonthStart(current);
			if (!monthCounts.has(monthStart)) {
				monthCounts.set(monthStart, 0);
			}
			current.setMonth(current.getMonth() + 1);
		}
	}

	// Count entries per month
	entries.forEach((entry) => {
		const entryDate = new Date(entry.date + 'T00:00:00');
		const monthStart = getMonthStart(entryDate);
		monthCounts.set(monthStart, (monthCounts.get(monthStart) || 0) + 1);
	});

	// Convert to sorted array
	return Array.from(monthCounts.entries())
		.sort((a, b) => a[0].localeCompare(b[0]))
		.map(([date, value]) => ({ date, value }));
}

/**
 * Get time series data for a specific entity
 */
export function selectTimeSeries(
	entries: Entry[],
	entity: EntityRef,
	data: TrackerData,
	timeRange: TimeRange,
	grouping: Grouping = 'weekly'
): ChartSeries {
	const range = getDateRangeFromTimeRange(timeRange);
	const entityEntries = getEntriesForEntity(entries, entity, data);
	const filteredEntries = range ? filterEntriesByDateRange(entityEntries, range) : entityEntries;
	const entityName = getEntityName(entity, data);

	let points: ChartDataPoint[];
	switch (grouping) {
		case 'daily':
			points = groupEntriesByDay(filteredEntries, range);
			break;
		case 'monthly':
			points = groupEntriesByMonth(filteredEntries, range);
			break;
		case 'weekly':
		default:
			points = groupEntriesByWeek(filteredEntries, range);
			break;
	}

	return {
		id: `${entity.type}-${entity.entityType}-${entity.id}`,
		label: entityName,
		points
	};
}

/**
 * Get summary statistics for an entity
 */
export function selectStats(
	entries: Entry[],
	entity: EntityRef,
	data: TrackerData,
	timeRange: TimeRange
): EntityStats {
	const range = getDateRangeFromTimeRange(timeRange);
	const entityEntries = getEntriesForEntity(entries, entity, data);
	const filteredEntries = range ? filterEntriesByDateRange(entityEntries, range) : entityEntries;

	const total = filteredEntries.length;
	const allTimeTotal = entityEntries.length;

	// Calculate average per week
	let weeks = 1;
	if (range) {
		const start = new Date(range.start + 'T00:00:00');
		const end = new Date(range.end + 'T00:00:00');
		const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
		weeks = Math.max(1, days / 7);
	} else if (entityEntries.length > 0) {
		// For "all time", use the span of actual entries
		const dates = entityEntries.map((e) => e.date).sort();
		const first = new Date(dates[0] + 'T00:00:00');
		const last = new Date(dates[dates.length - 1] + 'T00:00:00');
		const days = Math.floor((last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24)) + 1;
		weeks = Math.max(1, days / 7);
	}

	const averagePerWeek = Math.round((total / weeks) * 10) / 10;

	return {
		total,
		averagePerWeek,
		allTimeTotal
	};
}

/**
 * Convert a time series to cumulative values
 */
export function selectCumulativeSeries(series: ChartSeries): ChartSeries {
	let cumulative = 0;
	const cumulativePoints = series.points.map((point) => {
		cumulative += point.value;
		return { date: point.date, value: cumulative };
	});

	return {
		id: series.id + '-cumulative',
		label: series.label + ' (Cumulative)',
		points: cumulativePoints
	};
}

/**
 * Calculate rolling average for a time series
 */
export function selectRollingAverage(
	series: ChartSeries,
	window: RollingAverageWindow
): ChartSeries {
	if (window === 'off') {
		return series;
	}

	const windowDays = window === '7d' ? 7 : 30;
	const points = series.points;

	// For weekly/monthly grouped data, we need to adjust the window
	// Calculate average based on surrounding data points
	const windowSize = window === '7d' ? 1 : 4; // 1 week or ~4 weeks for monthly

	const smoothedPoints = points.map((point, index) => {
		const start = Math.max(0, index - windowSize);
		const end = Math.min(points.length - 1, index + windowSize);
		let sum = 0;
		let count = 0;

		for (let i = start; i <= end; i++) {
			sum += points[i].value;
			count++;
		}

		return {
			date: point.date,
			value: Math.round((sum / count) * 10) / 10
		};
	});

	return {
		id: series.id + '-rolling',
		label: `${series.label} (${windowDays}d avg)`,
		points: smoothedPoints
	};
}

/**
 * Format date label based on grouping
 */
export function formatDateLabel(dateString: string, grouping: Grouping): string {
	const date = new Date(dateString + 'T00:00:00');

	switch (grouping) {
		case 'daily':
			return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
		case 'monthly':
			return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
		case 'weekly':
		default:
			return formatWeekLabel(dateString);
	}
}

/**
 * Get all entities of a given type for comparison selection
 */
export function getAvailableEntities(
	data: TrackerData,
	type: EntryType,
	excludeId?: string
): Array<{ ref: EntityRef; name: string }> {
	const items = type === 'activity' ? data.activityItems : data.foodItems;
	const categories = type === 'activity' ? data.activityCategories : data.foodCategories;

	const result: Array<{ ref: EntityRef; name: string }> = [];

	// Add items
	items.forEach((item) => {
		if (item.id !== excludeId) {
			result.push({
				ref: { type, entityType: 'item', id: item.id },
				name: item.name
			});
		}
	});

	// Add categories
	categories.forEach((category) => {
		if (category.id !== excludeId) {
			result.push({
				ref: { type, entityType: 'category', id: category.id },
				name: `[Category] ${category.name}`
			});
		}
	});

	return result.sort((a, b) => a.name.localeCompare(b.name));
}
