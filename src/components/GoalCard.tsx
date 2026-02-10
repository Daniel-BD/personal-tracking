import { useMemo } from 'react';
import { LineChart, Line, ResponsiveContainer, Dot } from 'recharts';

interface GoalCardProps {
	categoryName: string;
	categoryColor: string;
	sparklineData: { week: string; count: number }[];
	delta: number;
	deltaPercent: number;
	onRemove: () => void;
}

export default function GoalCard({
	categoryName,
	categoryColor,
	sparklineData,
	delta,
	deltaPercent,
	onRemove
}: GoalCardProps) {
	const direction = useMemo(() => {
		if (Math.abs(deltaPercent) < 0.1) return 'stable';
		return deltaPercent > 0 ? 'up' : 'down';
	}, [deltaPercent]);

	const indicator = {
		up: { icon: '↑', label: 'Increase' },
		down: { icon: '↓', label: 'Decrease' },
		stable: { icon: '→', label: 'No change' }
	}[direction];

	const deltaText = useMemo(() => {
		const absDelta = Math.abs(delta);
		const absPercent = Math.round(Math.abs(deltaPercent) * 100);

		if (direction === 'stable') {
			return `No meaningful change vs baseline`;
		}

		return `${indicator.icon} ${absPercent}% vs 4-week average`;
	}, [direction, delta, deltaPercent, indicator.icon]);

	const subText = useMemo(() => {
		const absDelta = Math.abs(delta);
		const unit = absDelta === 1 ? 'event' : 'events';
		if (direction === 'stable') return '';
		return `${indicator.icon} ${absDelta.toFixed(1)} ${unit} vs baseline`;
	}, [direction, delta, indicator.icon]);

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

			<div className="space-y-1">
				<div className="flex items-center gap-1.5">
					<div
						className="w-2 h-2 rounded-full"
						style={{ backgroundColor: categoryColor }}
					/>
					<span className="text-xs font-medium text-label truncate max-w-[120px]">
						{categoryName}
					</span>
				</div>

				<div className="flex items-center gap-2">
					<span className="text-2xl font-bold" style={{ color: categoryColor }}>
						{indicator.icon}
					</span>
					<span className="text-sm font-medium text-heading">
						{direction === 'up' ? 'Increase' : direction === 'down' ? 'Decrease' : 'No change'}
					</span>
				</div>
			</div>

			<div className="h-12 w-full -mx-2">
				<ResponsiveContainer width="100%" height="100%">
					<LineChart data={sparklineData}>
						<Line
							type="monotone"
							dataKey="count"
							stroke={categoryColor}
							strokeWidth={2}
							dot={(props) => {
								const { cx, cy, payload, index } = props;
								if (index === sparklineData.length - 1) {
									return <Dot cx={cx} cy={cy} r={3} fill={categoryColor} stroke="none" />;
								}
								return <></>;
							}}
							isAnimationActive={false}
						/>
					</LineChart>
				</ResponsiveContainer>
			</div>

			<div className="space-y-0.5">
				<div className="text-[10px] font-medium text-body leading-tight">
					{deltaText}
				</div>
				{subText && (
					<div className="text-[10px] text-label leading-tight">
						{subText}
					</div>
				)}
			</div>
		</div>
	);
}
