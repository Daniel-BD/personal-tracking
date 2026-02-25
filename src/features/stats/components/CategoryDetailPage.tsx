import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTrackerData } from '@/shared/store/hooks';
import { formatDateLocal } from '@/shared/lib/date-utils';
import type { CategorySentiment } from '@/shared/lib/types';
import { filterEntriesByCategory, filterEntriesByDateRange } from '@/features/tracking';
import {
	getLastNWeeks,
	getDaysElapsedInCurrentWeek,
	getWeekNumber,
	calcActualDeltaPercent,
	formatChangeText,
} from '../utils/stats-engine';
import CategoryTrendChart from './CategoryTrendChart';
import WeekHistoryGrid from './WeekHistoryGrid';

const SENTIMENT_COLORS: Record<CategorySentiment, string> = {
	positive: 'var(--color-success)',
	limit: 'var(--color-danger)',
	neutral: 'var(--color-neutral)',
};

export default function CategoryDetailPage() {
	const { categoryId } = useParams<{ categoryId: string }>();
	const navigate = useNavigate();
	const { t } = useTranslation('stats');
	const data = useTrackerData();
	const [selectedWeekIndex, setSelectedWeekIndex] = useState<number | null>(null);

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

	// Baseline: average of weeks at indices 3–6 (the 4 weeks before the current week)
	const baselineAvg = useMemo(() => {
		const baselineWeeks = weeklyStats.slice(3, 7);
		const sum = baselineWeeks.reduce((s, w) => s + w.count, 0);
		return sum / 4;
	}, [weeklyStats]);

	// Current week stats
	const currentCount = weeklyStats.length > 0 ? weeklyStats[weeklyStats.length - 1].count : 0;
	const proratedBaseline = baselineAvg * (daysElapsed / 7);
	const delta = currentCount - proratedBaseline;
	const deltaPercent = proratedBaseline === 0 ? (currentCount > 0 ? 1 : 0) : delta / proratedBaseline;
	const isStable = Math.abs(deltaPercent) < 0.1;

	// Actual (non-prorated) comparison: current count vs full-week baseline
	const actualDeltaPercent = calcActualDeltaPercent(currentCount, baselineAvg);

	const sentiment = category?.sentiment ?? 'neutral';
	const color = SENTIMENT_COLORS[sentiment];

	// Week history data (week number, count, % change from previous)
	const weekHistoryData = useMemo(() => {
		return weeklyStats.map((week, i) => {
			const prev = i > 0 ? weeklyStats[i - 1].count : null;
			const percentChange =
				prev === null ? null : prev === 0 ? (week.count > 0 ? 100 : 0) : ((week.count - prev) / prev) * 100;
			return {
				weekNumber: getWeekNumber(week.weekKey),
				count: week.count,
				percentChange,
			};
		});
	}, [weeklyStats]);

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

	const avgFormatted = Number.isInteger(baselineAvg) ? baselineAvg.toString() : baselineAvg.toFixed(1);
	const absPercent = Math.round(Math.abs(deltaPercent) * 100);
	const changeSign = deltaPercent > 0 ? '+' : '\u2212';
	const changeText = isStable ? '' : `${changeSign}${absPercent}%`;
	const deltaRaw = Math.abs(delta);
	const deltaFormatted = Number.isInteger(deltaRaw) ? deltaRaw.toString() : deltaRaw.toFixed(1);
	const deltaUnit = t('categoryDetail.event', { count: Math.round(deltaRaw) });
	const deltaEventsText = isStable ? null : `(${changeSign}${deltaFormatted} ${deltaUnit})`;

	// Actual change text (non-prorated)
	const actualChangeText = formatChangeText(actualDeltaPercent);

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
				<div className="text-xs text-label">{t('categoryDetail.baselineAvg', { avg: avgFormatted })}</div>
				{!isStable && (
					<div className="flex items-baseline gap-1.5 pt-1">
						<span className="text-lg font-bold" style={{ color }}>
							{changeText}
						</span>
						{deltaEventsText && <span className="text-xs text-label">{deltaEventsText}</span>}
						{daysElapsed < 7 && <span className="text-[10px] text-label">{t('categoryDetail.projected')}</span>}
					</div>
				)}
				{daysElapsed < 7 && (
					<div className="text-[11px] text-[var(--text-tertiary)]">
						{t('categoryDetail.currentlyLabel', { change: actualChangeText })}
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

			{/* Week history grid */}
			<WeekHistoryGrid
				weeks={weekHistoryData}
				selectedWeekIndex={selectedWeekIndex}
				sentiment={sentiment}
				onSelectWeek={setSelectedWeekIndex}
			/>
		</div>
	);
}
