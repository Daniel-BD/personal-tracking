import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { type Category, type Entry, getTodayDate } from '@/shared/lib/types';
import {
	filterEntriesByDateRange,
	filterEntriesByType,
	getEntryCategoryIdsFromIndex,
	useCategoryById,
	useItemById,
	useItemCategoryIdsByItemId,
} from '@/features/tracking';
import { getDateNDaysAgo } from '@/shared/lib/date-utils';
import SegmentedControl from '@/shared/ui/SegmentedControl';
import { rankItems, type RankedItem } from '../utils/ranking-utils';
import { SENTIMENT_COLORS } from '../utils/stats-engine';
import { useItemAccentColorById } from '../hooks/use-stats-view-models';

type TimePeriod = 'all' | '7d' | '30d';
type TypeFilter = 'all' | 'activity' | 'food';
type ViewMode = 'items' | 'categories';

function rankCategories(
	entries: Entry[],
	categoryById: Map<string, Category>,
	itemCategoryIdsByItemId: Map<string, string[]>,
): RankedItem[] {
	const counts = new Map<string, RankedItem>();

	for (const entry of entries) {
		const catIds = getEntryCategoryIdsFromIndex(entry, itemCategoryIdsByItemId);
		for (const catId of catIds) {
			const existing = counts.get(catId);
			if (existing) {
				existing.count++;
			} else {
				const cat = categoryById.get(catId);
				counts.set(catId, {
					id: catId,
					name: cat?.name ?? 'Unknown',
					count: 1,
					type: entry.type,
					sentiment: cat?.sentiment,
				});
			}
		}
	}

	return Array.from(counts.values()).sort((a, b) => b.count - a.count);
}

interface Props {
	entries: Entry[];
}

export default function FrequencyRanking({ entries }: Props) {
	const { t } = useTranslation('stats');
	const navigate = useNavigate();
	const [timePeriod, setTimePeriod] = useState<TimePeriod>('all');
	const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
	const [viewMode, setViewMode] = useState<ViewMode>('items');
	const itemById = useItemById();
	const categoryById = useCategoryById();
	const itemCategoryIdsByItemId = useItemCategoryIdsByItemId();
	const itemAccentColorById = useItemAccentColorById();

	const timeFilteredEntries = useMemo(() => {
		if (timePeriod === 'all') return entries;
		const days = timePeriod === '7d' ? 7 : 30;
		return filterEntriesByDateRange(entries, {
			start: getDateNDaysAgo(days - 1),
			end: getTodayDate(),
		});
	}, [entries, timePeriod]);

	const filteredEntries = useMemo(() => {
		if (typeFilter === 'all') return timeFilteredEntries;
		return filterEntriesByType(timeFilteredEntries, typeFilter);
	}, [timeFilteredEntries, typeFilter]);

	const ranked = useMemo(() => {
		if (viewMode === 'items') {
			return rankItems(filteredEntries, itemById);
		}
		return rankCategories(filteredEntries, categoryById, itemCategoryIdsByItemId);
	}, [filteredEntries, viewMode, itemById, categoryById, itemCategoryIdsByItemId]);

	const maxCount = ranked.length > 0 ? ranked[0].count : 0;

	const getRowColor = (row: RankedItem) => {
		if (viewMode === 'categories') {
			return SENTIMENT_COLORS[row.sentiment ?? 'neutral'];
		}
		return itemAccentColorById.get(row.id) ?? SENTIMENT_COLORS.neutral;
	};

	return (
		<div className="space-y-3">
			<h2 className="text-lg font-semibold text-heading">{t('frequencyRanking.title')}</h2>

			<SegmentedControl
				options={[
					{ value: 'all' as const, label: t('frequencyRanking.timePeriod.all') },
					{ value: '7d' as const, label: t('frequencyRanking.timePeriod.7d') },
					{ value: '30d' as const, label: t('frequencyRanking.timePeriod.30d') },
				]}
				value={timePeriod}
				onChange={setTimePeriod}
				variant="segment"
				size="sm"
			/>

			<SegmentedControl
				options={[
					{
						value: 'all' as const,
						label: t('frequencyRanking.typeFilter.all'),
						activeClass: 'bg-[var(--text-secondary)] text-white',
					},
					{
						value: 'activity' as const,
						label: t('frequencyRanking.typeFilter.activities'),
						activeClass: 'bg-[var(--text-primary)] text-[var(--bg-card)]',
					},
					{
						value: 'food' as const,
						label: t('frequencyRanking.typeFilter.food'),
						activeClass: 'bg-[var(--text-primary)] text-[var(--bg-card)]',
					},
				]}
				value={typeFilter}
				onChange={setTypeFilter}
				variant="segment"
				size="sm"
			/>

			<SegmentedControl
				options={[
					{ value: 'items' as const, label: t('frequencyRanking.viewMode.items') },
					{ value: 'categories' as const, label: t('frequencyRanking.viewMode.categories') },
				]}
				value={viewMode}
				onChange={setViewMode}
				variant="segment"
				size="sm"
			/>

			{ranked.length === 0 ? (
				<p className="text-sm text-label text-center py-4">
					{t('frequencyRanking.empty', { viewMode: t(`frequencyRanking.viewMode.${viewMode}`).toLowerCase() })}
				</p>
			) : (
				<div className="space-y-1.5">
					{ranked.map((row, i) => {
						const rowColor = getRowColor(row);
						const detailPath = viewMode === 'items' ? `/stats/item/${row.id}` : `/stats/category/${row.id}`;

						return (
							<button
								key={row.id}
								type="button"
								onClick={() => navigate(detailPath)}
								className="w-full flex items-center gap-3 text-left hover:bg-[var(--bg-card-hover)] rounded-lg p-1 -m-1 transition-colors"
							>
								<span className="text-xs text-muted w-5 text-right shrink-0">{i + 1}</span>
								<div className="flex-1 min-w-0">
									<div className="flex items-center justify-between gap-2 mb-0.5">
										<span className="text-sm text-heading truncate">{row.name}</span>
										<span className="text-xs text-label shrink-0">{row.count}</span>
									</div>
									<div className="h-1 rounded-full bg-[var(--bg-inset)] overflow-hidden">
										<div
											className="h-full rounded-full transition-all"
											style={{
												width: `${(row.count / maxCount) * 100}%`,
												backgroundColor: rowColor,
											}}
										/>
									</div>
								</div>
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
}
