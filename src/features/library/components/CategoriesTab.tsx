import { useEffect, useMemo, type KeyboardEvent } from 'react';
import { Pencil, Trash2, FolderOpen, Merge } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { CategorySentiment, EntryType } from '@/shared/lib/types';
import { addCategory, updateCategory, deleteCategory, mergeCategory } from '@/shared/store/store';
import { useEntries } from '@/shared/store/hooks';
import { cn } from '@/shared/lib/cn';
import { SENTIMENT_COLORS } from '@/features/stats';
import EntityTitle from '@/shared/ui/EntityTitle';
import { SentimentDot } from '@/shared/ui/EntityMetaBadges';
import BottomSheet from '@/shared/ui/BottomSheet';
import ConfirmDialog from '@/shared/ui/ConfirmDialog';
import { useToast } from '@/shared/ui/useToast';
import IconActionButton from '@/shared/ui/IconActionButton';
import SentimentPicker from './SentimentPicker';
import { useLibraryEntityManager } from '../hooks/useLibraryEntityManager';
import { countAffectedEntryOverridesForCategoryMerge } from '../utils/merge-utils';
import MergeTargetSheet from './MergeTargetSheet';
import MergeConfirmSheet from './MergeConfirmSheet';
import TypeSegmentedPicker from './TypeSegmentedPicker';
import type { CategoriesByType, ItemCountsByCategoryId } from '../utils/library-indexes';
import type { TypedCategory } from '../types';

interface Props {
	categories: TypedCategory[];
	categoriesByType: CategoriesByType;
	itemCountsByCategoryId: ItemCountsByCategoryId;
	searchQuery: string;
	showAddSheet: boolean;
	onCloseAddSheet: () => void;
	initialEditCategoryId?: string | null;
	onInitialEditHandled?: () => void;
}

const CATEGORY_FORM_DEFAULTS = { name: '', sentiment: 'neutral' as CategorySentiment, type: 'activity' as EntryType };

