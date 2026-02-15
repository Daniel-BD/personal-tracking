import { useMemo, useState } from 'react';
import { useTrackerData } from '@/shared/store/hooks';
import { getLastNWeeks } from '../utils/stats-engine';
import { filterEntriesByCategory, filterEntriesByDateRange } from '@/features/tracking';
import { formatDateLocal } from '@/shared/lib/date-utils';
import GoalCard from './GoalCard';
import { removeDashboardCard } from '@/shared/store/store';
import AddCategoryModal from './AddCategoryModal';

export default function GoalDashboard() {
	const data = useTrackerData();
	const [isModalOpen, setIsModalOpen] = useState(false);

	// Recalculate week boundaries when entries change (new entries may span a new week)
	const weeks = useMemo(() => getLastNWeeks(8), [data.entries]);

	const dashboardData = useMemo(() => {
		if (!data.dashboardCards) return [];

		return data.dashboardCards
			.map((card) => {
				const categoryId = card.categoryId;

				// Find category and determine color/type/sentiment
				const foodCat = data.foodCategories.find((c) => c.id === categoryId);
				const activityCat = data.activityCategories.find((c) => c.id === categoryId);
				const category = foodCat || activityCat;

				if (!category) return null;

				const categoryName = category.name;
				const sentiment = category.sentiment;

				// Calculate weekly counts
				const sparklineData = weeks.map((week) => {
					const range = {
						start: formatDateLocal(week.start),
						end: formatDateLocal(week.end),
					};
					const weekEntries = filterEntriesByCategory(filterEntriesByDateRange(data.entries, range), categoryId, data);
					return {
						week: week.key,
						count: weekEntries.length,
					};
				});

				// Current week (last element)
				const currentCount = sparklineData[sparklineData.length - 1].count;

				// Baseline: average of the 4 weeks preceding the last week
				const baselineWeeks = sparklineData.slice(3, 7);
				const baselineSum = baselineWeeks.reduce((sum, w) => sum + w.count, 0);
				const baselineAvg = baselineSum / 4;

				const delta = currentCount - baselineAvg;
				const deltaPercent = baselineAvg === 0 ? (currentCount > 0 ? 1 : 0) : delta / baselineAvg;

				return {
					categoryId,
					categoryName,
					sentiment,
					sparklineData,
					currentCount,
					baselineAvg,
					delta,
					deltaPercent,
				};
			})
			.filter((item): item is NonNullable<typeof item> => item !== null);
	}, [data, weeks]);

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-xl font-bold text-heading">Goals & Trends</h2>
				<button
					onClick={() => setIsModalOpen(true)}
					className="text-sm font-medium transition-colors hover:opacity-80"
					style={{ color: 'var(--color-activity)' }}
				>
					+ Add to dashboard
				</button>
			</div>

			<div
				className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto pr-1"
				style={{ maxHeight: 'calc(3 * 180px + 2 * 1rem)' }}
			>
				{dashboardData.map((card) => (
					<GoalCard
						key={card.categoryId}
						categoryName={card.categoryName}
						sentiment={card.sentiment}
						sparklineData={card.sparklineData}
						currentCount={card.currentCount}
						baselineAvg={card.baselineAvg}
						deltaPercent={card.deltaPercent}
						onRemove={() => removeDashboardCard(card.categoryId)}
					/>
				))}

				{dashboardData.length === 0 && (
					<div className="col-span-full py-8 text-center card bg-inset border-dashed">
						<p className="text-label text-sm">No cards added to your dashboard yet.</p>
						<button
							onClick={() => setIsModalOpen(true)}
							className="mt-2 text-sm font-semibold"
							style={{ color: 'var(--color-activity)' }}
						>
							Add your first category
						</button>
					</div>
				)}
			</div>

			{isModalOpen && <AddCategoryModal onClose={() => setIsModalOpen(false)} />}
		</div>
	);
}
