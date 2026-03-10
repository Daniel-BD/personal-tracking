import { useMemo } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Dot } from 'recharts';
import type { CategorySentiment } from '@/shared/lib/types';
import { calcActualDeltaPercent, formatChangeText, SENTIMENT_COLORS } from '../utils/stats-engine';
import { getWeeklyLineXAxisProps, weeklyLineValueAxisProps } from '../utils/weekly-chart-axis';

interface GoalCardProps {
	categoryName: string;
	sentiment: CategorySentiment;
	/** Override accent color (e.g. blue for item cards). If set, takes precedence over sentiment color. */
	accentColor?: string;
	sparklineData: { week: string; count: number; label: string }[];
	currentCount: number;
	baselineAvg: number;
	deltaPercent: number;
	/** Days elapsed in the current week (1–7). Used for pace-adjusted display. */
	daysElapsed: number;
	onRemove: () => void;
	onCardClick?: () => void;
}

export default function GoalCard({
	categoryName,
	sentiment,
	accentColor,
	sparklineData,
	currentCount,
	baselineAvg,
	deltaPercent,
	daysElapsed,
	onRemove,
	onCardClick,
}: GoalCardProps) {
	const { t } = useTranslation('stats');
	const color = accentColor ?? SENTIMENT_COLORS[sentiment];

	const isStable = Math.abs(deltaPercent) < 0.1;
	const absPercent = Math.round(Math.abs(deltaPercent) * 100);

	const changeText = useMemo(() => {
		if (isStable) return t('goalCard.noMeaningfulChange');
		const sign = deltaPercent > 0 ? '+' : '−';
		return `${sign}${absPercent}%`;
	}, [isStable, deltaPercent, absPercent, t]);

	const proratedBaseline = baselineAvg * (daysElapsed / 7);
	const deltaEvents = useMemo(() => {
		if (isStable) return null;
		const raw = currentCount - proratedBaseline;
		const sign = raw >= 0 ? '+' : '−';
		const abs = Math.abs(raw);
		const formatted = Number.isInteger(abs) ? abs.toString() : abs.toFixed(1);
		const unit = t('goalCard.event', { count: Math.round(abs) });
		return `(${sign}${formatted} ${unit})`;
	}, [isStable, currentCount, proratedBaseline, t]);

	// Actual (non-prorated) comparison: current count vs full-week baseline
	const actualChangeText = formatChangeText(calcActualDeltaPercent(currentCount, baselineAvg));

	const avgFormatted = Number.isInteger(baselineAvg) ? baselineAvg.toString() : baselineAvg.toFixed(1);

	const maxCount = useMemo(
		() => Math.max(...sparklineData.map((d) => d.count), baselineAvg, 1),
		[sparklineData, baselineAvg],
	);

	return (
		<div
			className="card p-4 flex flex-col justify-between relative group h-full min-h-[160px] cursor-pointer active:scale-[0.98] transition-transform"
			onClick={onCardClick}
			role="button"
			tabIndex={0}
			onKeyDown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					onCardClick?.();
				}
			}}
		>
			{/* Remove button */}
			<button
				onClick={(e) => {
					e.stopPropagation();
					onRemove();
				}}
				className="absolute top-2 right-2 p-1 text-label opacity-60 sm:opacity-0 group-hover:opacity-100 transition-opacity hover:text-[var(--color-danger)]"
				title={t('goalCard.removeFromDashboard')}
			>
				<X className="w-4 h-4" strokeWidth={2} />
			</button>

			{/* 1. Category name + sentiment dot */}
			<div className="flex items-center gap-1.5">
				<div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
				<span className="text-xs font-medium text-label truncate max-w-[120px]">{categoryName}</span>
			</div>

			{/* 2. Current value block — explicit values */}
			<div className="mt-1.5 space-y-0">
				<div className="text-sm font-semibold text-heading">
					{t('goalCard.thisWeek', { count: currentCount })}
					{daysElapsed < 7 && (
						<span className="text-xs font-normal text-label"> {t('goalCard.partialWeek', { day: daysElapsed })}</span>
					)}
				</div>
				<div className="text-xs text-label">
					{t('goalCard.baselineAvg', { count: Math.round(baselineAvg), avg: avgFormatted })}
				</div>
			</div>

			{/* 3. Primary change metric */}
			<div className="mt-1 space-y-0.5">
				<div className="flex items-baseline gap-1.5">
					<span className="text-lg font-bold" style={{ color: isStable ? undefined : color }}>
						{changeText}
					</span>
					{deltaEvents && <span className="text-[10px] text-label">{deltaEvents}</span>}
					{!isStable && daysElapsed < 7 && <span className="text-[10px] text-label">{t('goalCard.projected')}</span>}
				</div>
				{daysElapsed < 7 && (
					<div className="text-[10px] text-[var(--text-tertiary)]">
						{t('goalCard.currentlyLabel', { change: actualChangeText })}
					</div>
				)}
			</div>

			{/* 4. Trend chart */}
			<div className="h-24 w-full -mx-2 mt-1">
				<ResponsiveContainer width="100%" height="100%">
					<LineChart data={sparklineData} margin={{ top: 16, right: 12, left: 4, bottom: 4 }}>
						<XAxis dataKey="label" {...getWeeklyLineXAxisProps(9)} />
						<YAxis {...weeklyLineValueAxisProps} domain={[0, Math.ceil(maxCount * 1.2)]} />
						<ReferenceLine y={baselineAvg} stroke="var(--border-default)" strokeDasharray="4 4" strokeWidth={1} />
						<Line
							type="monotone"
							dataKey="count"
							stroke={color}
							strokeWidth={2.5}
							dot={(props: { cx?: number; cy?: number; index?: number; payload?: { count: number } }) => {
								const { cx, cy, index, payload } = props;
								if (cx == null || cy == null || index == null) return <g />;
								const isLast = index === sparklineData.length - 1;
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
										<text
											x={cx}
											y={cy - 10}
											textAnchor="middle"
											fontSize={10}
											fontWeight={600}
											fill="var(--text-secondary)"
										>
											{payload?.count}
										</text>
									</g>
								);
							}}
							activeDot={false}
							isAnimationActive={false}
						/>
					</LineChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
}
