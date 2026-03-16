import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { DashboardCard, Entry } from '@/shared/lib/types';
import { addDashboardCard } from '@/shared/store/store';
import { useToast } from '@/shared/ui/useToast';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { cn } from '@/shared/lib/cn';
import SegmentedControl from '@/shared/ui/SegmentedControl';
import { useCategoryById, useItemById, useItemCategoryIdsByItemId } from '@/features/tracking';
import { getTopLimitRows, type ActionableLimitRow } from '../utils/stats-engine';

const MAX_DASHBOARD_CARDS = 6;
const FOCUS_AREA_ROWS_LIMIT = 10;
type TimePeriod = '7d' | '30d';
type ViewMode = 'categories' | 'items';

interface ActionableCategoriesProps {
	entries: Entry[];
	dashboardCards: DashboardCard[];
}

export default function ActionableCategories({ entries, dashboardCards }: ActionableCategoriesProps) {
	const { t } = useTranslation('stats');
	const { showToast } = useToast();
	const categoryById = useCategoryById();
	const itemById = useItemById();
	const itemCategoryIdsByItemId = useItemCategoryIdsByItemId();
	const [timePeriod, setTimePeriod] = useState<TimePeriod>('7d');
	const [viewMode, setViewMode] = useState<ViewMode>('categories');

	const limitRows = useMemo(
		() =>
			getTopLimitRows(entries, {
				days: timePeriod === '7d' ? 7 : 30,
				mode: viewMode === 'categories' ? 'category' : 'item',
				categoryById,
				itemById,
				itemCategoryIdsByItemId,
				limit: FOCUS_AREA_ROWS_LIMIT,
			}),
		[entries, timePeriod, viewMode, categoryById, itemById, itemCategoryIdsByItemId],
	);

	const followedIds = useMemo(() => {
		return new Set(dashboardCards.map((card) => card.categoryId).filter((id): id is string => !!id));
	}, [dashboardCards]);

	const cardCount = dashboardCards.length;

	if (limitRows.length === 0) return null;

	function handleFollow(categoryId: string, categoryName: string) {
		if (followedIds.has(categoryId)) return;
		if (cardCount >= MAX_DASHBOARD_CARDS) {
			showToast(t('focusAreas.dashboardFull'));
			return;
		}
		addDashboardCard({ categoryId });
		showToast(t('focusAreas.addedToDashboard', { name: categoryName }));
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between gap-3">
				<h2 className="text-xl font-bold text-heading">{t('focusAreas.title')}</h2>
				<SegmentedControl
					options={[
						{ value: '7d' as const, label: t('focusAreas.timePeriod.7d') },
						{ value: '30d' as const, label: t('focusAreas.timePeriod.30d') },
					]}
					value={timePeriod}
					onChange={setTimePeriod}
					variant="segment"
					size="sm"
				/>
			</div>

			<div>
				<Panel
					title={
						viewMode === 'categories'
							? t('focusAreas.limitPanel.topCategoriesTitle')
							: t('focusAreas.limitPanel.topItemsTitle')
					}
					subtitle={t('focusAreas.limitPanel.subtitle')}
					rows={limitRows}
					showFollow={viewMode === 'categories'}
					followedIds={followedIds}
					onFollow={handleFollow}
					followingLabel={t('focusAreas.following')}
					followLabel={t('focusAreas.follow')}
					toggleLabel={
						viewMode === 'categories' ? t('focusAreas.limitPanel.showItems') : t('focusAreas.limitPanel.showCategories')
					}
					onToggle={() => setViewMode((current) => (current === 'categories' ? 'items' : 'categories'))}
				/>
			</div>
		</div>
	);
}

interface PanelProps {
	title: string;
	subtitle: string;
	rows: ActionableLimitRow[];
	showFollow: boolean;
	followedIds: Set<string>;
	onFollow: (categoryId: string, categoryName: string) => void;
	followingLabel: string;
	followLabel: string;
	toggleLabel: string;
	onToggle: () => void;
}

function Panel({
	title,
	subtitle,
	rows,
	showFollow,
	followedIds,
	onFollow,
	followingLabel,
	followLabel,
	toggleLabel,
	onToggle,
}: PanelProps) {
	const isMobile = useIsMobile();
	const barColor = 'var(--color-danger)';
	const maxValue = Math.max(...rows.map((r) => r.value), 1);

	return (
		<div className="card p-4 space-y-3">
			<div className="flex items-start justify-between gap-3">
				<div>
					<h3 className="text-sm font-semibold text-heading">{title}</h3>
					<p className="text-xs text-label mt-0.5">{subtitle}</p>
				</div>
				<button type="button" onClick={onToggle} className="btn btn-secondary btn-sm shrink-0">
					{toggleLabel}
				</button>
			</div>

			<div className="space-y-2 max-h-44 overflow-y-auto pr-1">
				{rows.map((row) => {
					const isFollowed = followedIds.has(row.id);
					const barWidth = Math.max((row.value / maxValue) * 100, 4);

					return (
						<div key={row.id} className="group">
							<div className="flex items-center justify-between gap-2 mb-0.5">
								<div className="flex items-center gap-2 min-w-0 flex-1">
									<span className="text-sm font-medium text-heading truncate">{row.name}</span>
									<span className="text-xs text-label whitespace-nowrap">{row.label}</span>
								</div>

								{showFollow && (
									<button
										onClick={() => onFollow(row.id, row.name)}
										disabled={isFollowed}
										className={cn(
											'text-xs font-medium px-2 py-0.5 rounded transition-colors whitespace-nowrap',
											isFollowed ? 'text-label cursor-default' : 'text-body hover:bg-[var(--bg-inset)]',
											!isMobile && !isFollowed && 'sm:opacity-0 sm:group-hover:opacity-100',
										)}
									>
										{isFollowed ? followingLabel : followLabel}
									</button>
								)}
							</div>

							<div className="h-2 rounded-full bg-[var(--bg-inset)] overflow-hidden">
								<div
									className="h-full rounded-full transition-all duration-300"
									style={{
										width: `${barWidth}%`,
										backgroundColor: barColor,
										opacity: 0.7,
									}}
								/>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
