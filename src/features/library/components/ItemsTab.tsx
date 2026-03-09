import { useState, type KeyboardEvent } from 'react';
import { Pencil, Trash2, PackageOpen, Merge } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { Item, Category, EntryType } from '@/shared/lib/types';
import { addItem, updateItem, deleteItem, mergeItem, toggleFavorite, isFavorite } from '@/shared/store/store';
import { useEntries, useActivityItems, useFoodItems } from '@/shared/store/hooks';
import { CategoryPicker } from '@/features/tracking';
import { cn } from '@/shared/lib/cn';
import { getItemAccentColor } from '@/features/stats';
import { SentimentDot, CategorySentimentPills } from '@/shared/ui/EntityMetaBadges';
import StarIcon from '@/shared/ui/StarIcon';
import BottomSheet from '@/shared/ui/BottomSheet';
import ConfirmDialog from '@/shared/ui/ConfirmDialog';
import { showToast } from '@/shared/ui/Toast';
import IconActionButton from '@/shared/ui/IconActionButton';
import { useLibraryForm } from '../hooks/useLibraryForm';
import { useMergeFlow } from '../hooks/useMergeFlow';
import { countAffectedEntriesForItemMerge } from '../utils/merge-utils';
import MergeTargetSheet from './MergeTargetSheet';
import MergeConfirmSheet from './MergeConfirmSheet';
import TypeSegmentedPicker from './TypeSegmentedPicker';

export type TypedItem = Item & { type: EntryType };

interface Props {
	items: TypedItem[];
	categoriesByType: Record<EntryType, (Category & { type: EntryType })[]>;
	searchQuery: string;
	showAddSheet: boolean;
	onCloseAddSheet: () => void;
}

const ITEM_FORM_DEFAULTS = { name: '', categories: [] as string[], type: 'activity' as EntryType };

