import { useState, useMemo, useRef, useCallback } from 'react';
import type { Entry, EntryType } from '../lib/types';
import { getItemById, deleteEntry, updateEntry } from '../lib/store';
import { useTrackerData } from '../lib/hooks';
import { getEntriesGroupedByDate, formatDate, formatTime, getEntryCategoryNames, getEntryCategoryIds } from '../lib/analysis';
import CategoryPicker from './CategoryPicker';
import NativePickerInput from './NativePickerInput';
import BottomSheet from './BottomSheet';

interface Props {
	entries: Entry[];
	showType?: boolean;
}

const SWIPE_THRESHOLD = 70;

export default function EntryList({ entries, showType = false }: Props) {
	const data = useTrackerData();
	const groupedEntries = useMemo(() => getEntriesGroupedByDate(entries), [entries]);

	const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
	const [editDate, setEditDate] = useState('');
	const [editTime, setEditTime] = useState('');
	const [editNotes, setEditNotes] = useState('');
	const [editCategories, setEditCategories] = useState<string[]>([]);

	// Swipe state
	const [swipedEntryId, setSwipedEntryId] = useState<string | null>(null);
	const touchStartRef = useRef<{ x: number; y: number; id: string } | null>(null);
	const [swipeOffset, setSwipeOffset] = useState(0);

	function getItemName(type: EntryType, itemId: string): string {
		const item = getItemById(type, itemId);
		return item?.name ?? 'Unknown';
	}

	function handleDelete(id: string) {
		if (confirm('Delete this entry?')) {
			deleteEntry(id);
			setSwipedEntryId(null);
			setSwipeOffset(0);
		}
	}

	function startEdit(entry: Entry) {
		setEditingEntry(entry);
		setEditDate(entry.date);
		setEditTime(entry.time ?? '');
		setEditNotes(entry.notes ?? '');
		setEditCategories(getEntryCategoryIds(entry, data));
		setSwipedEntryId(null);
		setSwipeOffset(0);
	}

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

	// Swipe handlers
	const handleTouchStart = useCallback((e: React.TouchEvent, entryId: string) => {
		const touch = e.touches[0];
		touchStartRef.current = { x: touch.clientX, y: touch.clientY, id: entryId };

		// If a different entry was swiped, reset it
		if (swipedEntryId && swipedEntryId !== entryId) {
			setSwipedEntryId(null);
			setSwipeOffset(0);
		}
	}, [swipedEntryId]);

	const handleTouchMove = useCallback((e: React.TouchEvent) => {
		if (!touchStartRef.current) return;
		const touch = e.touches[0];
		const deltaX = touch.clientX - touchStartRef.current.x;
		const deltaY = touch.clientY - touchStartRef.current.y;

		// If vertical scroll is dominant, cancel swipe
		if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaX) < 10) {
			return;
		}

		// Only allow left swipe (negative deltaX)
		if (deltaX < 0) {
			setSwipeOffset(Math.max(deltaX, -140));
			setSwipedEntryId(touchStartRef.current.id);
		}
	}, []);

	const handleTouchEnd = useCallback(() => {
		if (!touchStartRef.current) return;

		if (Math.abs(swipeOffset) > SWIPE_THRESHOLD) {
			// Snap to reveal actions
			setSwipeOffset(-140);
		} else {
			// Snap back
			setSwipeOffset(0);
			setSwipedEntryId(null);
		}

		touchStartRef.current = null;
	}, [swipeOffset]);

	// Reset swipe on tap outside
	const handleRowTap = useCallback((entry: Entry) => {
		if (swipedEntryId) {
			setSwipedEntryId(null);
			setSwipeOffset(0);
			return;
		}
		startEdit(entry);
	}, [swipedEntryId]);

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
								const categories = getEntryCategoryNames(entry, data);
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
												onClick={() => startEdit(entry)}
												className="h-full w-[70px] flex items-center justify-center"
												style={{ background: 'var(--color-activity)' }}
											>
												<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
												</svg>
											</button>
											<button
												onClick={() => handleDelete(entry.id)}
												className="h-full w-[70px] flex items-center justify-center"
												style={{ background: 'var(--color-danger)' }}
											>
												<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
												</svg>
											</button>
										</div>

										{/* Entry row content */}
										<div
											className={`relative bg-[var(--bg-card)] px-4 py-3 transition-transform ${
												!isLastInGroup ? 'border-b border-[var(--border-subtle)]' : ''
											}`}
											style={{
												transform: isSwiped ? `translateX(${swipeOffset}px)` : 'translateX(0)',
												transition: touchStartRef.current ? 'none' : 'transform 0.25s ease-out'
											}}
											onTouchStart={(e) => handleTouchStart(e, entry.id)}
											onTouchMove={handleTouchMove}
											onTouchEnd={handleTouchEnd}
											onClick={() => handleRowTap(entry)}
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
													{categories.length > 0 && (
														<p className="text-xs text-label mt-0.5 truncate">
															{categories.join(' \u00B7 ')}
														</p>
													)}
													{entry.notes && (
														<p className="text-xs text-subtle mt-0.5 truncate italic">{entry.notes}</p>
													)}
												</div>
												{entry.time && (
													<span className="text-xs text-subtle flex-shrink-0 tabular-nums">
														{formatTime(entry.time)}
													</span>
												)}
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
								<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
								</svg>
							</button>
						</div>
					</div>
				)}
			</BottomSheet>
		</>
	);
}
