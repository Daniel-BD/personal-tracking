import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import TypeIcon from '@/shared/ui/TypeIcon';
import { useTranslation } from 'react-i18next';
import { getCurrentTime, getTodayDate, type Entry, type EntryType } from '@/shared/lib/types';
import { addEntry, getItemById, deleteEntry, updateEntry } from '@/shared/store/store';
import { useTrackerData } from '@/shared/store/hooks';
import { getEntriesGroupedByDate } from '../utils/entry-grouping';
import { getEntryCategoryIds } from '../utils/category-utils';
import CategoryLine from './CategoryLine';
import DaySentimentSummary from './DaySentimentSummary';
import { formatDate, formatTime } from '@/shared/lib/date-utils';
import CategoryPicker from './CategoryPicker';
import NativePickerInput from '@/shared/ui/NativePickerInput';
import BottomSheet from '@/shared/ui/BottomSheet';
import ConfirmDialog from '@/shared/ui/ConfirmDialog';
import IconActionButton from '@/shared/ui/IconActionButton';
import { showToast } from '@/shared/ui/Toast';

interface Props {
	entries: Entry[];
	showType?: boolean;
}

export default function EntryList({ entries, showType = false }: Props) {
	const { t } = useTranslation('log');
	const navigate = useNavigate();
	const data = useTrackerData();
	const groupedEntries = useMemo(() => getEntriesGroupedByDate(entries), [entries]);

	const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
	const [editDate, setEditDate] = useState('');
	const [editTime, setEditTime] = useState('');
	const [editNotes, setEditNotes] = useState('');
	const [editCategories, setEditCategories] = useState<string[]>([]);
	const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);

	function getItemName(type: EntryType, itemId: string): string {
		const item = getItemById(type, itemId);
		return item?.name ?? 'Unknown';
	}

	function handleDelete(id: string) {
		setDeletingEntryId(id);
	}

	function confirmDeleteEntry() {
		if (!deletingEntryId) return;
		deleteEntry(deletingEntryId);
		cancelEdit();
	}

	const startEdit = useCallback(
		(entry: Entry) => {
			setEditingEntry(entry);
			setEditDate(entry.date);
			setEditTime(entry.time ?? '');
			setEditNotes(entry.notes ?? '');
			setEditCategories(getEntryCategoryIds(entry, data));
		},
		[data],
	);

	function cancelEdit() {
		setEditingEntry(null);
		setEditDate('');
		setEditTime('');
		setEditNotes('');
		setEditCategories([]);
	}

	function saveEdit() {
		if (!editingEntry) return;
		const item = getItemById(editingEntry.type, editingEntry.itemId);
		const defaultCategories = item?.categories ?? [];

		const categoriesChanged =
			editCategories.length !== defaultCategories.length ||
			!editCategories.every((id) => defaultCategories.includes(id)) ||
			!defaultCategories.every((id) => editCategories.includes(id));

		updateEntry(editingEntry.id, {
			date: editDate,
			time: editTime || null,
			notes: editNotes || null,
			categoryOverrides: categoriesChanged ? editCategories : null,
		});
		cancelEdit();
	}

	function getCategoriesForType(type: EntryType) {
		return type === 'activity' ? data.activityCategories : data.foodCategories;
	}

	function handleQuickLog(entry: Entry) {
		const item = getItemById(entry.type, entry.itemId);
		if (!item) return;

		const newEntry = addEntry(entry.type, entry.itemId, getTodayDate(), getCurrentTime(), null, null);
		showToast(`Logged "${item.name}"`, {
			label: 'Undo',
			onClick: () => {
				deleteEntry(newEntry.id);
				showToast('Entry undone');
			},
		});
	}

	const groupedArray = useMemo(() => Array.from(groupedEntries.entries()), [groupedEntries]);

	if (groupedArray.length === 0) {
		return <p className="text-center text-label py-8">No entries yet</p>;
	}

	return (
		<>
			<div className="space-y-5">
				{groupedArray.map(([dateStr, dateEntries]) => (
					<div key={dateStr}>
						{/* Date header — sticky, uppercase, muted */}
						<div className="sticky top-0 z-10 bg-[var(--bg-page)] py-1.5 flex items-center justify-between">
							<h3 className="text-[11px] font-semibold text-subtle uppercase tracking-wider">{formatDate(dateStr)}</h3>
							<DaySentimentSummary entries={dateEntries} data={data} />
						</div>

						{/* Grouped entry rows — flat, divider-separated */}
						<div className="card overflow-hidden">
							{dateEntries.map((entry, idx) => {
								const categoryIds = getEntryCategoryIds(entry, data);
								const typeCategories = entry.type === 'activity' ? data.activityCategories : data.foodCategories;
								const isLastInGroup = idx === dateEntries.length - 1;

								return (
									<div
										key={entry.id}
										className={`px-4 py-3 ${!isLastInGroup ? 'border-b border-[var(--border-subtle)]' : ''}`}
										onClick={() => navigate(`/log/item/${entry.itemId}?type=${entry.type}`)}
									>
										<div className="flex items-center justify-between gap-3">
											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-2">
													{showType && (
														<TypeIcon type={entry.type} className="w-4 h-4 shrink-0 text-[var(--text-muted)]" />
													)}
													<span className="font-medium text-heading truncate">
														{getItemName(entry.type, entry.itemId)}
													</span>
												</div>
												<CategoryLine categoryIds={categoryIds} categories={typeCategories} />
												{entry.notes && <p className="text-xs text-subtle mt-0.5 truncate italic">{entry.notes}</p>}
											</div>
											<div className="flex items-center gap-1 flex-shrink-0">
												{entry.time && (
													<span className="text-xs text-subtle tabular-nums mr-1">{formatTime(entry.time)}</span>
												)}
												<IconActionButton
													icon={Plus}
													tone="add"
													onClick={(e) => {
														e.stopPropagation();
														handleQuickLog(entry);
													}}
													ariaLabel="Quick add entry"
												/>
												<IconActionButton
													icon={Pencil}
													tone="edit"
													onClick={(e) => {
														e.stopPropagation();
														startEdit(entry);
													}}
													ariaLabel="Edit entry"
												/>
												<IconActionButton
													icon={Trash2}
													tone="delete"
													onClick={(e) => {
														e.stopPropagation();
														handleDelete(entry.id);
													}}
													ariaLabel="Delete entry"
												/>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				))}
			</div>

			{/* Delete Entry Confirm Dialog */}
			<ConfirmDialog
				open={deletingEntryId !== null}
				onClose={() => setDeletingEntryId(null)}
				onConfirm={confirmDeleteEntry}
				title={t('deleteConfirm.title')}
				message={t('deleteConfirm.message')}
				confirmLabel={t('deleteConfirm.confirm')}
			/>

			{/* Edit Bottom Sheet */}
			<BottomSheet
				open={editingEntry !== null}
				onClose={cancelEdit}
				title={
					editingEntry ? t('editEntry.title', { name: getItemName(editingEntry.type, editingEntry.itemId) }) : undefined
				}
				actionLabel={editingEntry ? t('editEntry.save') : undefined}
				onAction={saveEdit}
			>
				{editingEntry && (
					<div className="space-y-4">
						<div className="grid grid-cols-2 gap-3">
							<div>
								<label className="form-label">{t('editEntry.date')}</label>
								<NativePickerInput type="date" value={editDate} onChange={setEditDate} />
							</div>
							<div>
								<label className="form-label">{t('editEntry.time')}</label>
								<NativePickerInput type="time" value={editTime} onChange={setEditTime} />
							</div>
						</div>

						<div>
							<label className="form-label">{t('editEntry.notes')}</label>
							<input
								type="text"
								value={editNotes}
								onChange={(e) => setEditNotes(e.target.value)}
								placeholder={t('editEntry.notesPlaceholder')}
								className="form-input"
							/>
						</div>

						<div>
							<label className="form-label">{t('editEntry.categories')}</label>
							<CategoryPicker
								selected={editCategories}
								categories={getCategoriesForType(editingEntry.type)}
								onChange={setEditCategories}
								type={editingEntry.type}
							/>
						</div>

						<div className="pt-2">
							<button
								onClick={() => handleDelete(editingEntry.id)}
								className="btn btn-danger w-full flex items-center justify-center"
							>
								<Trash2 className="w-4 h-4 mr-2" strokeWidth={2} />
								{t('editEntry.deleteButton')}
							</button>
						</div>
					</div>
				)}
			</BottomSheet>
		</>
	);
}
