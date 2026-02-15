import { useMemo, useState } from 'react';
import type { TrackerData, EntryType, Entry } from '@/shared/lib/types';
import { getTodayDate } from '@/shared/lib/types';
import { filterEntriesByType, filterEntriesByDateRange, getEntryCategoryIds } from '@/features/tracking';
import { getDateNDaysAgo } from '@/shared/lib/date-utils';
import SegmentedControl from '@/shared/ui/SegmentedControl';

type TimePeriod = 'all' | '7d' | '30d';
type TypeFilter = 'all' | 'activity' | 'food';
type ViewMode = 'items' | 'categories';

interface RankedRow {
	id: string;
	name: string;
	count: number;
	type: EntryType;
}

function rankItems(entries: Entry[], data: TrackerData): RankedRow[] {
	const itemLookup = new Map(
		[...data.activityItems, ...data.foodItems].map((item) => [item.id, item])
	);
	const counts = new Map<string, RankedRow>();

	for (const entry of entries) {
		const existing = counts.get(entry.itemId);
		if (existing) {
			existing.count++;
		} else {
			const item = itemLookup.get(entry.itemId);
			counts.set(entry.itemId, {
				id: entry.itemId,
				name: item?.name ?? 'Unknown',
				count: 1,
				type: entry.type
			});
		}
	}

	return Array.from(counts.values()).sort((a, b) => b.count - a.count);
}

function rankCategories(entries: Entry[], data: TrackerData): RankedRow[] {
	const catLookup = new Map(
		[...data.activityCategories, ...data.foodCategories].map((cat) => [cat.id, cat])
	);
	const counts = new Map<string, RankedRow>();

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
					type: entry.type
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
	const [timePeriod, setTimePeriod] = useState<TimePeriod>('all');
	const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
	const [viewMode, setViewMode] = useState<ViewMode>('items');

	const timeFilteredEntries = useMemo(() => {
		if (timePeriod === 'all') return entries;
		const days = timePeriod === '7d' ? 7 : 30;
		return filterEntriesByDateRange(entries, {
			start: getDateNDaysAgo(days - 1),
			end: getTodayDate()
		});
	}, [entries, timePeriod]);

	const filteredEntries = useMemo(() => {
		if (typeFilter === 'all') return timeFilteredEntries;
		return filterEntriesByType(timeFilteredEntries, typeFilter);
	}, [timeFilteredEntries, typeFilter]);

	const ranked = useMemo(() => {
		if (viewMode === 'items') {
			return rankItems(filteredEntries, data);
		}
		return rankCategories(filteredEntries, data);
	}, [filteredEntries, data, viewMode]);

	const maxCount = ranked.length > 0 ? ranked[0].count : 0;

	return (
		<div className="space-y-3">
			<h2 className="text-lg font-semibold text-heading">Most logged</h2>

			<SegmentedControl
				options={[
					{ value: 'all' as const, label: 'All time' },
					{ value: '7d' as const, label: '7 days' },
					{ value: '30d' as const, label: '30 days' }
				]}
				value={timePeriod}
				onchange={setTimePeriod}
				variant="segment"
				size="sm"
			/>

			<SegmentedControl
				options={[
					{ value: 'all' as const, label: 'All', activeClass: 'bg-[var(--text-secondary)] text-white' },
					{ value: 'activity' as const, label: 'Activities', activeClass: 'type-activity' },
					{ value: 'food' as const, label: 'Food', activeClass: 'type-food' }
				]}
				value={typeFilter}
				onchange={setTypeFilter}
				variant="segment"
				size="sm"
			/>

			<SegmentedControl
				options={[
					{ value: 'items' as const, label: 'Items' },
					{ value: 'categories' as const, label: 'Categories' }
				]}
				value={viewMode}
				onchange={setViewMode}
				variant="segment"
				size="sm"
			/>

			{ranked.length === 0 ? (
				<p className="text-sm text-label text-center py-4">
					No {viewMode} logged in this period
				</p>
			) : (
				<div className="space-y-1.5">
					{ranked.map((row, i) => (
						<div key={row.id} className="flex items-center gap-3">
							<span className="text-xs text-muted w-5 text-right shrink-0">{i + 1}</span>
							<div className="flex-1 min-w-0">
								<div className="flex items-center justify-between gap-2 mb-0.5">
									<span className="text-sm text-heading truncate">{row.name}</span>
									<span className="text-xs text-label shrink-0">{row.count}</span>
								</div>
								<div className="h-1 rounded-full bg-[var(--bg-inset)] overflow-hidden">
									<div
										className={`h-full rounded-full transition-all ${
											row.type === 'activity'
												? 'bg-[var(--color-activity)]'
												: 'bg-[var(--color-food)]'
										}`}
										style={{ width: `${(row.count / maxCount) * 100}%` }}
									/>
								</div>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