export default function CategoriesTab({
	categories,
	categoriesByType,
	itemCountsByCategoryId,
	searchQuery,
	showAddSheet,
	onCloseAddSheet,
	initialEditCategoryId,
	onInitialEditHandled,
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
	} = useLibraryEntityManager<
		TypedCategory,
		typeof CATEGORY_FORM_DEFAULTS,
		{ id: string; name: string; itemCount: number; type: EntryType }
	>({
		showAddSheet,
		defaults: CATEGORY_FORM_DEFAULTS,
		canSubmit: (currentFields) => currentFields.name.trim().length > 0,
		getEditFields: (category) => ({ name: category.name, sentiment: category.sentiment, type: category.type }),
		getDeleteState: (category) => ({
			id: category.id,
			name: category.name,
			itemCount: itemCountsByCategoryId.get(category.id) ?? 0,
			type: category.type,
		}),
		onAdd: (currentFields) => addCategory(currentFields.type, currentFields.name.trim(), currentFields.sentiment),
		onSave: (category, currentFields) =>
			updateCategory(currentFields.type, category.id, currentFields.name.trim(), currentFields.sentiment),
		onDelete: (category) => deleteCategory(category.type, category.id),
	});

	const effectiveMergeType = mergeType ?? fields.type;
	const activeCategoriesForMerge = categoriesByType[effectiveMergeType];

	useEffect(() => {
		if (!initialEditCategoryId) return;
		const targetCategory = categories.find((category) => category.id === initialEditCategoryId);
		if (!targetCategory) return;

		handleStartEdit(targetCategory);
		onInitialEditHandled?.();
	}, [initialEditCategoryId, categories, handleStartEdit, onInitialEditHandled]);

	const categoryRows = useMemo(
		() =>
			categories.map((category) => ({
				category,
				itemCount: itemCountsByCategoryId.get(category.id) ?? 0,
			})),
		[categories, itemCountsByCategoryId],
	);

	function handleConfirmMerge() {
		if (!mergeSource || !mergeTarget) return;
		mergeCategory(effectiveMergeType, mergeSource.id, mergeTarget.id);
		showToast(t('categories.merge.successToast', { source: mergeSource.name, target: mergeTarget.name }));
		handleCompleteMerge();
	}

	const mergePreview =
		mergeSource && isConfirming
			? {
					itemCount: itemCountsByCategoryId.get(mergeSource.id) ?? 0,
					entryCount: countAffectedEntryOverridesForCategoryMerge(entries, effectiveMergeType, mergeSource.id),
				}
			: { itemCount: 0, entryCount: 0 };

	function handleRowKeyDown(event: KeyboardEvent<HTMLDivElement>, categoryId: string) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			navigate(`/stats/category/${categoryId}`);
		}
	}

	return (
		<>
			{categories.length === 0 ? (
				<div className="text-center py-12">
					<FolderOpen className="w-10 h-10 text-subtle mx-auto mb-3" strokeWidth={1.5} />
					<p className="text-label mb-1">
						{searchQuery.trim() ? t('categories.emptySearch', { query: searchQuery }) : t('categories.emptyAll')}
					</p>
					{!searchQuery.trim() && <p className="text-xs text-subtle">{t('categories.emptyHint')}</p>}
				</div>
			) : (
				<div className="card overflow-hidden">
					{categoryRows.map(({ category, itemCount }, idx) => {
						const isLastInGroup = idx === categoryRows.length - 1;

						return (
							<div
								key={category.id}
								className={cn('px-4 py-3', !isLastInGroup && 'border-b border-[var(--border-subtle)]')}
								onClick={() => navigate(`/stats/category/${category.id}`)}
								onKeyDown={(event) => handleRowKeyDown(event, category.id)}
								role="button"
								tabIndex={0}
							>
								<div className="flex items-center justify-between gap-3">
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2">
											<SentimentDot color={SENTIMENT_COLORS[category.sentiment]} />
											<EntityTitle text={category.name} className="flex-1 min-w-0" />
										</div>
										<p className="text-xs text-subtle mt-0.5">{t('categories.itemCount', { count: itemCount })}</p>
									</div>
									<div className="flex items-center gap-1 flex-shrink-0">
										<IconActionButton
											icon={Pencil}
											tone="edit"
											onClick={(e) => {
												e.stopPropagation();
												handleStartEdit(category);
											}}
											ariaLabel="Edit category"
										/>
										<IconActionButton
											icon={Trash2}
											tone="delete"
											onClick={(e) => {
												e.stopPropagation();
												handleDelete(category);
											}}
											ariaLabel="Delete category"
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

			<BottomSheet
				open={showAddSheet}
				onClose={onCloseAddSheet}
				title={t('categories.addSheet.title')}
				actionLabel={t('common:btn.add')}
				onAction={() => handleAdd(onCloseAddSheet)}
				actionDisabled={!fields.name.trim()}
			>
				<div className="space-y-4">
					<TypeSegmentedPicker value={fields.type} onChange={(type) => setField('type', type)} />
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
						<div className="pt-2 space-y-2">
							<button onClick={handleStartMerge} className="btn btn-secondary w-full flex items-center justify-center">
								<Merge className="w-4 h-4 mr-2" strokeWidth={2} />
								{t('categories.mergeButton')}
							</button>
							<button
								onClick={() => handleDelete(editing)}
								className="btn btn-danger w-full flex items-center justify-center"
							>
								<Trash2 className="w-4 h-4 mr-2" strokeWidth={2} />
								{t('categories.deleteButton')}
							</button>
						</div>
					</div>
				)}
			</BottomSheet>

			<MergeTargetSheet
				open={isSelectingTarget}
				onClose={handleCancelMerge}
				onSelect={selectTarget}
				title={t('categories.merge.selectTitle')}
				candidates={activeCategoriesForMerge
					.filter((c) => c.id !== mergeSource?.id)
					.map((c) => ({ id: c.id, name: c.name }))}
				searchPlaceholder={t('categories.merge.searchPlaceholder')}
			/>

			<MergeConfirmSheet
				open={isConfirming}
				onClose={handleCancelMerge}
				onConfirm={handleConfirmMerge}
				sourceName={mergeSource?.name ?? ''}
				targetName={mergeTarget?.name ?? ''}
				affectedEntryCount={mergePreview.entryCount}
				affectedItemCount={mergePreview.itemCount}
				showNoteInput={false}
				entityType="category"
			/>
		</>
	);
}
