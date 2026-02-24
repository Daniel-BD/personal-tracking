import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, ResponsiveContainer, Cell } from 'recharts';
import type { CategorySentiment } from '@/shared/lib/types';

const SENTIMENT_COLORS: Record<CategorySentiment, string> = {
	positive: 'var(--color-success)',
	limit: 'var(--color-danger)',
	neutral: 'var(--color-neutral)',
};

interface WeekBreakdownTooltipProps {
	weekNumber: number;
	total: number;
	dailyData: Array<{ day: string; count: number }>;
	sentiment: CategorySentiment;
}

export default function WeekBreakdownTooltip({ weekNumber, total, dailyData, sentiment }: WeekBreakdownTooltipProps) {
	const { t } = useTranslation('stats');
	const color = SENTIMENT_COLORS[sentiment];
	const maxCount = Math.max(...dailyData.map((d) => d.count), 1);

	return (
		<div className="card p-3 space-y-2 shadow-[var(--shadow-elevated)]">
			<div className="flex items-center justify-between gap-4">
				<span className="text-sm font-semibold text-heading">
					{t('categoryDetail.weekBreakdownTitle', { week: weekNumber })}
				</span>
				<span className="text-xs text-label">{t('categoryDetail.weekBreakdownTotal', { count: total })}</span>
			</div>
			<div className="h-20">
				<ResponsiveContainer width="100%" height="100%">
					<BarChart data={dailyData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
						<XAxis
							dataKey="day"
							tickLine={false}
							axisLine={false}
							tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
						/>
						<Bar dataKey="count" radius={[3, 3, 0, 0]} isAnimationActive={false}>
							{dailyData.map((entry, index) => (
								<Cell
									key={index}
									fill={entry.count > 0 ? color : 'var(--bg-inset)'}
									opacity={entry.count > 0 ? 0.4 + (entry.count / maxCount) * 0.6 : 0.3}
								/>
							))}
						</Bar>
					</BarChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
}
