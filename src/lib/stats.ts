import type { Entry, TrackerData } from './types';
import { getCategories } from './types';
import { getCategoryNameById, getEntryCategoryIds, filterEntriesByType, formatWeekLabel as formatWeekLabelFromString } from './analysis';

export type PeriodType = 'weekly' | 'monthly';

/**
 * Get the ISO week number and year for a date
 */
function getISOWeek(date: Date): { year: number; week: number } {
	const d = new Date(date);
	d.setHours(0, 0, 0, 0);
	d.setDate(d.getDate() + 4 - (d.getDay() || 7));
	const yearStart = new Date(d.getFullYear(), 0, 1);
	const weekNumber = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
	return { year: d.getFullYear(), week: weekNumber };
}

/**
 * Get the Monday of a given ISO week
 */
export function getWeekStartDate(year: number, week: number): Date {
	const simple = new Date(year, 0, 1 + (week - 1) * 7);
	const dow = simple.getDay();
	const ISOweekStart = simple;
	if (dow <= 4) {
		ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
	} else {
		ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
	}
	return ISOweekStart;
}

/**
 * Format week key as "YYYY-W##"
 */
function getWeekKey(date: Date): string {
	const { year, week } = getISOWeek(date);
	return `${year}-W${String(week).padStart(2, '0')}`;
}

/**
 * Get last N weeks of data (default 8)
 */
export function getLastNWeeks(count: number = 8): Array<{ key: string; start: Date; end: Date }> {
	const weeks: Array<{ key: string; start: Date; end: Date }> = [];
	const today = new Date();

	for (let i = count - 1; i >= 0; i--) {
		const date = new Date(today);
		date.setDate(date.getDate() - i * 7);
		const key = getWeekKey(date);
		const start = getWeekStartDate(date.getFullYear(), getISOWeek(date).week);
		const end = new Date(start);
		end.setDate(end.getDate() + 6);

		// Check if we already have this week
		if (!weeks.find((w) => w.key === key)) {
			weeks.push({ key, start, end });
		}
	}

	return weeks;
}

/**
 * Check if an entry's date falls within a week
 */
function isEntryInWeek(entry: Entry, weekStart: Date, weekEnd: Date): boolean {
	const entryDate = new Date(entry.date + 'T00:00:00');
	return entryDate >= weekStart && entryDate <= weekEnd;
}

/**
 * Category data for a single week
 */
export interface WeeklyCategoryData {
	categoryId: string;
	categoryName: string;
	sentiment: 'positive' | 'neutral' | 'limit';
	count: number;
	color?: string;
}

/**
 * Weekly breakdown with sentiment distribution
 */
export interface WeeklyData {
	weekKey: string;
	start: Date;
	end: Date;
	entries: Entry[];
	totalCount: number;
	categories: WeeklyCategoryData[];
	sentimentCounts: {
		positive: number;
		neutral: number;
		limit: number;
	};
	hasLowData: boolean;
}

/**
 * Process food entries for last N weeks
 */
export function processFoodEntriesByWeek(
	entries: Entry[],
	data: TrackerData,
	weeks: Array<{ key: string; start: Date; end: Date }>
): WeeklyData[] {
	const foodEntries = filterEntriesByType(entries, 'food');
	const foodCategories = getCategories(data, 'food');

	return weeks.map((week) => {
		const weekEntries = foodEntries.filter((e: Entry) =>
			isEntryInWeek(e, week.start, week.end)
		);

		// Build category map with sentiment
		const categoryMap = new Map<string, WeeklyCategoryData>();

		weekEntries.forEach((entry: Entry) => {
			const catIds = getEntryCategoryIds(entry, data);
			catIds.forEach((catId: string) => {
				const catName = getCategoryNameById(catId, data);
				const category = foodCategories.find((c) => c.id === catId);
				const sentiment = category?.sentiment ?? 'neutral';

				if (!categoryMap.has(catId)) {
					categoryMap.set(catId, {
						categoryId: catId,
						categoryName: catName,
						sentiment,
						count: 0
					});
				}
				const existing = categoryMap.get(catId)!;
				existing.count += 1;
			});
		});

		// Calculate sentiment totals
		const categories = Array.from(categoryMap.values());
		const sentimentCounts = {
			positive: categories.filter((c) => c.sentiment === 'positive').reduce((s, c) => s + c.count, 0),
			neutral: categories.filter((c) => c.sentiment === 'neutral').reduce((s, c) => s + c.count, 0),
			limit: categories.filter((c) => c.sentiment === 'limit').reduce((s, c) => s + c.count, 0)
		};

		return {
			weekKey: week.key,
			start: week.start,
			end: week.end,
			entries: weekEntries,
			totalCount: weekEntries.length,
			categories,
			sentimentCounts,
			hasLowData: weekEntries.length < 5
		};
	});
}

