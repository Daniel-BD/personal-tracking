import type { DashboardCard, Entry } from '@/shared/lib/types';
import {
	getCardId,
	getDashboardCardEntityIds,
	getDashboardCardEntityType,
	isCombinedDashboardCard,
	type Category,
	type Item,
} from '@/shared/lib/types';
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

export interface DashboardCardMember {
	id: string;
	name: string;
	accentColor: string;
	sentiment: 'positive' | 'neutral' | 'limit';
}

export interface GoalDashboardCardViewModel {
	cardId: string;
	name: string;
	sentiment: 'positive' | 'neutral' | 'limit';
	accentColor?: string;
	members: DashboardCardMember[];
	isCombined: boolean;
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

export interface DashboardCardDetailViewModel {
	card: DashboardCard;
	cardId: string;
	name: string;
	entityType: 'category' | 'item';
	members: DashboardCardMember[];
	entries: Entry[];
	weeklyStats: WeeklyDetailStats[];
	currentCount: number;
	baselineAvg: number;
	delta: number;
	deltaPercent: number;
	daysElapsed: number;
	daysSinceLastLogged: number | null;
	accentColor: string;
	sentiment: 'positive' | 'neutral' | 'limit';
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

function pickAggregateSentiment(members: DashboardCardMember[]): 'positive' | 'neutral' | 'limit' {
	if (members.some((member) => member.sentiment === 'limit')) {
		return 'limit';
	}
	if (members.some((member) => member.sentiment === 'positive')) {
		return 'positive';
	}
	return 'neutral';
}

function buildCardMembers(
	card: DashboardCard,
	itemById: ItemById,
	categoryById: CategoryById,
	itemCategoriesByItemId: ItemCategoriesByItemId,
): DashboardCardMember[] {
	const entityType = getDashboardCardEntityType(card);
	const entityIds = getDashboardCardEntityIds(card);

	if (entityType === 'item') {
		return entityIds
			.map((itemId) => {
				const item = itemById.get(itemId);
				if (!item) {
					return null;
				}

				return {
					id: item.id,
					name: item.name,
					accentColor: getItemAccentColor(item.categories, itemCategoriesByItemId.get(item.id) ?? []),
					sentiment: 'neutral' as const,
				};
			})
			.filter((member) => member !== null) as DashboardCardMember[];
	}

	return entityIds
		.map((categoryId) => {
			const category = categoryById.get(categoryId);
			if (!category) {
				return null;
			}

			return {
				id: category.id,
				name: category.name,
				accentColor:
					category.sentiment === 'positive'
						? 'var(--color-success)'
						: category.sentiment === 'limit'
							? 'var(--color-danger)'
							: 'var(--color-neutral)',
				sentiment: category.sentiment,
			};
		})
		.filter((member) => member !== null) as DashboardCardMember[];
}

function sumWeeklyCounts(
	weeks: WeekWindow[],
	countsByWeek: Map<string, Map<string, number>>,
	entityIds: string[],
): Array<{ week: string; count: number; label: string }> {
	return weeks.map((week) => ({
		week: week.key,
		count: entityIds.reduce((sum, entityId) => sum + (countsByWeek.get(week.key)?.get(entityId) ?? 0), 0),
		label: formatWeekLabel(week.start),
	}));
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
		const entityType = getDashboardCardEntityType(card);
		const entityIds = getDashboardCardEntityIds(card);
		const members = buildCardMembers(card, itemById, categoryById, itemCategoriesByItemId);
		if (members.length === 0) {
			continue;
		}

		const sparklineData = sumWeeklyCounts(
			weeks,
			entityType === 'item' ? weeklyEntityCounts.itemCountsByWeek : weeklyEntityCounts.categoryCountsByWeek,
			entityIds,
		);
		const sentiment = entityType === 'category' ? pickAggregateSentiment(members) : 'neutral';

		viewModels.push({
			cardId,
			name: card.name ?? members.map((member) => member.name).join(' + '),
			sentiment,
			accentColor: entityType === 'item' ? (members[0]?.accentColor ?? 'var(--color-neutral)') : undefined,
			members,
			isCombined: isCombinedDashboardCard(card),
			sparklineData,
			...calcCardStats(sparklineData, daysElapsed),
			daysElapsed,
			navigateTo:
				isCombinedDashboardCard(card) || entityIds.length > 1
					? `/stats/dashboard-card/${cardId}`
					: entityType === 'item'
						? `/stats/item/${entityIds[0]}`
						: `/stats/category/${entityIds[0]}`,
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

export function buildDashboardCardDetailViewModel(params: {
	cardId: string;
	dashboardCards: DashboardCard[];
	weeks: WeekWindow[];
	daysElapsed: number;
	itemById: ItemById;
	categoryById: CategoryById;
	itemCategoriesByItemId: ItemCategoriesByItemId;
	entriesByItem: EntriesByItem;
	entriesByCategory: EntriesByCategory;
}): DashboardCardDetailViewModel | null {
	const {
		cardId,
		dashboardCards,
		weeks,
		daysElapsed,
		itemById,
		categoryById,
		itemCategoriesByItemId,
		entriesByItem,
		entriesByCategory,
	} = params;
	const card = dashboardCards.find((candidate) => getCardId(candidate) === cardId);
	if (!card) {
		return null;
	}

	const entityType = getDashboardCardEntityType(card);
	const entityIds = getDashboardCardEntityIds(card);
	const members = buildCardMembers(card, itemById, categoryById, itemCategoriesByItemId);
	if (members.length === 0) {
		return null;
	}

	const entriesByEntity = entityType === 'item' ? entriesByItem : entriesByCategory;
	const entryMap = new Map<string, Entry>();
	for (const entityId of entityIds) {
		for (const entry of entriesByEntity.get(entityId) ?? []) {
			entryMap.set(entry.id, entry);
		}
	}
	const entries = Array.from(entryMap.values()).sort((left, right) => {
		if (left.date === right.date) {
			return (left.time ?? '').localeCompare(right.time ?? '');
		}
		return left.date.localeCompare(right.date);
	});
	const weeklyStats = buildWeeklyDetailStats(weeks, entries);
	const baselineAvg = getBaselineAvg(weeklyStats);
	const currentCount = weeklyStats[weeklyStats.length - 1]?.count ?? 0;
	const { delta, deltaPercent } = getDelta(currentCount, baselineAvg, daysElapsed);
	const sentiment = entityType === 'category' ? pickAggregateSentiment(members) : 'neutral';

	return {
		card,
		cardId,
		name: card.name ?? members.map((member) => member.name).join(' + '),
		entityType,
		members,
		entries,
		weeklyStats,
		currentCount,
		baselineAvg,
		delta,
		deltaPercent,
		daysElapsed,
		daysSinceLastLogged: entityType === 'category' ? getDaysSinceMostRecentEntry(entries) : null,
		accentColor: members[0]?.accentColor ?? 'var(--color-neutral)',
		sentiment,
	};
}

export function getHasWeeklyData(weeklyData: WeeklyData[]): boolean {
	return weeklyData.some((week) => week.totalCount > 0);
}
