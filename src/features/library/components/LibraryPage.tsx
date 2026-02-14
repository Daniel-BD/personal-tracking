import { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
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

	const allItems = useMemo(
		() => (activeTab === 'activity' ? activityItems : foodItems)
			.slice()
			.sort((a, b) => a.name.localeCompare(b.name)),
		[activeTab, activityItems, foodItems]
	);

	const allCategories = useMemo(
		() => (activeTab === 'activity' ? activityCategories : foodCategories)
			.slice()
			.sort((a, b) => a.name.localeCompare(b.name)),
		[activeTab, activityCategories, foodCategories]
	);

	const currentItems = useMemo(
		() => searchQuery.trim()
			? allItems.filter((item) =>
				item.name.toLowerCase().includes(searchQuery.toLowerCase())
			)
			: allItems,
		[allItems, searchQuery]
	);

	const currentCategories = useMemo(
		() => searchQuery.trim()
			? allCategories.filter((cat) =>
				cat.name.toLowerCase().includes(searchQuery.toLowerCase())
			)
			: allCategories,
		[allCategories, searchQuery]
	);

	return (
		<div className="space-y-4">
			<h2 className="text-2xl font-bold text-heading">Item Library</h2>

			<SegmentedControl
				options={[
					{ value: 'activity' as const, label: 'Activities', activeClass: 'type-activity' },
					{ value: 'food' as const, label: 'Food', activeClass: 'type-food' }
				]}
				value={activeTab}
				onchange={setActiveTab}
			/>

			<SegmentedControl
				options={[
					{ value: 'items' as const, label: `Items (${allItems.length})` },
					{ value: 'categories' as const, label: `Categories (${allCategories.length})` }
				]}
				value={activeSubTab}
				onchange={setActiveSubTab}
				size="sm"
			/>

			<div className="relative">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle" strokeWidth={2} />
				<input
					type="text"
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					placeholder={`Search ${activeSubTab}...`}
					className="form-input pl-10 pr-8"
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
					categories={currentCategories}
					activeTab={activeTab}
					searchQuery={searchQuery}
				/>
			) : (
				<CategoriesTab
					categories={currentCategories}
					allItems={allItems}
					activeTab={activeTab}
					searchQuery={searchQuery}
				/>
			)}
		</div>
	);
}
