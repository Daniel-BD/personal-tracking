import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TrackerData, Entry, CategorySentiment } from '@/shared/lib/types';
import { getTodayDate } from '@/shared/lib/types';
import { filterEntriesByDateRange } from '@/features/tracking';
import { getDateNDaysAgo } from '@/shared/lib/date-utils';
import { cn } from '@/shared/lib/cn';
import SegmentedControl from '@/shared/ui/SegmentedControl';
import { SENTIMENT_COLORS } from '../utils/stats-engine';

type TimePeriod = 'all' | '7d' | '30d';

interface RankedItem {
	id: string;
	name: string;
	count: number;
}

function rankItems(entries: Entry[], data: TrackerData): RankedItem[] {
	const itemLookup = new Map([...data.activityItems, ...data.foodItems].map((item) => [item.id, item]));
	const counts = new Map<string, RankedItem>();

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
			});
		}
	}

	return Array.from(counts.values()).sort((a, b) => b.count - a.count);
}

interface Props {
	entries: Entry[];
	data: TrackerData;
	sentiment: CategorySentiment;
}

export default function CategoryMostLogged({ entries, data, sentiment }: Props) {
	const { t } = useTranslation('stats');
	const [timePeriod, setTimePeriod] = useState<TimePeriod>('all');

	const filteredEntries = useMemo(() => {
		if (timePeriod === 'all') return entries;
		const days = timePeriod === '7d' ? 7 : 30;
		return filterEntriesByDateRange(entries, {
			start: getDateNDaysAgo(days - 1),
			end: getTodayDate(),
		});
	}, [entries, timePeriod]);

	const ranked = useMemo(() => rankItems(filteredEntries, data), [filteredEntries, data]);

	const maxCount = ranked.length > 0 ? ranked[0].count : 0;
	const totalCount = filteredEntries.length;

	const barColor = SENTIMENT_COLORS[sentiment] ?? 'var(--color-activity)';

	return (
		<div className="space-y-3">
			<h2 className="text-lg font-semibold text-heading">{t('categoryDetail.mostLogged.title')}</h2>

			<SegmentedControl
				options={[
					{ value: 'all' as const, label: t('categoryDetail.mostLogged.timePeriod.all') },
					{ value: '7d' as const, label: t('categoryDetail.mostLogged.timePeriod.7d') },
					{ value: '30d' as const, label: t('categoryDetail.mostLogged.timePeriod.30d') },
				]}
				value={timePeriod}
				onChange={setTimePeriod}
				variant="segment"
				size="sm"
			/>

			{ranked.length === 0 ? (
				<p className="text-sm text-label text-center py-4">{t('categoryDetail.mostLogged.empty')}</p>
			) : (
				<div className="space-y-1.5">
					{ranked.map((row, i) => {
						const pct = totalCount > 0 ? Math.round((row.count / totalCount) * 100) : 0;
						return (
							<div key={row.id} className="flex items-center gap-3">
								<span className="text-xs text-muted w-5 text-right shrink-0">{i + 1}</span>
								<div className="flex-1 min-w-0">
									<div className="flex items-center justify-between gap-2 mb-0.5">
										<span className="text-sm text-heading truncate">{row.name}</span>
										<div className="flex items-center gap-2 shrink-0">
											<span className="text-xs text-label">{pct}%</span>
											<span className="text-xs text-label">{row.count}</span>
										</div>
									</div>
									<div className="h-1 rounded-full bg-[var(--bg-inset)] overflow-hidden">
										<div
											className={cn('h-full rounded-full transition-all')}
											style={{
												width: `${(row.count / maxCount) * 100}%`,
												backgroundColor: barColor,
											}}
										/>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
