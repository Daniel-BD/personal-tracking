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
		<div className="space-y-4 pb-6 sm:space-y-6">
			<header>
				<h1 className="text-2xl font-bold">{t('title')}</h1>
			</header>

			{!hasData && (
				<div className="card space-y-2 p-8 text-center">
					<p className="text-body">{t('empty.noFoodEntries')}</p>
					<p className="text-sm text-label">{t('empty.startLogging')}</p>
				</div>
			)}

			{hasData && (
				<>
					<BalanceOverview weeklyData={weeklyData} />

					<hr className="border-[var(--border-default)]" />
					<GoalDashboard />
					<ActionableCategories entries={entries} dashboardCards={dashboardCards} />
					<CategoryComposition weeklyData={weeklyData} />
				</>
			)}

			{entries.length > 0 && (
				<>
					<hr className="border-[var(--border-default)]" />
					<FrequencyRanking entries={entries} />
				</>
			)}
		</div>
	);
}
