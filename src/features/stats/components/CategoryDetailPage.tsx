import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTrackerData } from '@/shared/store/hooks';
import { formatDateLocal } from '@/shared/lib/date-utils';
import { filterEntriesByCategory, filterEntriesByDateRange } from '@/features/tracking';
import {
	getLastNWeeks,
	getDaysElapsedInCurrentWeek,
	getDeltaSummaryParts,
	SENTIMENT_COLORS,
} from '../utils/stats-engine';
import CategoryTrendChart from './CategoryTrendChart';
import MonthCalendarView from './MonthCalendarView';
import YearlyActivityGrid from './YearlyActivityGrid';
import CategoryMostLogged from './CategoryMostLogged';

export default function CategoryDetailPage() {
	const { categoryId } = useParams<{ categoryId: string }>();
	const navigate = useNavigate();
	const { t } = useTranslation('stats');
	const data = useTrackerData();
	const [selectedWeekIndex, setSelectedWeekIndex] = useState<number | null>(null);

	// eslint-disable-next-line react-hooks/exhaustive-deps -- recalculate weeks when entries change
	const weeks = useMemo(() => getLastNWeeks(8), [data.entries]);
	const currentWeek = weeks[weeks.length - 1];
	const daysElapsed = currentWeek ? getDaysElapsedInCurrentWeek(currentWeek.start) : 7;

	// Find the category across food and activity
	const category = useMemo(() => {
		return (
			data.foodCategories.find((c) => c.id === categoryId) || data.activityCategories.find((c) => c.id === categoryId)
		);
	}, [data.foodCategories, data.activityCategories, categoryId]);

	// Calculate weekly data for this category
	const weeklyStats = useMemo(() => {
		if (!categoryId) return [];
		return weeks.map((week) => {
			const range = { start: formatDateLocal(week.start), end: formatDateLocal(week.end) };
			const weekEntries = filterEntriesByCategory(filterEntriesByDateRange(data.entries, range), categoryId, data);
			return {
				weekKey: week.key,
				label: week.key,
				count: weekEntries.length,
				start: week.start,
				end: week.end,
				entries: weekEntries,
			};
		});
	}, [weeks, categoryId, data]);

	// Baseline: average of the 4 weeks preceding the current (last) week
	const baselineAvg = useMemo(() => {
		const baselineWeeks = weeklyStats.slice(-5, -1);
		if (baselineWeeks.length === 0) return 0;
		const sum = baselineWeeks.reduce((s, w) => s + w.count, 0);
		return sum / baselineWeeks.length;
	}, [weeklyStats]);

	// Current week stats
	const currentCount = weeklyStats.length > 0 ? weeklyStats[weeklyStats.length - 1].count : 0;
	const proratedBaseline = baselineAvg * (daysElapsed / 7);
	const delta = currentCount - proratedBaseline;
	const deltaPercent = proratedBaseline === 0 ? (currentCount > 0 ? 1 : 0) : delta / proratedBaseline;

	const sentiment = category?.sentiment ?? 'neutral';
	const color = SENTIMENT_COLORS[sentiment];

	// All entries for this category (used by most-logged section)
	const categoryEntries = useMemo(() => {
		if (!categoryId) return [];
		return filterEntriesByCategory(data.entries, categoryId, data);
	}, [categoryId, data.entries, data.activityItems, data.foodItems, data.activityCategories, data.foodCategories]);

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

			{/* Trend chart */}
			<CategoryTrendChart
				weeks={weeklyStats}
				baselineAvg={baselineAvg}
				sentiment={sentiment}
				selectedWeekIndex={selectedWeekIndex}
				onSelectWeek={setSelectedWeekIndex}
			/>

			{/* Month calendar view */}
			<MonthCalendarView entries={data.entries} categoryId={categoryId!} data={data} sentiment={sentiment} />

			{/* Yearly activity grid */}
			<YearlyActivityGrid entries={data.entries} categoryId={categoryId!} data={data} sentiment={sentiment} />

			{/* Most logged items in this category */}
			<CategoryMostLogged entries={categoryEntries} data={data} sentiment={sentiment} />
		</div>
	);
}
