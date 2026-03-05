import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTrackerData } from '@/shared/store/hooks';
import { formatDateLocal } from '@/shared/lib/date-utils';
import { filterEntriesByCategory, filterEntriesByItem, filterEntriesByDateRange } from '@/features/tracking';
import {
	getLastNWeeks,
	getDaysElapsedInCurrentWeek,
	getWeekNumber,
	calcActualDeltaPercent,
	formatChangeText,
	SENTIMENT_COLORS,
} from '../utils/stats-engine';
import CategoryTrendChart from './CategoryTrendChart';
import WeekHistoryGrid from './WeekHistoryGrid';
import MonthCalendarView from './MonthCalendarView';
import YearlyActivityGrid from './YearlyActivityGrid';

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

	// Find the entity across categories and items
	const { entity, isItem, defaultCategories } = useMemo(() => {
		const category =
			data.foodCategories.find((c) => c.id === categoryId) || data.activityCategories.find((c) => c.id === categoryId);
		const item = data.foodItems.find((i) => i.id === categoryId) || data.activityItems.find((i) => i.id === categoryId);

		let defaultCategories: typeof data.foodCategories = [];
		if (item) {
			defaultCategories = [
				...data.foodCategories.filter((c) => item.categories.includes(c.id)),
				...data.activityCategories.filter((c) => item.categories.includes(c.id)),
			];
		}

		return {
			entity: category || item,
			isItem: !!item,
			defaultCategories,
		};
	}, [data, categoryId]);

	// Calculate weekly data for this entity
	const weeklyStats = useMemo(() => {
		if (!categoryId || !entity) return [];
		return weeks.map((week) => {
			const range = { start: formatDateLocal(week.start), end: formatDateLocal(week.end) };
			const dateEntries = filterEntriesByDateRange(data.entries, range);
			const weekEntries = isItem
				? filterEntriesByItem(dateEntries, categoryId)
				: filterEntriesByCategory(dateEntries, categoryId, data);

			return {
				weekKey: week.key,
				label: week.key,
				count: weekEntries.length,
				start: week.start,
				end: week.end,
				entries: weekEntries,
			};
		});
	}, [weeks, categoryId, data, isItem, entity]);

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
	const isStable = Math.abs(deltaPercent) < 0.1;

	// Actual (non-prorated) comparison: current count vs full-week baseline
	const actualDeltaPercent = calcActualDeltaPercent(currentCount, baselineAvg);

	const sentiment = entity && 'sentiment' in entity ? entity.sentiment : 'neutral';
	const color = isItem ? 'var(--color-activity)' : SENTIMENT_COLORS[sentiment];

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

	if (!entity) {
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
			<div className="flex items-start justify-between">
				<div className="flex flex-col gap-1.5">
					<div className="flex items-center gap-2">
						<div className="w-2.5 h-2.5 rounded-full mt-1" style={{ backgroundColor: color }} />
						<h1 className="text-xl font-bold text-heading">{entity.name}</h1>
					</div>
					{isItem && defaultCategories.length > 0 && (
						<div className="flex flex-wrap gap-1 mt-1 pl-4">
							{defaultCategories.map((cat) => (
								<span key={cat.id} className="text-[10px] px-2 py-0.5 rounded-full bg-inset text-label font-medium">
									{cat.name}
								</span>
							))}
						</div>
					)}
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

			{/* Month calendar view */}
			<MonthCalendarView entries={data.entries} categoryId={categoryId!} data={data} sentiment={sentiment} />

			{/* Yearly activity grid */}
			<YearlyActivityGrid entries={data.entries} categoryId={categoryId!} data={data} sentiment={sentiment} />
		</div>
	);
}
