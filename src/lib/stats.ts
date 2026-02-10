import type { Entry, TrackerData } from './types';
import { getCategories } from './types';
import { getCategoryNameById, getEntryCategoryIds, filterEntriesByType } from './analysis';

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
 * Get percentage distribution for sentiment groups
 */
export function calculateSentimentRatios(
	weeklyData: WeeklyData
): { positive: number; neutral: number; limit: number } {
	const total =
		weeklyData.sentimentCounts.positive +
		weeklyData.sentimentCounts.neutral +
		weeklyData.sentimentCounts.limit;

	if (total === 0) {
		return { positive: 0, neutral: 0, limit: 0 };
	}

	return {
		positive: (weeklyData.sentimentCounts.positive / total) * 100,
		neutral: (weeklyData.sentimentCounts.neutral / total) * 100,
		limit: (weeklyData.sentimentCounts.limit / total) * 100
	};
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
 * Calculate average balance score across weeks
 */
export function calculateAverageBalanceScore(allWeeklyData: WeeklyData[]): number {
	if (allWeeklyData.length === 0) return 0;
	const scores = allWeeklyData.map(calculateBalanceScore);
	return scores.reduce((a, b) => a + b, 0) / scores.length;
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

/**
 * Generate a deterministic color for a category
 */
function hashCode(str: string): number {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash;
	}
	return Math.abs(hash);
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
 * Assign a persistent color to a category based on its ID
 */
export function getCategoryColor(categoryId: string): string {
	const hash = hashCode(categoryId);
	return COLOR_PALETTE[hash % COLOR_PALETTE.length];
}

/**
 * Get all unique categories for coloring
 */
export function buildCategoryColorMap(topCategoryIds: string[]): Map<string, string> {
	const map = new Map<string, string>();
	topCategoryIds.forEach((catId) => {
		map.set(catId, getCategoryColor(catId));
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

/**
 * Format week label like "Jan 15"
 */
export function formatWeekLabel(start: Date): string {
	return start.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric'
	});
}
