import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Entry, TrackerData } from '@/shared/lib/types';
import type { CategorySentiment } from '@/shared/lib/types';
import { formatDateLocal } from '@/shared/lib/date-utils';
import { filterEntriesByCategory, filterEntriesByItem, filterEntriesByDateRange } from '@/features/tracking';
import { cn } from '@/shared/lib/cn';

const SENTIMENT_COLORS: Record<CategorySentiment, string> = {
	positive: 'var(--color-success)',
	limit: 'var(--color-danger)',
	neutral: 'var(--color-neutral)',
};

const DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

interface MonthCalendarViewProps {
	entries: Entry[];
	categoryId?: string;
	itemId?: string;
	data: TrackerData;
	sentiment: CategorySentiment;
	/** Override accent color. If set, takes precedence over sentiment color. */
	accentColor?: string;
}

export default function MonthCalendarView({
	entries,
	categoryId,
	itemId,
	data,
	sentiment,
	accentColor,
}: MonthCalendarViewProps) {
	const { t } = useTranslation('stats');
	const [monthOffset, setMonthOffset] = useState(0);
	const color = accentColor ?? SENTIMENT_COLORS[sentiment];

	const { year, month, monthLabel } = useMemo(() => {
		const now = new Date();
		const d = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
		return {
			year: d.getFullYear(),
			month: d.getMonth(),
			monthLabel: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
		};
	}, [monthOffset]);

	// Build a map of date string -> count for the displayed month
	const dayCounts = useMemo(() => {
		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);
		const range = { start: formatDateLocal(firstDay), end: formatDateLocal(lastDay) };

		const dateFiltered = filterEntriesByDateRange(entries, range);
		const filtered = itemId
			? filterEntriesByItem(dateFiltered, itemId)
			: filterEntriesByCategory(dateFiltered, categoryId!, data);

		const counts = new Map<string, number>();
		for (const entry of filtered) {
			counts.set(entry.date, (counts.get(entry.date) || 0) + 1);
		}
		return counts;
	}, [entries, categoryId, itemId, data, year, month]);

	// Build calendar grid cells
	const calendarCells = useMemo(() => {
		const firstDay = new Date(year, month, 1);
		const daysInMonth = new Date(year, month + 1, 0).getDate();

		// Day of week for the 1st (0=Sun, convert to Mon-first: Mon=0, Sun=6)
		const startDow = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

		const cells: Array<{ day: number; dateStr: string; count: number } | null> = [];

		// Leading empty cells
		for (let i = 0; i < startDow; i++) {
			cells.push(null);
		}

		// Day cells
		for (let d = 1; d <= daysInMonth; d++) {
			const dateStr = formatDateLocal(new Date(year, month, d));
			cells.push({ day: d, dateStr, count: dayCounts.get(dateStr) || 0 });
		}

		return cells;
	}, [year, month, dayCounts]);

	const todayStr = formatDateLocal(new Date());

	return (
		<div className="space-y-3">
			{/* Header with navigation */}
			<div className="flex items-center justify-between">
				<h3 className="text-sm font-semibold text-heading">{t('categoryDetail.monthView')}</h3>
				<div className="flex items-center gap-1">
					<button
						onClick={() => setMonthOffset((o) => o - 1)}
						className="p-1.5 text-label hover:text-heading transition-colors rounded-md hover:bg-[var(--bg-inset)]"
					>
						<ChevronLeft className="w-4 h-4" />
					</button>
					<span className="text-xs font-medium text-heading min-w-[120px] text-center">{monthLabel}</span>
					<button
						onClick={() => setMonthOffset((o) => o + 1)}
						disabled={monthOffset >= 0}
						className="p-1.5 text-label hover:text-heading transition-colors rounded-md hover:bg-[var(--bg-inset)] disabled:opacity-30 disabled:cursor-not-allowed"
					>
						<ChevronRight className="w-4 h-4" />
					</button>
				</div>
			</div>

			{/* Calendar grid */}
			<div className="card p-3">
				{/* Day-of-week headers */}
				<div className="grid grid-cols-7 gap-1 mb-1">
					{DAY_LABELS.map((label) => (
						<div key={label} className="text-[10px] font-medium text-label text-center">
							{label}
						</div>
					))}
				</div>

				{/* Day cells */}
				<div className="grid grid-cols-7 gap-1">
					{calendarCells.map((cell, i) => {
						if (!cell) {
							return <div key={`empty-${i}`} className="aspect-square" />;
						}

						const hasEntries = cell.count > 0;
						const isToday = cell.dateStr === todayStr;

						return (
							<div
								key={cell.dateStr}
								className={cn(
									'aspect-square rounded-md flex flex-col items-center justify-center relative text-[11px]',
									hasEntries ? 'font-semibold' : 'text-label',
									isToday && !hasEntries && 'ring-1 ring-[var(--border-default)]',
								)}
								style={
									hasEntries
										? {
												backgroundColor: `color-mix(in srgb, ${color} 18%, var(--bg-card))`,
												border: `1px solid color-mix(in srgb, ${color} 35%, transparent)`,
												color: color,
											}
										: undefined
								}
							>
								<span className={cn(hasEntries && cell.count > 0 ? '-mt-1' : '')}>{cell.day}</span>
								{hasEntries && (
									<span className="text-[9px] font-bold absolute bottom-0.5 leading-none">{cell.count}</span>
								)}
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
