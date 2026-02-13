import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTrackerData } from '@/shared/store/hooks';
import {
	filterEntriesByType,
	filterEntriesByItems,
	filterEntriesByCategories
} from '@/features/tracking/utils/entry-filters';
import { EntryList } from '@/features/tracking';
import SegmentedControl from '@/shared/ui/SegmentedControl';
import MultiSelectFilter from '@/shared/ui/MultiSelectFilter';
import BottomSheet from '@/shared/ui/BottomSheet';

export default function LogPage() {
	const data = useTrackerData();

	const [typeFilter, setTypeFilter] = useState<'all' | 'activity' | 'food'>('all');
	const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
	const [selectedItems, setSelectedItems] = useState<string[]>([]);
	const [showFilterSheet, setShowFilterSheet] = useState(false);

	const availableCategories = useMemo(() => {
		if (typeFilter === 'activity') return data.activityCategories;
		if (typeFilter === 'food') return data.foodCategories;
		return [...data.activityCategories, ...data.foodCategories];
	}, [typeFilter, data.activityCategories, data.foodCategories]);

	const availableItems = useMemo(() => {
		if (typeFilter === 'activity') return data.activityItems;
		if (typeFilter === 'food') return data.foodItems;
		return [...data.activityItems, ...data.foodItems];
	}, [typeFilter, data.activityItems, data.foodItems]);

	const categoryOptions = useMemo(
		() => availableCategories.map((cat) => ({
			id: cat.id,
			name: cat.name,
			subtitle:
				typeFilter === 'all'
					? data.activityCategories.find((c) => c.id === cat.id)
						? 'Activity'
						: 'Food'
					: undefined
		})),
		[availableCategories, typeFilter, data.activityCategories]
	);

	const itemOptions = useMemo(
		() => availableItems.map((item) => {
			const categories =
				typeFilter === 'all'
					? data.activityItems.find((i) => i.id === item.id)
						? data.activityCategories
						: data.foodCategories
					: typeFilter === 'activity'
						? data.activityCategories
						: data.foodCategories;

			const categoryNames = item.categories
				.map((catId) => categories.find((c) => c.id === catId)?.name)
				.filter(Boolean)
				.join(', ');

			return {
				id: item.id,
				name: item.name,
				subtitle: categoryNames || undefined
			};
		}),
		[availableItems, typeFilter, data]
	);

	const activeFilterCount = selectedCategories.length + selectedItems.length;

	const filteredEntries = useMemo(() => {
		let result = data.entries;

		if (typeFilter !== 'all') {
			result = filterEntriesByType(result, typeFilter);
		}

		if (selectedCategories.length > 0) {
			result = filterEntriesByCategories(result, selectedCategories, data);
		}

		if (selectedItems.length > 0) {
			result = filterEntriesByItems(result, selectedItems);
		}

		return result;
	}, [data, typeFilter, selectedCategories, selectedItems]);

	function handleTypeChange(newType: 'all' | 'activity' | 'food') {
		if (newType !== typeFilter) {
			if (newType === 'activity') {
				setSelectedCategories((prev) => prev.filter((id) =>
					data.activityCategories.some((c) => c.id === id)
				));
				setSelectedItems((prev) => prev.filter((id) =>
					data.activityItems.some((i) => i.id === id)
				));
			} else if (newType === 'food') {
				setSelectedCategories((prev) => prev.filter((id) =>
					data.foodCategories.some((c) => c.id === id)
				));
				setSelectedItems((prev) => prev.filter((id) =>
					data.foodItems.some((i) => i.id === id)
				));
			}
			setTypeFilter(newType);
		}
	}

	function clearAllFilters() {
		setSelectedCategories([]);
		setSelectedItems([]);
	}

	const hasItems = data.activityItems.length > 0 || data.foodItems.length > 0;
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
					<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
					</svg>
					{activeFilterCount > 0 && (
						<span className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ background: 'var(--color-activity)' }} />
					)}
				</button>
			</div>

			{/* Segmented control — breathing on page bg */}
			<SegmentedControl
				options={[
					{ value: 'all' as const, label: 'All', activeClass: 'bg-[var(--text-secondary)] text-white' },
					{ value: 'activity' as const, label: 'Activities', activeClass: 'type-activity' },
					{ value: 'food' as const, label: 'Food', activeClass: 'type-food' }
				]}
				value={typeFilter}
				onchange={handleTypeChange}
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
								<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
								</svg>
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
								<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
								</svg>
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
						<button
							type="button"
							onClick={clearAllFilters}
							className="text-[var(--color-activity)] hover:underline"
						>
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
			<BottomSheet
				open={showFilterSheet}
				onclose={() => setShowFilterSheet(false)}
				title="Filters"
			>
				<div className="space-y-5">
					{categoryOptions.length > 0 && (
						<MultiSelectFilter
							label="Categories"
							options={categoryOptions}
							selected={selectedCategories}
							onchange={setSelectedCategories}
							placeholder="Search categories..."
						/>
					)}

					{itemOptions.length > 0 && (
						<MultiSelectFilter
							label="Items"
							options={itemOptions}
							selected={selectedItems}
							onchange={setSelectedItems}
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
						<button
							type="button"
							onClick={clearAllFilters}
							className="w-full btn btn-secondary"
						>
							Clear all filters
						</button>
					)}
				</div>
			</BottomSheet>
		</div>
	);
}
