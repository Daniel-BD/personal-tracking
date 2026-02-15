import { useState, useMemo } from 'react';
import { Search, X, Plus } from 'lucide-react';
import { useActivityItems, useFoodItems, useActivityCategories, useFoodCategories } from '@/shared/store/hooks';
import SegmentedControl from '@/shared/ui/SegmentedControl';
import ItemsTab from './ItemsTab';
import CategoriesTab from './CategoriesTab';

export default function LibraryPage() {
	const activityItems = useActivityItems();
	const foodItems = useFoodItems();
	const activityCategories = useActivityCategories();
	const foodCategories = useFoodCategories();

	const [activeTab, setActiveTab] = useState<'activity' | 'food'>('activity');
	const [activeSubTab, setActiveSubTab] = useState<'items' | 'categories'>('items');
	const [searchQuery, setSearchQuery] = useState('');
	const [showAddSheet, setShowAddSheet] = useState(false);

	const allItems = useMemo(
		() => (activeTab === 'activity' ? activityItems : foodItems).slice().sort((a, b) => a.name.localeCompare(b.name)),
		[activeTab, activityItems, foodItems],
	);

	const allCategories = useMemo(
		() =>
			(activeTab === 'activity' ? activityCategories : foodCategories)
				.slice()
				.sort((a, b) => a.name.localeCompare(b.name)),
		[activeTab, activityCategories, foodCategories],
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

	const count = activeSubTab === 'items' ? currentItems.length : currentCategories.length;
	const countLabel =
		activeSubTab === 'items'
			? `${count} item${count !== 1 ? 's' : ''}`
			: `${count} ${count !== 1 ? 'categories' : 'category'}`;

	return (
		<div className="space-y-3">
			{/* Header with title + add button */}
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-bold text-heading">Library</h2>
					<p className="text-xs text-subtle mt-0.5">{countLabel}</p>
				</div>
				<button
					type="button"
					onClick={() => setShowAddSheet(true)}
					className="p-2 rounded-lg text-label hover:text-heading hover:bg-[var(--bg-inset)] transition-colors"
					aria-label={activeSubTab === 'items' ? 'Add item' : 'Add category'}
				>
					<Plus className="w-5 h-5" strokeWidth={1.5} />
				</button>
			</div>

			{/* Type filter */}
			<SegmentedControl
				options={[
					{ value: 'activity' as const, label: 'Activities', activeClass: 'type-activity' },
					{ value: 'food' as const, label: 'Food', activeClass: 'type-food' },
				]}
				value={activeTab}
				onchange={setActiveTab}
				variant="segment"
				size="sm"
			/>

			{/* Sub-tab filter */}
			<SegmentedControl
				options={[
					{ value: 'items' as const, label: 'Items' },
					{ value: 'categories' as const, label: 'Categories' },
				]}
				value={activeSubTab}
				onchange={setActiveSubTab}
				variant="segment"
				size="sm"
			/>

			{/* Search */}
			<div className="relative">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle" strokeWidth={2} />
				<input
					type="text"
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					placeholder={`Search ${activeSubTab}...`}
					className="form-input-sm pl-9 pr-8"
				/>
				{searchQuery && (
					<button
						type="button"
						onClick={() => setSearchQuery('')}
						className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle hover:text-body"
						aria-label="Clear search"
					>
						<X className="w-4 h-4" strokeWidth={2} />
					</button>
				)}
			</div>

			{activeSubTab === 'items' ? (
				<ItemsTab
					items={currentItems}
					categories={allCategories}
					activeTab={activeTab}
					searchQuery={searchQuery}
					showAddSheet={showAddSheet}
					onCloseAddSheet={() => setShowAddSheet(false)}
				/>
			) : (
				<CategoriesTab
					categories={currentCategories}
					allItems={allItems}
					activeTab={activeTab}
					searchQuery={searchQuery}
					showAddSheet={showAddSheet}
					onCloseAddSheet={() => setShowAddSheet(false)}
				/>
			)}
		</div>
	);
}
