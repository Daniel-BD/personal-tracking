import { useTranslation } from 'react-i18next';
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
			<div className="flex items-end justify-between gap-1 h-20">
				{dailyData.map((entry, index) => {
					const heightPercent = maxCount > 0 ? (entry.count / maxCount) * 100 : 0;
					return (
						<div key={index} className="flex flex-col items-center flex-1 h-full">
							<div className="flex-1 flex items-end w-full">
								<div
									className="w-full rounded-t-[3px] min-h-[4px]"
									style={{
										height: `${Math.max(heightPercent, 6)}%`,
										backgroundColor: entry.count > 0 ? color : 'var(--bg-inset)',
										opacity: entry.count > 0 ? 0.4 + (entry.count / maxCount) * 0.6 : 0.3,
									}}
								/>
							</div>
							<span className="text-[11px] font-semibold mt-1 text-heading">{entry.count}</span>
							<span className="text-[11px] text-[var(--text-tertiary)] leading-tight">{entry.day}</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}
