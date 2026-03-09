import type { DashboardCard, Entry } from '@/shared/lib/types';
import { getCardId, type Category, type Item } from '@/shared/lib/types';
import {
	buildEntriesByWeek,
	type CategoryById,
	type EntriesByCategory,
	type EntriesByItem,
	type EntriesByWeek,
	type ItemById,
	type ItemCategoriesByItemId,
	type ItemCategoryIdsByItemId,
} from '@/features/tracking';
import { getDaysSinceMostRecentEntry, getItemAccentColor, formatWeekLabel, type WeeklyData } from './stats-engine';

export interface WeekWindow {
	key: string;
	start: Date;
	end: Date;
}

export interface GoalDashboardCardViewModel {
	cardId: string;
	name: string;
	sentiment: 'positive' | 'neutral' | 'limit';
	accentColor?: string;
	sparklineData: Array<{ week: string; count: number; label: string }>;
	currentCount: number;
	baselineAvg: number;
	deltaPercent: number;
	daysElapsed: number;
	navigateTo: string;
}

export interface WeeklyDetailStats {
	weekKey: string;
	label: string;
	count: number;
	start: Date;
	end: Date;
	entries: Entry[];
}

export interface CategoryDetailViewModel {
	category: Category;
	categoryEntries: Entry[];
	weeklyStats: WeeklyDetailStats[];
	currentCount: number;
	baselineAvg: number;
	delta: number;
	deltaPercent: number;
	daysElapsed: number;
	daysSinceLastLogged: number | null;
}

export interface ItemDetailViewModel {
	item: Item;
	itemEntries: Entry[];
	itemCategories: Category[];
	defaultCategories: Category[];
	accentColor: string;
	weeklyStats: WeeklyDetailStats[];
	currentCount: number;
	baselineAvg: number;
	delta: number;
	deltaPercent: number;
	daysElapsed: number;
}

export interface WeeklyEntityCounts {
	itemCountsByWeek: Map<string, Map<string, number>>;
	categoryCountsByWeek: Map<string, Map<string, number>>;
}

export function calcCardStats(sparklineData: Array<{ count: number }>, daysElapsed: number) {
	const currentCount = sparklineData[sparklineData.length - 1]?.count ?? 0;
	const baselineWeeks = sparklineData.slice(-5, -1);
	const baselineSum = baselineWeeks.reduce((sum, week) => sum + week.count, 0);
	const baselineAvg = baselineWeeks.length > 0 ? baselineSum / baselineWeeks.length : 0;
	const proratedBaseline = baselineAvg * (daysElapsed / 7);
	const delta = currentCount - proratedBaseline;
	const deltaPercent = proratedBaseline === 0 ? (currentCount > 0 ? 1 : 0) : delta / proratedBaseline;

	return { currentCount, baselineAvg, deltaPercent };
}

export function buildWeeklyEntityCounts(
	weeks: WeekWindow[],
	entriesByWeek: EntriesByWeek,
	itemCategoryIdsByItemId: ItemCategoryIdsByItemId,
): WeeklyEntityCounts {
	const itemCountsByWeek = new Map<string, Map<string, number>>();
	const categoryCountsByWeek = new Map<string, Map<string, number>>();

	for (const week of weeks) {
		const itemCounts = new Map<string, number>();
		const categoryCounts = new Map<string, number>();

		for (const entry of entriesByWeek.get(week.key) ?? []) {
			itemCounts.set(entry.itemId, (itemCounts.get(entry.itemId) ?? 0) + 1);

			const categoryIds = entry.categoryOverrides ?? itemCategoryIdsByItemId.get(entry.itemId) ?? [];
			for (const categoryId of categoryIds) {
				categoryCounts.set(categoryId, (categoryCounts.get(categoryId) ?? 0) + 1);
			}
		}

		itemCountsByWeek.set(week.key, itemCounts);
		categoryCountsByWeek.set(week.key, categoryCounts);
	}

	return { itemCountsByWeek, categoryCountsByWeek };
}

export function buildItemAccentColorById(
	itemById: ItemById,
	itemCategoriesByItemId: ItemCategoriesByItemId,
): Map<string, string> {
	const index = new Map<string, string>();

	for (const [itemId, item] of itemById) {
		index.set(itemId, getItemAccentColor(item.categories, itemCategoriesByItemId.get(itemId) ?? []));
	}

	return index;
}

