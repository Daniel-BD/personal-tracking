import { useMemo } from 'react';
import { useEntries, useFoodItems, useFoodCategories } from '@/shared/store/hooks';
import { getTodayDate } from '@/shared/lib/types';
import BalanceScoreMeter from '@/shared/ui/BalanceScoreMeter';
import { calculateDailyBalance } from '../utils/daily-balance';

export default function DailyBalanceScore() {
	const entries = useEntries();
	const foodItems = useFoodItems();
	const foodCategories = useFoodCategories();

	const { score, positive, limit, hasEntries } = useMemo(
		() => calculateDailyBalance(entries, foodItems, foodCategories, getTodayDate()),
		[entries, foodItems, foodCategories],
	);

	if (!hasEntries) return null;

	return (
		<BalanceScoreMeter
			title="Balance Score"
			description="Today · Positive ÷ (Positive + Limit)"
			score={score}
			positive={positive}
			limit={limit}
		/>
	);
}
