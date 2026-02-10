import { useState, useMemo } from 'react';
import type { Entry, EntryType } from '../lib/types';
import { getItemById, deleteEntry, updateEntry } from '../lib/store';
import { useTrackerData } from '../lib/hooks';
import { getEntriesGroupedByDate, formatDate, getEntryCategoryNames, getEntryCategoryIds } from '../lib/analysis';
import CategoryPicker from './CategoryPicker';

interface Props {
	entries: Entry[];
	showType?: boolean;
}

function formatTime(time: string | null): string {
	if (!time) return '';
	const [hours, minutes] = time.split(':').map(Number);
	const period = hours >= 12 ? 'PM' : 'AM';
	const displayHours = hours % 12 || 12;
	return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export default function EntryList({ entries, showType = false }: Props) {
	const data = useTrackerData();
	const groupedEntries = useMemo(() => getEntriesGroupedByDate(entries), [entries]);

	const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
	const [editDate, setEditDate] = useState('');
	const [editTime, setEditTime] = useState('');
	const [editNotes, setEditNotes] = useState('');
	const [editCategories, setEditCategories] = useState<string[]>([]);

	function getItemName(type: EntryType, itemId: string): string {
		const item = getItemById(type, itemId);
		return item?.name ?? 'Unknown';
	}

	function handleDelete(id: string) {
		if (confirm('Delete this entry?')) {
			deleteEntry(id);
		}
	}

	function startEdit(entry: Entry) {
		setEditingEntryId(entry.id);
		setEditDate(entry.date);
		setEditTime(entry.time ?? '');
		setEditNotes(entry.notes ?? '');
		setEditCategories(getEntryCategoryIds(entry, data));
	}

	function cancelEdit() {
		setEditingEntryId(null);
		setEditDate('');
		setEditTime('');
		setEditNotes('');
		setEditCategories([]);
	}

	function saveEdit(entry: Entry) {
		const item = getItemById(entry.type, entry.itemId);
		const defaultCategories = item?.categories ?? [];

		const categoriesChanged =
			editCategories.length !== defaultCategories.length ||
			!editCategories.every((id) => defaultCategories.includes(id)) ||
			!defaultCategories.every((id) => editCategories.includes(id));

		updateEntry(entry.id, {
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
		<div className="space-y-4">
			{groupedArray.map(([dateStr, dateEntries]) => (
				<div key={dateStr}>
					<h3 className="text-sm font-semibold text-label mb-2">{formatDate(dateStr)}</h3>
					<div className="space-y-2">
						{dateEntries.map((entry) => {
							const categories = getEntryCategoryNames(entry, data);
							return (
								<div key={entry.id} className="card p-3">
									{editingEntryId === entry.id ? (
										<div className="space-y-3">
											<div className="flex items-center gap-2">
												{showType && (
													<span className="text-sm" style={{ color: `var(${entry.type === 'activity' ? '--color-activity' : '--color-food'})` }}>
														{entry.type === 'activity' ? '\u{1F3C3}' : '\u{1F37D}\u{FE0F}'}
													</span>
												)}
												<span className="font-medium text-heading">{getItemName(entry.type, entry.itemId)}</span>
											</div>

											<div className="grid grid-cols-2 gap-2">
												<div>
													<label className="form-label">Date</label>
													<input
														type="date"
														value={editDate}
														onChange={(e) => setEditDate(e.target.value)}
														className="form-input"
													/>
												</div>
												<div>
													<label className="form-label">Time</label>
													<input
														type="time"
														value={editTime}
														onChange={(e) => setEditTime(e.target.value)}
														className="form-input"
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
													categories={getCategoriesForType(entry.type)}
													onchange={setEditCategories}
													type={entry.type}
												/>
											</div>

											<div className="flex gap-2 pt-2">
												<button onClick={() => saveEdit(entry)} className="btn btn-primary btn-sm flex-1">
													Save
												</button>
												<button onClick={cancelEdit} className="btn btn-secondary btn-sm flex-1">
													Cancel
												</button>
											</div>
										</div>
									) : (
										<div className="flex items-start justify-between">
											<div className="flex-1">
												<div className="flex items-center gap-2">
													{showType && (
														<span className="text-sm" style={{ color: `var(${entry.type === 'activity' ? '--color-activity' : '--color-food'})` }}>
															{entry.type === 'activity' ? '\u{1F3C3}' : '\u{1F37D}\u{FE0F}'}
														</span>
													)}
													<span className="font-medium text-heading">{getItemName(entry.type, entry.itemId)}</span>
													{entry.time && (
														<span className="text-xs text-subtle">{formatTime(entry.time)}</span>
													)}
												</div>
												{entry.notes && (
													<p className="text-sm text-body mt-1">{entry.notes}</p>
												)}
												{categories.length > 0 && (
													<div className="flex flex-wrap gap-1 mt-1">
														{categories.map((category) => (
															<span key={category} className="text-xs bg-[var(--bg-inset)] text-label px-2 py-0.5 rounded">
																{category}
															</span>
														))}
													</div>
												)}
											</div>
											<div className="flex gap-1">
												<button
													onClick={() => startEdit(entry)}
													className="text-subtle hover:text-[var(--color-activity)] p-1"
													aria-label="Edit entry"
												>
													&#x270F;&#xFE0F;
												</button>
												<button
													onClick={() => handleDelete(entry.id)}
													className="text-subtle hover:text-[var(--color-danger)] p-1"
													aria-label="Delete entry"
												>
													&#x1F5D1;&#xFE0F;
												</button>
											</div>
										</div>
									)}
								</div>
							);
						})}
					</div>
				</div>
			))}
		</div>
	);
}