export function buildGoalDashboardViewModels(params: {
	dashboardCards: DashboardCard[];
	weeks: WeekWindow[];
	daysElapsed: number;
	itemById: ItemById;
	categoryById: CategoryById;
	itemCategoriesByItemId: ItemCategoriesByItemId;
	weeklyEntityCounts: WeeklyEntityCounts;
}): GoalDashboardCardViewModel[] {
	const { dashboardCards, weeks, daysElapsed, itemById, categoryById, itemCategoriesByItemId, weeklyEntityCounts } =
		params;
	const viewModels: GoalDashboardCardViewModel[] = [];

	for (const card of dashboardCards) {
		const cardId = getCardId(card);

		if (card.itemId) {
			const item = itemById.get(card.itemId);
			if (!item) {
				continue;
			}

			const sparklineData = weeks.map((week) => ({
				week: week.key,
				count: weeklyEntityCounts.itemCountsByWeek.get(week.key)?.get(card.itemId!) ?? 0,
				label: formatWeekLabel(week.start),
			}));

			viewModels.push({
				cardId,
				name: item.name,
				sentiment: 'neutral',
				accentColor: getItemAccentColor(item.categories, itemCategoriesByItemId.get(card.itemId) ?? []),
				sparklineData,
				...calcCardStats(sparklineData, daysElapsed),
				daysElapsed,
				navigateTo: `/stats/item/${card.itemId}`,
			});
			continue;
		}

		const categoryId = card.categoryId;
		if (!categoryId) {
			continue;
		}

		const category = categoryById.get(categoryId);
		if (!category) {
			continue;
		}

		const sparklineData = weeks.map((week) => ({
			week: week.key,
			count: weeklyEntityCounts.categoryCountsByWeek.get(week.key)?.get(categoryId) ?? 0,
			label: formatWeekLabel(week.start),
		}));

		viewModels.push({
			cardId,
			name: category.name,
			sentiment: category.sentiment,
			sparklineData,
			...calcCardStats(sparklineData, daysElapsed),
			daysElapsed,
			navigateTo: `/stats/category/${categoryId}`,
		});
	}

	return viewModels;
}

function buildWeeklyDetailStats(weeks: WeekWindow[], entries: Entry[]): WeeklyDetailStats[] {
	const entriesByWeek = buildEntriesByWeek(entries);

	return weeks.map((week) => ({
		weekKey: week.key,
		label: week.key,
		count: entriesByWeek.get(week.key)?.length ?? 0,
		start: week.start,
		end: week.end,
		entries: entriesByWeek.get(week.key) ?? [],
	}));
}

function getBaselineAvg(weeklyStats: WeeklyDetailStats[]): number {
	const baselineWeeks = weeklyStats.slice(-5, -1);
	if (baselineWeeks.length === 0) {
		return 0;
	}

	const sum = baselineWeeks.reduce((total, week) => total + week.count, 0);
	return sum / baselineWeeks.length;
}

function getDelta(currentCount: number, baselineAvg: number, daysElapsed: number) {
	const proratedBaseline = baselineAvg * (daysElapsed / 7);
	const delta = currentCount - proratedBaseline;
	const deltaPercent = proratedBaseline === 0 ? (currentCount > 0 ? 1 : 0) : delta / proratedBaseline;

	return { delta, deltaPercent };
}

export function buildCategoryDetailViewModel(params: {
	categoryId: string;
	weeks: WeekWindow[];
	daysElapsed: number;
	categoryById: CategoryById;
	entriesByCategory: EntriesByCategory;
}): CategoryDetailViewModel | null {
	const { categoryId, weeks, daysElapsed, categoryById, entriesByCategory } = params;
	const category = categoryById.get(categoryId);
	if (!category) {
		return null;
	}

	const categoryEntries = entriesByCategory.get(categoryId) ?? [];
	const weeklyStats = buildWeeklyDetailStats(weeks, categoryEntries);
	const baselineAvg = getBaselineAvg(weeklyStats);
	const currentCount = weeklyStats[weeklyStats.length - 1]?.count ?? 0;
	const { delta, deltaPercent } = getDelta(currentCount, baselineAvg, daysElapsed);

	return {
		category,
		categoryEntries,
		weeklyStats,
		currentCount,
		baselineAvg,
		delta,
		deltaPercent,
		daysElapsed,
		daysSinceLastLogged: getDaysSinceMostRecentEntry(categoryEntries),
	};
}

export function buildItemDetailViewModel(params: {
	itemId: string;
	weeks: WeekWindow[];
	daysElapsed: number;
	itemById: ItemById;
	itemCategoriesByItemId: ItemCategoriesByItemId;
	entriesByItem: EntriesByItem;
}): ItemDetailViewModel | null {
	const { itemId, weeks, daysElapsed, itemById, itemCategoriesByItemId, entriesByItem } = params;
	const item = itemById.get(itemId);
	if (!item) {
		return null;
	}

	const itemCategories = itemCategoriesByItemId.get(itemId) ?? [];
	const defaultCategories = item.categories
		.map((categoryId) => itemCategories.find((category) => category.id === categoryId) ?? null)
		.filter((category): category is Category => category !== null);
	const itemEntries = entriesByItem.get(itemId) ?? [];
	const weeklyStats = buildWeeklyDetailStats(weeks, itemEntries);
	const baselineAvg = getBaselineAvg(weeklyStats);
	const currentCount = weeklyStats[weeklyStats.length - 1]?.count ?? 0;
	const { delta, deltaPercent } = getDelta(currentCount, baselineAvg, daysElapsed);

	return {
		item,
		itemEntries,
		itemCategories,
		defaultCategories,
		accentColor: getItemAccentColor(item.categories, itemCategories),
		weeklyStats,
		currentCount,
		baselineAvg,
		delta,
		deltaPercent,
		daysElapsed,
	};
}

export function getHasWeeklyData(weeklyData: WeeklyData[]): boolean {
	return weeklyData.some((week) => week.totalCount > 0);
}
