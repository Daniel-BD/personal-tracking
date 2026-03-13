import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Dot } from 'recharts';
import type { WeeklyData } from '../utils/stats-engine';
import { calculateBalanceScore, formatWeekLabel } from '../utils/stats-engine';
import { getWeeklyLineXAxisProps, weeklyLineValueAxisProps } from '../utils/weekly-chart-axis';

interface BalanceScoreTrendChartProps {
	weeklyData: WeeklyData[];
}

export default function BalanceScoreTrendChart({ weeklyData }: BalanceScoreTrendChartProps) {
	const color = 'var(--color-accent)';

	const chartData = useMemo(
		() =>
			weeklyData.map((week) => ({
				label: formatWeekLabel(week.start),
				score: Math.round(calculateBalanceScore(week)),
				positive: week.sentimentCounts.positive,
				limit: week.sentimentCounts.limit,
				hasLowData: week.hasLowData,
			})),
		[weeklyData],
	);

	const avgScore = useMemo(() => {
		if (chartData.length === 0) return 0;
		const scores = chartData.map((d) => d.score);
		return scores.reduce((sum, s) => sum + s, 0) / scores.length;
	}, [chartData]);

	return (
		<div className="h-52 w-full -mx-2">
			<ResponsiveContainer width="100%" height="100%">
				<LineChart data={chartData} margin={{ top: 24, right: 16, left: 8, bottom: 24 }}>
					<XAxis
						dataKey="label"
						ticks={chartData.map((week) => week.label)}
						allowDuplicatedCategory={false}
						{...getWeeklyLineXAxisProps()}
					/>
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
							const opacity = payload.hasLowData ? 0.4 : 1;

							return (
								<g opacity={opacity}>
									<Dot cx={cx} cy={cy} r={r} fill={isLast ? color : 'var(--bg-card)'} stroke={color} strokeWidth={2} />
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
	);
}
