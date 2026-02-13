import { useState, useMemo } from 'react';
import { useTrackerData } from '@/shared/store/hooks';
import SegmentedControl from '@/shared/ui/SegmentedControl';
import ItemsTab from './ItemsTab';
import CategoriesTab from './CategoriesTab';

export default function LibraryPage() {
	const data = useTrackerData();

	const [activeTab, setActiveTab] = useState<'activity' | 'food'>('activity');
	const [activeSubTab, setActiveSubTab] = useState<'items' | 'categories'>('items');
	const [searchQuery, setSearchQuery] = useState('');

	const allItems = useMemo(
		() => (activeTab === 'activity' ? data.activityItems : data.foodItems)
			.slice()
			.sort((a, b) => a.name.localeCompare(b.name)),
		[activeTab, data.activityItems, data.foodItems]
	);

	const allCategories = useMemo(
		() => (activeTab === 'activity' ? data.activityCategories : data.foodCategories)
			.slice()
			.sort((a, b) => a.name.localeCompare(b.name)),
		[activeTab, data.activityCategories, data.foodCategories]
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
				<svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
				</svg>
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
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
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
