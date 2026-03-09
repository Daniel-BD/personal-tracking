import { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
	useDashboardCards,
	useFoodCategories,
	useActivityCategories,
	useFoodItems,
	useActivityItems,
} from '@/shared/store/hooks';
import { addDashboardCard } from '@/shared/store/store';
import { getCardId } from '@/shared/lib/types';
import type { EntryType } from '@/shared/lib/types';
import SegmentedControl from '@/shared/ui/SegmentedControl';
import { SENTIMENT_COLORS, getItemAccentColor } from '../utils/stats-engine';
import { SentimentDot, CategorySentimentPills } from '@/shared/ui/EntityMetaBadges';

interface AddCategoryModalProps {
	onClose: () => void;
}

type Tab = 'categories' | 'items';

export default function AddCategoryModal({ onClose }: AddCategoryModalProps) {
	const { t } = useTranslation('stats');
	const dashboardCards = useDashboardCards();
	const foodCategories = useFoodCategories();
	const activityCategories = useActivityCategories();
	const foodItems = useFoodItems();
	const activityItems = useActivityItems();
	const [search, setSearch] = useState('');
	const [tab, setTab] = useState<Tab>('categories');

	const addedIds = useMemo(() => {
		return new Set(dashboardCards.map((c) => getCardId(c)));
	}, [dashboardCards]);

	const categories = useMemo(() => {
		const all = [
			...foodCategories.map((c) => ({ ...c, type: 'food' as EntryType })),
			...activityCategories.map((c) => ({ ...c, type: 'activity' as EntryType })),
		];

		return all.sort((a, b) => a.name.localeCompare(b.name));
	}, [foodCategories, activityCategories]);

	const filteredCategories = useMemo(() => {
		const term = search.toLowerCase().trim();
		return categories.filter((c) => c.name.toLowerCase().includes(term));
	}, [categories, search]);

	const sortedItems = useMemo(() => {
		const all = [
			...foodItems.map((i) => ({ ...i, type: 'food' as EntryType })),
			...activityItems.map((i) => ({ ...i, type: 'activity' as EntryType })),
		];
		return all.sort((a, b) => a.name.localeCompare(b.name));
	}, [foodItems, activityItems]);

	const filteredItems = useMemo(() => {
		const term = search.toLowerCase().trim();
		return sortedItems.filter((item) => item.name.toLowerCase().includes(term));
	}, [sortedItems, search]);

	const handleSelectCategory = (categoryId: string) => {
		if (addedIds.has(categoryId)) return;
		addDashboardCard({ categoryId });
		onClose();
	};

	const handleSelectItem = (itemId: string) => {
		if (addedIds.has(itemId)) return;
		addDashboardCard({ itemId });
		onClose();
	};

	const tabOptions = [
		{ value: 'categories' as Tab, label: t('addCategoryModal.tabCategories') },
		{ value: 'items' as Tab, label: t('addCategoryModal.tabItems') },
	];

	const searchPlaceholder = t('addCategoryModal.searchPlaceholder');

	const resolveItemCategories = (item: { categories: string[]; type: EntryType }) => {
		const typeCategories = item.type === 'food' ? foodCategories : activityCategories;
		return item.categories
			.map((id) => typeCategories.find((category) => category.id === id))
			.filter((category): category is (typeof typeCategories)[number] => category !== undefined);
	};

	return (
		// eslint-disable-next-line jsx-a11y/no-static-element-interactions
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
			onMouseDown={onClose}
		>
			{/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
			<div
				className="card w-full max-w-md bg-elevated shadow-elevated flex flex-col max-h-[80vh]"
				onMouseDown={(e) => e.stopPropagation()}
			>
				<div className="p-4 border-b flex items-center justify-between">
					<h3 className="text-lg font-bold">{t('addCategoryModal.title')}</h3>
					<button onClick={onClose} className="p-1 hover:bg-inset rounded-full transition-colors">
						<X className="w-5 h-5" strokeWidth={2} />
					</button>
				</div>

				<div className="px-4 pt-4 pb-2 space-y-3">
					<SegmentedControl options={tabOptions} value={tab} onChange={setTab} variant="segment" size="sm" />
					<input
						type="text"
						placeholder={searchPlaceholder}
						className="form-input"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						autoFocus
					/>
				</div>

				<div className="flex-1 overflow-y-auto p-2 space-y-1">
					{tab === 'categories' &&
						filteredCategories.map((category) => {
							const isAdded = addedIds.has(category.id);
							return (
								<button
									key={category.id}
									onClick={() => handleSelectCategory(category.id)}
									disabled={isAdded}
									className={`w-full text-left px-3 py-2 rounded-md flex items-center justify-between transition-colors ${
										isAdded ? 'opacity-50 cursor-not-allowed bg-inset' : 'hover:bg-inset'
									}`}
								>
									<div className="min-w-0">
										<div className="flex items-center gap-2">
											<SentimentDot color={SENTIMENT_COLORS[category.sentiment]} />
											<span className="font-medium truncate">{category.name}</span>
										</div>
									</div>
									{isAdded && <span className="text-xs font-medium text-label">{t('addCategoryModal.added')}</span>}
								</button>
							);
						})}

					{tab === 'items' &&
						filteredItems.map((item) => {
							const isAdded = addedIds.has(item.id);
							return (
								<button
									key={item.id}
									onClick={() => handleSelectItem(item.id)}
									disabled={isAdded}
									className={`w-full text-left px-3 py-2 rounded-md flex items-center justify-between transition-colors ${
										isAdded ? 'opacity-50 cursor-not-allowed bg-inset' : 'hover:bg-inset'
									}`}
								>
									<div className="min-w-0">
										<div className="flex items-center gap-2">
											<SentimentDot
												color={getItemAccentColor(
													item.categories,
													item.type === 'food' ? foodCategories : activityCategories,
												)}
											/>
											<span className="font-medium truncate">{item.name}</span>
										</div>
										<CategorySentimentPills categories={resolveItemCategories(item)} />
									</div>
									{isAdded && <span className="text-xs font-medium text-label">{t('addCategoryModal.added')}</span>}
								</button>
							);
						})}

					{tab === 'categories' && filteredCategories.length === 0 && (
						<div className="py-8 text-center text-label">{t('addCategoryModal.noResults', { search })}</div>
					)}

					{tab === 'items' && filteredItems.length === 0 && (
						<div className="py-8 text-center text-label">{t('addCategoryModal.noItemResults', { search })}</div>
					)}
				</div>
			</div>
		</div>
	);
}
