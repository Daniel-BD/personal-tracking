import type { Entry, TrackerData } from '@/shared/lib/types';
import { filterEntriesByType, getDaySentimentCounts } from '@/features/tracking';

export interface DailyBalanceResult {
	score: number;
	positive: number;
	limit: number;
	hasEntries: boolean;
}

export function calculateDailyBalance(entries: Entry[], data: TrackerData, today: string): DailyBalanceResult {
	const todayFoodEntries = filterEntriesByType(entries, 'food').filter((e) => e.date === today);
	if (todayFoodEntries.length === 0) {
		return { score: 0, positive: 0, limit: 0, hasEntries: false };
	}
	const counts = getDaySentimentCounts(todayFoodEntries, data);
	const total = counts.positive + counts.limit;
	return {
		score: total === 0 ? 0 : (counts.positive / total) * 100,
		positive: counts.positive,
		limit: counts.limit,
		hasEntries: true,
	};
}
