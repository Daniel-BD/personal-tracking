import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getTypeIcon } from '@/shared/lib/types';
import { toggleFavorite } from '@/shared/store/store';
import StarIcon from '@/shared/ui/StarIcon';
import SegmentedControl from '@/shared/ui/SegmentedControl';
import type { UnifiedItem } from '../hooks/useQuickLogSearch';
import QuickLogButton from './QuickLogButton';

type Tab = 'favorites' | 'recent';

interface Props {
	favoriteItemsList: UnifiedItem[];
	recentItemsList: UnifiedItem[];
	onSelectExisting: (unified: UnifiedItem) => void;
	onQuickLog: (unified: UnifiedItem) => void;
}

export default function QuickLogItemsList({ favoriteItemsList, recentItemsList, onSelectExisting, onQuickLog }: Props) {
	const { t } = useTranslation('quickLog');
	const [tab, setTab] = useState<Tab>('favorites');

	const items = tab === 'favorites' ? favoriteItemsList : recentItemsList;
	const isEmpty = items.length === 0;
	const emptyMessage = tab === 'favorites' ? t('noFavorites') : t('noRecent');

	return (
		<div className="flex flex-col flex-1 min-h-0">
			{/* Segmented control — never scrolls */}
			<div className="py-3 flex-shrink-0">
				<SegmentedControl
					options={[
						{ value: 'favorites' as Tab, label: t('favoritesLabel') },
						{ value: 'recent' as Tab, label: t('recentLabel') },
					]}
					value={tab}
					onChange={setTab}
					variant="segment"
					size="sm"
				/>
			</div>

			{/* Items list — scroll container, fills remaining height */}
			{isEmpty ? (
				<p className="text-sm text-[var(--text-muted)] px-1 py-3">{emptyMessage}</p>
			) : (
				<div className="flex-1 min-h-0 overflow-y-auto">
					<div className="space-y-0.5">
						{items.map((unified) => (
							<div
								key={`${unified.type}-${unified.item.id}`}
								className="w-full px-1 py-2.5 hover:bg-[var(--bg-card-hover)] rounded-md flex items-center gap-3 transition-colors"
							>
								{tab === 'favorites' ? (
									<button
										type="button"
										onClick={() => toggleFavorite(unified.item.id)}
										className="flex-shrink-0 p-1"
										aria-label={t('removeFromFavoritesAriaLabel')}
									>
										<StarIcon filled className="w-4 h-4" />
									</button>
								) : (
									<span className="flex-shrink-0 w-6" />
								)}
								<button
									type="button"
									onClick={() => onSelectExisting(unified)}
									className="flex-1 text-left flex items-center gap-3 min-w-0"
								>
									<span className="text-sm">{getTypeIcon(unified.type)}</span>
									<span className="text-body truncate">{unified.item.name}</span>
								</button>
								<QuickLogButton
									onClick={() => onQuickLog(unified)}
									ariaLabel={t('quickLogAriaLabel', { name: unified.item.name })}
								/>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
