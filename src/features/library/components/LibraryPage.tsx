import { useMemo, useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useActivityItems, useFoodItems, useActivityCategories, useFoodCategories } from '@/shared/store/hooks';
import SegmentedControl from '@/shared/ui/SegmentedControl';
import { useLibraryIndexes } from '../hooks/use-library-indexes';
import ItemsTab from './ItemsTab';
import CategoriesTab from './CategoriesTab';
import { buildTypedCategories, buildTypedItems } from '../utils/library-indexes';

type LibrarySubTab = 'items' | 'categories';

type EditIntent =
	| {
			kind: 'item';
			id: string;
	  }
	| {
			kind: 'category';
			id: string;
	  }
	| null;

function parseEditIntent(searchParams: URLSearchParams): EditIntent {
	const editKind = searchParams.get('edit');
	const id = searchParams.get('id');

	if (!id) return null;
	if (editKind === 'item') return { kind: 'item', id };
	if (editKind === 'category') return { kind: 'category', id };
	return null;
}

function parseInitialTab(searchParams: URLSearchParams, editIntent: EditIntent): LibrarySubTab {
	if (editIntent?.kind === 'item') return 'items';
	if (editIntent?.kind === 'category') return 'categories';

	const tab = searchParams.get('tab');
	return tab === 'categories' ? 'categories' : 'items';
}

export default function LibraryPage() {
	const { t } = useTranslation('library');
	const [searchParams, setSearchParams] = useSearchParams();
	const initialEditIntent = useMemo(() => parseEditIntent(searchParams), [searchParams]);
	const activityItems = useActivityItems();
	const foodItems = useFoodItems();
	const activityCategories = useActivityCategories();
	const foodCategories = useFoodCategories();
	const { categoriesById, categoriesByType, favoriteItemIdSet, itemCountsByCategoryId } = useLibraryIndexes();

	const [activeSubTab, setActiveSubTab] = useState<LibrarySubTab>(() =>
		parseInitialTab(searchParams, initialEditIntent),
	);
	const [searchQuery, setSearchQuery] = useState('');
	const [showAddSheet, setShowAddSheet] = useState(false);
	const [editIntent, setEditIntent] = useState<EditIntent>(initialEditIntent);

	const allItems = useMemo(() => buildTypedItems(activityItems, foodItems), [activityItems, foodItems]);

	const allCategories = useMemo(
		() => buildTypedCategories(activityCategories, foodCategories),
		[activityCategories, foodCategories],
	);
	const itemsByType = useMemo(
		() => ({
			activity: allItems.filter((item) => item.type === 'activity'),
			food: allItems.filter((item) => item.type === 'food'),
		}),
		[allItems],
	);

	useEffect(() => {
		if (!editIntent) return;
		setActiveSubTab(editIntent.kind === 'item' ? 'items' : 'categories');
		setShowAddSheet(false);
	}, [editIntent]);

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

	function handleEditIntentHandled() {
		setEditIntent(null);
		if (!searchParams.get('edit') && !searchParams.get('id')) return;

		const nextParams = new URLSearchParams(searchParams);
		nextParams.delete('edit');
		nextParams.delete('id');
		setSearchParams(nextParams, { replace: true });
	}

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
					itemsByType={itemsByType}
					categoriesById={categoriesById}
					categoriesByType={categoriesByType}
					favoriteItemIdSet={favoriteItemIdSet}
					searchQuery={searchQuery}
					showAddSheet={showAddSheet}
					onCloseAddSheet={() => setShowAddSheet(false)}
					initialEditItemId={editIntent?.kind === 'item' ? editIntent.id : null}
					onInitialEditHandled={handleEditIntentHandled}
				/>
			) : (
				<CategoriesTab
					categories={currentCategories}
					categoriesByType={categoriesByType}
					itemCountsByCategoryId={itemCountsByCategoryId}
					searchQuery={searchQuery}
					showAddSheet={showAddSheet}
					onCloseAddSheet={() => setShowAddSheet(false)}
					initialEditCategoryId={editIntent?.kind === 'category' ? editIntent.id : null}
					onInitialEditHandled={handleEditIntentHandled}
				/>
			)}
		</div>
	);
}
