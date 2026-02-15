import { useState, useEffect } from 'react';
import { Pencil, Trash2, FolderOpen } from 'lucide-react';
import type { Item, Category, CategorySentiment, EntryType } from '@/shared/lib/types';
import {
	addCategory,
	updateCategory,
	deleteCategory
} from '@/shared/store/store';
import { useSwipeGesture, ACTION_WIDTH } from '@/features/tracking';
import BottomSheet from '@/shared/ui/BottomSheet';
import SentimentPicker from './SentimentPicker';

interface Props {
	categories: Category[];
	allItems: Item[];
	activeTab: EntryType;
	searchQuery: string;
	showAddSheet: boolean;
	onCloseAddSheet: () => void;
}

export default function CategoriesTab({ categories, allItems, activeTab, searchQuery, showAddSheet, onCloseAddSheet }: Props) {
	const [editingCategory, setEditingCategory] = useState<Category | null>(null);
	const [formName, setFormName] = useState('');
	const [formSentiment, setFormSentiment] = useState<CategorySentiment>('neutral');

	const {
		swipedEntryId,
		swipeOffset,
		handleTouchStart,
		handleTouchMove,
		handleTouchEnd,
		handleRowTap,
		resetSwipe,
		isTouching,
	} = useSwipeGesture();

	// Reset form when add sheet opens
	useEffect(() => {
		if (showAddSheet) {
			setFormName('');
			setFormSentiment('neutral');
		}
	}, [showAddSheet]);

	function getItemCountForCategory(categoryId: string): number {
		return allItems.filter((item) => item.categories.includes(categoryId)).length;
	}

	function handleAdd() {
		if (!formName.trim()) return;
		addCategory(activeTab, formName.trim(), formSentiment);
		setFormName('');
		setFormSentiment('neutral');
		onCloseAddSheet();
	}

	function startEdit(category: Category) {
		setEditingCategory({ ...category });
		setFormName(category.name);
		setFormSentiment(category.sentiment);
		resetSwipe();
	}

	function handleSaveEdit() {
		if (!editingCategory || !formName.trim()) return;
		updateCategory(activeTab, editingCategory.id, formName.trim(), formSentiment);
		setEditingCategory(null);
		setFormName('');
		setFormSentiment('neutral');
	}

	function cancelEdit() {
		setEditingCategory(null);
		setFormName('');
		setFormSentiment('neutral');
	}

	function handleDelete(categoryId: string) {
		const itemCount = getItemCountForCategory(categoryId);
		const category = categories.find((c) => c.id === categoryId);
		if (
			!confirm(
				`Delete category "${category?.name}"? It will be removed from ${itemCount} item${itemCount !== 1 ? 's' : ''}.`
			)
		)
			return;
		deleteCategory(activeTab, categoryId);
		resetSwipe();
		cancelEdit();
	}

	return (
		<>
			{/* Category list */}
			{categories.length === 0 ? (
				<div className="text-center py-12">
					<FolderOpen className="w-10 h-10 text-subtle mx-auto mb-3" strokeWidth={1.5} />
					<p className="text-label mb-1">
						{searchQuery.trim()
							? `No categories match "${searchQuery}"`
							: `No categories for ${activeTab === 'activity' ? 'activities' : 'food'} yet`}
					</p>
					{!searchQuery.trim() && (
						<p className="text-xs text-subtle">Tap + to add your first category</p>
					)}
				</div>
			) : (
				<div className="rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] overflow-hidden">
					{categories.map((category, idx) => {
						const itemCount = getItemCountForCategory(category.id);
						const isLastInGroup = idx === categories.length - 1;
						const isSwiped = swipedEntryId === category.id;

						return (
							<div key={category.id} className="relative overflow-hidden">
								{/* Swipe action background */}
								<div className="absolute inset-0 flex items-center justify-end">
									<button
										type="button"
										onClick={() => startEdit(category)}
										style={{ background: 'var(--color-activity)', width: ACTION_WIDTH }}
										className="h-full flex items-center justify-center"
										aria-label="Edit category"
									>
										<Pencil className="w-5 h-5 text-white" strokeWidth={2} />
									</button>
									<button
										type="button"
										onClick={() => handleDelete(category.id)}
										style={{ background: 'var(--color-danger)', width: ACTION_WIDTH }}
										className="h-full flex items-center justify-center"
										aria-label="Delete category"
									>
										<Trash2 className="w-5 h-5 text-white" strokeWidth={2} />
									</button>
								</div>

								{/* Row content */}
								<div
									className={`relative bg-[var(--bg-card)] px-4 py-3 transition-transform ${
										!isLastInGroup ? 'border-b border-[var(--border-subtle)]' : ''
									}`}
									style={{
										transform: isSwiped ? `translateX(${swipeOffset}px)` : 'translateX(0)',
										transition: isTouching() ? 'none' : 'transform 0.25s ease-out'
									}}
									onTouchStart={(e) => handleTouchStart(e, category.id)}
									onTouchMove={handleTouchMove}
									onTouchEnd={handleTouchEnd}
									onClick={() => handleRowTap(() => startEdit(category))}
								>
									<div className="flex items-center justify-between gap-3">
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2">
												<span className="font-medium text-heading truncate">
													{category.name}
												</span>
												{category.sentiment && category.sentiment !== 'neutral' && (
													<span className={`text-xs font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${
														category.sentiment === 'positive'
															? 'bg-[var(--color-success-bg)] text-[var(--color-success-text)]'
															: 'bg-[var(--color-danger-bg)] text-[var(--color-danger-text)]'
													}`}>
														{category.sentiment}
													</span>
												)}
											</div>
											<p className="text-xs text-subtle mt-0.5">
												{itemCount} item{itemCount !== 1 ? 's' : ''}
											</p>
										</div>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			)}

			{/* Add Category Bottom Sheet */}
			<BottomSheet
				open={showAddSheet}
				onclose={onCloseAddSheet}
				title="Add Category"
				headerAction={
					<button
						onClick={handleAdd}
						disabled={!formName.trim()}
						className="btn-primary btn-sm rounded-full px-4"
					>
						Add
					</button>
				}
			>
				<div className="space-y-4">
					<div>
						<label htmlFor="addCategoryName" className="form-label">Name</label>
						<input
							id="addCategoryName"
							type="text"
							value={formName}
							onChange={(e) => setFormName(e.target.value)}
							placeholder="Enter category name..."
							className="form-input"
							autoFocus
						/>
					</div>
					<div>
						<label className="form-label">Sentiment</label>
						<SentimentPicker value={formSentiment} onChange={setFormSentiment} />
					</div>
				</div>
			</BottomSheet>

			{/* Edit Category Bottom Sheet */}
			<BottomSheet
				open={editingCategory !== null}
				onclose={cancelEdit}
				title={editingCategory ? `Edit ${editingCategory.name}` : undefined}
				headerAction={
					editingCategory ? (
						<button
							onClick={handleSaveEdit}
							disabled={!formName.trim()}
							className="btn-primary btn-sm rounded-full px-4"
						>
							Save
						</button>
					) : undefined
				}
			>
				{editingCategory && (
					<div className="space-y-4">
						<div>
							<label htmlFor="editCategoryName" className="form-label">Name</label>
							<input
								id="editCategoryName"
								type="text"
								value={formName}
								onChange={(e) => setFormName(e.target.value)}
								className="form-input"
							/>
						</div>
						<div>
							<label className="form-label">Sentiment</label>
							<SentimentPicker value={formSentiment} onChange={setFormSentiment} />
						</div>
						<div className="pt-2">
							<button
								onClick={() => handleDelete(editingCategory.id)}
								className="btn btn-danger w-full"
							>
								<Trash2 className="w-4 h-4 mr-2" strokeWidth={2} />
								Delete Category
							</button>
						</div>
					</div>
				)}
			</BottomSheet>
		</>
	);
}
