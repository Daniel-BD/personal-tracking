import { useMemo, useState } from 'react';
import { useTrackerData } from '@/shared/store/hooks';
import { filterEntriesByDateRange } from '@/features/tracking';
import BalanceOverview from './BalanceOverview';
import ActionableCategories from './ActionableCategories';
import CategoryComposition from './CategoryComposition';
import GoalDashboard from './GoalDashboard';
import FrequencyRanking from './FrequencyRanking';
import SegmentedControl from '@/shared/ui/SegmentedControl';
import { getLastNWeeks, processFoodEntriesByWeek } from '../utils/stats-engine';

type PeriodType = 'weekly' | 'monthly';

export default function StatsPage() {
	const data = useTrackerData();
	const [period, setPeriod] = useState<PeriodType>('weekly');

	const weeks = useMemo(() => getLastNWeeks(8), []);

	const weeklyData = useMemo(() => {
		return processFoodEntriesByWeek(data.entries, data, weeks);
	}, [data, weeks]);

	const periodEntries = useMemo(() => {
		if (weeks.length === 0) return [];
		const start = weeks[0].start;
		const end = weeks[weeks.length - 1].end;
		const fmt = (d: Date) => d.toISOString().split('T')[0];
		return filterEntriesByDateRange(data.entries, { start: fmt(start), end: fmt(end) });
	}, [data.entries, weeks]);

	const hasData = useMemo(() => {
		return weeklyData.some((w) => w.totalCount > 0);
	}, [weeklyData]);

	const hasAnyEntries = periodEntries.length > 0;

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
					{ value: 'weekly' as const, label: 'Weekly' },
					{ value: 'monthly' as const, label: 'Monthly', disabled: true, title: 'Monthly view coming soon' }
				]}
				value={period}
				onchange={setPeriod}
				variant="segment"
				size="sm"
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

			{/* Frequency Ranking — shows for any entries in the period */}
			{hasAnyEntries && (
				<>
					<hr className="border-[var(--border-default)]" />
					<FrequencyRanking entries={periodEntries} data={data} />
				</>
			)}
		</div>
	);
}