export default function ItemsTab({ items, categoriesByType, searchQuery, showAddSheet, onCloseAddSheet }: Props) {
	const { t } = useTranslation('library');
	const navigate = useNavigate();
	const { editing, fields, deleting, setDeleting, setField, resetForm, startEdit, startDelete } = useLibraryForm<
		TypedItem,
		typeof ITEM_FORM_DEFAULTS,
		{ id: string; name: string; type: EntryType }
	>({ showAddSheet, defaults: ITEM_FORM_DEFAULTS });

	const [mergeType, setMergeType] = useState<EntryType | null>(null);
	const entries = useEntries();
	const activityItems = useActivityItems();
	const foodItems = useFoodItems();
	const {
		mergeSource,
		mergeTarget,
		isSelectingTarget,
		isConfirming,
		startMerge,
		selectTarget,
		cancelMerge,
		completeMerge,
	} = useMergeFlow();

	const effectiveMergeType = mergeType ?? fields.type;
	const activeItemsForMerge = effectiveMergeType === 'activity' ? activityItems : foodItems;
	const categories = fields.type === 'activity' ? categoriesByType.activity : categoriesByType.food;

	function handleStartMerge() {
		if (!editing) return;
		setMergeType(editing.type);
		const source = { id: editing.id, name: editing.name };
		resetForm();
		startMerge(source);
	}

	function handleCancelMerge() {
		setMergeType(null);
		cancelMerge();
	}

	function handleCompleteMerge() {
		setMergeType(null);
		completeMerge();
	}

	function handleConfirmMerge(noteToAppend?: string) {
		if (!mergeSource || !mergeTarget) return;
		mergeItem(effectiveMergeType, mergeSource.id, mergeTarget.id, noteToAppend);
		showToast(t('items.merge.successToast', { source: mergeSource.name, target: mergeTarget.name }));
		handleCompleteMerge();
	}

	const mergeAffectedEntryCount =
		mergeSource && isConfirming ? countAffectedEntriesForItemMerge(entries, effectiveMergeType, mergeSource.id) : 0;

	function handleAdd() {
		if (!fields.name.trim()) return;
		addItem(fields.type, fields.name.trim(), fields.categories);
		resetForm();
		onCloseAddSheet();
	}

	function handleStartEdit(item: TypedItem) {
		startEdit(item, { name: item.name, categories: [...item.categories], type: item.type });
	}

	function handleSaveEdit() {
		if (!editing || !fields.name.trim()) return;
		updateItem(fields.type, editing.id, fields.name.trim(), fields.categories);
		resetForm();
	}

	function handleDelete(item: TypedItem) {
		startDelete({ id: item.id, name: item.name, type: item.type });
	}

	function confirmDeleteItem() {
		if (!deleting) return;
		deleteItem(deleting.type, deleting.id);
		resetForm();
	}

	function handleRowKeyDown(event: KeyboardEvent<HTMLDivElement>, itemId: string) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			navigate(`/stats/item/${itemId}`);
		}
	}

	return (
		<>
			{items.length === 0 ? (
				<div className="text-center py-12">
					<PackageOpen className="w-10 h-10 text-subtle mx-auto mb-3" strokeWidth={1.5} />
					<p className="text-label mb-1">
						{searchQuery.trim() ? t('items.emptySearchAll', { query: searchQuery }) : t('items.emptyAll')}
					</p>
					{!searchQuery.trim() && <p className="text-xs text-subtle">{t('items.emptyHint')}</p>}
				</div>
			) : (
				<div className="card overflow-hidden">
					{items.map((item, idx) => {
						const itemCategories: Category[] = item.categories
							.map((categoryId) => categoriesByType[item.type].find((category) => category.id === categoryId))
							.filter((category): category is NonNullable<typeof category> => category !== undefined)
							.map(({ id, name, sentiment }) => ({ id, name, sentiment }));
						const isLastInGroup = idx === items.length - 1;

						return (
							<div
								key={item.id}
								className={cn('px-4 py-3', !isLastInGroup && 'border-b border-[var(--border-subtle)]')}
								onClick={() => navigate(`/stats/item/${item.id}`)}
								onKeyDown={(event) => handleRowKeyDown(event, item.id)}
								role="button"
								tabIndex={0}
							>
								<div className="flex items-center justify-between gap-3">
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2">
											<SentimentDot color={getItemAccentColor(item.categories, categoriesByType[item.type])} />
											<span className="font-medium text-heading truncate block">{item.name}</span>
										</div>
										<CategorySentimentPills categories={itemCategories} emptyText={t('items.noCategories')} />
									</div>
									<div className="flex items-center gap-1 flex-shrink-0">
										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												toggleFavorite(item.id);
											}}
											className="p-1.5"
											aria-label={
												isFavorite(item.id) ? t('items.favoriteAriaLabel.remove') : t('items.favoriteAriaLabel.add')
											}
										>
											<StarIcon filled={isFavorite(item.id)} className="w-4 h-4" />
										</button>
										<IconActionButton
											icon={Pencil}
											tone="edit"
											onClick={(e) => {
												e.stopPropagation();
												handleStartEdit(item);
											}}
											ariaLabel="Edit item"
										/>
										<IconActionButton
											icon={Trash2}
											tone="delete"
											onClick={(e) => {
												e.stopPropagation();
												handleDelete(item);
											}}
											ariaLabel="Delete item"
										/>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			)}

			<ConfirmDialog
				open={deleting !== null}
				onClose={() => setDeleting(null)}
				onConfirm={confirmDeleteItem}
				title={t('items.deleteDialog.title')}
				message={
					deleting?.name
						? t('items.deleteDialog.messageWithName', { name: deleting.name })
						: t('items.deleteDialog.messageGeneric')
				}
				confirmLabel={t('items.deleteDialog.confirmLabel')}
			/>

			<BottomSheet
				open={showAddSheet}
				onClose={onCloseAddSheet}
				title={t('items.addSheet.title', {
					type: fields.type === 'activity' ? t('common:type.activity') : t('common:type.food'),
				})}
				actionLabel={t('common:btn.add')}
				onAction={handleAdd}
				actionDisabled={!fields.name.trim()}
			>
				<div className="space-y-4">
					<TypeSegmentedPicker value={fields.type} onChange={(type) => setField('type', type)} />
					<div>
						<label htmlFor="addItemName" className="form-label">
							{t('items.form.nameLabel')}
						</label>
						<input
							id="addItemName"
							type="text"
							value={fields.name}
							onChange={(e) => setField('name', e.target.value)}
							placeholder={t('items.form.namePlaceholder')}
							className="form-input"
							autoFocus
						/>
					</div>
					<div>
						<label className="form-label">{t('items.form.categoriesLabel')}</label>
						<CategoryPicker
							selected={fields.categories}
							categories={categories}
							onChange={(val) => setField('categories', val)}
							type={fields.type}
						/>
					</div>
				</div>
			</BottomSheet>

			<BottomSheet
				open={editing !== null}
				onClose={resetForm}
				title={editing ? t('items.editSheet.title', { name: editing.name }) : undefined}
				actionLabel={editing ? t('common:btn.save') : undefined}
				onAction={handleSaveEdit}
				actionDisabled={!fields.name.trim()}
			>
				{editing && (
					<div className="space-y-4">
						<div>
							<label htmlFor="editItemName" className="form-label">
								{t('items.form.nameLabel')}
							</label>
							<input
								id="editItemName"
								type="text"
								value={fields.name}
								onChange={(e) => setField('name', e.target.value)}
								className="form-input"
							/>
						</div>
						<div>
							<label className="form-label">{t('items.form.categoriesLabel')}</label>
							<CategoryPicker
								selected={fields.categories}
								categories={categories}
								onChange={(val) => setField('categories', val)}
								type={fields.type}
							/>
						</div>
						<div className="pt-2 space-y-2">
							<button onClick={handleStartMerge} className="btn btn-secondary w-full flex items-center justify-center">
								<Merge className="w-4 h-4 mr-2" strokeWidth={2} />
								{t('items.mergeButton')}
							</button>
							<button
								onClick={() => handleDelete(editing)}
								className="btn btn-danger w-full flex items-center justify-center"
							>
								<Trash2 className="w-4 h-4 mr-2" strokeWidth={2} />
								{t('items.deleteButton')}
							</button>
						</div>
					</div>
				)}
			</BottomSheet>

			<MergeTargetSheet
				open={isSelectingTarget}
				onClose={handleCancelMerge}
				onSelect={selectTarget}
				title={t('items.merge.selectTitle')}
				candidates={activeItemsForMerge
					.filter((i) => i.id !== mergeSource?.id)
					.map((i) => ({ id: i.id, name: i.name }))}
				searchPlaceholder={t('items.merge.searchPlaceholder')}
			/>

			<MergeConfirmSheet
				open={isConfirming}
				onClose={handleCancelMerge}
				onConfirm={handleConfirmMerge}
				sourceName={mergeSource?.name ?? ''}
				targetName={mergeTarget?.name ?? ''}
				affectedEntryCount={mergeAffectedEntryCount}
				showNoteInput
				entityType="item"
			/>
		</>
	);
}
