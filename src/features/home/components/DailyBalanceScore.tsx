import { useMemo } from 'react';
import { useEntries, useFoodItems, useFoodCategories } from '@/shared/store/hooks';
import { getTodayDate } from '@/shared/lib/types';
import SentimentPills from '@/shared/ui/SentimentPills';
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
		<div className="pt-4 border-t border-[var(--border-subtle)]">
			<div className="flex items-baseline justify-between">
				<span className="text-xs font-medium text-label uppercase tracking-wide">Balance Score</span>
				<div className="flex items-center gap-2">
					<span className="text-lg font-bold" style={{ color: 'var(--color-activity)' }}>
						{Math.round(score)}%
					</span>
					<SentimentPills positive={positive} limit={limit} />
				</div>
			</div>
			<div className="bg-[var(--bg-inset)] rounded-full h-2.5 overflow-hidden mt-2">
				<div
					className="h-full rounded-full transition-all duration-300"
					style={{
						width: `${score}%`,
						background: 'linear-gradient(to right, var(--color-danger), var(--color-warning), var(--color-success))',
					}}
				/>
			</div>
			<p className="text-xs text-[var(--text-muted)] mt-1.5">Today · Positive ÷ (Positive + Limit)</p>
		</div>
	);
}