/**
 * Calculate balance score for a week
 */
export function calculateBalanceScore(weeklyData: WeeklyData): number {
	const { positive, limit } = weeklyData.sentimentCounts;
	if (positive + limit === 0) return 0;
	return (positive / (positive + limit)) * 100;
}

/**
 * Determine score change direction
 */
export function getScoreChange(
	current: number,
	previous: number
): { direction: 'up' | 'down' | 'stable'; percentChange: number } {
	if (previous === 0) return { direction: 'stable', percentChange: 0 };
	const change = ((current - previous) / previous) * 100;
	if (Math.abs(change) < 1) return { direction: 'stable', percentChange: 0 };
	return {
		direction: change > 0 ? 'up' : 'down',
		percentChange: Math.round(Math.abs(change))
	};
}

/**
 * Get top N categories across all weeks
 */
export function getTopCategories(
	allWeeklyData: WeeklyData[],
	limit: number = 9
): string[] {
	const categoryTotals = new Map<string, number>();

	allWeeklyData.forEach((week) => {
		week.categories.forEach((cat) => {
			categoryTotals.set(cat.categoryId, (categoryTotals.get(cat.categoryId) || 0) + cat.count);
		});
	});

	return Array.from(categoryTotals.entries())
		.sort((a, b) => b[1] - a[1])
		.slice(0, limit)
		.map(([catId]) => catId);
}

const COLOR_PALETTE = [
	'#3b82f6', // blue
	'#ef4444', // red
	'#10b981', // emerald
	'#f59e0b', // amber
	'#8b5cf6', // violet
	'#ec4899', // pink
	'#06b6d4', // cyan
	'#f97316', // orange
	'#6366f1' // indigo
];

/**
 * Assign colors to top categories by rank order to guarantee unique colors.
 * Categories are ordered by frequency (from getTopCategories), so the most
 * common category always gets the first palette color.
 */
export function buildCategoryColorMap(topCategoryIds: string[]): Map<string, string> {
	const map = new Map<string, string>();
	topCategoryIds.forEach((catId, index) => {
		map.set(catId, COLOR_PALETTE[index % COLOR_PALETTE.length]);
	});
	map.set('OTHER', '#d1d5db'); // gray for "Other"
	return map;
}

/**
 * Group category data for a week, showing top N + "Other"
 */
export function groupCategoriesForWeek(
	week: WeeklyData,
	topCategoryIds: string[]
): Array<{ categoryId: string; categoryName: string; sentiment: string; count: number }> {
	const grouped = [];
	let otherCount = 0;

	week.categories.forEach((cat) => {
		if (topCategoryIds.includes(cat.categoryId)) {
			grouped.push(cat);
		} else {
			otherCount += cat.count;
		}
	});

	if (otherCount > 0) {
		grouped.push({
			categoryId: 'OTHER',
			categoryName: 'Other',
			sentiment: 'neutral',
			count: otherCount
		});
	}

	// Sort by top category order
	return grouped.sort((a, b) => {
		const aIdx = topCategoryIds.indexOf(a.categoryId);
		const bIdx = topCategoryIds.indexOf(b.categoryId);
		if (aIdx === -1) return 1; // "Other" goes last
		if (bIdx === -1) return -1;
		return aIdx - bIdx;
	});
}

// ============================================================
// Actionable Categories — used by the stats "Follow" section
// ============================================================

