import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTrackerData } from '@/shared/store/hooks';
import BalanceOverview from './BalanceOverview';
import ActionableCategories from './ActionableCategories';
import CategoryComposition from './CategoryComposition';
import GoalDashboard from './GoalDashboard';
import FrequencyRanking from './FrequencyRanking';
import SegmentedControl from '@/shared/ui/SegmentedControl';
import { getLastNWeeks, processFoodEntriesByWeek } from '../utils/stats-engine';

type PeriodType = 'weekly' | 'monthly';

export default function StatsPage() {
	const { t } = useTranslation('stats');
	const data = useTrackerData();
	const [period, setPeriod] = useState<PeriodType>('weekly');

	const weeks = useMemo(() => getLastNWeeks(8), []);

	const weeklyData = useMemo(() => {
		return processFoodEntriesByWeek(data.entries, data, weeks);
	}, [data, weeks]);

	const hasData = useMemo(() => {
		return weeklyData.some((w) => w.totalCount > 0);
	}, [weeklyData]);

	return (
		<div className="space-y-4 sm:space-y-6 pb-6">
			{/* Header */}
			<div className="space-y-2">
				<h1 className="text-2xl font-bold">{t('title')}</h1>
				<p className="text-body">{t('subtitle')}</p>
			</div>

			{/* Period toggle */}
			<SegmentedControl
				options={[
					{ value: 'weekly' as const, label: t('period.weekly') },
					{
						value: 'monthly' as const,
						label: t('period.monthly'),
						disabled: true,
						title: t('period.monthlyComingSoon'),
					},
				]}
				value={period}
				onChange={setPeriod}
				variant="segment"
				size="sm"
			/>

			{/* Empty state */}
			{!hasData && (
				<div className="card p-8 text-center space-y-2">
					<p className="text-body">{t('empty.noFoodEntries')}</p>
					<p className="text-sm text-label">{t('empty.startLogging')}</p>
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

			{/* Frequency Ranking — shows for any entries */}
			{data.entries.length > 0 && (
				<>
					<hr className="border-[var(--border-default)]" />
					<FrequencyRanking entries={data.entries} data={data} />
				</>
			)}
		</div>
	);
}
