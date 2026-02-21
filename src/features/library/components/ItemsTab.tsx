import { useState, useEffect } from 'react';
import { Pencil, Trash2, PackageOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Item, Category, EntryType } from '@/shared/lib/types';
import { addItem, updateItem, deleteItem, toggleFavorite, isFavorite } from '@/shared/store/store';
import { CategoryPicker, CategoryLine, useSwipeGesture, ACTION_WIDTH } from '@/features/tracking';
import StarIcon from '@/shared/ui/StarIcon';
import BottomSheet from '@/shared/ui/BottomSheet';
import ConfirmDialog from '@/shared/ui/ConfirmDialog';

interface Props {
	items: Item[];
	categories: Category[];
	activeTab: EntryType;
	searchQuery: string;
	showAddSheet: boolean;
	onCloseAddSheet: () => void;
}

export default function ItemsTab({ items, categories, activeTab, searchQuery, showAddSheet, onCloseAddSheet }: Props) {
	const { t } = useTranslation('library');
	const [editingItem, setEditingItem] = useState<Item | null>(null);
	const [formName, setFormName] = useState('');
	const [formCategories, setFormCategories] = useState<string[]>([]);
	const [deletingItem, setDeletingItem] = useState<{ id: string; name: string } | null>(null);

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
			setFormCategories([]);
		}
	}, [showAddSheet]);

	function handleAdd() {
		if (!formName.trim()) return;
		addItem(activeTab, formName.trim(), formCategories);
		setFormName('');
		setFormCategories([]);
		onCloseAddSheet();
	}

	function startEdit(item: Item) {
		setEditingItem({ ...item });
		setFormName(item.name);
		setFormCategories([...item.categories]);
		resetSwipe();
	}

	function handleSaveEdit() {
		if (!editingItem || !formName.trim()) return;
		updateItem(activeTab, editingItem.id, formName.trim(), formCategories);
		setEditingItem(null);
		setFormName('');
		setFormCategories([]);
	}

	function cancelEdit() {
		setEditingItem(null);
		setFormName('');
		setFormCategories([]);
	}

	function handleDelete(id: string) {
		const item = items.find((i) => i.id === id) || (editingItem?.id === id ? editingItem : null);
		setDeletingItem({ id, name: item?.name ?? '' });
	}

	function confirmDeleteItem() {
		if (!deletingItem) return;
		deleteItem(activeTab, deletingItem.id);
		resetSwipe();
		cancelEdit();
	}

	const typeLabel = activeTab === 'activity' ? t('common:type.activity') : t('common:type.food');

	return (
		<>
			{/* Item list */}
			{items.length === 0 ? (
				<div className="text-center py-12">
					<PackageOpen className="w-10 h-10 text-subtle mx-auto mb-3" strokeWidth={1.5} />
					<p className="text-label mb-1">
						{searchQuery.trim()
							? t('items.emptySearch', { type: typeLabel, query: searchQuery })
							: t('items.empty', { type: typeLabel })}
					</p>
					{!searchQuery.trim() && <p className="text-xs text-subtle">{t('items.emptyHint')}</p>}
				</div>
			) : (
				<div className="card overflow-hidden">
					{items.map((item, idx) => {
						const isLastInGroup = idx === items.length - 1;
						const isSwiped = swipedEntryId === item.id;

						return (
							<div key={item.id} className="relative overflow-hidden">
								{/* Swipe action background */}
								<div className="absolute inset-0 flex items-center justify-end">
									<button
										type="button"
										onClick={() => startEdit(item)}
										style={{ background: 'var(--color-activity)', width: ACTION_WIDTH }}
										className="h-full flex items-center justify-center"
										aria-label="Edit item"
									>
										<Pencil className="w-5 h-5 text-white" strokeWidth={2} />
									</button>
									<button
										type="button"
										onClick={() => handleDelete(item.id)}
										style={{ background: 'var(--color-danger)', width: ACTION_WIDTH }}
										className="h-full flex items-center justify-center"
										aria-label="Delete item"
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
										transition: isTouching() ? 'none' : 'transform 0.25s ease-out',
									}}
									onTouchStart={(e) => handleTouchStart(e, item.id)}
									onTouchMove={handleTouchMove}
									onTouchEnd={handleTouchEnd}
									onClick={() => handleRowTap(() => startEdit(item))}
								>
									<div className="flex items-center justify-between gap-3">
										<div className="flex-1 min-w-0">
											<span className="font-medium text-heading truncate block">{item.name}</span>
											<CategoryLine categoryIds={item.categories} categories={categories} emptyText="No categories" />
										</div>
										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												toggleFavorite(item.id);
											}}
											className="p-0.5 flex-shrink-0"
											aria-label={
												isFavorite(item.id) ? t('items.favoriteAriaLabel.remove') : t('items.favoriteAriaLabel.add')
											}
										>
											<StarIcon filled={isFavorite(item.id)} className="w-4 h-4" />
										</button>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			)}

			{/* Delete Item Confirm Dialog */}
			<ConfirmDialog
				open={deletingItem !== null}
				onClose={() => setDeletingItem(null)}
				onConfirm={confirmDeleteItem}
				title={t('items.deleteDialog.title')}
				message={
					deletingItem?.name
						? t('items.deleteDialog.messageWithName', { name: deletingItem.name })
						: t('items.deleteDialog.messageGeneric')
				}
				confirmLabel={t('items.deleteDialog.confirmLabel')}
			/>

			{/* Add Item Bottom Sheet */}
			<BottomSheet
				open={showAddSheet}
				onClose={onCloseAddSheet}
				title={t('items.addSheet.title', {
					type: activeTab === 'activity' ? t('common:type.activity') : t('common:type.food'),
				})}
				actionLabel={t('common:btn.add')}
				onAction={handleAdd}
				actionDisabled={!formName.trim()}
			>
				<div className="space-y-4">
					<div>
						<label htmlFor="addItemName" className="form-label">
							{t('items.form.nameLabel')}
						</label>
						<input
							id="addItemName"
							type="text"
							value={formName}
							onChange={(e) => setFormName(e.target.value)}
							placeholder={t('items.form.namePlaceholder')}
							className="form-input"
							autoFocus
						/>
					</div>
					<div>
						<label className="form-label">{t('items.form.categoriesLabel')}</label>
						<CategoryPicker
							selected={formCategories}
							categories={categories}
							onChange={setFormCategories}
							type={activeTab}
						/>
					</div>
				</div>
			</BottomSheet>

			{/* Edit Item Bottom Sheet */}
			<BottomSheet
				open={editingItem !== null}
				onClose={cancelEdit}
				title={editingItem ? t('items.editSheet.title', { name: editingItem.name }) : undefined}
				actionLabel={editingItem ? t('common:btn.save') : undefined}
				onAction={handleSaveEdit}
				actionDisabled={!formName.trim()}
			>
				{editingItem && (
					<div className="space-y-4">
						<div>
							<label htmlFor="editItemName" className="form-label">
								{t('items.form.nameLabel')}
							</label>
							<input
								id="editItemName"
								type="text"
								value={formName}
								onChange={(e) => setFormName(e.target.value)}
								className="form-input"
							/>
						</div>
						<div>
							<label className="form-label">{t('items.form.categoriesLabel')}</label>
							<CategoryPicker
								selected={formCategories}
								categories={categories}
								onChange={setFormCategories}
								type={activeTab}
							/>
						</div>
						<div className="pt-2">
							<button onClick={() => handleDelete(editingItem.id)} className="btn btn-danger w-full">
								<Trash2 className="w-4 h-4 mr-2" strokeWidth={2} />
								{t('items.deleteButton')}
							</button>
						</div>
					</div>
				)}
			</BottomSheet>
		</>
	);
}
