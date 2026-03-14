// Utils
export {
	filterEntriesByDateRange,
	filterEntriesByType,
	filterEntriesByItem,
	filterEntriesByItems,
	filterEntriesByCategory,
	filterEntriesByCategories,
} from './utils/entry-filters';
export type { DateRange } from './utils/entry-filters';
export {
	getEntryCategoryIds,
	getCategoryNameById,
	getEntryCategoryNames,
	getCategorySentimentCounts,
	getDaySentimentCounts,
} from './utils/category-utils';
export {
	getEntriesGroupedByDate,
	countEntriesByItem,
	countEntriesByCategory,
	groupEntriesByWeek,
	getMonthRange,
	getPreviousMonthRange,
	getWeekRange,
	compareMonths,
	compareMonthsForItem,
	getItemTotals,
	getCategoryTotals,
} from './utils/entry-grouping';
export type { ComparisonResult } from './utils/entry-grouping';
export {
	buildEntriesByItem,
	buildEntriesByCategory,
	buildEntriesByWeek,
	buildItemById,
	buildCategoryById,
	buildItemCategoryIdsByItemId,
	buildItemCategoriesByItemId,
	getEntryCategoryIdsFromIndex,
} from './utils/tracking-indexes';
export type {
	EntriesByItem,
	EntriesByCategory,
	EntriesByWeek,
	ItemById,
	CategoryById,
	ItemCategoryIdsByItemId,
	ItemCategoriesByItemId,
} from './utils/tracking-indexes';
export {
	useEntriesByItem,
	useEntriesByCategory,
	useEntriesByWeek,
	useItemById,
	useCategoryById,
	useItemCategoryIdsByItemId,
	useItemCategoriesByItemId,
} from './hooks/use-tracking-indexes';

// Components
export { default as EntryList } from './components/EntryList';
export { default as CategoryPicker } from './components/CategoryPicker';
export { default as CategoryLine } from './components/CategoryLine';
