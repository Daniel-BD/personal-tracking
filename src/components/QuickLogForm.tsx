import { useState, useMemo, useRef } from 'react';
import type { EntryType, Item } from '../lib/types';
import { getTodayDate, getCurrentTime, getTypeIcon } from '../lib/types';
import { useTrackerData } from '../lib/hooks';
import { addEntry, addItem, deleteEntry, getItemById, getCategoryNames, toggleFavorite, isFavorite } from '../lib/store';
import { showToast } from './Toast';
import BottomSheet from './BottomSheet';
import StarIcon from './StarIcon';
import SegmentedControl from './SegmentedControl';
import CategoryPicker from './CategoryPicker';
import NativePickerInput from './NativePickerInput';

interface UnifiedItem {
	item: Item;
	type: EntryType;
}

export default function QuickLogForm() {
	const data = useTrackerData();
	const inputRef = useRef<HTMLInputElement>(null);

	// Search state
	const [query, setQuery] = useState('');
	const [isFocused, setIsFocused] = useState(false);

	// Create + Log sheet state
	const [sheetOpen, setSheetOpen] = useState(false);
	const [sheetMode, setSheetMode] = useState<'create' | 'log'>('create');
	const [itemName, setItemName] = useState('');
	const [itemType, setItemType] = useState<EntryType>('food');
	const [logDate, setLogDate] = useState(getTodayDate());
	const [logTime, setLogTime] = useState<string | null>(getCurrentTime());
	const [logNote, setLogNote] = useState('');
	const [logCategories, setLogCategories] = useState<string[]>([]);

	// Item being logged (for existing items tapped from search)
	const [selectedItem, setSelectedItem] = useState<UnifiedItem | null>(null);

	// All items merged
	const allItems = useMemo(() => {
		const activities: UnifiedItem[] = data.activityItems.map((item) => ({ item, type: 'activity' as EntryType }));
		const foods: UnifiedItem[] = data.foodItems.map((item) => ({ item, type: 'food' as EntryType }));
		return [...activities, ...foods];
	}, [data.activityItems, data.foodItems]);

	// Favorite items — Map-based O(N+M) lookup
	const favoriteItemsList = useMemo(() => {
		const favorites = data.favoriteItems || [];
		if (favorites.length === 0) return [];

		const itemMap = new Map<string, UnifiedItem>();
		for (const item of data.activityItems) {
			itemMap.set(item.id, { item, type: 'activity' });
		}
		for (const item of data.foodItems) {
			itemMap.set(item.id, { item, type: 'food' });
		}

		const result: UnifiedItem[] = [];
		for (const itemId of favorites) {
			const unified = itemMap.get(itemId);
			if (unified) result.push(unified);
		}
		return result;
	}, [data.favoriteItems, data.activityItems, data.foodItems]);

	// Filtered search results
	const searchResults = useMemo(() => {
		if (!query.trim()) return [];
		return allItems.filter((u) =>
			u.item.name.toLowerCase().includes(query.toLowerCase())
		);
	}, [allItems, query]);

	const showResults = isFocused && query.trim().length > 0;
	const hasExactMatch = searchResults.some(
		(u) => u.item.name.toLowerCase() === query.trim().toLowerCase()
	);

	// --- Actions ---

	function handleSelectExisting(unified: UnifiedItem) {
		setSelectedItem(unified);
		setSheetMode('log');
		setItemName(unified.item.name);
		setItemType(unified.type);
		setLogDate(getTodayDate());
		setLogTime(getCurrentTime());
		setLogNote('');
		setLogCategories([...unified.item.categories]);

		setSheetOpen(true);
		setQuery('');
		setIsFocused(false);
		inputRef.current?.blur();
	}

	function handleCreateTap() {
		setSelectedItem(null);
		setSheetMode('create');
		setItemName(query.trim());
		setItemType('food');
		setLogDate(getTodayDate());
		setLogTime(getCurrentTime());
		setLogNote('');
		setLogCategories([]);

		setSheetOpen(true);
		setQuery('');
		setIsFocused(false);
		inputRef.current?.blur();
	}

	function handleLog() {
		let entryItemId: string;
		let entryType: EntryType;

		if (sheetMode === 'create') {
			if (!itemName.trim()) return;
			const newItem = addItem(itemType, itemName.trim(), logCategories);
			entryItemId = newItem.id;
			entryType = itemType;
		} else {
			if (!selectedItem) return;
			entryItemId = selectedItem.item.id;
			entryType = selectedItem.type;
		}

		const entry = addEntry(
			entryType,
			entryItemId,
			logDate,
			logTime,
			logNote.trim() || null,
			logCategories.length > 0 ? logCategories : null
		);

		setSheetOpen(false);
		resetForm();

		const displayName = itemName.trim() || selectedItem?.item.name || 'item';
		showToast(`Logged "${displayName}"`, {
			label: 'Undo',
			onClick: () => {
				deleteEntry(entry.id);
				showToast('Entry undone');
			}
		});
	}

	function resetForm() {
		setQuery('');
		setSelectedItem(null);
		setItemName('');
		setItemType('food');
		setLogDate(getTodayDate());
		setLogTime(getCurrentTime());
		setLogNote('');
		setLogCategories([]);
	}

	// Categories for current type
	const categoriesForType = useMemo(
		() => itemType === 'activity' ? data.activityCategories : data.foodCategories,
		[itemType, data.activityCategories, data.foodCategories]
	);

	const isLogDisabled = sheetMode === 'create' && !itemName.trim();

	return (
		<>
			{/* Search input — borderless, full-width */}
			<div className="relative">
				<div className="flex items-center gap-3 py-2">
					<svg className="w-5 h-5 text-[var(--text-muted)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
						<path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
					</svg>
					<input
						ref={inputRef}
						type="text"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						onFocus={() => setIsFocused(true)}
						onBlur={() => setTimeout(() => setIsFocused(false), 200)}
						placeholder="Search or create item..."
						className="flex-1 bg-transparent text-heading text-base placeholder:text-[var(--text-muted)] outline-none"
					/>
				</div>
				<div className="h-px bg-[var(--border-subtle)]" />

				{/* Search results */}
				{showResults && (
					<div className="absolute z-20 w-full mt-1 bg-[var(--bg-elevated)] rounded-lg shadow-[var(--shadow-elevated)] border border-[var(--border-default)] max-h-64 overflow-y-auto">
						{searchResults.map((unified) => (
							<button
								key={`${unified.type}-${unified.item.id}`}
								type="button"
								onMouseDown={(e) => e.preventDefault()}
								onClick={() => handleSelectExisting(unified)}
								className="w-full text-left px-4 py-3 hover:bg-[var(--bg-card-hover)] flex items-center gap-3 border-b border-[var(--border-subtle)] last:border-b-0"
							>
								<span className="text-sm">{getTypeIcon(unified.type)}</span>
								<div className="flex-1 min-w-0">
									<div className="font-medium text-heading">{unified.item.name}</div>
									{unified.item.categories.length > 0 && (
										<div className="text-xs text-label truncate">
											{getCategoryNames(unified.type, unified.item.categories).join(', ')}
										</div>
									)}
								</div>
							</button>
						))}

						{!hasExactMatch && query.trim() && (
							<button
								type="button"
								onMouseDown={(e) => e.preventDefault()}
								onClick={handleCreateTap}
								className="w-full text-left px-4 py-3 hover:bg-[var(--bg-card-hover)] flex items-center gap-3 text-[var(--color-activity)]"
							>
								<span className="text-sm font-bold">+</span>
								<span>Create &ldquo;{query.trim()}&rdquo;</span>
							</button>
						)}
					</div>
				)}
			</div>

			{/* Favorite items — shown when not searching */}
			{!showResults && favoriteItemsList.length > 0 && (
				<div className="mt-4">
					<div className="text-xs font-medium text-label uppercase tracking-wide mb-2">Favorites</div>
					<div className="space-y-0.5">
						{favoriteItemsList.map((unified) => (
							<div
								key={`${unified.type}-${unified.item.id}`}
								className="w-full px-1 py-2.5 hover:bg-[var(--bg-card-hover)] rounded-md flex items-center gap-3 transition-colors"
							>
								<button
									type="button"
									onClick={() => toggleFavorite(unified.item.id)}
									className="flex-shrink-0 p-1"
									aria-label="Remove from favorites"
								>
									<StarIcon filled className="w-4 h-4" />
								</button>
								<button
									type="button"
									onClick={() => handleSelectExisting(unified)}
									className="flex-1 text-left flex items-center gap-3"
								>
									<span className="text-sm">{getTypeIcon(unified.type)}</span>
									<span className="text-body">{unified.item.name}</span>
								</button>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Create + Log bottom sheet */}
			<BottomSheet
				open={sheetOpen}
				onclose={() => setSheetOpen(false)}
				title={sheetMode === 'create' ? 'New item' : `Log ${selectedItem?.item.name ?? ''}`}
				headerAction={
					<button
						type="button"
						onClick={handleLog}
						disabled={isLogDisabled}
						className="px-4 py-1.5 text-sm font-semibold rounded-full bg-[var(--color-activity)] text-white transition-colors hover:bg-[var(--color-activity-hover)] disabled:opacity-40 disabled:cursor-not-allowed"
					>
						{sheetMode === 'create' ? 'Create' : 'Log'}
					</button>
				}
			>
				<div className="space-y-5">
					{/* Item name — only for create mode */}
					{sheetMode === 'create' && (
						<div>
							<label htmlFor="sheet-name" className="form-label">Name</label>
							<input
								id="sheet-name"
								type="text"
								value={itemName}
								onChange={(e) => setItemName(e.target.value)}
								placeholder="Item name"
								className="form-input"
								autoFocus
							/>
						</div>
					)}

					{/* Type selector — only for create mode */}
					{sheetMode === 'create' && (
						<div>
							<label className="form-label">Type</label>
							<SegmentedControl
								options={[
									{ value: 'activity' as EntryType, label: 'Activity', activeClass: 'type-activity' },
									{ value: 'food' as EntryType, label: 'Food', activeClass: 'type-food' }
								]}
								value={itemType}
								onchange={setItemType}
								variant="segment"
								size="sm"
							/>
						</div>
					)}

					{/* Date */}
					<div>
						<label htmlFor="sheet-date" className="form-label">Date</label>
						<NativePickerInput
							id="sheet-date"
							type="date"
							value={logDate}
							onChange={setLogDate}
						/>
					</div>

					{/* Time */}
					<div>
						<label htmlFor="sheet-time" className="form-label">Time</label>
						<NativePickerInput
							id="sheet-time"
							type="time"
							value={logTime ?? ''}
							onChange={(val) => setLogTime(val || null)}
							onClear={() => setLogTime(null)}
						/>
					</div>

					{/* Categories */}
					<div>
						<label className="form-label">Categories</label>
						<CategoryPicker
							selected={logCategories}
							categories={categoriesForType}
							onchange={setLogCategories}
							type={sheetMode === 'create' ? itemType : (selectedItem?.type ?? itemType)}
						/>
					</div>

					{/* Note */}
					<div>
						<label htmlFor="sheet-note" className="form-label">Note</label>
						<input
							id="sheet-note"
							type="text"
							value={logNote}
							onChange={(e) => setLogNote(e.target.value)}
							placeholder="Add a note..."
							className="form-input"
						/>
					</div>
				</div>
			</BottomSheet>
		</>
	);
}
