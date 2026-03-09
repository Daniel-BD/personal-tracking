import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTrackerData } from '@/shared/store/hooks';
import { formatDateLocal } from '@/shared/lib/date-utils';
import { filterEntriesByItem, filterEntriesByDateRange } from '@/features/tracking';
import {
	getLastNWeeks,
	getDaysElapsedInCurrentWeek,
	getDeltaSummaryParts,
	getItemAccentColor,
} from '../utils/stats-engine';
import { findItemWithCategories } from '@/shared/lib/types';
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
	const data = useTrackerData();
	const [selectedWeekIndex, setSelectedWeekIndex] = useState<number | null>(null);

	// eslint-disable-next-line react-hooks/exhaustive-deps -- recalculate weeks when entries change
	const weeks = useMemo(() => getLastNWeeks(8), [data.entries]);
	const currentWeek = weeks[weeks.length - 1];
	const daysElapsed = currentWeek ? getDaysElapsedInCurrentWeek(currentWeek.start) : 7;

	const found = useMemo(() => (itemId ? findItemWithCategories(data, itemId) : undefined), [data, itemId]);
	const item = found?.item;
	const itemCategories = useMemo(() => found?.categories ?? [], [found]);

	// Resolve default categories for this item
	const defaultCategories = useMemo(() => {
		if (!item) return [];
		return item.categories
			.map((catId) => {
				const cat = itemCategories.find((c) => c.id === catId);
				return cat ?? null;
			})
			.filter((c): c is NonNullable<typeof c> => c !== null);
	}, [item, itemCategories]);

	const accentColor = useMemo(() => getItemAccentColor(item?.categories ?? [], itemCategories), [item, itemCategories]);

	// Calculate weekly data for this item
	const weeklyStats = useMemo(() => {
		if (!itemId) return [];
		return weeks.map((week) => {
			const range = { start: formatDateLocal(week.start), end: formatDateLocal(week.end) };
			const weekEntries = filterEntriesByItem(filterEntriesByDateRange(data.entries, range), itemId);
			return {
				weekKey: week.key,
				label: week.key,
				count: weekEntries.length,
				start: week.start,
				end: week.end,
				entries: weekEntries,
			};
		});
	}, [weeks, itemId, data.entries]);

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
			<MonthCalendarView
				entries={data.entries}
				itemId={itemId!}
				data={data}
				sentiment="neutral"
				accentColor={accentColor}
			/>

			{/* Yearly activity grid */}
			<YearlyActivityGrid
				entries={data.entries}
				itemId={itemId!}
				data={data}
				sentiment="neutral"
				accentColor={accentColor}
			/>
		</div>
	);
}
