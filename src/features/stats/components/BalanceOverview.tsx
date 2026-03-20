import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import BalanceScoreMeter from '@/shared/ui/BalanceScoreMeter';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import type { WeeklyData } from '../utils/stats-engine';
import { calculateBalanceScore, formatWeekLabel } from '../utils/stats-engine';
import { getWeeklyVerticalBarCategoryAxisProps, weeklyVerticalBarValueAxisProps } from '../utils/weekly-chart-axis';
import BalanceScoreTrendChart from './BalanceScoreTrendChart';

interface BalanceOverviewProps {
	weeklyData: WeeklyData[];
}

export default function BalanceOverview({ weeklyData }: BalanceOverviewProps) {
	const { t } = useTranslation('stats');
	const data = useMemo(() => {
		return weeklyData.map((week) => {
			const { positive, neutral, limit } = week.sentimentCounts;
			const total = positive + neutral + limit;

			return {
				week: formatWeekLabel(week.start),
				positive: total > 0 ? (positive / total) * 100 : 0,
				neutral: total > 0 ? (neutral / total) * 100 : 0,
				limit: total > 0 ? (limit / total) * 100 : 0,
			};
		});
	}, [weeklyData]);

	const currentWeek = weeklyData[weeklyData.length - 1];
	const currentScore = useMemo(() => {
		if (!currentWeek) return 0;
		return calculateBalanceScore(currentWeek);
	}, [currentWeek]);

	const isMobile = useIsMobile();

	return (
		<div className="space-y-4 sm:space-y-6">
			<BalanceScoreMeter
				title={t('balanceOverview.scoreTitle')}
				description={t('balanceOverview.scoreMeterDescription')}
				score={currentScore}
				positive={currentWeek?.sentimentCounts.positive ?? 0}
				limit={currentWeek?.sentimentCounts.limit ?? 0}
			/>

			<div className="card space-y-3 p-4 sm:p-6">
				<h3 className="text-lg font-semibold">{t('balanceOverview.trendTitle')}</h3>
				<BalanceScoreTrendChart weeklyData={weeklyData} />
			</div>

			<div className="card space-y-4 p-4 sm:p-6">
				<h3 className="text-lg font-semibold">{t('balanceOverview.weeklyBreakdownTitle')}</h3>
				<ResponsiveContainer width="100%" height={280}>
					<BarChart
						data={data}
						layout="vertical"
						margin={isMobile ? { top: 5, right: 10, left: 5, bottom: 5 } : { top: 5, right: 30, left: 80, bottom: 5 }}
					>
						<XAxis {...weeklyVerticalBarValueAxisProps} />
						<YAxis dataKey="week" {...getWeeklyVerticalBarCategoryAxisProps(isMobile)} />
						<Tooltip
							formatter={(value: number | undefined) => (value !== undefined ? `${Math.round(value)}%` : 'N/A')}
							contentStyle={{
								background: 'var(--bg-card)',
								border: '1px solid var(--border-default)',
								borderRadius: '8px',
							}}
						/>
						<Bar
							dataKey="positive"
							stackId="sentiment"
							fill="var(--color-success)"
							name={t('balanceOverview.chartPositive')}
						/>
						<Bar
							dataKey="neutral"
							stackId="sentiment"
							fill="var(--color-neutral)"
							name={t('balanceOverview.chartNeutral')}
						/>
						<Bar
							dataKey="limit"
							stackId="sentiment"
							fill="var(--color-danger)"
							name={t('balanceOverview.chartLimit')}
						/>
					</BarChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
}
