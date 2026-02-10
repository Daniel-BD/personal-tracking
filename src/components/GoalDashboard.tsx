import { useMemo, useState } from 'react';
import { useTrackerData } from '../lib/hooks';
import { getLastNWeeks } from '../lib/stats';
import { filterEntriesByCategory, filterEntriesByDateRange } from '../lib/analysis';
import GoalCard from './GoalCard';
import { removeDashboardCard } from '../lib/store';
import AddCategoryModal from './AddCategoryModal';

export default function GoalDashboard() {
	const data = useTrackerData();
	const [isModalOpen, setIsModalOpen] = useState(false);

	const weeks = useMemo(() => getLastNWeeks(8), []);

	const dashboardData = useMemo(() => {
		if (!data.dashboardCards) return [];

		return data.dashboardCards.map((card) => {
			const categoryId = card.categoryId;

			// Find category and determine color/type
			const foodCat = data.foodCategories.find(c => c.id === categoryId);
			const activityCat = data.activityCategories.find(c => c.id === categoryId);
			const category = foodCat || activityCat;

			if (!category) return null;

			const categoryName = category.name;
			const categoryType = foodCat ? 'food' : 'activity';
			const categoryColor = categoryType === 'food' ? 'var(--color-food)' : 'var(--color-activity)';

			// Calculate weekly counts
			const sparklineData = weeks.map((week) => {
				const range = {
					start: week.start.toISOString().split('T')[0],
					end: week.end.toISOString().split('T')[0]
				};
				const weekEntries = filterEntriesByCategory(
					filterEntriesByDateRange(data.entries, range),
					categoryId,
					data
				);
				return {
					week: week.key,
					count: weekEntries.length
				};
			});

			// Current week (last element)
			const currentCount = sparklineData[sparklineData.length - 1].count;

			// Baseline: average of the 4 weeks preceding the last week
			// sparklineData has 8 weeks: [0, 1, 2, 3, 4, 5, 6, 7]
			// Current is index 7.
			// Baseline is average of indices 3, 4, 5, 6.
			const baselineWeeks = sparklineData.slice(3, 7);
			const baselineSum = baselineWeeks.reduce((sum, w) => sum + w.count, 0);
			const baselineAvg = baselineSum / 4;

			const delta = currentCount - baselineAvg;
			const deltaPercent = baselineAvg === 0 ? (currentCount > 0 ? 1 : 0) : delta / baselineAvg;

			return {
				categoryId,
				categoryName,
				categoryColor,
				sparklineData,
				delta,
				deltaPercent
			};
		}).filter((item): item is NonNullable<typeof item> => item !== null);
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
						categoryColor={card.categoryColor}
						sparklineData={card.sparklineData}
						delta={card.delta}
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

			{isModalOpen && (
				<AddCategoryModal
					onClose={() => setIsModalOpen(false)}
				/>
			)}
		</div>
	);
}
