import { useMemo } from 'react';
import { LineChart, Line, ResponsiveContainer, ReferenceLine, Dot } from 'recharts';
import type { CategorySentiment } from '@/shared/lib/types';

const SENTIMENT_COLORS: Record<CategorySentiment, string> = {
	positive: 'var(--color-success)',
	limit: 'var(--color-danger)',
	neutral: 'var(--color-neutral)'
};

interface GoalCardProps {
	categoryName: string;
	sentiment: CategorySentiment;
	sparklineData: { week: string; count: number }[];
	currentCount: number;
	baselineAvg: number;
	deltaPercent: number;
	onRemove: () => void;
}

export default function GoalCard({
	categoryName,
	sentiment,
	sparklineData,
	currentCount,
	baselineAvg,
	deltaPercent,
	onRemove
}: GoalCardProps) {
	const color = SENTIMENT_COLORS[sentiment];

	const isStable = Math.abs(deltaPercent) < 0.1;
	const absPercent = Math.round(Math.abs(deltaPercent) * 100);

	const changeText = useMemo(() => {
		if (isStable) return 'No meaningful change';
		const sign = deltaPercent > 0 ? '+' : '−';
		return `${sign}${absPercent}%`;
	}, [isStable, deltaPercent, absPercent]);

	const deltaEvents = useMemo(() => {
		if (isStable) return null;
		const raw = currentCount - baselineAvg;
		const sign = raw >= 0 ? '+' : '−';
		const abs = Math.abs(raw);
		const formatted = Number.isInteger(abs) ? abs.toString() : abs.toFixed(1);
		const unit = abs === 1 ? 'event' : 'events';
		return `(${sign}${formatted} ${unit})`;
	}, [isStable, currentCount, baselineAvg]);

	const avgFormatted = Number.isInteger(baselineAvg)
		? baselineAvg.toString()
		: baselineAvg.toFixed(1);

	return (
		<div className="card p-4 flex flex-col justify-between relative group h-full min-h-[160px]">
			{/* Remove button */}
			<button
				onClick={onRemove}
				className="absolute top-2 right-2 p-1 text-label opacity-60 sm:opacity-0 group-hover:opacity-100 transition-opacity hover:text-[var(--color-danger)]"
				title="Remove from dashboard"
			>
				<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>

			{/* 1. Category name + sentiment dot */}
			<div className="flex items-center gap-1.5">
				<div
					className="w-2 h-2 rounded-full"
					style={{ backgroundColor: color }}
				/>
				<span className="text-xs font-medium text-label truncate max-w-[120px]">
					{categoryName}
				</span>
			</div>

			{/* 2. Current value block — explicit values */}
			<div className="mt-1.5 space-y-0">
				<div className="text-sm font-semibold text-heading">
					This week: {currentCount} {currentCount === 1 ? 'event' : 'events'}
				</div>
				<div className="text-xs text-label">
					4-week avg: {avgFormatted} {avgFormatted === '1' ? 'event' : 'events'}
				</div>
			</div>

			{/* 3. Primary change metric */}
			<div className="mt-1 flex items-baseline gap-1.5">
				<span
					className="text-lg font-bold"
					style={{ color: isStable ? undefined : color }}
				>
					{changeText}
				</span>
				{deltaEvents && (
					<span className="text-[10px] text-label">
						{deltaEvents}
					</span>
				)}
			</div>

			{/* 4. Sparkline */}
			<div className="h-12 w-full -mx-2 mt-1">
				<ResponsiveContainer width="100%" height="100%">
					<LineChart data={sparklineData}>
						<ReferenceLine
							y={baselineAvg}
							stroke="var(--border-default)"
							strokeDasharray="3 3"
							strokeWidth={1}
						/>
						<Line
							type="monotone"
							dataKey="count"
							stroke={color}
							strokeWidth={2}
							dot={(props: { cx?: number; cy?: number; index?: number }) => {
								const { cx, cy, index } = props;
								if (cx == null || cy == null || index == null) return <></>;
								const isLast = index === sparklineData.length - 1;
								if (isLast) {
									return (
										<Dot
											cx={cx}
											cy={cy}
											r={4}
											fill={color}
											stroke="var(--bg-card)"
											strokeWidth={2}
										/>
									);
								}
								return (
									<Dot
										cx={cx}
										cy={cy}
										r={2}
										fill={color}
										stroke="none"
										opacity={0.35}
									/>
								);
							}}
							isAnimationActive={false}
						/>
					</LineChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
}
