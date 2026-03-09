import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TrackerData, Entry } from '@/shared/lib/types';
import { getTodayDate, findItemWithCategories } from '@/shared/lib/types';
import { filterEntriesByType, filterEntriesByDateRange, getEntryCategoryIds } from '@/features/tracking';
import { getDateNDaysAgo } from '@/shared/lib/date-utils';
import SegmentedControl from '@/shared/ui/SegmentedControl';
import { EntryTypePill } from '@/shared/ui/EntityMetaBadges';
import { rankItems, buildItemLookup, type RankedItem } from '../utils/ranking-utils';
import { getItemAccentColor, SENTIMENT_COLORS } from '../utils/stats-engine';

type TimePeriod = 'all' | '7d' | '30d';
type TypeFilter = 'all' | 'activity' | 'food';
type ViewMode = 'items' | 'categories';

function rankCategories(entries: Entry[], data: TrackerData): RankedItem[] {
	const catLookup = new Map([...data.activityCategories, ...data.foodCategories].map((cat) => [cat.id, cat]));
	const counts = new Map<string, RankedItem>();

	for (const entry of entries) {
		const catIds = getEntryCategoryIds(entry, data);
		for (const catId of catIds) {
			const existing = counts.get(catId);
			if (existing) {
				existing.count++;
			} else {
				const cat = catLookup.get(catId);
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
	data: TrackerData;
}

export default function FrequencyRanking({ entries, data }: Props) {
	const { t } = useTranslation('stats');
	const navigate = useNavigate();
	const [timePeriod, setTimePeriod] = useState<TimePeriod>('all');
	const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
	const [viewMode, setViewMode] = useState<ViewMode>('items');

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

	const itemLookup = useMemo(() => buildItemLookup(data), [data]);

	const ranked = useMemo(() => {
		if (viewMode === 'items') {
			return rankItems(filteredEntries, itemLookup);
		}
		return rankCategories(filteredEntries, data);
	}, [filteredEntries, data, viewMode, itemLookup]);

	const maxCount = ranked.length > 0 ? ranked[0].count : 0;

	const getRowColor = (row: RankedItem) => {
		if (viewMode === 'categories') {
			return SENTIMENT_COLORS[row.sentiment ?? 'neutral'];
		}
		const found = findItemWithCategories(data, row.id);
		if (!found) return SENTIMENT_COLORS.neutral;
		return getItemAccentColor(found.item.categories, found.categories);
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
										<div className="flex items-center gap-1.5 min-w-0">
											{typeFilter === 'all' && <EntryTypePill type={row.type} className="shrink-0" />}
											<span className="text-sm text-heading truncate">{row.name}</span>
										</div>
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
