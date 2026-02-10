import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { WeeklyData } from '../lib/stats';
import {
	calculateBalanceScore,
	calculateAverageBalanceScore,
	getScoreChange,
	formatWeekLabel
} from '../lib/stats';

interface BalanceOverviewProps {
	weeklyData: WeeklyData[];
}

export default function BalanceOverview({ weeklyData }: BalanceOverviewProps) {
	const data = useMemo(() => {
		return weeklyData.map((week) => {
			const { positive, neutral, limit } = week.sentimentCounts;
			const total = positive + neutral + limit;

			return {
				week: formatWeekLabel(week.start),
				positive: total > 0 ? (positive / total) * 100 : 0,
				neutral: total > 0 ? (neutral / total) * 100 : 0,
				limit: total > 0 ? (limit / total) * 100 : 0,
				opacity: week.hasLowData ? 0.4 : 1
			};
		});
	}, [weeklyData]);

	const currentScore = useMemo(() => {
		if (weeklyData.length === 0) return 0;
		// Average of last 2 weeks or current week
		const recentWeeks = weeklyData.slice(-2);
		return recentWeeks.reduce((sum, w) => sum + calculateBalanceScore(w), 0) / recentWeeks.length;
	}, [weeklyData]);

	const previousScore = useMemo(() => {
		if (weeklyData.length < 4) return currentScore;
		// Average of 2 weeks before current
		const previousWeeks = weeklyData.slice(-4, -2);
		if (previousWeeks.length === 0) return currentScore;
		return previousWeeks.reduce((sum, w) => sum + calculateBalanceScore(w), 0) / previousWeeks.length;
	}, [weeklyData, currentScore]);

	const scoreChange = useMemo(() => {
		return getScoreChange(currentScore, previousScore);
	}, [currentScore, previousScore]);

	return (
		<div className="space-y-6">
			{/* Score Card */}
			<div className="card p-6 space-y-4">
				<div className="flex items-baseline justify-between">
					<h3 className="text-lg font-semibold">Balance Score</h3>
					<div className="flex items-center gap-2">
						<span className="text-4xl font-bold" style={{ color: 'var(--color-activity)' }}>
							{Math.round(currentScore)}%
						</span>
						{scoreChange.direction !== 'stable' && (
							<div
								className="text-sm font-semibold flex items-center gap-1"
								style={{
									color:
										scoreChange.direction === 'up'
											? '#10b981'
											: '#ef4444'
								}}
							>
								<span>{scoreChange.direction === 'up' ? '↑' : '↓'}</span>
								<span>{scoreChange.percentChange}%</span>
							</div>
						)}
					</div>
				</div>

				{/* Score meter */}
				<div className="bg-gray-200 rounded-full h-4 overflow-hidden dark:bg-gray-700">
					<div
						className="h-full transition-all duration-300"
						style={{
							width: `${currentScore}%`,
							background: `linear-gradient(to right, #ef4444, #f59e0b, #10b981)`
						}}
					/>
				</div>
				<p className="text-xs text-gray-600 dark:text-gray-400">
					Positive ÷ (Positive + Limit)
				</p>
			</div>

			{/* Weekly breakdown chart */}
			<div className="card p-6 space-y-4">
				<h3 className="text-lg font-semibold">Weekly Breakdown</h3>
				<ResponsiveContainer width="100%" height={280}>
					<BarChart
						data={data}
						layout="vertical"
						margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
					>
						<XAxis type="number" domain={[0, 100]} hide />
						<YAxis
							dataKey="week"
							type="category"
							width={75}
							tick={{ fontSize: 12 }}
						/>
						<Tooltip
							formatter={(value: number | undefined) => value !== undefined ? `${Math.round(value)}%` : 'N/A'}
							contentStyle={{
								background: 'var(--bg-card)',
								border: '1px solid var(--border-default)',
								borderRadius: '8px'
							}}
						/>
						<Bar
							dataKey="positive"
							stackId="sentiment"
							fill="#10b981"
							name="Positive"
						>
							{data.map((entry, index) => (
								<Cell
									key={`positive-${index}`}
									opacity={entry.opacity}
								/>
							))}
						</Bar>
						<Bar
							dataKey="neutral"
							stackId="sentiment"
							fill="#d1d5db"
							name="Neutral"
						>
							{data.map((entry, index) => (
								<Cell
									key={`neutral-${index}`}
									opacity={entry.opacity}
								/>
							))}
						</Bar>
						<Bar
							dataKey="limit"
							stackId="sentiment"
							fill="#ef4444"
							name="Limit"
						>
							{data.map((entry, index) => (
								<Cell
									key={`limit-${index}`}
									opacity={entry.opacity}
								/>
							))}
						</Bar>
					</BarChart>
				</ResponsiveContainer>
				<p className="text-xs text-gray-600 dark:text-gray-400">
					Faded weeks have less than 5 logged events
				</p>
			</div>
		</div>
	);
}
