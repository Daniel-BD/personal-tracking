import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { TooltipContentProps } from 'recharts';
import type { WeeklyData } from '../utils/stats-engine';
import {
	getTopCategories,
	buildCategoryColorMap,
	groupCategoriesForWeek,
	formatWeekLabel,
	getWeekNumber,
} from '../utils/stats-engine';
import { getWeeklyVerticalBarCategoryAxisProps, weeklyVerticalBarValueAxisProps } from '../utils/weekly-chart-axis';
import { useIsMobile } from '@/shared/hooks/useIsMobile';

function CompositionTooltip({ active, payload, label }: TooltipContentProps<number, string>) {
	if (!active || !payload?.length) return null;
	const sorted = [...payload]
		.filter((p) => (p.value as number) > 0)
		.sort((a, b) => (b.value as number) - (a.value as number));
	return (
		<div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-xs">
			<p className="mb-1 font-semibold text-heading">{label}</p>
			{sorted.map((entry) => (
				<div key={entry.dataKey} className="flex items-center gap-1.5 mb-0.5">
					<span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
					<span className="text-body">{entry.name}</span>
					<span className="ml-auto pl-3 font-semibold text-heading">{Math.round(entry.value as number)}%</span>
				</div>
			))}
		</div>
	);
}

interface CategoryCompositionProps {
	weeklyData: WeeklyData[];
}

interface ModalState {
	isOpen: boolean;
	week: WeeklyData | null;
}

export default function CategoryComposition({ weeklyData }: CategoryCompositionProps) {
	const [modal, setModal] = useState<ModalState>({ isOpen: false, week: null });

	const topCategoryIds = useMemo(() => {
		return getTopCategories(weeklyData, 20);
	}, [weeklyData]);

	const colorMap = useMemo(() => {
		return buildCategoryColorMap(topCategoryIds);
	}, [topCategoryIds]);

	const chartData = useMemo(() => {
		return weeklyData.map((week) => {
			const grouped = groupCategoriesForWeek(week, topCategoryIds);
			const totalCategoryCount = grouped.reduce((sum, c) => sum + c.count, 0);
			const dataPoint: Record<string, number | string> = {
				week: formatWeekLabel(week.start),
				weekKey: week.weekKey,
				opacity: week.hasLowData ? 0.4 : 1,
			};

			grouped.forEach((cat) => {
				dataPoint[cat.categoryId] = totalCategoryCount > 0 ? (cat.count / totalCategoryCount) * 100 : 0;
			});

			return dataPoint;
		});
	}, [weeklyData, topCategoryIds]);

	const allCategoryIds = useMemo(() => {
		return [...topCategoryIds, 'OTHER'];
	}, [topCategoryIds]);

	const categoryNameMap = useMemo(() => {
		const map = new Map<string, string>();
		weeklyData.forEach((week) => {
			week.categories.forEach((cat) => {
				if (!map.has(cat.categoryId)) {
					map.set(cat.categoryId, cat.categoryName);
				}
			});
		});
		map.set('OTHER', 'Other');
		return map;
	}, [weeklyData]);

	const isMobile = useIsMobile();

	const handleBarClick = (data: { weekKey?: string }) => {
		const week = weeklyData.find((w) => w.weekKey === data.weekKey);
		if (week) {
			setModal({ isOpen: true, week });
		}
	};

	return (
		<>
			<div className="card p-4 sm:p-6 space-y-4">
				<h3 className="text-lg font-semibold">Category Composition</h3>
				<ResponsiveContainer width="100%" height={280}>
					<BarChart
						data={chartData}
						layout="vertical"
						margin={isMobile ? { top: 5, right: 10, left: 5, bottom: 5 } : { top: 5, right: 30, left: 80, bottom: 5 }}
						onClick={(state) => {
							if (state.isTooltipActive && typeof state.activeTooltipIndex === 'number') {
								handleBarClick(chartData[state.activeTooltipIndex]);
							}
						}}
					>
						<XAxis {...weeklyVerticalBarValueAxisProps} />
						<YAxis dataKey="week" {...getWeeklyVerticalBarCategoryAxisProps(isMobile)} />
						<Tooltip content={CompositionTooltip} cursor={{ fill: 'var(--bg-inset)' }} />

						{allCategoryIds.map((catId) => (
							<Bar
								key={catId}
								dataKey={catId}
								stackId="categories"
								fill={colorMap.get(catId) || 'var(--color-neutral)'}
								name={categoryNameMap.get(catId) || catId}
								isAnimationActive={false}
							>
								{chartData.map((entry, index) => (
									<Cell key={`${catId}-${index}`} opacity={entry.opacity} cursor="pointer" />
								))}
							</Bar>
						))}
					</BarChart>
				</ResponsiveContainer>
				<p className="text-xs text-body">Click a bar to see detailed category breakdown</p>
			</div>

			{/* Modal */}
			{modal.isOpen && modal.week && (
				<CategoryDetailModal
					week={modal.week}
					colorMap={colorMap}
					onClose={() => setModal({ isOpen: false, week: null })}
				/>
			)}
		</>
	);
}

interface CategoryDetailModalProps {
	week: WeeklyData;
	colorMap: Map<string, string>;
	onClose: () => void;
}

function CategoryDetailModal({ week, colorMap, onClose }: CategoryDetailModalProps) {
	const sortedCategories = useMemo(() => {
		return [...week.categories].sort((a, b) => b.count - a.count);
	}, [week.categories]);

	return (
		// eslint-disable-next-line jsx-a11y/no-static-element-interactions
		<div className="fixed inset-0 bg-black/50 flex items-end z-50 sm:items-center" onMouseDown={onClose}>
			{/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
			<div
				className="bg-[var(--bg-elevated)] w-full sm:w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 space-y-4 max-h-96 overflow-y-auto"
				onMouseDown={(e) => e.stopPropagation()}
			>
				<div className="flex justify-between items-center pb-4 border-b border-[var(--border-default)]">
					<div>
						<h3 className="font-semibold text-heading">Week {getWeekNumber(week.weekKey)}</h3>
						<p className="text-sm text-body">{week.totalCount} events</p>
					</div>
					<button onClick={onClose} className="text-label hover:text-heading text-xl">
						✕
					</button>
				</div>

				{/* Categories list */}
				<div className="space-y-3">
					{sortedCategories.map((cat) => {
						const percentage = week.totalCount > 0 ? Math.round((cat.count / week.totalCount) * 100) : 0;

						const color = colorMap.get(cat.categoryId);

						return (
							<div key={cat.categoryId} className="space-y-2">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2 min-w-0">
										<div
											className="w-3 h-3 rounded-full flex-shrink-0"
											style={{
												backgroundColor: color,
											}}
										/>
										<span className="font-medium truncate text-heading">{cat.categoryName}</span>
									</div>
									<div className="flex items-center gap-2 ml-2 flex-shrink-0">
										<span className="text-sm text-body">{percentage}%</span>
										<span className="text-sm font-semibold text-heading">({cat.count})</span>
									</div>
								</div>
								<div className="bg-[var(--bg-inset)] rounded h-1.5">
									<div
										className="h-full rounded transition-all"
										style={{
											width: `${percentage}%`,
											backgroundColor: color,
										}}
									/>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
