import { useState, useMemo, useRef } from 'react';
import type { EntryType, Item } from '../lib/types';
import { getTodayDate, getTypeIcon } from '../lib/types';
import { useTrackerData } from '../lib/hooks';
import { addEntry, addItem, deleteEntry, getItemById } from '../lib/store';
import { showToast } from './Toast';
import BottomSheet from './BottomSheet';
import SegmentedControl from './SegmentedControl';
import CategoryPicker from './CategoryPicker';

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
	const [showDetails, setShowDetails] = useState(false);
	const [logTime, setLogTime] = useState<string | null>(null);
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

	// Recent items from last entries
	const recentItems = useMemo(() => {
		const seen = new Set<string>();
		const recents: UnifiedItem[] = [];

		const sorted = [...data.entries].sort((a, b) => {
			const dateComp = b.date.localeCompare(a.date);
			if (dateComp !== 0) return dateComp;
			if (a.time && b.time) return b.time.localeCompare(a.time);
			if (b.time) return 1;
			if (a.time) return -1;
			return 0;
		});

		for (const entry of sorted) {
			const key = `${entry.type}-${entry.itemId}`;
			if (seen.has(key)) continue;
			seen.add(key);

			const item = getItemById(entry.type, entry.itemId);
			if (item) {
				recents.push({ item, type: entry.type });
			}
			if (recents.length >= 5) break;
		}

		return recents;
	}, [data.entries]);

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

	function getCategoryNames(categoryIds: string[], type: EntryType): string {
		const categories = type === 'activity' ? data.activityCategories : data.foodCategories;
		return categoryIds
			.map((id) => categories.find((c) => c.id === id)?.name)
			.filter(Boolean)
			.join(', ');
	}

	// --- Actions ---

	function handleSelectExisting(unified: UnifiedItem) {
		setSelectedItem(unified);
		setSheetMode('log');
		setItemName(unified.item.name);
		setItemType(unified.type);
		setLogDate(getTodayDate());
		setLogTime(null);
		setLogNote('');
		setLogCategories([...unified.item.categories]);
		setShowDetails(false);
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
		setLogTime(null);
		setLogNote('');
		setLogCategories([]);
		setShowDetails(false);
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
			showDetails && logCategories.length > 0
				? logCategories
				: null
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
		setLogTime(null);
		setLogNote('');
		setLogCategories([]);
		setShowDetails(false);
	}

	// Categories for current type
	const categoriesForType = useMemo(
		() => itemType === 'activity' ? data.activityCategories : data.foodCategories,
		[itemType, data.activityCategories, data.foodCategories]
	);

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
											{getCategoryNames(unified.item.categories, unified.type)}
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

			{/* Recent items — shown when not searching */}
			{!showResults && recentItems.length > 0 && (
				<div className="mt-4">
					<div className="text-xs font-medium text-label uppercase tracking-wide mb-2">Recent</div>
					<div className="space-y-0.5">
						{recentItems.map((unified) => (
							<button
								key={`${unified.type}-${unified.item.id}`}
								type="button"
								onClick={() => handleSelectExisting(unified)}
								className="w-full text-left px-1 py-2.5 hover:bg-[var(--bg-card-hover)] rounded-md flex items-center gap-3 transition-colors"
							>
								<span className="text-sm">{getTypeIcon(unified.type)}</span>
								<span className="text-body">{unified.item.name}</span>
							</button>
						))}
					</div>
				</div>
			)}

			{/* Create + Log bottom sheet */}
			<BottomSheet
				open={sheetOpen}
				onclose={() => setSheetOpen(false)}
				title={sheetMode === 'create' ? 'New item' : `Log ${selectedItem?.item.name ?? ''}`}
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
						<input
							id="sheet-date"
							type="date"
							value={logDate}
							onChange={(e) => setLogDate(e.target.value)}
							className="form-input"
						/>
					</div>

					{/* Optional details */}
					<div>
						<button
							type="button"
							onClick={() => setShowDetails(!showDetails)}
							className="flex items-center gap-2 text-sm text-label hover:text-body transition-colors"
						>
							<svg
								className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-90' : ''}`}
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								strokeWidth="2"
							>
								<path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
							</svg>
							Optional details
						</button>

						{showDetails && (
							<div className="mt-3 space-y-4 animate-fade-in">
								{/* Time */}
								<div>
									<label htmlFor="sheet-time" className="form-label">Time</label>
									<div className="relative">
										<input
											id="sheet-time"
											type="time"
											value={logTime ?? ''}
											onChange={(e) => setLogTime(e.target.value || null)}
											className={`form-input ${logTime ? 'pr-8' : ''}`}
											placeholder="Not set"
										/>
										{logTime && (
											<button
												type="button"
												onClick={() => setLogTime(null)}
												className="absolute right-2 top-1/2 -translate-y-1/2 text-subtle hover:text-body text-lg"
												aria-label="Clear time"
											>
												&times;
											</button>
										)}
									</div>
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
						)}
					</div>

					{/* Log button — sticky at bottom */}
					<button
						type="button"
						onClick={handleLog}
						disabled={sheetMode === 'create' && !itemName.trim()}
						className="w-full btn-lg rounded-lg font-medium transition-colors type-activity disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Log
					</button>
				</div>
			</BottomSheet>
		</>
	);
}
