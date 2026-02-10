import { useMemo, useState } from 'react';
import { useTrackerData } from '../lib/hooks';
import BalanceOverview from '../components/BalanceOverview';
import CategoryComposition from '../components/CategoryComposition';
import { getLastNWeeks, processFoodEntriesByWeek } from '../lib/stats';

type PeriodType = 'weekly' | 'monthly';

export default function StatsPage() {
	const data = useTrackerData();
	const [period, setPeriod] = useState<PeriodType>('weekly');

	const weeklyData = useMemo(() => {
		const weeks = getLastNWeeks(8);
		return processFoodEntriesByWeek(data.entries, data, weeks);
	}, [data]);

	const hasData = useMemo(() => {
		return weeklyData.some((w) => w.totalCount > 0);
	}, [weeklyData]);

	return (
		<div className="space-y-4 sm:space-y-6 pb-6">
			{/* Header */}
			<div className="space-y-2">
				<h1 className="text-2xl font-bold">Eating patterns</h1>
				<p className="text-gray-600 dark:text-gray-400">
					What your eating events are made of
				</p>
			</div>

			{/* Period toggle */}
			<div className="flex gap-2">
				<button
					onClick={() => setPeriod('weekly')}
					className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
						period === 'weekly'
							? 'bg-blue-600 text-white'
							: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
					}`}
				>
					Weekly
				</button>
				<button
					onClick={() => setPeriod('monthly')}
					disabled
					className="flex-1 py-2 px-4 rounded-lg font-medium transition-colors bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed"
					title="Monthly view coming soon"
				>
					Monthly
				</button>
			</div>

			{/* Empty state */}
			{!hasData && (
				<div className="card p-8 text-center space-y-2">
					<p className="text-gray-600 dark:text-gray-400">
						No food entries logged yet
					</p>
					<p className="text-sm text-gray-500 dark:text-gray-500">
						Start logging food items to see your eating patterns
					</p>
				</div>
			)}

			{/* Content */}
			{hasData && (
				<>
					{/* Section 1: Balance Overview */}
					<BalanceOverview weeklyData={weeklyData} />

					{/* Section 2: Category Composition */}
					<CategoryComposition weeklyData={weeklyData} />
				</>
			)}
		</div>
	);
}
