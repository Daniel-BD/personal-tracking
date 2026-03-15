import { useTranslation } from 'react-i18next';
import { useDashboardCards, useEntries } from '@/shared/store/hooks';
import BalanceOverview from './BalanceOverview';
import ActionableCategories from './ActionableCategories';
import CategoryComposition from './CategoryComposition';
import GoalDashboard from './GoalDashboard';
import FrequencyRanking from './FrequencyRanking';
import { useWeeklyFoodStats } from '../hooks/use-stats-view-models';

export default function StatsPage() {
	const { t } = useTranslation('stats');
	const entries = useEntries();
	const dashboardCards = useDashboardCards();
	const { weeklyData, hasData } = useWeeklyFoodStats();

	return (
		<div className="space-y-4 sm:space-y-6 pb-6">
			{/* Header */}
			<div className="space-y-2">
				<h1 className="text-2xl font-bold">{t('title')}</h1>
				<p className="text-body">{t('subtitle')}</p>
			</div>

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
					<ActionableCategories weeklyData={weeklyData} dashboardCards={dashboardCards} />

					{/* Section 2: Category Composition */}
					<CategoryComposition weeklyData={weeklyData} />
				</>
			)}

			{/* Frequency Ranking — shows for any entries */}
			{entries.length > 0 && (
				<>
					<hr className="border-[var(--border-default)]" />
					<FrequencyRanking entries={entries} />
				</>
			)}
		</div>
	);
}
