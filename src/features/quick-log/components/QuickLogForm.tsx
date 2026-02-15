import { useRef } from 'react';
import { Search, Zap } from 'lucide-react';
import type { EntryType } from '@/shared/lib/types';
import { getTypeIcon } from '@/shared/lib/types';
import {
	useActivityItems,
	useFoodItems,
	useFavoriteItems,
	useActivityCategories,
	useFoodCategories,
} from '@/shared/store/hooks';
import { getCategoryNames, toggleFavorite, isFavorite } from '@/shared/store/store';
import BottomSheet from '@/shared/ui/BottomSheet';
import StarIcon from '@/shared/ui/StarIcon';
import SegmentedControl from '@/shared/ui/SegmentedControl';
import { CategoryPicker } from '@/features/tracking';
import NativePickerInput from '@/shared/ui/NativePickerInput';
import { useQuickLogSearch } from '../hooks/useQuickLogSearch';
import { useQuickLogForm } from '../hooks/useQuickLogForm';

export default function QuickLogForm() {
	const activityItems = useActivityItems();
	const foodItems = useFoodItems();
	const favoriteIds = useFavoriteItems();
	const activityCategories = useActivityCategories();
	const foodCategories = useFoodCategories();
	const inputRef = useRef<HTMLInputElement>(null);

	const {
		query,
		setQuery,
		isFocused,
		setIsFocused,
		searchResults,
		showResults,
		hasExactMatch,
		favoriteItemsList,
		resetSearch,
	} = useQuickLogSearch(activityItems, foodItems, favoriteIds);

	const {
		sheetOpen,
		setSheetOpen,
		sheetMode,
		itemName,
		setItemName,
		itemType,
		setItemType,
		logDate,
		setLogDate,
		logTime,
		setLogTime,
		logNote,
		setLogNote,
		logCategories,
		setLogCategories,
		selectedItem,
		categoriesForType,
		isLogDisabled,
		openForExisting,
		openForCreate,
		handleLog,
		quickLogItem,
	} = useQuickLogForm(activityCategories, foodCategories);

	function handleSelectExisting(unified: Parameters<typeof openForExisting>[0]) {
		openForExisting(unified);
		resetSearch();
		inputRef.current?.blur();
	}

	function handleCreateTap() {
		openForCreate(query.trim());
		resetSearch();
		inputRef.current?.blur();
	}

	return (
		<>
			{/* Search input — borderless, full-width */}
			<div className="relative">
				<div className="flex items-center gap-3 py-2">
					<Search className="w-5 h-5 text-[var(--text-muted)] flex-shrink-0" strokeWidth={1.5} />
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
									className="flex-1 text-left flex items-center gap-3 min-w-0"
								>
									<span className="text-sm">{getTypeIcon(unified.type)}</span>
									<span className="text-body truncate">{unified.item.name}</span>
								</button>
								<button
									type="button"
									onClick={() => quickLogItem(unified)}
									className="flex-shrink-0 p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--color-activity)] hover:bg-[var(--bg-inset)] transition-colors"
									aria-label={`Quick log ${unified.item.name}`}
								>
									<Zap className="w-4 h-4" strokeWidth={2} />
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
							<label htmlFor="sheet-name" className="form-label">
								Name
							</label>
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
									{ value: 'food' as EntryType, label: 'Food', activeClass: 'type-food' },
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
						<label htmlFor="sheet-date" className="form-label">
							Date
						</label>
						<NativePickerInput id="sheet-date" type="date" value={logDate} onChange={setLogDate} />
					</div>

					{/* Time */}
					<div>
						<label htmlFor="sheet-time" className="form-label">
							Time
						</label>
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
						<label htmlFor="sheet-note" className="form-label">
							Note
						</label>
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