export interface ActionableCategoryRow {
	categoryId: string;
	categoryName: string;
	/** Primary metric value (count for limit, gap for positive) */
	value: number;
	/** Human-readable secondary label, e.g. "32% of limit total" */
	label: string;
	/** Raw event count. Only populated for limit categories; undefined for positive categories. */
	count?: number;
}

/**
 * Collect food entries from the last 4 weeks and count occurrences for
 * categories matching the given sentiment. Filters all entries once by
 * date range instead of per-week for efficiency.
 */
function countCategoriesBySentiment(
	entries: Entry[],
	data: TrackerData,
	weeks: Array<{ key: string; start: Date; end: Date }>,
	sentiment: 'limit' | 'positive'
): { counts: Map<string, number>; total: number; catIds: Set<string> } {
	const foodCategories = getCategories(data, 'food');
	const catIds = new Set(
		foodCategories.filter((c) => c.sentiment === sentiment).map((c) => c.id)
	);

	const counts = new Map<string, number>();
	let total = 0;

	if (catIds.size === 0) return { counts, total, catIds };

	// Determine the full date range from the last 4 weeks and filter once
	const last4 = weeks.slice(-4);
	const rangeStart = last4[0].start;
	const rangeEnd = last4[last4.length - 1].end;
	const foodEntries = filterEntriesByType(entries, 'food')
		.filter((e) => isEntryInWeek(e, rangeStart, rangeEnd));

	for (const entry of foodEntries) {
		const entryCatIds = getEntryCategoryIds(entry, data);
		for (const catId of entryCatIds) {
			if (catIds.has(catId)) {
				counts.set(catId, (counts.get(catId) || 0) + 1);
				total++;
			}
		}
	}

	return { counts, total, catIds };
}

/**
 * Top Limit Categories (last 4 weeks)
 * Ranked by total_count descending. Bar = share of all limit events.
 */
export function getTopLimitCategories(
	entries: Entry[],
	data: TrackerData,
	weeks: Array<{ key: string; start: Date; end: Date }>,
	limit: number = 5
): ActionableCategoryRow[] {
	const { counts, total } = countCategoriesBySentiment(entries, data, weeks, 'limit');
	if (total === 0) return [];

	return Array.from(counts.entries())
		.sort((a, b) => b[1] - a[1])
		.slice(0, limit)
		.map(([catId, count]) => {
			const share = Math.round((count / total) * 100);
			const catName = getCategoryNameById(catId, data);
			return {
				categoryId: catId,
				categoryName: catName,
				value: share,
				label: `${share}% of limit total`,
				count
			};
		});
}

/**
 * Lagging Positive Categories (last 4 weeks)
 * Ranked by underrepresentation: (average_positive_share − category_share)
 * where average_positive_share = 1/N and category_share = cat_count/total_positive
 */
export function getLaggingPositiveCategories(
	entries: Entry[],
	data: TrackerData,
	weeks: Array<{ key: string; start: Date; end: Date }>,
	limit: number = 5
): ActionableCategoryRow[] {
	const { counts, total, catIds } = countCategoriesBySentiment(entries, data, weeks, 'positive');
	if (total === 0) return [];

	// Ensure every positive category appears (even with 0 count)
	for (const catId of catIds) {
		if (!counts.has(catId)) {
			counts.set(catId, 0);
		}
	}

	const avgShare = 1 / catIds.size;

	return Array.from(counts.entries())
		.map(([catId, count]) => {
			const share = count / total;
			const gap = avgShare - share;
			return { catId, count, share, gap };
		})
		.filter((r) => r.gap > 0)
		.sort((a, b) => b.gap - a.gap)
		.slice(0, limit)
		.map((r) => {
			const catName = getCategoryNameById(r.catId, data);
			const gapPercent = Math.round(r.gap * 100);
			return {
				categoryId: r.catId,
				categoryName: catName,
				value: gapPercent,
				label: 'Below your positive average'
			};
		});
}

/**
 * Format week label like "Jan 15"
 */
export function formatWeekLabel(start: Date): string {
	const year = start.getFullYear();
	const month = String(start.getMonth() + 1).padStart(2, '0');
	const day = String(start.getDate()).padStart(2, '0');
	return formatWeekLabelFromString(`${year}-${month}-${day}`);
}
