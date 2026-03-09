import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useItemById } from '@/features/tracking';
import { useCategoryDetailViewModel, useItemAccentColorById } from '../hooks/use-stats-view-models';
import { getDeltaSummaryParts, SENTIMENT_COLORS } from '../utils/stats-engine';
import CategoryTrendChart from './CategoryTrendChart';
import MonthCalendarView from './MonthCalendarView';
import YearlyActivityGrid from './YearlyActivityGrid';
import CategoryMostLogged from './CategoryMostLogged';

export default function CategoryDetailPage() {
	const { categoryId } = useParams<{ categoryId: string }>();
	const navigate = useNavigate();
	const { t } = useTranslation('stats');
	const [selectedWeekIndex, setSelectedWeekIndex] = useState<number | null>(null);
	const viewModel = useCategoryDetailViewModel(categoryId);
	const itemById = useItemById();
	const itemAccentColorById = useItemAccentColorById();

	const category = viewModel?.category;
	const weeklyStats = viewModel?.weeklyStats ?? [];
	const baselineAvg = viewModel?.baselineAvg ?? 0;
	const currentCount = viewModel?.currentCount ?? 0;
	const delta = viewModel?.delta ?? 0;
	const deltaPercent = viewModel?.deltaPercent ?? 0;
	const daysElapsed = viewModel?.daysElapsed ?? 7;
	const categoryEntries = viewModel?.categoryEntries ?? [];
	const daysSinceLastLogged = viewModel?.daysSinceLastLogged ?? null;
	const sentiment = category?.sentiment ?? 'neutral';
	const color = SENTIMENT_COLORS[sentiment];

	if (!category) {
		return (
			<div className="flex flex-col items-center justify-center py-24 gap-4">
				<p className="text-label">{t('categoryDetail.notFound')}</p>
				<button onClick={() => navigate('/stats')} className="btn btn-secondary btn-sm">
					{t('categoryDetail.goBack')}
				</button>
			</div>
		);
	}

	const summary = getDeltaSummaryParts(deltaPercent, delta);
	const deltaUnit = t('categoryDetail.event', { count: Math.round(Math.abs(delta)) });
	const deltaEventsText = summary.isStable ? null : `(${summary.sign}${summary.deltaValueText} ${deltaUnit})`;
	const comparisonText = t('categoryDetail.comparedToAverage');

	return (
		<div className="space-y-6 pb-4">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
					<h1 className="text-xl font-bold text-heading">{category.name}</h1>
				</div>
				<button
					onClick={() => navigate('/stats')}
					className="p-2 -mr-2 text-label hover:text-heading transition-colors"
				>
					<X className="w-5 h-5" />
				</button>
			</div>

			{/* Summary stats */}
			<div className="space-y-2">
				{sentiment === 'limit' && (
					<p className="card inline-flex self-start rounded-full px-3 py-1 text-xs font-semibold text-heading">
						{t('categoryDetail.daysSinceLastLogged', { count: daysSinceLastLogged ?? 0 })}
					</p>
				)}

				<div className="card p-4 space-y-1">
					<div className="text-sm font-semibold text-heading">
						{t('categoryDetail.thisWeek', { count: currentCount })}
						{daysElapsed < 7 && (
							<span className="text-xs font-normal text-label">
								{' '}
								({t('categoryDetail.partialWeek', { day: daysElapsed })})
							</span>
						)}
					</div>
					{!summary.isStable && (
						<div className="flex items-baseline gap-1.5 pt-1">
							<span className="text-lg font-bold" style={{ color }}>
								{summary.changeText}
							</span>
							{deltaEventsText && <span className="text-xs text-label">{deltaEventsText}</span>}
							<span className="text-xs text-label">• {comparisonText}</span>
						</div>
					)}
				</div>
			</div>

			{/* Trend chart */}
			<CategoryTrendChart
				weeks={weeklyStats}
				baselineAvg={baselineAvg}
				sentiment={sentiment}
				selectedWeekIndex={selectedWeekIndex}
				onSelectWeek={setSelectedWeekIndex}
			/>

			{/* Month calendar view */}
			<MonthCalendarView entries={categoryEntries} sentiment={sentiment} />

			{/* Yearly activity grid */}
			<YearlyActivityGrid entries={categoryEntries} sentiment={sentiment} />

			{/* Most logged items in this category */}
			<CategoryMostLogged
				entries={categoryEntries}
				itemById={itemById}
				itemAccentColorById={itemAccentColorById}
				sentiment={sentiment}
			/>
		</div>
	);
}
