import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TrackerData, Entry, CategorySentiment } from '@/shared/lib/types';
import { getTodayDate, findItemWithCategories } from '@/shared/lib/types';
import { filterEntriesByDateRange } from '@/features/tracking';
import { getDateNDaysAgo } from '@/shared/lib/date-utils';
import SegmentedControl from '@/shared/ui/SegmentedControl';
import { SENTIMENT_COLORS, getItemAccentColor } from '../utils/stats-engine';
import { rankItems, buildItemLookup } from '../utils/ranking-utils';

type TimePeriod = 'all' | '7d' | '30d';

interface Props {
	entries: Entry[];
	data: TrackerData;
	sentiment: CategorySentiment;
}

export default function CategoryMostLogged({ entries, data, sentiment: _sentiment }: Props) {
	const { t } = useTranslation('stats');
	const navigate = useNavigate();
	const [timePeriod, setTimePeriod] = useState<TimePeriod>('all');

	const filteredEntries = useMemo(() => {
		if (timePeriod === 'all') return entries;
		const days = timePeriod === '7d' ? 7 : 30;
		return filterEntriesByDateRange(entries, {
			start: getDateNDaysAgo(days - 1),
			end: getTodayDate(),
		});
	}, [entries, timePeriod]);

	const itemLookup = useMemo(() => buildItemLookup(data), [data]);
	const ranked = useMemo(() => rankItems(filteredEntries, itemLookup), [filteredEntries, itemLookup]);

	const maxCount = ranked.length > 0 ? ranked[0].count : 0;
	const totalCount = filteredEntries.length;

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
						const found = findItemWithCategories(data, row.id);
						const barColor = found
							? getItemAccentColor(found.item.categories, found.categories)
							: SENTIMENT_COLORS.neutral;
						return (
							<button
								key={row.id}
								type="button"
								onClick={() => navigate(`/stats/item/${row.id}`)}
								className="w-full flex items-center gap-3 text-left hover:bg-[var(--bg-card-hover)] rounded-lg p-1 -m-1 transition-colors"
							>
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
											className="h-full rounded-full transition-all"
											style={{
												width: `${(row.count / maxCount) * 100}%`,
												backgroundColor: barColor,
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
