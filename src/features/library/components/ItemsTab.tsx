import { useState } from 'react';
import type { Item, Category, EntryType } from '@/shared/lib/types';
import {
	addItem,
	updateItem,
	deleteItem,
	getCategoryNames,
	toggleFavorite,
	isFavorite
} from '@/shared/store/store';
import { CategoryPicker } from '@/features/tracking';
import StarIcon from '@/shared/ui/StarIcon';

interface Props {
	items: Item[];
	categories: Category[];
	activeTab: EntryType;
	searchQuery: string;
}

export default function ItemsTab({ items, categories, activeTab, searchQuery }: Props) {
	const [editingItem, setEditingItem] = useState<Item | null>(null);
	const [showAddForm, setShowAddForm] = useState(false);
	const [newItemName, setNewItemName] = useState('');
	const [newItemCategories, setNewItemCategories] = useState<string[]>([]);

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

	function getCategoryNamesForItem(item: Item): string[] {
		return getCategoryNames(activeTab, item.categories);
	}

	return (
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
							categories={categories}
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
				{items.length === 0 ? (
					<p className="text-center text-label py-8">
						{searchQuery.trim()
							? `No ${activeTab === 'activity' ? 'activities' : 'food items'} match "${searchQuery}"`
							: `No ${activeTab === 'activity' ? 'activities' : 'food items'} yet. Add one above!`}
					</p>
				) : (
					items.map((item) =>
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
									categories={categories}
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
	);
}
