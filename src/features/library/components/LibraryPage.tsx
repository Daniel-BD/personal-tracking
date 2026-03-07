import { useState, useMemo } from 'react';
import { X, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useActivityItems, useFoodItems, useActivityCategories, useFoodCategories } from '@/shared/store/hooks';
import SegmentedControl from '@/shared/ui/SegmentedControl';
import ItemsTab from './ItemsTab';
import CategoriesTab from './CategoriesTab';

export default function LibraryPage() {
	const { t } = useTranslation('library');
	const activityItems = useActivityItems();
	const foodItems = useFoodItems();
	const activityCategories = useActivityCategories();
	const foodCategories = useFoodCategories();

	const [activeSubTab, setActiveSubTab] = useState<'items' | 'categories'>('items');
	const [searchQuery, setSearchQuery] = useState('');
	const [showAddSheet, setShowAddSheet] = useState(false);

	const allItems = useMemo(
		() =>
			[
				...activityItems.map((item) => ({ ...item, type: 'activity' as const })),
				...foodItems.map((item) => ({ ...item, type: 'food' as const })),
			].sort((a, b) => a.name.localeCompare(b.name)),
		[activityItems, foodItems],
	);

	const allCategories = useMemo(
		() =>
			[
				...activityCategories.map((category) => ({ ...category, type: 'activity' as const })),
				...foodCategories.map((category) => ({ ...category, type: 'food' as const })),
			].sort((a, b) => a.name.localeCompare(b.name)),
		[activityCategories, foodCategories],
	);

	const currentItems = useMemo(
		() =>
			searchQuery.trim()
				? allItems.filter((item) => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
				: allItems,
		[allItems, searchQuery],
	);

	const currentCategories = useMemo(
		() =>
			searchQuery.trim()
				? allCategories.filter((cat) => cat.name.toLowerCase().includes(searchQuery.toLowerCase()))
				: allCategories,
		[allCategories, searchQuery],
	);

	const categoriesByType = useMemo(
		() => ({
			activity: allCategories.filter((category) => category.type === 'activity'),
			food: allCategories.filter((category) => category.type === 'food'),
		}),
		[allCategories],
	);

	const count = activeSubTab === 'items' ? currentItems.length : currentCategories.length;
	const countLabel = activeSubTab === 'items' ? t('countLabel.item', { count }) : t('countLabel.category', { count });

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-bold text-heading">{t('title')}</h2>
					<p className="text-xs text-subtle mt-0.5">{countLabel}</p>
				</div>
				<button
					type="button"
					onClick={() => setShowAddSheet(true)}
					className="p-2 rounded-lg text-label hover:text-heading hover:bg-[var(--bg-inset)] transition-colors"
					aria-label={activeSubTab === 'items' ? t('addAriaLabel.item') : t('addAriaLabel.category')}
				>
					<Plus className="w-5 h-5" strokeWidth={1.5} />
				</button>
			</div>

			<SegmentedControl
				options={[
					{ value: 'items' as const, label: t('subTabs.items') },
					{ value: 'categories' as const, label: t('subTabs.categories') },
				]}
				value={activeSubTab}
				onChange={setActiveSubTab}
				variant="segment"
				size="sm"
			/>

			<div className="relative">
				<input
					type="text"
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					placeholder={t('searchPlaceholder.simple')}
					className="form-input-sm pr-8"
				/>
				{searchQuery && (
					<button
						type="button"
						onClick={() => setSearchQuery('')}
						className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle hover:text-body"
						aria-label={t('clearSearchAriaLabel')}
					>
						<X className="w-4 h-4" strokeWidth={2} />
					</button>
				)}
			</div>

			{activeSubTab === 'items' ? (
				<ItemsTab
					items={currentItems}
					categoriesByType={categoriesByType}
					searchQuery={searchQuery}
					showAddSheet={showAddSheet}
					onCloseAddSheet={() => setShowAddSheet(false)}
				/>
			) : (
				<CategoriesTab
					categories={currentCategories}
					allItems={allItems}
					searchQuery={searchQuery}
					showAddSheet={showAddSheet}
					onCloseAddSheet={() => setShowAddSheet(false)}
				/>
			)}
		</div>
	);
}
