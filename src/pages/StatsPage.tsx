import { useMemo, useState } from 'react';
import { useTrackerData } from '../lib/hooks';
import BalanceOverview from '../components/BalanceOverview';
import ActionableCategories from '../components/ActionableCategories';
import CategoryComposition from '../components/CategoryComposition';
import GoalDashboard from '../components/GoalDashboard';
import SegmentedControl from '../components/SegmentedControl';
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
				<p className="text-body">
					What your eating events are made of
				</p>
			</div>

			{/* Period toggle */}
			<SegmentedControl
				options={[
					{ value: 'weekly' as const, label: 'Weekly', activeClass: 'type-activity' },
					{ value: 'monthly' as const, label: 'Monthly', disabled: true, title: 'Monthly view coming soon' }
				]}
				value={period}
				onchange={setPeriod}
			/>

			{/* Empty state */}
			{!hasData && (
				<div className="card p-8 text-center space-y-2">
					<p className="text-body">
						No food entries logged yet
					</p>
					<p className="text-sm text-label">
						Start logging food items to see your eating patterns
					</p>
				</div>
			)}

			{/* Content */}
			{hasData && (
				<>
					{/* Section 0: Goal Dashboard */}
					<GoalDashboard />

					<hr className="border-[var(--border-default)]" />

					{/* Section 1: Balance Overview */}
					<BalanceOverview weeklyData={weeklyData} />

					{/* Section 1.5: Actionable Categories (Focus Areas) */}
					<ActionableCategories data={data} />

					{/* Section 2: Category Composition */}
					<CategoryComposition weeklyData={weeklyData} />
				</>
			)}
		</div>
	);
}
