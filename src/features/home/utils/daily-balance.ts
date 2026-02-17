import type { Entry, Item, Category, TrackerData } from '@/shared/lib/types';
import { getDaySentimentCounts } from '@/features/tracking';

export interface DailyBalanceResult {
	score: number;
	positive: number;
	limit: number;
	hasEntries: boolean;
}

export function calculateDailyBalance(
	entries: Entry[],
	foodItems: Item[],
	foodCategories: Category[],
	today: string,
): DailyBalanceResult {
	const todayFoodEntries = entries.filter((e) => e.type === 'food' && e.date === today);
	if (todayFoodEntries.length === 0) {
		return { score: 0, positive: 0, limit: 0, hasEntries: false };
	}
	const data = { foodItems, foodCategories } as TrackerData;
	const counts = getDaySentimentCounts(todayFoodEntries, data);
	const total = counts.positive + counts.limit;
	return {
		score: total === 0 ? 0 : (counts.positive / total) * 100,
		positive: counts.positive,
		limit: counts.limit,
		hasEntries: true,
	};
}
