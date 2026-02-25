import { useTranslation } from 'react-i18next';
import type { CategorySentiment } from '@/shared/lib/types';
import { cn } from '@/shared/lib/cn';

const SENTIMENT_COLORS: Record<CategorySentiment, string> = {
	positive: 'var(--color-success)',
	limit: 'var(--color-danger)',
	neutral: 'var(--color-neutral)',
};

interface WeekData {
	weekNumber: number;
	count: number;
	percentChange: number | null;
}

interface WeekHistoryGridProps {
	weeks: WeekData[];
	currentWeekIndex: number;
	selectedWeekIndex: number | null;
	sentiment: CategorySentiment;
	onSelectWeek: (index: number) => void;
}

export default function WeekHistoryGrid({
	weeks,
	currentWeekIndex,
	selectedWeekIndex,
	sentiment,
	onSelectWeek,
}: WeekHistoryGridProps) {
	const { t } = useTranslation('stats');
	const color = SENTIMENT_COLORS[sentiment];

	return (
		<div className="space-y-3">
			<h3 className="text-sm font-semibold text-heading">{t('categoryDetail.last8Weeks')}</h3>
			<div className="grid grid-cols-4 gap-2">
				{weeks.map((week, index) => {
					const isCurrentWeek = index === currentWeekIndex;
					const isSelected = index === selectedWeekIndex;

					return (
						<button
							key={week.weekNumber}
							onClick={() => onSelectWeek(index)}
							className={cn(
								'card px-2 py-2.5 flex flex-col items-center text-center transition-all',
								isSelected && 'ring-1',
							)}
							style={
								{
									borderLeftWidth: isCurrentWeek ? '3px' : undefined,
									borderLeftColor: isCurrentWeek ? color : undefined,
									'--tw-ring-color': isSelected ? color : undefined,
								} as React.CSSProperties
							}
						>
							<div className="text-[11px] font-medium text-label">
								{t('categoryDetail.weekLabel', { week: week.weekNumber })}
							</div>
							<div className="text-base font-bold text-heading">{week.count}</div>
							<div className="text-[11px] font-medium" style={{ color: getChangeColor(week.percentChange, sentiment) }}>
								{formatChange(week.percentChange)}
							</div>
						</button>
					);
				})}
			</div>
		</div>
	);
}

function getChangeColor(percentChange: number | null, sentiment: CategorySentiment): string {
	if (percentChange === null || percentChange === 0) return 'var(--text-muted)';
	// For limit categories: increase is bad (danger), decrease is good (success)
	// For positive categories: increase is good (success), decrease is bad (danger)
	// For neutral: just use muted
	if (sentiment === 'neutral') return 'var(--text-secondary)';
	const increaseIsBad = sentiment === 'limit';
	if (percentChange > 0) return increaseIsBad ? 'var(--color-danger)' : 'var(--color-success)';
	return increaseIsBad ? 'var(--color-success)' : 'var(--color-danger)';
}

function formatChange(percentChange: number | null): string {
	if (percentChange === null) return '--';
	if (percentChange === 0) return '0%';
	const sign = percentChange > 0 ? '+' : '';
	return `${sign}${Math.round(percentChange)}%`;
}
