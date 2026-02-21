import { useMemo, useState, useEffect, useRef } from 'react';
import { useEntries, useFoodItems, useFoodCategories } from '@/shared/store/hooks';
import { getTodayDate } from '@/shared/lib/types';
import SentimentPills from '@/shared/ui/SentimentPills';
import { calculateDailyBalance } from '../utils/daily-balance';

const ANIMATION_DURATION = 900; // ms

function easeOutCubic(t: number): number {
	return 1 - Math.pow(1 - t, 3);
}

export default function DailyBalanceScore() {
	const entries = useEntries();
	const foodItems = useFoodItems();
	const foodCategories = useFoodCategories();

	const { score, positive, limit, hasEntries } = useMemo(
		() => calculateDailyBalance(entries, foodItems, foodCategories, getTodayDate()),
		[entries, foodItems, foodCategories],
	);

	const [displayScore, setDisplayScore] = useState(0);
	const displayScoreRef = useRef(0);
	const animFrameRef = useRef<number | null>(null);

	useEffect(() => {
		if (!hasEntries) return;

		if (animFrameRef.current !== null) {
			cancelAnimationFrame(animFrameRef.current);
		}

		const startValue = displayScoreRef.current;
		const targetValue = score;
		const startTime = performance.now();

		const animate = (currentTime: number) => {
			const elapsed = currentTime - startTime;
			const progress = Math.min(elapsed / ANIMATION_DURATION, 1);
			const eased = easeOutCubic(progress);
			const current = startValue + (targetValue - startValue) * eased;

			displayScoreRef.current = current;
			setDisplayScore(current);

			if (progress < 1) {
				animFrameRef.current = requestAnimationFrame(animate);
			} else {
				animFrameRef.current = null;
			}
		};

		animFrameRef.current = requestAnimationFrame(animate);

		return () => {
			if (animFrameRef.current !== null) {
				cancelAnimationFrame(animFrameRef.current);
				animFrameRef.current = null;
			}
		};
	}, [score, hasEntries]);

	if (!hasEntries) return null;

	return (
		<div className="pt-4 border-t border-[var(--border-subtle)]">
			<div className="flex items-baseline justify-between">
				<span className="text-xs font-medium text-label uppercase tracking-wide">Balance Score</span>
				<div className="flex items-center gap-2">
					<span className="text-lg font-bold" style={{ color: 'var(--color-activity)' }}>
						{Math.round(displayScore)}%
					</span>
					<SentimentPills positive={positive} limit={limit} />
				</div>
			</div>
			<div className="bg-[var(--bg-inset)] rounded-full h-2.5 overflow-hidden mt-2">
				<div
					className="h-full rounded-full"
					style={{
						width: `${displayScore}%`,
						background: 'linear-gradient(to right, var(--color-danger), var(--color-warning), var(--color-success))',
					}}
				/>
			</div>
			<p className="text-xs text-[var(--text-muted)] mt-1.5">Today · Positive ÷ (Positive + Limit)</p>
		</div>
	);
}
