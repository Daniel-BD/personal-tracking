import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useItemDetailViewModel } from '../hooks/use-stats-view-models';
import { getDeltaSummaryParts } from '../utils/stats-engine';
import type { CategorySentiment } from '@/shared/lib/types';
import CategoryTrendChart from './CategoryTrendChart';
import MonthCalendarView from './MonthCalendarView';
import YearlyActivityGrid from './YearlyActivityGrid';

const SENTIMENT_PILL_COLORS: Record<CategorySentiment, { bg: string; text: string }> = {
	positive: { bg: 'color-mix(in srgb, var(--color-success) 15%, var(--bg-card))', text: 'var(--color-success)' },
	limit: { bg: 'color-mix(in srgb, var(--color-danger) 15%, var(--bg-card))', text: 'var(--color-danger)' },
	neutral: { bg: 'var(--bg-inset)', text: 'var(--text-secondary)' },
};

export default function ItemDetailPage() {
	const { itemId } = useParams<{ itemId: string }>();
	const navigate = useNavigate();
	const { t } = useTranslation('stats');
	const [selectedWeekIndex, setSelectedWeekIndex] = useState<number | null>(null);
	const viewModel = useItemDetailViewModel(itemId);
	const item = viewModel?.item;
	const defaultCategories = viewModel?.defaultCategories ?? [];
	const accentColor = viewModel?.accentColor ?? 'var(--color-neutral)';
	const weeklyStats = viewModel?.weeklyStats ?? [];
	const baselineAvg = viewModel?.baselineAvg ?? 0;
	const currentCount = viewModel?.currentCount ?? 0;
	const delta = viewModel?.delta ?? 0;
	const deltaPercent = viewModel?.deltaPercent ?? 0;
	const daysElapsed = viewModel?.daysElapsed ?? 7;
	const itemEntries = viewModel?.itemEntries ?? [];

	if (!item) {
		return (
			<div className="flex flex-col items-center justify-center py-24 gap-4">
				<p className="text-label">{t('itemDetail.notFound')}</p>
				<button onClick={() => navigate('/stats')} className="btn btn-secondary btn-sm">
					{t('itemDetail.goBack')}
				</button>
			</div>
		);
	}

	const summary = getDeltaSummaryParts(deltaPercent, delta);
	const deltaUnit = t('itemDetail.event', { count: Math.round(Math.abs(delta)) });
	const deltaEventsText = summary.isStable ? null : `(${summary.sign}${summary.deltaValueText} ${deltaUnit})`;
	const comparisonText = t('itemDetail.comparedToAverage');

	return (
		<div className="space-y-6 pb-4">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: accentColor }} />
					<h1 className="text-xl font-bold text-heading">{item.name}</h1>
				</div>
				<button onClick={() => navigate(-1)} className="p-2 -mr-2 text-label hover:text-heading transition-colors">
					<X className="w-5 h-5" />
				</button>
			</div>

			{/* Default categories */}
			{defaultCategories.length > 0 && (
				<div className="space-y-2">
					<h3 className="text-xs font-semibold text-label uppercase tracking-wide">
						{t('itemDetail.defaultCategories')}
					</h3>
					<div className="flex flex-wrap gap-1.5">
						{defaultCategories.map((cat) => {
							const pillColors = SENTIMENT_PILL_COLORS[cat.sentiment];
							return (
								<button
									key={cat.id}
									type="button"
									onClick={() => navigate(`/stats/category/${cat.id}`)}
									className="text-xs font-medium px-2.5 py-1 rounded-full transition-opacity hover:opacity-85"
									style={{ backgroundColor: pillColors.bg, color: pillColors.text }}
								>
									{cat.name}
								</button>
							);
						})}
					</div>
				</div>
			)}

			{/* Summary stats */}
			<div className="card p-4 space-y-1">
				<div className="text-sm font-semibold text-heading">
					{t('itemDetail.thisWeek', { count: currentCount })}
					{daysElapsed < 7 && (
						<span className="text-xs font-normal text-label">
							{' '}
							({t('itemDetail.partialWeek', { day: daysElapsed })})
						</span>
					)}
				</div>
				{!summary.isStable && (
					<div className="flex items-baseline gap-1.5 pt-1">
						<span className="text-lg font-bold" style={{ color: accentColor }}>
							{summary.changeText}
						</span>
						{deltaEventsText && <span className="text-xs text-label">{deltaEventsText}</span>}
						<span className="text-xs text-label">• {comparisonText}</span>
					</div>
				)}
			</div>

			{/* Trend chart */}
			<CategoryTrendChart
				weeks={weeklyStats}
				baselineAvg={baselineAvg}
				sentiment="neutral"
				accentColor={accentColor}
				selectedWeekIndex={selectedWeekIndex}
				onSelectWeek={setSelectedWeekIndex}
			/>

			{/* Month calendar view */}
			<MonthCalendarView entries={itemEntries} sentiment="neutral" accentColor={accentColor} />

			{/* Yearly activity grid */}
			<YearlyActivityGrid entries={itemEntries} sentiment="neutral" accentColor={accentColor} />
		</div>
	);
}
