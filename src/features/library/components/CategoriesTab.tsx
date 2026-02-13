import { useState } from 'react';
import type { Item, Category, CategorySentiment, EntryType } from '@/shared/lib/types';
import {
	addCategory,
	updateCategory,
	deleteCategory
} from '@/shared/store/store';
import SentimentPicker from './SentimentPicker';

interface Props {
	categories: Category[];
	allItems: Item[];
	activeTab: EntryType;
	searchQuery: string;
}

export default function CategoriesTab({ categories, allItems, activeTab, searchQuery }: Props) {
	const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
	const [editingCategoryName, setEditingCategoryName] = useState('');
	const [editingCategorySentiment, setEditingCategorySentiment] = useState<CategorySentiment>('neutral');
	const [showAddCategoryForm, setShowAddCategoryForm] = useState(false);
	const [newCategoryName, setNewCategoryName] = useState('');
	const [newCategorySentiment, setNewCategorySentiment] = useState<CategorySentiment>('neutral');

	function getItemCountForCategory(categoryId: string): number {
		return allItems.filter((item) => item.categories.includes(categoryId)).length;
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
		const category = categories.find((c) => c.id === categoryId);
		if (
			!confirm(
				`Delete category "${category?.name}"? It will be removed from ${itemCount} item${itemCount !== 1 ? 's' : ''}.`
			)
		)
			return;
		deleteCategory(activeTab, categoryId);
	}

	return (
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
				{categories.length === 0 ? (
					<p className="text-center text-label py-8">
						{searchQuery.trim()
							? `No categories match "${searchQuery}"`
							: `No categories for ${activeTab === 'activity' ? 'activities' : 'food'} yet. Add one above!`}
					</p>
				) : (
					categories.map((category) =>
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
	);
}
