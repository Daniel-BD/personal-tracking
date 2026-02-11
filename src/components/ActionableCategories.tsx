import { useMemo } from 'react';
import type { TrackerData } from '../lib/types';
import type { ActionableCategoryRow } from '../lib/stats';
import {
	getLastNWeeks,
	getTopLimitCategories,
	getLaggingPositiveCategories
} from '../lib/stats';
import { addDashboardCard } from '../lib/store';
import { showToast } from './Toast';
import { useIsMobile } from '../lib/hooks';

const MAX_DASHBOARD_CARDS = 6;

interface ActionableCategoriesProps {
	data: TrackerData;
}

export default function ActionableCategories({ data }: ActionableCategoriesProps) {
	const weeks = useMemo(() => getLastNWeeks(8), []);

	const limitRows = useMemo(
		() => getTopLimitCategories(data.entries, data, weeks),
		[data, weeks]
	);

	const positiveRows = useMemo(
		() => getLaggingPositiveCategories(data.entries, data, weeks),
		[data, weeks]
	);

	const followedIds = useMemo(() => {
		return new Set((data.dashboardCards || []).map((c) => c.categoryId));
	}, [data.dashboardCards]);

	const cardCount = data.dashboardCards?.length ?? 0;

	if (limitRows.length === 0 && positiveRows.length === 0) return null;

	function handleFollow(categoryId: string, categoryName: string) {
		if (followedIds.has(categoryId)) return;
		if (cardCount >= MAX_DASHBOARD_CARDS) {
			showToast('Remove one to add another');
			return;
		}
		addDashboardCard(categoryId);
		showToast(`${categoryName} added to your dashboard`);
	}

	return (
		<div className="space-y-4">
			<h2 className="text-xl font-bold text-heading">Focus Areas</h2>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				{limitRows.length > 0 && (
					<Panel
						title="Top Limit Categories"
						subtitle="These dominate your limit choices"
						rows={limitRows}
						accent="limit"
						followedIds={followedIds}
						onFollow={handleFollow}
					/>
				)}
				{positiveRows.length > 0 && (
					<Panel
						title="Lagging Positive Categories"
						subtitle="These show up less often than your other positives"
						rows={positiveRows}
						accent="positive"
						followedIds={followedIds}
						onFollow={handleFollow}
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
}

function Panel({ title, subtitle, rows, accent, followedIds, onFollow }: PanelProps) {
	const isMobile = useIsMobile();
	const barColor = accent === 'limit' ? '#ef4444' : '#10b981';
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
									<span className="text-sm font-medium text-heading truncate">
										{row.categoryName}
									</span>
									<span className="text-xs text-label whitespace-nowrap">
										{row.label}
									</span>
								</div>

								<button
									onClick={() => onFollow(row.categoryId, row.categoryName)}
									disabled={isFollowed}
									className={`text-xs font-medium px-2 py-0.5 rounded transition-colors whitespace-nowrap ${
										isFollowed
											? 'text-label cursor-default'
											: 'text-body hover:bg-[var(--bg-inset)]'
									} ${!isMobile && !isFollowed ? 'sm:opacity-0 sm:group-hover:opacity-100' : ''}`}
								>
									{isFollowed ? '\u2713 Following' : '+ Follow'}
								</button>
							</div>

							<div className="h-2 rounded-full bg-[var(--bg-inset)] overflow-hidden">
								<div
									className="h-full rounded-full transition-all duration-300"
									style={{
										width: `${barWidth}%`,
										backgroundColor: barColor,
										opacity: 0.7
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
