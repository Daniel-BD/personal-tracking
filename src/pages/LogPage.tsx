import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTrackerData } from '../lib/hooks';
import {
	filterEntriesByType,
	filterEntriesByItems,
	filterEntriesByCategories
} from '../lib/analysis';
import EntryList from '../components/EntryList';
import SegmentedControl from '../components/SegmentedControl';
import MultiSelectFilter from '../components/MultiSelectFilter';

export default function LogPage() {
	const data = useTrackerData();

	const [typeFilter, setTypeFilter] = useState<'all' | 'activity' | 'food'>('all');
	const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
	const [selectedItems, setSelectedItems] = useState<string[]>([]);
	const [showFilters, setShowFilters] = useState(false);

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
			<h2 className="text-2xl font-bold text-heading">Log</h2>

			<div className="card">
				<div className="p-3 border-b border-[var(--border-subtle)]">
					<div className="flex items-center gap-3">
						<div className="flex-1">
							<SegmentedControl
								options={[
									{ value: 'all' as const, label: 'All', activeClass: 'bg-[var(--text-secondary)] text-white' },
									{ value: 'activity' as const, label: 'Activities', activeClass: 'type-activity' },
									{ value: 'food' as const, label: 'Food', activeClass: 'type-food' }
								]}
								value={typeFilter}
								onchange={handleTypeChange}
							/>
						</div>
						<button
							type="button"
							onClick={() => setShowFilters(!showFilters)}
							className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-colors ${
								showFilters || activeFilterCount > 0
									? 'bg-[var(--color-activity-bg)] border-[var(--color-activity-border)] text-[var(--color-activity-text)]'
									: 'bg-[var(--bg-inset)] border-[var(--border-default)] text-label hover:bg-[var(--bg-card-hover)]'
							}`}
						>
							<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
							</svg>
							<span className="text-sm font-medium">Filters</span>
							{activeFilterCount > 0 && (
								<span className="flex items-center justify-center w-5 h-5 text-xs font-bold text-white rounded-full" style={{ background: 'var(--color-activity)' }}>
									{activeFilterCount}
								</span>
							)}
						</button>
					</div>
				</div>

				{showFilters && (
					<div className="p-3 space-y-4 border-b border-[var(--border-subtle)] bg-[var(--bg-inset)]">
						{activeFilterCount > 0 && (
							<div className="flex justify-end">
								<button
									type="button"
									onClick={clearAllFilters}
									className="text-sm text-[var(--color-activity)] hover:text-[var(--color-activity-hover)]"
								>
									Clear all filters
								</button>
							</div>
						)}

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
					</div>
				)}

				<div className="px-3 py-2 flex items-center justify-between text-sm text-label">
					<span>{filteredEntries.length} {entryLabel}</span>
					{activeFilterCount > 0 && !showFilters && (
						<button
							type="button"
							onClick={clearAllFilters}
							className="text-[var(--color-activity)] hover:text-[var(--color-activity-hover)]"
						>
							Clear filters
						</button>
					)}
				</div>
			</div>

			{!hasItems ? (
				<div className="text-center py-8">
					<p className="text-label mb-4">No items yet</p>
					<Link to="/library" className="text-[var(--color-activity)] hover:underline">
						Add some in the Library
					</Link>
				</div>
			) : filteredEntries.length === 0 ? (
				<div className="text-center py-8">
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
		</div>
	);
}
