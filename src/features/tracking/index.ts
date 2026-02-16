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

// Hooks
export { useSwipeGesture, ACTION_WIDTH } from './hooks/useSwipeGesture';

// Components
export { default as EntryList } from './components/EntryList';
export { default as CategoryPicker } from './components/CategoryPicker';
export { default as CategoryLine } from './components/CategoryLine';
