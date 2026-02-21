import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TrackerData } from '@/shared/lib/types';
import type { ActionableCategoryRow } from '../utils/stats-engine';
import { getLastNWeeks, getTopLimitCategories, getLaggingPositiveCategories } from '../utils/stats-engine';
import { addDashboardCard } from '@/shared/store/store';
import { showToast } from '@/shared/ui/Toast';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { cn } from '@/shared/lib/cn';

const MAX_DASHBOARD_CARDS = 6;

interface ActionableCategoriesProps {
	data: TrackerData;
}

export default function ActionableCategories({ data }: ActionableCategoriesProps) {
	const { t } = useTranslation('stats');
	const weeks = useMemo(() => getLastNWeeks(8), []);

	const limitRows = useMemo(() => getTopLimitCategories(data.entries, data, weeks), [data, weeks]);

	const positiveRows = useMemo(() => getLaggingPositiveCategories(data.entries, data, weeks), [data, weeks]);

	const followedIds = useMemo(() => {
		return new Set((data.dashboardCards || []).map((c) => c.categoryId));
	}, [data.dashboardCards]);

	const cardCount = data.dashboardCards?.length ?? 0;

	if (limitRows.length === 0 && positiveRows.length === 0) return null;

	function handleFollow(categoryId: string, categoryName: string) {
		if (followedIds.has(categoryId)) return;
		if (cardCount >= MAX_DASHBOARD_CARDS) {
			showToast(t('focusAreas.dashboardFull'));
			return;
		}
		addDashboardCard(categoryId);
		showToast(t('focusAreas.addedToDashboard', { name: categoryName }));
	}

	return (
		<div className="space-y-4">
			<h2 className="text-xl font-bold text-heading">{t('focusAreas.title')}</h2>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				{limitRows.length > 0 && (
					<Panel
						title={t('focusAreas.limitPanel.title')}
						subtitle={t('focusAreas.limitPanel.subtitle')}
						rows={limitRows}
						accent="limit"
						followedIds={followedIds}
						onFollow={handleFollow}
						followingLabel={t('focusAreas.following')}
						followLabel={t('focusAreas.follow')}
					/>
				)}
				{positiveRows.length > 0 && (
					<Panel
						title={t('focusAreas.positivePanel.title')}
						subtitle={t('focusAreas.positivePanel.subtitle')}
						rows={positiveRows}
						accent="positive"
						followedIds={followedIds}
						onFollow={handleFollow}
						followingLabel={t('focusAreas.following')}
						followLabel={t('focusAreas.follow')}
					/>
				)}
			</div>
		</div>
	);
}

interface PanelProps {
	title: string;
	subtitle: string;
	rows: ActionableCategoryRow[];
	accent: 'limit' | 'positive';
	followedIds: Set<string>;
	onFollow: (categoryId: string, categoryName: string) => void;
	followingLabel: string;
	followLabel: string;
}

function Panel({ title, subtitle, rows, accent, followedIds, onFollow, followingLabel, followLabel }: PanelProps) {
	const isMobile = useIsMobile();
	const barColor = accent === 'limit' ? 'var(--color-danger)' : 'var(--color-food)';
	const maxValue = Math.max(...rows.map((r) => r.value), 1);

	return (
		<div className="card p-4 space-y-3">
			<div>
				<h3 className="text-sm font-semibold text-heading">{title}</h3>
				<p className="text-xs text-label mt-0.5">{subtitle}</p>
			</div>

			<div className="space-y-2">
				{rows.map((row) => {
					const isFollowed = followedIds.has(row.categoryId);
					const barWidth = Math.max((row.value / maxValue) * 100, 4);

					return (
						<div key={row.categoryId} className="group">
							<div className="flex items-center justify-between gap-2 mb-0.5">
								<div className="flex items-center gap-2 min-w-0 flex-1">
									<span className="text-sm font-medium text-heading truncate">{row.categoryName}</span>
									<span className="text-xs text-label whitespace-nowrap">{row.label}</span>
								</div>

								<button
									onClick={() => onFollow(row.categoryId, row.categoryName)}
									disabled={isFollowed}
									className={cn(
										'text-xs font-medium px-2 py-0.5 rounded transition-colors whitespace-nowrap',
										isFollowed ? 'text-label cursor-default' : 'text-body hover:bg-[var(--bg-inset)]',
										!isMobile && !isFollowed && 'sm:opacity-0 sm:group-hover:opacity-100',
									)}
								>
									{isFollowed ? followingLabel : followLabel}
								</button>
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
