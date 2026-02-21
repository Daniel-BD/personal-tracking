import { Pencil, Trash2, FolderOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Item, Category, CategorySentiment, EntryType } from '@/shared/lib/types';
import { addCategory, updateCategory, deleteCategory } from '@/shared/store/store';
import { useSwipeGesture, ACTION_WIDTH } from '@/features/tracking';
import { cn } from '@/shared/lib/cn';
import BottomSheet from '@/shared/ui/BottomSheet';
import ConfirmDialog from '@/shared/ui/ConfirmDialog';
import SentimentPicker from './SentimentPicker';
import { useLibraryForm } from '../hooks/useLibraryForm';

interface Props {
	categories: Category[];
	allItems: Item[];
	activeTab: EntryType;
	searchQuery: string;
	showAddSheet: boolean;
	onCloseAddSheet: () => void;
}

const CATEGORY_FORM_DEFAULTS = { name: '', sentiment: 'neutral' as CategorySentiment };

export default function CategoriesTab({
	categories,
	allItems,
	activeTab,
	searchQuery,
	showAddSheet,
	onCloseAddSheet,
}: Props) {
	const { t } = useTranslation('library');
	const { editing, fields, deleting, setDeleting, setField, resetForm, startEdit } = useLibraryForm<
		Category,
		typeof CATEGORY_FORM_DEFAULTS,
		{ id: string; name: string; itemCount: number }
	>({ showAddSheet, defaults: CATEGORY_FORM_DEFAULTS });

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

	function getItemCountForCategory(categoryId: string): number {
		return allItems.filter((item) => item.categories.includes(categoryId)).length;
	}

	function handleAdd() {
		if (!fields.name.trim()) return;
		addCategory(activeTab, fields.name.trim(), fields.sentiment);
		resetForm();
		onCloseAddSheet();
	}

	function handleStartEdit(category: Category) {
		startEdit(category, { name: category.name, sentiment: category.sentiment });
		resetSwipe();
	}

	function handleSaveEdit() {
		if (!editing || !fields.name.trim()) return;
		updateCategory(activeTab, editing.id, fields.name.trim(), fields.sentiment);
		resetForm();
	}

	function handleDelete(categoryId: string) {
		const itemCount = getItemCountForCategory(categoryId);
		const category = categories.find((c) => c.id === categoryId);
		setDeleting({ id: categoryId, name: category?.name ?? '', itemCount });
	}

	function confirmDeleteCategory() {
		if (!deleting) return;
		deleteCategory(activeTab, deleting.id);
		resetSwipe();
		resetForm();
	}

	const typeLabel =
		activeTab === 'activity' ? t('common:type.activities').toLowerCase() : t('common:type.food').toLowerCase();

	return (
		<>
			{/* Category list */}
			{categories.length === 0 ? (
				<div className="text-center py-12">
					<FolderOpen className="w-10 h-10 text-subtle mx-auto mb-3" strokeWidth={1.5} />
					<p className="text-label mb-1">
						{searchQuery.trim()
							? t('categories.emptySearch', { query: searchQuery })
							: t('categories.empty', { type: typeLabel })}
					</p>
					{!searchQuery.trim() && <p className="text-xs text-subtle">{t('categories.emptyHint')}</p>}
				</div>
			) : (
				<div className="card overflow-hidden">
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
										onClick={() => handleStartEdit(category)}
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
									className={cn(
										'relative bg-[var(--bg-card)] px-4 py-3 transition-transform',
										!isLastInGroup && 'border-b border-[var(--border-subtle)]',
									)}
									style={{
										transform: isSwiped ? `translateX(${swipeOffset}px)` : 'translateX(0)',
										transition: isTouching() ? 'none' : 'transform 0.25s ease-out',
									}}
									onTouchStart={(e) => handleTouchStart(e, category.id)}
									onTouchMove={handleTouchMove}
									onTouchEnd={handleTouchEnd}
									onClick={() => handleRowTap(() => handleStartEdit(category))}
								>
									<div className="flex items-center justify-between gap-3">
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2">
												<span className="font-medium text-heading truncate">{category.name}</span>
												{category.sentiment && category.sentiment !== 'neutral' && (
													<span
														className={cn(
															'text-xs font-medium px-1.5 py-0.5 rounded-full flex-shrink-0',
															category.sentiment === 'positive'
																? 'bg-[var(--color-success-bg)] text-[var(--color-success-text)]'
																: 'bg-[var(--color-danger-bg)] text-[var(--color-danger-text)]',
														)}
													>
														{category.sentiment}
													</span>
												)}
											</div>
											<p className="text-xs text-subtle mt-0.5">{t('categories.itemCount', { count: itemCount })}</p>
										</div>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			)}

			{/* Delete Category Confirm Dialog */}
			<ConfirmDialog
				open={deleting !== null}
				onClose={() => setDeleting(null)}
				onConfirm={confirmDeleteCategory}
				title={t('categories.deleteDialog.title')}
				message={
					deleting
						? t('categories.deleteDialog.message', {
								name: deleting.name,
								count: deleting.itemCount,
							})
						: undefined
				}
				confirmLabel={t('categories.deleteDialog.confirmLabel')}
			/>

			{/* Add Category Bottom Sheet */}
			<BottomSheet
				open={showAddSheet}
				onClose={onCloseAddSheet}
				title={t('categories.addSheet.title')}
				actionLabel={t('common:btn.add')}
				onAction={handleAdd}
				actionDisabled={!fields.name.trim()}
			>
				<div className="space-y-4">
					<div>
						<label htmlFor="addCategoryName" className="form-label">
							{t('categories.form.nameLabel')}
						</label>
						<input
							id="addCategoryName"
							type="text"
							value={fields.name}
							onChange={(e) => setField('name', e.target.value)}
							placeholder={t('categories.form.namePlaceholder')}
							className="form-input"
							autoFocus
						/>
					</div>
					<div>
						<label className="form-label">{t('categories.form.sentimentLabel')}</label>
						<SentimentPicker value={fields.sentiment} onChange={(val) => setField('sentiment', val)} />
					</div>
				</div>
			</BottomSheet>

			{/* Edit Category Bottom Sheet */}
			<BottomSheet
				open={editing !== null}
				onClose={resetForm}
				title={editing ? t('categories.editSheet.title', { name: editing.name }) : undefined}
				actionLabel={editing ? t('common:btn.save') : undefined}
				onAction={handleSaveEdit}
				actionDisabled={!fields.name.trim()}
			>
				{editing && (
					<div className="space-y-4">
						<div>
							<label htmlFor="editCategoryName" className="form-label">
								{t('categories.form.nameLabel')}
							</label>
							<input
								id="editCategoryName"
								type="text"
								value={fields.name}
								onChange={(e) => setField('name', e.target.value)}
								className="form-input"
							/>
						</div>
						<div>
							<label className="form-label">{t('categories.form.sentimentLabel')}</label>
							<SentimentPicker value={fields.sentiment} onChange={(val) => setField('sentiment', val)} />
						</div>
						<div className="pt-2">
							<button onClick={() => handleDelete(editing.id)} className="btn btn-danger w-full">
								<Trash2 className="w-4 h-4 mr-2" strokeWidth={2} />
								{t('categories.deleteButton')}
							</button>
						</div>
					</div>
				)}
			</BottomSheet>
		</>
	);
}
