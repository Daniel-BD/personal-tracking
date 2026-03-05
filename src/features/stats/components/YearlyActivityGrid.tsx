import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Entry, TrackerData } from '@/shared/lib/types';
import type { CategorySentiment } from '@/shared/lib/types';
import { formatDateLocal } from '@/shared/lib/date-utils';
import { filterEntriesByCategory, filterEntriesByItem, filterEntriesByDateRange } from '@/features/tracking';

const SENTIMENT_COLORS: Record<CategorySentiment, string> = {
	positive: 'var(--color-success)',
	limit: 'var(--color-danger)',
	neutral: 'var(--color-neutral)',
};

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_LABELS = ['', 'M', '', 'W', '', 'F', ''];

interface YearlyActivityGridProps {
	entries: Entry[];
	categoryId: string;
	data: TrackerData;
	sentiment: CategorySentiment;
	isItem?: boolean;
}

/** Size of each grid square in pixels */
const CELL_SIZE = 11;
const CELL_GAP = 2;
const CELL_STEP = CELL_SIZE + CELL_GAP;

export default function YearlyActivityGrid({ entries, categoryId, data, sentiment, isItem }: YearlyActivityGridProps) {
	const { t } = useTranslation('stats');
	const [yearOffset, setYearOffset] = useState(0);
	const color = isItem ? 'var(--color-activity)' : SENTIMENT_COLORS[sentiment];
	const targetYear = new Date().getFullYear() + yearOffset;

	// Build date -> count map for the year
	const dayCounts = useMemo(() => {
		const range = {
			start: `${targetYear}-01-01`,
			end: `${targetYear}-12-31`,
		};
		const dateEntries = filterEntriesByDateRange(entries, range);
		const filtered = isItem
			? filterEntriesByItem(dateEntries, categoryId)
			: filterEntriesByCategory(dateEntries, categoryId, data);

		const counts = new Map<string, number>();
		for (const entry of filtered) {
			counts.set(entry.date, (counts.get(entry.date) || 0) + 1);
		}
		return counts;
	}, [entries, categoryId, data, targetYear, isItem]);

	// Build weekly columns: each column is 7 days (Mon=0 to Sun=6)
	const { weeks, monthPositions } = useMemo(() => {
		const jan1 = new Date(targetYear, 0, 1);
		// Start from the Monday on or before Jan 1
		const jan1Dow = jan1.getDay() === 0 ? 6 : jan1.getDay() - 1; // Mon=0
		const gridStart = new Date(jan1);
		gridStart.setDate(gridStart.getDate() - jan1Dow);

		const dec31 = new Date(targetYear, 11, 31);
		const weeksArr: Array<Array<{ dateStr: string; count: number; inYear: boolean } | null>> = [];

		const current = new Date(gridStart);
		while (current <= dec31 || current.getDay() !== 1) {
			// Start a new week on Monday
			if (current.getDay() === 1 || weeksArr.length === 0) {
				weeksArr.push([]);
			}
			const week = weeksArr[weeksArr.length - 1];
			const dateStr = formatDateLocal(current);
			const inYear = current.getFullYear() === targetYear;
			week.push({
				dateStr,
				count: inYear ? dayCounts.get(dateStr) || 0 : 0,
				inYear,
			});
			current.setDate(current.getDate() + 1);

			// Stop after completing the week that contains Dec 31
			if (current.getDay() === 1 && current > dec31) break;
		}

		// Calculate month label positions (which week column each month starts in)
		const positions: Array<{ label: string; weekIndex: number }> = [];
		let lastMonth = -1;
		for (let wi = 0; wi < weeksArr.length; wi++) {
			for (const day of weeksArr[wi]) {
				if (day && day.inYear) {
					const m = parseInt(day.dateStr.substring(5, 7), 10) - 1;
					if (m !== lastMonth) {
						positions.push({ label: MONTH_LABELS[m], weekIndex: wi });
						lastMonth = m;
					}
				}
			}
		}

		return { weeks: weeksArr, monthPositions: positions };
	}, [targetYear, dayCounts]);

	const gridWidth = weeks.length * CELL_STEP;
	const gridHeight = 7 * CELL_STEP;
	const labelWidth = 20;

	return (
		<div className="space-y-3">
			{/* Header with navigation */}
			<div className="flex items-center justify-between">
				<h3 className="text-sm font-semibold text-heading">{t('categoryDetail.yearView')}</h3>
				<div className="flex items-center gap-1">
					<button
						onClick={() => setYearOffset((o) => o - 1)}
						className="p-1.5 text-label hover:text-heading transition-colors rounded-md hover:bg-[var(--bg-inset)]"
					>
						<ChevronLeft className="w-4 h-4" />
					</button>
					<span className="text-xs font-medium text-heading min-w-[40px] text-center">{targetYear}</span>
					<button
						onClick={() => setYearOffset((o) => o + 1)}
						disabled={yearOffset >= 0}
						className="p-1.5 text-label hover:text-heading transition-colors rounded-md hover:bg-[var(--bg-inset)] disabled:opacity-30 disabled:cursor-not-allowed"
					>
						<ChevronRight className="w-4 h-4" />
					</button>
				</div>
			</div>

			{/* Grid */}
			<div className="card p-3 overflow-x-auto">
				{/* Month labels */}
				<div className="flex text-[9px] text-label mb-1" style={{ paddingLeft: labelWidth }}>
					{monthPositions.map((mp, i) => {
						const nextPos = monthPositions[i + 1]?.weekIndex ?? weeks.length;
						const span = nextPos - mp.weekIndex;
						return (
							<span key={mp.label} style={{ width: span * CELL_STEP, flexShrink: 0 }} className="text-left">
								{mp.label}
							</span>
						);
					})}
				</div>

				{/* Day labels + grid */}
				<div className="flex">
					{/* Day-of-week labels */}
					<div
						className="flex flex-col justify-between text-[9px] text-label shrink-0"
						style={{ width: labelWidth, height: gridHeight }}
					>
						{DAY_LABELS.map((label, i) => (
							<span key={i} style={{ height: CELL_SIZE, lineHeight: `${CELL_SIZE}px` }}>
								{label}
							</span>
						))}
					</div>

					{/* SVG grid */}
					<svg width={gridWidth} height={gridHeight} className="block">
						{weeks.map((week, wi) =>
							week.map((day, di) => {
								if (!day) return null;
								const x = wi * CELL_STEP;
								const y = di * CELL_STEP;
								const hasEntries = day.count > 0 && day.inYear;

								return (
									<rect
										key={day.dateStr}
										x={x}
										y={y}
										width={CELL_SIZE}
										height={CELL_SIZE}
										rx={2}
										fill={!day.inYear ? 'transparent' : hasEntries ? color : 'var(--bg-inset)'}
										opacity={hasEntries ? Math.min(0.4 + day.count * 0.2, 1) : 1}
									/>
								);
							}),
						)}
					</svg>
				</div>
			</div>
		</div>
	);
}
