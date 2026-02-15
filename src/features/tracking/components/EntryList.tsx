import { useState, useMemo, useCallback } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import type { Entry, EntryType } from '@/shared/lib/types';
import { getItemById, deleteEntry, updateEntry, toggleFavorite, isFavorite } from '@/shared/store/store';
import StarIcon from '@/shared/ui/StarIcon';
import { useTrackerData } from '@/shared/store/hooks';
import { getEntriesGroupedByDate } from '../utils/entry-grouping';
import { getEntryCategoryIds } from '../utils/category-utils';
import CategoryLine from './CategoryLine';
import { formatDate, formatTime } from '@/shared/lib/date-utils';
import CategoryPicker from './CategoryPicker';
import NativePickerInput from '@/shared/ui/NativePickerInput';
import BottomSheet from '@/shared/ui/BottomSheet';
import { useSwipeGesture, ACTION_WIDTH } from '../hooks/useSwipeGesture';

interface Props {
	entries: Entry[];
	showType?: boolean;
}

export default function EntryList({ entries, showType = false }: Props) {
	const data = useTrackerData();
	const groupedEntries = useMemo(() => getEntriesGroupedByDate(entries), [entries]);

	const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
	const [editDate, setEditDate] = useState('');
	const [editTime, setEditTime] = useState('');
	const [editNotes, setEditNotes] = useState('');
	const [editCategories, setEditCategories] = useState<string[]>([]);

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

	function getItemName(type: EntryType, itemId: string): string {
		const item = getItemById(type, itemId);
		return item?.name ?? 'Unknown';
	}

	function handleDelete(id: string) {
		if (confirm('Delete this entry?')) {
			deleteEntry(id);
			resetSwipe();
			cancelEdit();
		}
	}

	const startEdit = useCallback((entry: Entry) => {
		setEditingEntry(entry);
		setEditDate(entry.date);
		setEditTime(entry.time ?? '');
		setEditNotes(entry.notes ?? '');
		setEditCategories(getEntryCategoryIds(entry, data));
		resetSwipe();
	}, [data, resetSwipe]);

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
			categoryOverrides: categoriesChanged ? editCategories : null
		});
		cancelEdit();
	}

	function getCategoriesForType(type: EntryType) {
		return type === 'activity' ? data.activityCategories : data.foodCategories;
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
						<div className="sticky top-0 z-10 bg-[var(--bg-page)] py-1.5">
							<h3 className="text-[11px] font-semibold text-subtle uppercase tracking-wider">
								{formatDate(dateStr)}
							</h3>
						</div>

						{/* Grouped entry rows — flat, divider-separated */}
						<div className="rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] overflow-hidden">
							{dateEntries.map((entry, idx) => {
								const categoryIds = getEntryCategoryIds(entry, data);
								const typeCategories = entry.type === 'activity' ? data.activityCategories : data.foodCategories;
								const isLastInGroup = idx === dateEntries.length - 1;
								const isSwiped = swipedEntryId === entry.id;

								return (
									<div
										key={entry.id}
										className="relative overflow-hidden"
									>
										{/* Swipe action background */}
										<div className="absolute inset-0 flex items-center justify-end">
											<button
												type="button"
												onClick={() => startEdit(entry)}
												className={`h-full w-[${ACTION_WIDTH}px] flex items-center justify-center`}
												style={{ background: 'var(--color-activity)', width: ACTION_WIDTH }}
												aria-label="Edit entry"
											>
												<Pencil className="w-5 h-5 text-white" strokeWidth={2} />
											</button>
											<button
												type="button"
												onClick={() => handleDelete(entry.id)}
												className={`h-full w-[${ACTION_WIDTH}px] flex items-center justify-center`}
												style={{ background: 'var(--color-danger)', width: ACTION_WIDTH }}
												aria-label="Delete entry"
											>
												<Trash2 className="w-5 h-5 text-white" strokeWidth={2} />
											</button>
										</div>

										{/* Entry row content */}
										<div
											className={`relative bg-[var(--bg-card)] px-4 py-3 transition-transform ${
												!isLastInGroup ? 'border-b border-[var(--border-subtle)]' : ''
											}`}
											style={{
												transform: isSwiped ? `translateX(${swipeOffset}px)` : 'translateX(0)',
												transition: isTouching() ? 'none' : 'transform 0.25s ease-out'
											}}
											onTouchStart={(e) => handleTouchStart(e, entry.id)}
											onTouchMove={handleTouchMove}
											onTouchEnd={handleTouchEnd}
											onClick={() => handleRowTap(() => startEdit(entry))}
										>
											<div className="flex items-center justify-between gap-3">
												<div className="flex-1 min-w-0">
													<div className="flex items-center gap-2">
														{showType && (
															<span className="text-sm flex-shrink-0" style={{ color: `var(${entry.type === 'activity' ? '--color-activity' : '--color-food'})` }}>
																{entry.type === 'activity' ? '\u{1F3C3}' : '\u{1F37D}\u{FE0F}'}
															</span>
														)}
														<span className="font-medium text-heading truncate">
															{getItemName(entry.type, entry.itemId)}
														</span>
													</div>
													<CategoryLine
													categoryIds={categoryIds}
													categories={typeCategories}
												/>
												{entry.notes && (
													<p className="text-xs text-subtle mt-0.5 truncate italic">{entry.notes}</p>
												)}
												</div>
												<div className="flex items-center gap-2 flex-shrink-0">
													{entry.time && (
														<span className="text-xs text-subtle tabular-nums">
															{formatTime(entry.time)}
														</span>
													)}
													<button
														type="button"
														onClick={(e) => { e.stopPropagation(); toggleFavorite(entry.itemId); }}
														className="p-0.5"
														aria-label={isFavorite(entry.itemId) ? 'Remove from favorites' : 'Add to favorites'}
													>
														<StarIcon filled={isFavorite(entry.itemId)} className="w-4 h-4" />
													</button>
												</div>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				))}
			</div>

			{/* Edit Bottom Sheet */}
			<BottomSheet
				open={editingEntry !== null}
				onclose={cancelEdit}
				title={editingEntry ? `Edit ${getItemName(editingEntry.type, editingEntry.itemId)}` : undefined}
			>
				{editingEntry && (
					<div className="space-y-4">
						<div className="grid grid-cols-2 gap-3">
							<div>
								<label className="form-label">Date</label>
								<NativePickerInput
									type="date"
									value={editDate}
									onChange={setEditDate}
								/>
							</div>
							<div>
								<label className="form-label">Time</label>
								<NativePickerInput
									type="time"
									value={editTime}
									onChange={setEditTime}
								/>
							</div>
						</div>

						<div>
							<label className="form-label">Notes</label>
							<input
								type="text"
								value={editNotes}
								onChange={(e) => setEditNotes(e.target.value)}
								placeholder="Optional notes..."
								className="form-input"
							/>
						</div>

						<div>
							<label className="form-label">Categories</label>
							<CategoryPicker
								selected={editCategories}
								categories={getCategoriesForType(editingEntry.type)}
								onchange={setEditCategories}
								type={editingEntry.type}
							/>
						</div>

						<div className="flex gap-2 pt-2">
							<button onClick={saveEdit} className="btn btn-primary flex-1">
								Save
							</button>
							<button
								onClick={() => handleDelete(editingEntry.id)}
								className="btn btn-danger"
								aria-label="Delete entry"
							>
								<Trash2 className="w-5 h-5" strokeWidth={2} />
							</button>
						</div>
					</div>
				)}
			</BottomSheet>
		</>
	);
}
