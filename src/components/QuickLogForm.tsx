import { useState, useMemo } from 'react';
import type { Item, EntryType } from '../lib/types';
import { getTodayDate, getCurrentTime, getTypeColor, getTypeLabel } from '../lib/types';
import { useTrackerData } from '../lib/hooks';
import { addEntry, addItem } from '../lib/store';
import UnifiedItemPicker, { type UnifiedItem } from './UnifiedItemPicker';
import CategoryPicker from './CategoryPicker';

interface Props {
	onsave?: () => void;
}

export default function QuickLogForm({ onsave }: Props) {
	const data = useTrackerData();

	const [selectedUnified, setSelectedUnified] = useState<UnifiedItem | null>(null);
	const [date, setDate] = useState(getTodayDate());
	const [time, setTime] = useState<string | null>(getCurrentTime());
	const [notes, setNotes] = useState('');
	const [useOverrides, setUseOverrides] = useState(false);
	const [categoryOverrides, setCategoryOverrides] = useState<string[]>([]);

	const [showNewItemForm, setShowNewItemForm] = useState(false);
	const [newItemType, setNewItemType] = useState<EntryType | null>(null);
	const [newItemName, setNewItemName] = useState('');
	const [newItemCategories, setNewItemCategories] = useState<string[]>([]);

	const categories = useMemo(
		() => selectedUnified
			? selectedUnified.type === 'activity'
				? data.activityCategories
				: data.foodCategories
			: [],
		[selectedUnified, data.activityCategories, data.foodCategories]
	);

	const newItemCategoriesOptions = useMemo(
		() => newItemType === 'activity' ? data.activityCategories : data.foodCategories,
		[newItemType, data.activityCategories, data.foodCategories]
	);

	function handleItemSelect(unified: UnifiedItem) {
		if (unified.item.id) {
			setSelectedUnified(unified);
			setCategoryOverrides([...unified.item.categories]);
		} else {
			setSelectedUnified(null);
		}
	}

	function handleCreateNew(prefillName: string = '') {
		setShowNewItemForm(true);
		setNewItemType(null);
		setNewItemName(prefillName);
		setNewItemCategories([]);
	}

	function handleSaveNewItem() {
		if (!newItemName.trim() || !newItemType) return;

		const newItem = addItem(newItemType, newItemName.trim(), newItemCategories);
		setSelectedUnified({ item: newItem, type: newItemType });
		setCategoryOverrides([...newItemCategories]);
		setShowNewItemForm(false);
		setNewItemType(null);
	}

	function handleCancelNewItem() {
		setShowNewItemForm(false);
		setNewItemType(null);
	}

	function handleSubmit() {
		if (!selectedUnified?.item.id) return;

		addEntry(
			selectedUnified.type,
			selectedUnified.item.id,
			date,
			time,
			notes.trim() || null,
			useOverrides ? categoryOverrides : null
		);

		setSelectedUnified(null);
		setDate(getTodayDate());
		setTime(getCurrentTime());
		setNotes('');
		setUseOverrides(false);
		setCategoryOverrides([]);

		onsave?.();
	}

	return (
		<div className="card p-4 space-y-4">
			{showNewItemForm ? (
				<div className="space-y-4">
					{!newItemType ? (
						<>
							<h3 className="font-semibold text-heading">What type of item?</h3>
							<div className="flex gap-2">
								<button
									type="button"
									onClick={() => setNewItemType('activity')}
									className="flex-1 py-3 px-4 rounded-lg font-medium text-lg type-activity hover:opacity-90"
								>
									&#x1F3C3; Activity
								</button>
								<button
									type="button"
									onClick={() => setNewItemType('food')}
									className="flex-1 py-3 px-4 rounded-lg font-medium text-lg type-food hover:opacity-90"
								>
									&#x1F37D;&#xFE0F; Food
								</button>
							</div>
							<button type="button" onClick={handleCancelNewItem} className="w-full btn-secondary">
								Cancel
							</button>
						</>
					) : (
						<>
							<h3 className="font-semibold text-heading">
								Create New {newItemType === 'activity' ? 'Activity' : 'Food'} Item
							</h3>

							<div>
								<label htmlFor="newItemName" className="form-label">Name</label>
								<input
									id="newItemName"
									type="text"
									value={newItemName}
									onChange={(e) => setNewItemName(e.target.value)}
									placeholder="Enter name..."
									className="form-input"
								/>
							</div>

							<div>
								<label className="form-label">Categories</label>
								<CategoryPicker
									selected={newItemCategories}
									categories={newItemCategoriesOptions}
									onchange={setNewItemCategories}
									type={newItemType}
								/>
							</div>

							<div className="flex gap-2">
								<button
									type="button"
									onClick={handleSaveNewItem}
									disabled={!newItemName.trim()}
									className="flex-1 btn-primary"
								>
									Create &amp; Select
								</button>
								<button type="button" onClick={handleCancelNewItem} className="flex-1 btn-secondary">
									Cancel
								</button>
							</div>
						</>
					)}
				</div>
			) : (
				<>
					<div>
						<label className="form-label">Item</label>
						<UnifiedItemPicker
							activityItems={data.activityItems}
							foodItems={data.foodItems}
							activityCategories={data.activityCategories}
							foodCategories={data.foodCategories}
							selectedItem={selectedUnified}
							onselect={handleItemSelect}
							oncreate={handleCreateNew}
							placeholder="Search or create..."
						/>
					</div>

					{selectedUnified?.item.id && (
						<>
							<div>
								<label htmlFor="date" className="form-label">Date</label>
								<input
									id="date"
									type="date"
									value={date}
									onChange={(e) => setDate(e.target.value)}
									className="form-input"
								/>
							</div>

							<div>
								<label htmlFor="time" className="form-label">
									Time <span className="text-subtle font-normal">(optional)</span>
								</label>
								<div className="relative">
									<input
										id="time"
										type="time"
										value={time ?? ''}
										onChange={(e) => setTime(e.target.value || null)}
										className={`form-input ${time ? 'pr-8' : ''}`}
									/>
									{time && (
										<button
											type="button"
											onClick={() => setTime(null)}
											className="absolute right-2 top-1/2 -translate-y-1/2 text-subtle hover:text-body text-lg"
											aria-label="Clear time"
										>
											&times;
										</button>
									)}
								</div>
							</div>

							<div>
								<label htmlFor="notes" className="form-label">
									Notes <span className="text-subtle font-normal">(optional)</span>
								</label>
								<input
									id="notes"
									type="text"
									value={notes}
									onChange={(e) => setNotes(e.target.value)}
									placeholder="Add a note..."
									className="form-input"
								/>
							</div>

							<div>
								<label className="flex items-center gap-2 text-sm text-body">
									<input
										type="checkbox"
										checked={useOverrides}
										onChange={(e) => setUseOverrides(e.target.checked)}
										className="rounded"
									/>
									<span>Override categories for this entry</span>
								</label>

								{useOverrides && (
									<div className="mt-2">
										<CategoryPicker
											selected={categoryOverrides}
											categories={categories}
											onchange={setCategoryOverrides}
											type={selectedUnified.type}
										/>
									</div>
								)}
							</div>

							<button
								type="button"
								onClick={handleSubmit}
								className={`w-full btn-lg rounded-md font-medium transition-colors ${getTypeColor(selectedUnified.type)}`}
							>
								Log {getTypeLabel(selectedUnified.type)}
							</button>
						</>
					)}
				</>
			)}
		</div>
	);
}
