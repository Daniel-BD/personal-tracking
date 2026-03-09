import { useMemo, type KeyboardEvent } from 'react';
import { Pencil, Trash2, PackageOpen, Merge } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { Category, EntryType } from '@/shared/lib/types';
import { addItem, updateItem, deleteItem, mergeItem, toggleFavorite } from '@/shared/store/store';
import { useEntries } from '@/shared/store/hooks';
import { CategoryPicker } from '@/features/tracking';
import { cn } from '@/shared/lib/cn';
import { getItemAccentColor } from '@/features/stats';
import { SentimentDot, CategorySentimentPills } from '@/shared/ui/EntityMetaBadges';
import EntityTitle from '@/shared/ui/EntityTitle';
import StarIcon from '@/shared/ui/StarIcon';
import BottomSheet from '@/shared/ui/BottomSheet';
import ConfirmDialog from '@/shared/ui/ConfirmDialog';
import { useToast } from '@/shared/ui/useToast';
import IconActionButton from '@/shared/ui/IconActionButton';
import { useLibraryEntityManager } from '../hooks/useLibraryEntityManager';
import { countAffectedEntriesForItemMerge } from '../utils/merge-utils';
import MergeTargetSheet from './MergeTargetSheet';
import MergeConfirmSheet from './MergeConfirmSheet';
import TypeSegmentedPicker from './TypeSegmentedPicker';
import type { CategoriesByType, FavoriteItemIdSet, TypedCategoryById } from '../utils/library-indexes';
import type { TypedItem } from '../types';

interface Props {
	items: TypedItem[];
	itemsByType: Record<EntryType, TypedItem[]>;
	categoriesById: TypedCategoryById;
	categoriesByType: CategoriesByType;
	favoriteItemIdSet: FavoriteItemIdSet;
	searchQuery: string;
	showAddSheet: boolean;
	onCloseAddSheet: () => void;
}

const ITEM_FORM_DEFAULTS = { name: '', categories: [] as string[], type: 'activity' as EntryType };

export default function ItemsTab({
	items,
	itemsByType,
	categoriesById,
	categoriesByType,
	favoriteItemIdSet,
	searchQuery,
	showAddSheet,
	onCloseAddSheet,
}: Props) {
	const { t } = useTranslation('library');
	const { showToast } = useToast();
	const navigate = useNavigate();
	const entries = useEntries();
	const {
		editing,
		fields,
		deleting,
		setDeleting,
		setField,
		resetForm,
		handleAdd,
		handleStartEdit,
		handleSaveEdit,
		handleDelete,
		handleConfirmDelete,
		mergeType,
		mergeSource,
		mergeTarget,
		isSelectingTarget,
		isConfirming,
		selectTarget,
		handleStartMerge,
		handleCancelMerge,
		handleCompleteMerge,
	} = useLibraryEntityManager<TypedItem, typeof ITEM_FORM_DEFAULTS, { id: string; name: string; type: EntryType }>({
		showAddSheet,
		defaults: ITEM_FORM_DEFAULTS,
		canSubmit: (currentFields) => currentFields.name.trim().length > 0,
		getEditFields: (item) => ({ name: item.name, categories: [...item.categories], type: item.type }),
		getDeleteState: (item) => ({ id: item.id, name: item.name, type: item.type }),
		onAdd: (currentFields) => addItem(currentFields.type, currentFields.name.trim(), currentFields.categories),
		onSave: (item, currentFields) =>
			updateItem(currentFields.type, item.id, currentFields.name.trim(), currentFields.categories),
		onDelete: (item) => deleteItem(item.type, item.id),
	});

	const effectiveMergeType = mergeType ?? fields.type;
	const activeItemsForMerge = itemsByType[effectiveMergeType];
	const categories = fields.type === 'activity' ? categoriesByType.activity : categoriesByType.food;
	const itemRows = useMemo(
		() =>
			items.map((item) => {
				const itemCategories: Category[] = item.categories
					.map((categoryId) => categoriesById.get(categoryId))
					.filter((category): category is NonNullable<typeof category> => category !== undefined)
					.map(({ id, name, sentiment }) => ({ id, name, sentiment }));

				return {
					item,
					itemCategories,
					accentColor: getItemAccentColor(
						itemCategories.map((category) => category.id),
						itemCategories,
					),
					isFavorite: favoriteItemIdSet.has(item.id),
				};
			}),
		[items, categoriesById, favoriteItemIdSet],
	);

	function handleConfirmMerge(noteToAppend?: string) {
		if (!mergeSource || !mergeTarget) return;
		mergeItem(effectiveMergeType, mergeSource.id, mergeTarget.id, noteToAppend);
		showToast(t('items.merge.successToast', { source: mergeSource.name, target: mergeTarget.name }));
		handleCompleteMerge();
	}

	const mergeAffectedEntryCount =
		mergeSource && isConfirming ? countAffectedEntriesForItemMerge(entries, effectiveMergeType, mergeSource.id) : 0;

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
					{itemRows.map(({ item, itemCategories, accentColor, isFavorite }, idx) => {
						const isLastInGroup = idx === itemRows.length - 1;

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
											<SentimentDot color={accentColor} />
											<EntityTitle text={item.name} className="flex-1 min-w-0" />
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
											aria-label={isFavorite ? t('items.favoriteAriaLabel.remove') : t('items.favoriteAriaLabel.add')}
										>
											<StarIcon filled={isFavorite} className="w-4 h-4" />
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
				onConfirm={handleConfirmDelete}
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
				onAction={() => handleAdd(onCloseAddSheet)}
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
