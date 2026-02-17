import { Link } from 'react-router-dom';
import { Filter, X } from 'lucide-react';
import { useActivityItems, useFoodItems } from '@/shared/store/hooks';
import { EntryList } from '@/features/tracking';
import SegmentedControl from '@/shared/ui/SegmentedControl';
import MultiSelectFilter from '@/shared/ui/MultiSelectFilter';
import BottomSheet from '@/shared/ui/BottomSheet';
import { useLogFilters } from '../hooks/useLogFilters';

export default function LogPage() {
	const activityItems = useActivityItems();
	const foodItems = useFoodItems();
	const {
		typeFilter,
		handleTypeChange,
		selectedCategories,
		setSelectedCategories,
		selectedItems,
		setSelectedItems,
		showFilterSheet,
		setShowFilterSheet,
		availableCategories,
		availableItems,
		categoryOptions,
		itemOptions,
		activeFilterCount,
		filteredEntries,
		clearAllFilters,
	} = useLogFilters();

	const hasItems = activityItems.length > 0 || foodItems.length > 0;
	const entryLabel = filteredEntries.length === 1 ? 'entry' : 'entries';

	return (
		<div className="space-y-4">
			{/* Header with title + filter icon */}
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-bold text-heading">Log</h2>
					<p className="text-xs text-subtle mt-0.5">
						{filteredEntries.length} {entryLabel}
						{activeFilterCount > 0 && ' (filtered)'}
					</p>
				</div>
				<button
					type="button"
					onClick={() => setShowFilterSheet(true)}
					className="relative p-2 rounded-lg text-label hover:text-heading hover:bg-[var(--bg-inset)] transition-colors"
					aria-label="Open filters"
				>
					<Filter className="w-5 h-5" strokeWidth={1.5} />
					{activeFilterCount > 0 && (
						<span
							className="absolute top-1 right-1 w-2 h-2 rounded-full"
							style={{ background: 'var(--color-activity)' }}
						/>
					)}
				</button>
			</div>

			{/* Segmented control — breathing on page bg */}
			<SegmentedControl
				options={[
					{ value: 'all' as const, label: 'All', activeClass: 'bg-[var(--text-secondary)] text-white' },
					{ value: 'activity' as const, label: 'Activities', activeClass: 'type-activity' },
					{ value: 'food' as const, label: 'Food', activeClass: 'type-food' },
				]}
				value={typeFilter}
				onChange={handleTypeChange}
				variant="segment"
				size="sm"
			/>

			{/* Active filter chips */}
			{activeFilterCount > 0 && (
				<div className="flex items-center gap-2 flex-wrap">
					{selectedCategories.map((catId) => {
						const cat = availableCategories.find((c) => c.id === catId);
						if (!cat) return null;
						return (
							<button
								key={catId}
								type="button"
								onClick={() => setSelectedCategories((prev) => prev.filter((id) => id !== catId))}
								className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-[var(--color-activity-bg)] text-[var(--color-activity-text)] border border-[var(--color-activity-border)] transition-colors hover:bg-[var(--color-activity-bg-strong)]"
							>
								{cat.name}
								<X className="w-3 h-3" strokeWidth={2} />
							</button>
						);
					})}
					{selectedItems.map((itemId) => {
						const item = availableItems.find((i) => i.id === itemId);
						if (!item) return null;
						return (
							<button
								key={itemId}
								type="button"
								onClick={() => setSelectedItems((prev) => prev.filter((id) => id !== itemId))}
								className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-[var(--bg-inset)] text-label border border-[var(--border-default)] transition-colors hover:bg-[var(--bg-card-hover)]"
							>
								{item.name}
								<X className="w-3 h-3" strokeWidth={2} />
							</button>
						);
					})}
					<button
						type="button"
						onClick={clearAllFilters}
						className="text-xs text-[var(--color-activity)] hover:text-[var(--color-activity-hover)]"
					>
						Clear all
					</button>
				</div>
			)}

			{/* Entry list */}
			{!hasItems ? (
				<div className="text-center py-12">
					<p className="text-label mb-4">No items yet</p>
					<Link to="/library" className="text-[var(--color-activity)] hover:underline">
						Add some in the Library
					</Link>
				</div>
			) : filteredEntries.length === 0 ? (
				<div className="text-center py-12">
					<p className="text-label mb-2">No entries match your filters</p>
					{activeFilterCount > 0 ? (
						<button type="button" onClick={clearAllFilters} className="text-[var(--color-activity)] hover:underline">
							Clear all filters
						</button>
					) : (
						<p className="text-subtle text-sm">Log entries from the Home page</p>
					)}
				</div>
			) : (
				<EntryList entries={filteredEntries} showType={typeFilter === 'all'} />
			)}

			{/* Filter Bottom Sheet */}
			<BottomSheet open={showFilterSheet} onClose={() => setShowFilterSheet(false)} title="Filters">
				<div className="space-y-5">
					{categoryOptions.length > 0 && (
						<MultiSelectFilter
							label="Categories"
							options={categoryOptions}
							selected={selectedCategories}
							onChange={setSelectedCategories}
							placeholder="Search categories..."
						/>
					)}

					{itemOptions.length > 0 && (
						<MultiSelectFilter
							label="Items"
							options={itemOptions}
							selected={selectedItems}
							onChange={setSelectedItems}
							placeholder="Search items..."
						/>
					)}

					{categoryOptions.length === 0 && itemOptions.length === 0 && (
						<p className="text-sm text-label text-center py-2">
							No categories or items to filter by.{' '}
							<Link to="/library" className="text-[var(--color-activity)] hover:underline">
								Add some in the Library
							</Link>
						</p>
					)}

					{activeFilterCount > 0 && (
						<button type="button" onClick={clearAllFilters} className="w-full btn btn-secondary">
							Clear all filters
						</button>
					)}
				</div>
			</BottomSheet>
		</div>
	);
}
