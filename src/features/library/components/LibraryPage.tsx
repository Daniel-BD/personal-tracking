import { useState, useMemo } from 'react';
import type { Item, Category, CategorySentiment } from '@/shared/lib/types';
import { useTrackerData } from '@/shared/store/hooks';
import {
	addItem,
	updateItem,
	deleteItem,
	addCategory,
	updateCategory,
	deleteCategory,
	getCategoryNames,
	toggleFavorite,
	isFavorite
} from '@/shared/store/store';
import { CategoryPicker } from '@/features/tracking';
import SegmentedControl from '@/shared/ui/SegmentedControl';
import StarIcon from '@/shared/ui/StarIcon';

const SENTIMENT_OPTIONS: { value: CategorySentiment; label: string }[] = [
	{ value: 'positive', label: 'Positive' },
	{ value: 'neutral', label: 'Neutral' },
	{ value: 'limit', label: 'Limit' },
];

function SentimentPicker({ value, onChange }: { value: CategorySentiment; onChange: (s: CategorySentiment) => void }) {
	return (
		<div className="flex gap-1">
			{SENTIMENT_OPTIONS.map((opt) => (
				<button
					key={opt.value}
					type="button"
					onClick={() => onChange(opt.value)}
					className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
						value === opt.value
							? opt.value === 'positive'
								? 'bg-[var(--color-success)] text-white'
								: opt.value === 'limit'
									? 'bg-[var(--color-danger)] text-white'
									: 'bg-[var(--bg-inset)] text-heading ring-1 ring-[var(--border-input)]'
							: 'bg-[var(--bg-inset)] text-label hover:bg-[var(--bg-card-hover)]'
					}`}
				>
					{opt.label}
				</button>
			))}
		</div>
	);
}

export default function LibraryPage() {
	const data = useTrackerData();

	const [activeTab, setActiveTab] = useState<'activity' | 'food'>('activity');
	const [activeSubTab, setActiveSubTab] = useState<'items' | 'categories'>('items');
	const [searchQuery, setSearchQuery] = useState('');
	const [editingItem, setEditingItem] = useState<Item | null>(null);
	const [showAddForm, setShowAddForm] = useState(false);
	const [newItemName, setNewItemName] = useState('');
	const [newItemCategories, setNewItemCategories] = useState<string[]>([]);

	const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
	const [editingCategoryName, setEditingCategoryName] = useState('');
	const [editingCategorySentiment, setEditingCategorySentiment] = useState<CategorySentiment>('neutral');
	const [showAddCategoryForm, setShowAddCategoryForm] = useState(false);
	const [newCategoryName, setNewCategoryName] = useState('');
	const [newCategorySentiment, setNewCategorySentiment] = useState<CategorySentiment>('neutral');

	function handleAddItem() {
		if (!newItemName.trim()) return;
		addItem(activeTab, newItemName.trim(), newItemCategories);
		setNewItemName('');
		setNewItemCategories([]);
		setShowAddForm(false);
	}

	function handleEditItem(item: Item) {
		setEditingItem({ ...item });
	}

	function handleSaveEdit() {
		if (!editingItem || !editingItem.name.trim()) return;
		updateItem(activeTab, editingItem.id, editingItem.name.trim(), editingItem.categories);
		setEditingItem(null);
	}

	function handleCancelEdit() {
		setEditingItem(null);
	}

	function handleDeleteItem(id: string) {
		if (!confirm('Delete this item and all its entries?')) return;
		deleteItem(activeTab, id);
	}

	function handleAddCategorySubmit() {
		if (!newCategoryName.trim()) return;
		addCategory(activeTab, newCategoryName.trim(), newCategorySentiment);
		setNewCategoryName('');
		setNewCategorySentiment('neutral');
		setShowAddCategoryForm(false);
	}

	function handleEditCategory(category: Category) {
		setEditingCategoryId(category.id);
		setEditingCategoryName(category.name);
		setEditingCategorySentiment(category.sentiment);
	}

	function handleSaveCategoryEdit() {
		if (!editingCategoryId || !editingCategoryName.trim()) return;
		updateCategory(activeTab, editingCategoryId, editingCategoryName.trim(), editingCategorySentiment);
		setEditingCategoryId(null);
		setEditingCategoryName('');
		setEditingCategorySentiment('neutral');
	}

	function handleCancelCategoryEdit() {
		setEditingCategoryId(null);
		setEditingCategoryName('');
		setEditingCategorySentiment('neutral');
	}

	function handleDeleteCategoryConfirm(categoryId: string) {
		const itemCount = getItemCountForCategory(categoryId);
		const category = currentCategories.find((c) => c.id === categoryId);
		if (
			!confirm(
				`Delete category "${category?.name}"? It will be removed from ${itemCount} item${itemCount !== 1 ? 's' : ''}.`
			)
		)
			return;
		deleteCategory(activeTab, categoryId);
	}

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

	function getItemCountForCategory(categoryId: string): number {
		return allItems.filter((item) => item.categories.includes(categoryId)).length;
	}

	function getCategoryNamesForItem(item: Item): string[] {
		return getCategoryNames(activeTab, item.categories);
	}

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
				<>
					{showAddForm ? (
						<div className="card p-4 space-y-4">
							<h3 className="font-semibold text-heading">
								Add New {activeTab === 'activity' ? 'Activity' : 'Food'} Item
							</h3>

							<div>
								<label htmlFor="newName" className="form-label">Name</label>
								<input
									id="newName"
									type="text"
									value={newItemName}
									onChange={(e) => setNewItemName(e.target.value)}
									placeholder="Enter name..."
									className="form-input"
								/>
							</div>

							<div>
								<label className="form-label">Categories</label>
								<CategoryPicker
									selected={newItemCategories}
									categories={currentCategories}
									onchange={setNewItemCategories}
									type={activeTab}
								/>
							</div>

							<div className="flex gap-2">
								<button
									onClick={handleAddItem}
									disabled={!newItemName.trim()}
									className="flex-1 btn-primary"
								>
									Add Item
								</button>
								<button
									onClick={() => setShowAddForm(false)}
									className="flex-1 btn-secondary"
								>
									Cancel
								</button>
							</div>
						</div>
					) : (
						<button
							onClick={() => setShowAddForm(true)}
							className="w-full bg-[var(--bg-card)] border-2 border-dashed border-[var(--border-input)] rounded-lg py-4 text-label hover:border-[var(--color-activity)] hover:text-[var(--color-activity)] transition-colors"
						>
							+ Add New {activeTab === 'activity' ? 'Activity' : 'Food'} Item
						</button>
					)}

					<div className="space-y-2">
						{currentItems.length === 0 ? (
							<p className="text-center text-label py-8">
								{searchQuery.trim()
									? `No ${activeTab === 'activity' ? 'activities' : 'food items'} match "${searchQuery}"`
									: `No ${activeTab === 'activity' ? 'activities' : 'food items'} yet. Add one above!`}
							</p>
						) : (
							currentItems.map((item) =>
								editingItem?.id === item.id ? (
									<div key={item.id} className="card p-4 space-y-3">
										<input
											type="text"
											value={editingItem.name}
											onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
											className="form-input"
										/>
										<CategoryPicker
											selected={editingItem.categories}
											categories={currentCategories}
											onchange={(ids) => setEditingItem({ ...editingItem, categories: ids })}
											type={activeTab}
										/>
										<div className="flex gap-2">
											<button onClick={handleSaveEdit} className="flex-1 btn-success">
												Save
											</button>
											<button onClick={handleCancelEdit} className="flex-1 btn-secondary">
												Cancel
											</button>
										</div>
									</div>
								) : (
									<div key={item.id} className="card p-4 flex items-start justify-between">
										<div className="flex-1">
											<div className="font-medium text-heading">{item.name}</div>
											{item.categories.length > 0 ? (
												<div className="flex flex-wrap gap-1 mt-1">
													{getCategoryNamesForItem(item).map((categoryName) => (
														<span key={categoryName} className="text-xs bg-[var(--bg-inset)] text-label px-2 py-0.5 rounded">
															{categoryName}
														</span>
													))}
												</div>
											) : (
												<div className="text-xs text-subtle mt-1">No categories</div>
											)}
										</div>
										<div className="flex gap-2">
											<button
												type="button"
												onClick={() => toggleFavorite(item.id)}
												className="p-1"
												aria-label={isFavorite(item.id) ? 'Remove from favorites' : 'Add to favorites'}
											>
												<StarIcon filled={isFavorite(item.id)} />
											</button>
											<button
												onClick={() => handleEditItem(item)}
												className="text-subtle hover:text-[var(--color-activity)] p-1"
												aria-label="Edit item"
											>
												&#x270F;&#xFE0F;
											</button>
											<button
												onClick={() => handleDeleteItem(item.id)}
												className="text-subtle hover:text-[var(--color-danger)] p-1"
												aria-label="Delete item"
											>
												&#x1F5D1;&#xFE0F;
											</button>
										</div>
									</div>
								)
							)
						)}
					</div>
				</>
			) : (
				<>
					{showAddCategoryForm ? (
						<div className="card p-4 space-y-4">
							<h3 className="font-semibold text-heading">Add New Category</h3>

							<div>
								<label htmlFor="newCategoryName" className="form-label">Name</label>
								<input
									id="newCategoryName"
									type="text"
									value={newCategoryName}
									onChange={(e) => setNewCategoryName(e.target.value)}
									placeholder="Enter category name..."
									className="form-input"
								/>
							</div>

							<div>
								<label className="form-label">Sentiment</label>
								<SentimentPicker value={newCategorySentiment} onChange={setNewCategorySentiment} />
							</div>

							<div className="flex gap-2">
								<button
									onClick={handleAddCategorySubmit}
									disabled={!newCategoryName.trim()}
									className="flex-1 btn-primary"
								>
									Add Category
								</button>
								<button
									onClick={() => setShowAddCategoryForm(false)}
									className="flex-1 btn-secondary"
								>
									Cancel
								</button>
							</div>
						</div>
					) : (
						<button
							onClick={() => setShowAddCategoryForm(true)}
							className="w-full bg-[var(--bg-card)] border-2 border-dashed border-[var(--border-input)] rounded-lg py-4 text-label hover:border-[var(--color-activity)] hover:text-[var(--color-activity)] transition-colors"
						>
							+ Add New Category
						</button>
					)}

					<div className="space-y-2">
						{currentCategories.length === 0 ? (
							<p className="text-center text-label py-8">
								{searchQuery.trim()
									? `No categories match "${searchQuery}"`
									: `No categories for ${activeTab === 'activity' ? 'activities' : 'food'} yet. Add one above!`}
							</p>
						) : (
							currentCategories.map((category) =>
								editingCategoryId === category.id ? (
									<div key={category.id} className="card p-4 space-y-3">
										<input
											type="text"
											value={editingCategoryName}
											onChange={(e) => setEditingCategoryName(e.target.value)}
											className="form-input"
										/>
										<div>
											<label className="form-label">Sentiment</label>
											<SentimentPicker value={editingCategorySentiment} onChange={setEditingCategorySentiment} />
										</div>
										<div className="flex gap-2">
											<button
												onClick={handleSaveCategoryEdit}
												disabled={!editingCategoryName.trim()}
												className="flex-1 btn-success"
											>
												Save
											</button>
											<button onClick={handleCancelCategoryEdit} className="flex-1 btn-secondary">
												Cancel
											</button>
										</div>
									</div>
								) : (
									<div key={category.id} className="card p-4 flex items-start justify-between">
										<div className="flex-1">
											<div className="font-medium text-heading">
												{category.name}
												{category.sentiment && category.sentiment !== 'neutral' && (
													<span className={`ml-2 text-xs font-medium px-1.5 py-0.5 rounded-full ${
														category.sentiment === 'positive'
															? 'bg-[var(--color-success-bg)] text-[var(--color-success-text)]'
															: 'bg-[var(--color-danger-bg)] text-[var(--color-danger-text)]'
													}`}>
														{category.sentiment}
													</span>
												)}
											</div>
											<div className="text-xs text-subtle mt-1">
												Used by {getItemCountForCategory(category.id)} item{getItemCountForCategory(category.id) !== 1 ? 's' : ''}
											</div>
										</div>
										<div className="flex gap-2">
											<button
												onClick={() => handleEditCategory(category)}
												className="text-subtle hover:text-[var(--color-activity)] p-1"
												aria-label="Edit category"
											>
												&#x270F;&#xFE0F;
											</button>
											<button
												onClick={() => handleDeleteCategoryConfirm(category.id)}
												className="text-subtle hover:text-[var(--color-danger)] p-1"
												aria-label="Delete category"
											>
												&#x1F5D1;&#xFE0F;
											</button>
										</div>
									</div>
								)
							)
						)}
					</div>
				</>
			)}
		</div>
	);
}
