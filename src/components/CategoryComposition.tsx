import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { WeeklyData } from '../lib/stats';
import {
	getTopCategories,
	buildCategoryColorMap,
	groupCategoriesForWeek,
	formatWeekLabel
} from '../lib/stats';

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
		return getTopCategories(weeklyData, 9);
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
				opacity: week.hasLowData ? 0.4 : 1
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

	const handleBarClick = (data: any) => {
		const week = weeklyData.find((w) => w.weekKey === data.weekKey);
		if (week) {
			setModal({ isOpen: true, week });
		}
	};

	return (
		<>
			<div className="card p-6 space-y-4">
				<h3 className="text-lg font-semibold">Category Composition</h3>
				<ResponsiveContainer width="100%" height={280}>
					<BarChart
						data={chartData}
						layout="vertical"
						margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
						onClick={(state) => {
							if (state.isTooltipActive && typeof state.activeTooltipIndex === 'number') {
								handleBarClick(chartData[state.activeTooltipIndex]);
							}
						}}
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
							cursor={{ fill: 'var(--bg-inset)' }}
						/>

						{allCategoryIds.map((catId) => (
							<Bar
								key={catId}
								dataKey={catId}
								stackId="categories"
								fill={colorMap.get(catId) || '#d1d5db'}
								name={categoryNameMap.get(catId) || catId}
								isAnimationActive={false}
							>
								{chartData.map((entry, index) => (
									<Cell
										key={`${catId}-${index}`}
										opacity={entry.opacity}
										cursor="pointer"
									/>
								))}
							</Bar>
						))}
					</BarChart>
				</ResponsiveContainer>
				<p className="text-xs text-gray-600 dark:text-gray-400">
					Click a bar to see detailed category breakdown
				</p>
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

function CategoryDetailModal({
	week,
	colorMap,
	onClose
}: CategoryDetailModalProps) {
	const sortedCategories = useMemo(() => {
		return [...week.categories].sort((a, b) => b.count - a.count);
	}, [week.categories]);

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-50 sm:items-center">
			<div
				className="bg-white dark:bg-gray-900 w-full sm:w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 space-y-4 max-h-96 overflow-y-auto"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="flex justify-between items-center pb-4 border-b border-gray-200 dark:border-gray-700">
					<div>
						<h3 className="font-semibold">
							Week of {formatWeekLabel(week.start)}
						</h3>
						<p className="text-sm text-gray-600 dark:text-gray-400">
							{week.totalCount} events
						</p>
					</div>
					<button
						onClick={onClose}
						className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xl"
					>
						✕
					</button>
				</div>

				{/* Categories list */}
				<div className="space-y-3">
					{sortedCategories.map((cat) => {
						const percentage =
							week.totalCount > 0
								? Math.round((cat.count / week.totalCount) * 100)
								: 0;

						const color = colorMap.get(cat.categoryId);

						return (
							<div key={cat.categoryId} className="space-y-2">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2 min-w-0">
										<div
											className="w-3 h-3 rounded-full flex-shrink-0"
											style={{
												backgroundColor: color
											}}
										/>
										<span className="font-medium truncate">
											{cat.categoryName}
										</span>
									</div>
									<div className="flex items-center gap-2 ml-2 flex-shrink-0">
										<span className="text-sm text-gray-600 dark:text-gray-400">
											{percentage}%
										</span>
										<span className="text-sm font-semibold">
											({cat.count})
										</span>
									</div>
								</div>
								<div className="bg-gray-200 rounded h-1.5 dark:bg-gray-700">
									<div
										className="h-full rounded transition-all"
										style={{
											width: `${percentage}%`,
											backgroundColor: color
										}}
									/>
								</div>
							</div>
						);
					})}
				</div>
			</div>

			{/* Close on background click */}
			<div
				className="fixed inset-0 -z-10"
				onClick={onClose}
			/>
		</div>
	);
}
