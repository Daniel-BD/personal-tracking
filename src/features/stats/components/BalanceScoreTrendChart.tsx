import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Dot } from 'recharts';
import type { WeeklyData } from '../utils/stats-engine';
import { calculateBalanceScore, formatWeekLabel } from '../utils/stats-engine';
import { getWeeklyLineXAxisProps, weeklyLineValueAxisProps } from '../utils/weekly-chart-axis';
import { useScrollContainerToEnd } from '../hooks/useScrollContainerToEnd';

interface BalanceScoreTrendChartProps {
	weeklyData: WeeklyData[];
}

export default function BalanceScoreTrendChart({ weeklyData }: BalanceScoreTrendChartProps) {
	const color = 'var(--color-accent)';
	const minChartWidth = Math.max(weeklyData.length * 56, 320);
	const scrollContainerRef = useScrollContainerToEnd(weeklyData.length);

	const chartData = useMemo(
		() =>
			weeklyData.map((week) => ({
				label: formatWeekLabel(week.start),
				score: Math.round(calculateBalanceScore(week)),
				positive: week.sentimentCounts.positive,
				limit: week.sentimentCounts.limit,
			})),
		[weeklyData],
	);

	const avgScore = useMemo(() => {
		if (chartData.length === 0) return 0;
		const scores = chartData.map((d) => d.score);
		return scores.reduce((sum, s) => sum + s, 0) / scores.length;
	}, [chartData]);

	return (
		<div ref={scrollContainerRef} className="-mx-2 overflow-x-auto pb-2">
			<div className="h-52 px-2" style={{ minWidth: `${minChartWidth}px` }}>
				<ResponsiveContainer width="100%" height="100%">
					<LineChart data={chartData} margin={{ top: 24, right: 16, left: 8, bottom: 24 }}>
						<XAxis dataKey="label" {...getWeeklyLineXAxisProps()} />
						<YAxis {...weeklyLineValueAxisProps} domain={[0, 110]} />
						<ReferenceLine y={avgScore} stroke="var(--border-default)" strokeDasharray="4 4" strokeWidth={1} />
						<Line
							type="monotone"
							dataKey="score"
							stroke={color}
							strokeWidth={2.5}
							isAnimationActive={false}
							dot={(props: { cx?: number; cy?: number; index?: number; payload?: (typeof chartData)[number] }) => {
								const { cx, cy, index, payload } = props;
								if (cx == null || cy == null || index == null || !payload) return <g />;

								const isLast = index === chartData.length - 1;
								const r = isLast ? 5 : 3;

								return (
									<g>
										<Dot
											cx={cx}
											cy={cy}
											r={r}
											fill={isLast ? color : 'var(--bg-card)'}
											stroke={color}
											strokeWidth={2}
										/>
										{/* Score label above dot */}
										<text
											x={cx}
											y={cy - 14}
											textAnchor="middle"
											fontSize={11}
											fontWeight={600}
											fill="var(--text-secondary)"
										>
											{payload.score}%
										</text>
										{/* Positive · Limit below dot */}
										<text x={cx} y={cy + 18} textAnchor="middle" fontSize={9}>
											<tspan fill="var(--color-success)">{payload.positive}</tspan>
											<tspan fill="var(--text-tertiary)"> · </tspan>
											<tspan fill="var(--color-danger)">{payload.limit}</tspan>
										</text>
									</g>
								);
							}}
							activeDot={false}
						/>
					</LineChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
}
