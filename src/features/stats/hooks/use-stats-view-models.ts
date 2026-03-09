import { useMemo } from 'react';
import { useDashboardCards, useEntries } from '@/shared/store/hooks';
import {
	useCategoryById,
	useEntriesByCategory,
	useEntriesByItem,
	useEntriesByWeek,
	useItemById,
	useItemCategoriesByItemId,
	useItemCategoryIdsByItemId,
} from '@/features/tracking';
import { getDaysElapsedInCurrentWeek, getLastNWeeks, processFoodEntriesByWeekFromIndexes } from '../utils/stats-engine';
import {
	buildCategoryDetailViewModel,
	buildGoalDashboardViewModels,
	buildItemAccentColorById,
	buildItemDetailViewModel,
	buildWeeklyEntityCounts,
	getHasWeeklyData,
} from '../utils/stats-view-models';

export function useStatsWindow() {
	const entries = useEntries();
	const weeks = useMemo(() => (entries.length >= 0 ? getLastNWeeks(8) : []), [entries.length]);
	const currentWeek = weeks[weeks.length - 1];
	const daysElapsed = useMemo(() => (currentWeek ? getDaysElapsedInCurrentWeek(currentWeek.start) : 7), [currentWeek]);

	return { weeks, daysElapsed };
}

export function useWeeklyFoodStats() {
	const { weeks } = useStatsWindow();
	const entriesByWeek = useEntriesByWeek();
	const categoryById = useCategoryById();
	const itemCategoryIdsByItemId = useItemCategoryIdsByItemId();

	const weeklyData = useMemo(
		() => processFoodEntriesByWeekFromIndexes(entriesByWeek, categoryById, itemCategoryIdsByItemId, weeks),
		[entriesByWeek, categoryById, itemCategoryIdsByItemId, weeks],
	);

	return {
		weeks,
		weeklyData,
		hasData: getHasWeeklyData(weeklyData),
	};
}

export function useGoalDashboardViewModels() {
	const { weeks, daysElapsed } = useStatsWindow();
	const dashboardCards = useDashboardCards();
	const entriesByWeek = useEntriesByWeek();
	const itemById = useItemById();
	const categoryById = useCategoryById();
	const itemCategoryIdsByItemId = useItemCategoryIdsByItemId();
	const itemCategoriesByItemId = useItemCategoriesByItemId();

	const weeklyEntityCounts = useMemo(
		() => buildWeeklyEntityCounts(weeks, entriesByWeek, itemCategoryIdsByItemId),
		[weeks, entriesByWeek, itemCategoryIdsByItemId],
	);

	return useMemo(
		() =>
			buildGoalDashboardViewModels({
				dashboardCards,
				weeks,
				daysElapsed,
				itemById,
				categoryById,
				itemCategoriesByItemId,
				weeklyEntityCounts,
			}),
		[dashboardCards, weeks, daysElapsed, itemById, categoryById, itemCategoriesByItemId, weeklyEntityCounts],
	);
}

export function useItemAccentColorById() {
	const itemById = useItemById();
	const itemCategoriesByItemId = useItemCategoriesByItemId();

	return useMemo(() => buildItemAccentColorById(itemById, itemCategoriesByItemId), [itemById, itemCategoriesByItemId]);
}

export function useCategoryDetailViewModel(categoryId?: string) {
	const { weeks, daysElapsed } = useStatsWindow();
	const categoryById = useCategoryById();
	const entriesByCategory = useEntriesByCategory();

	return useMemo(() => {
		if (!categoryId) {
			return null;
		}

		return buildCategoryDetailViewModel({
			categoryId,
			weeks,
			daysElapsed,
			categoryById,
			entriesByCategory,
		});
	}, [categoryId, weeks, daysElapsed, categoryById, entriesByCategory]);
}

export function useItemDetailViewModel(itemId?: string) {
	const { weeks, daysElapsed } = useStatsWindow();
	const itemById = useItemById();
	const itemCategoriesByItemId = useItemCategoriesByItemId();
	const entriesByItem = useEntriesByItem();

	return useMemo(() => {
		if (!itemId) {
			return null;
		}

		return buildItemDetailViewModel({
			itemId,
			weeks,
			daysElapsed,
			itemById,
			itemCategoriesByItemId,
			entriesByItem,
		});
	}, [itemId, weeks, daysElapsed, itemById, itemCategoriesByItemId, entriesByItem]);
}
