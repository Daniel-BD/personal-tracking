import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { WeeklyData } from '../utils/stats-engine';
import { calculateBalanceScore, getScoreChange, formatWeekLabel } from '../utils/stats-engine';
import { useIsMobile } from '@/shared/hooks/useIsMobile';

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
				opacity: week.hasLowData ? 0.4 : 1,
			};
		});
	}, [weeklyData]);

	const currentScore = useMemo(() => {
		if (weeklyData.length === 0) return 0;
		return calculateBalanceScore(weeklyData[weeklyData.length - 1]);
	}, [weeklyData]);

	const previousScore = useMemo(() => {
		if (weeklyData.length < 2) return currentScore;
		return calculateBalanceScore(weeklyData[weeklyData.length - 2]);
	}, [weeklyData, currentScore]);

	const scoreChange = useMemo(() => {
		return getScoreChange(currentScore, previousScore);
	}, [currentScore, previousScore]);

	const isMobile = useIsMobile();

	return (
		<div className="space-y-4 sm:space-y-6">
			{/* Score Card */}
			<div className="card p-4 sm:p-6 space-y-4">
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
									color: scoreChange.direction === 'up' ? 'var(--color-success)' : 'var(--color-danger)',
								}}
							>
								<span>{scoreChange.direction === 'up' ? '↑' : '↓'}</span>
								<span>{scoreChange.percentChange}%</span>
							</div>
						)}
					</div>
				</div>

				{/* Score meter */}
				<div className="bg-[var(--bg-inset)] rounded-full h-4 overflow-hidden">
					<div
						className="h-full transition-all duration-300"
						style={{
							width: `${currentScore}%`,
							background: `linear-gradient(to right, var(--color-danger), var(--color-warning), var(--color-success))`,
						}}
					/>
				</div>
				<p className="text-xs text-body">This week · Positive ÷ (Positive + Limit)</p>
			</div>

			{/* Weekly breakdown chart */}
			<div className="card p-4 sm:p-6 space-y-4">
				<h3 className="text-lg font-semibold">Weekly Breakdown</h3>
				<ResponsiveContainer width="100%" height={280}>
					<BarChart
						data={data}
						layout="vertical"
						margin={isMobile ? { top: 5, right: 10, left: 5, bottom: 5 } : { top: 5, right: 30, left: 80, bottom: 5 }}
					>
						<XAxis type="number" domain={[0, 100]} hide />
						<YAxis dataKey="week" type="category" width={isMobile ? 50 : 75} tick={{ fontSize: 12 }} />
						<Tooltip
							formatter={(value: number | undefined) => (value !== undefined ? `${Math.round(value)}%` : 'N/A')}
							contentStyle={{
								background: 'var(--bg-card)',
								border: '1px solid var(--border-default)',
								borderRadius: '8px',
							}}
						/>
						<Bar dataKey="positive" stackId="sentiment" fill="var(--color-success)" name="Positive">
							{data.map((entry, index) => (
								<Cell key={`positive-${index}`} opacity={entry.opacity} />
							))}
						</Bar>
						<Bar dataKey="neutral" stackId="sentiment" fill="var(--color-neutral)" name="Neutral">
							{data.map((entry, index) => (
								<Cell key={`neutral-${index}`} opacity={entry.opacity} />
							))}
						</Bar>
						<Bar dataKey="limit" stackId="sentiment" fill="var(--color-danger)" name="Limit">
							{data.map((entry, index) => (
								<Cell key={`limit-${index}`} opacity={entry.opacity} />
							))}
						</Bar>
					</BarChart>
				</ResponsiveContainer>
				<p className="text-xs text-body">Faded weeks have less than 5 logged events</p>
			</div>
		</div>
	);
}
