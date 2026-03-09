import { useState, type KeyboardEvent } from 'react';
import { Pencil, Trash2, FolderOpen, Merge } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { Item, Category, CategorySentiment, EntryType } from '@/shared/lib/types';
import { addCategory, updateCategory, deleteCategory, mergeCategory } from '@/shared/store/store';
import { useEntries, useActivityCategories, useFoodCategories } from '@/shared/store/hooks';
import { cn } from '@/shared/lib/cn';
import { SENTIMENT_COLORS } from '@/features/stats';
import { SentimentDot } from '@/shared/ui/EntityMetaBadges';
import BottomSheet from '@/shared/ui/BottomSheet';
import ConfirmDialog from '@/shared/ui/ConfirmDialog';
import { showToast } from '@/shared/ui/Toast';
import IconActionButton from '@/shared/ui/IconActionButton';
import SentimentPicker from './SentimentPicker';
import { useLibraryForm } from '../hooks/useLibraryForm';
import { useMergeFlow } from '../hooks/useMergeFlow';
import { countAffectedForCategoryMerge } from '../utils/merge-utils';
import MergeTargetSheet from './MergeTargetSheet';
import MergeConfirmSheet from './MergeConfirmSheet';
import TypeSegmentedPicker from './TypeSegmentedPicker';

export type TypedCategory = Category & { type: EntryType };
export type TypedItem = Item & { type: EntryType };

interface Props {
	categories: TypedCategory[];
	allItems: TypedItem[];
	searchQuery: string;
	showAddSheet: boolean;
	onCloseAddSheet: () => void;
}

const CATEGORY_FORM_DEFAULTS = { name: '', sentiment: 'neutral' as CategorySentiment, type: 'activity' as EntryType };

export default function CategoriesTab({ categories, allItems, searchQuery, showAddSheet, onCloseAddSheet }: Props) {
	const { t } = useTranslation('library');
	const navigate = useNavigate();
	const { editing, fields, deleting, setDeleting, setField, resetForm, startEdit, startDelete } = useLibraryForm<
		TypedCategory,
		typeof CATEGORY_FORM_DEFAULTS,
		{ id: string; name: string; itemCount: number; type: EntryType }
	>({ showAddSheet, defaults: CATEGORY_FORM_DEFAULTS });

	const [mergeType, setMergeType] = useState<EntryType | null>(null);
	const entries = useEntries();
	const activityCategories = useActivityCategories();
	const foodCategories = useFoodCategories();
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
	const activeCategoriesForMerge = effectiveMergeType === 'activity' ? activityCategories : foodCategories;

	function getItemCountForCategory(categoryId: string, type: EntryType): number {
		return allItems.filter((item) => item.type === type && item.categories.includes(categoryId)).length;
	}

	function handleAdd() {
		if (!fields.name.trim()) return;
		addCategory(fields.type, fields.name.trim(), fields.sentiment);
		resetForm();
		onCloseAddSheet();
	}

	function handleStartEdit(category: TypedCategory) {
		startEdit(category, { name: category.name, sentiment: category.sentiment, type: category.type });
	}

	function handleSaveEdit() {
		if (!editing || !fields.name.trim()) return;
		updateCategory(fields.type, editing.id, fields.name.trim(), fields.sentiment);
		resetForm();
	}

	function handleDelete(category: TypedCategory) {
		const itemCount = getItemCountForCategory(category.id, category.type);
		startDelete({ id: category.id, name: category.name, itemCount, type: category.type });
	}

	function confirmDeleteCategory() {
		if (!deleting) return;
		deleteCategory(deleting.type, deleting.id);
		resetForm();
	}

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

	function handleConfirmMerge() {
		if (!mergeSource || !mergeTarget) return;
		mergeCategory(effectiveMergeType, mergeSource.id, mergeTarget.id);
		showToast(t('categories.merge.successToast', { source: mergeSource.name, target: mergeTarget.name }));
		handleCompleteMerge();
	}

	const scopedItems = allItems.filter((item) => item.type === effectiveMergeType);
	const mergePreview =
		mergeSource && isConfirming
			? countAffectedForCategoryMerge(scopedItems, entries, effectiveMergeType, mergeSource.id)
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
					{categories.map((category, idx) => {
						const itemCount = getItemCountForCategory(category.id, category.type);
						const isLastInGroup = idx === categories.length - 1;

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
											<span className="font-medium text-heading truncate">{category.name}</span>
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

			<BottomSheet
				open={showAddSheet}
				onClose={onCloseAddSheet}
				title={t('categories.addSheet.title')}
				actionLabel={t('common:btn.add')}
				onAction={handleAdd}
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
