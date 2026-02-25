import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Dot } from 'recharts';
import type { CategorySentiment } from '@/shared/lib/types';
import type { Entry } from '@/shared/lib/types';
import { formatWeekLabel, getWeekNumber, getDailyBreakdown } from '../utils/stats-engine';
import WeekBreakdownTooltip from './WeekBreakdownTooltip';

const SENTIMENT_COLORS: Record<CategorySentiment, string> = {
	positive: 'var(--color-success)',
	limit: 'var(--color-danger)',
	neutral: 'var(--color-neutral)',
};

interface ChartWeek {
	label: string;
	count: number;
	weekKey: string;
	start: Date;
	end: Date;
	entries: Entry[];
}

interface CategoryTrendChartProps {
	weeks: ChartWeek[];
	baselineAvg: number;
	sentiment: CategorySentiment;
	selectedWeekIndex: number | null;
	onSelectWeek: (index: number | null) => void;
}

export default function CategoryTrendChart({
	weeks,
	baselineAvg,
	sentiment,
	selectedWeekIndex,
	onSelectWeek,
}: CategoryTrendChartProps) {
	const color = SENTIMENT_COLORS[sentiment];

	const chartData = useMemo(
		() =>
			weeks.map((w) => ({
				label: formatWeekLabel(w.start),
				count: w.count,
			})),
		[weeks],
	);

	const maxCount = useMemo(() => Math.max(...weeks.map((w) => w.count), baselineAvg, 1), [weeks, baselineAvg]);

	const tooltipData = useMemo(() => {
		if (selectedWeekIndex === null || !weeks[selectedWeekIndex]) return null;
		const week = weeks[selectedWeekIndex];
		return {
			weekNumber: getWeekNumber(week.weekKey),
			total: week.count,
			dailyData: getDailyBreakdown(week.entries, week.start, week.end),
		};
	}, [selectedWeekIndex, weeks]);

	return (
		<div className="space-y-2">
			{/* Line chart */}
			<div className="h-48 w-full -mx-2">
				<ResponsiveContainer width="100%" height="100%">
					<LineChart data={chartData} margin={{ top: 24, right: 16, left: 8, bottom: 4 }}>
						<XAxis
							dataKey="label"
							tickLine={false}
							axisLine={false}
							tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
						/>
						<YAxis hide domain={[0, Math.ceil(maxCount * 1.2)]} />
						<ReferenceLine y={baselineAvg} stroke="var(--border-default)" strokeDasharray="4 4" strokeWidth={1} />
						<Line
							type="monotone"
							dataKey="count"
							stroke={color}
							strokeWidth={2.5}
							isAnimationActive={false}
							dot={(props: { cx?: number; cy?: number; index?: number; payload?: { count: number } }) => {
								const { cx, cy, index, payload } = props;
								if (cx == null || cy == null || index == null) return <g />;
								const isSelected = index === selectedWeekIndex;
								const isLast = index === weeks.length - 1;
								const r = isSelected || isLast ? 5 : 3;
								return (
									<g
										onClick={(e) => {
											e.stopPropagation();
											onSelectWeek(isSelected ? null : index);
										}}
										style={{ cursor: 'pointer' }}
									>
										{/* Invisible touch target */}
										<circle cx={cx} cy={cy} r={20} fill="transparent" />
										<Dot
											cx={cx}
											cy={cy}
											r={r}
											fill={isSelected || isLast ? color : 'var(--bg-card)'}
											stroke={color}
											strokeWidth={2}
										/>
										{/* Value label above dot */}
										<text
											x={cx}
											y={cy - 12}
											textAnchor="middle"
											fontSize={11}
											fontWeight={600}
											fill="var(--text-secondary)"
										>
											{payload?.count}
										</text>
									</g>
								);
							}}
							activeDot={false}
						/>
					</LineChart>
				</ResponsiveContainer>
			</div>

			{/* Tooltip overlay */}
			{tooltipData && (
				<WeekBreakdownTooltip
					weekNumber={tooltipData.weekNumber}
					total={tooltipData.total}
					dailyData={tooltipData.dailyData}
					sentiment={sentiment}
				/>
			)}
		</div>
	);
}
