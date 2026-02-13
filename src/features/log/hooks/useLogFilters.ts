import { useState, useMemo } from 'react';
import {
	useEntries,
	useActivityItems,
	useFoodItems,
	useActivityCategories,
	useFoodCategories
} from '@/shared/store/hooks';
import type { TrackerData } from '@/shared/lib/types';
import {
	filterEntriesByType,
	filterEntriesByItems,
	filterEntriesByCategories
} from '@/features/tracking/utils/entry-filters';

export function useLogFilters() {
	const entries = useEntries();
	const activityItems = useActivityItems();
	const foodItems = useFoodItems();
	const activityCategories = useActivityCategories();
	const foodCategories = useFoodCategories();

	const [typeFilter, setTypeFilter] = useState<'all' | 'activity' | 'food'>('all');
	const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
	const [selectedItems, setSelectedItems] = useState<string[]>([]);
	const [showFilterSheet, setShowFilterSheet] = useState(false);

	const availableCategories = useMemo(() => {
		if (typeFilter === 'activity') return activityCategories;
		if (typeFilter === 'food') return foodCategories;
		return [...activityCategories, ...foodCategories];
	}, [typeFilter, activityCategories, foodCategories]);

	const availableItems = useMemo(() => {
		if (typeFilter === 'activity') return activityItems;
		if (typeFilter === 'food') return foodItems;
		return [...activityItems, ...foodItems];
	}, [typeFilter, activityItems, foodItems]);

	const categoryOptions = useMemo(
		() => availableCategories.map((cat) => ({
			id: cat.id,
			name: cat.name,
			subtitle:
				typeFilter === 'all'
					? activityCategories.find((c) => c.id === cat.id)
						? 'Activity'
						: 'Food'
					: undefined
		})),
		[availableCategories, typeFilter, activityCategories]
	);

	const itemOptions = useMemo(
		() => availableItems.map((item) => {
			const categories =
				typeFilter === 'all'
					? activityItems.find((i) => i.id === item.id)
						? activityCategories
						: foodCategories
					: typeFilter === 'activity'
						? activityCategories
						: foodCategories;

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
		[availableItems, typeFilter, activityItems, foodItems, activityCategories, foodCategories]
	);

	const activeFilterCount = selectedCategories.length + selectedItems.length;

	// Minimal TrackerData for utility functions that require it
	const dataForFilters = useMemo((): TrackerData => ({
		entries,
		activityItems,
		foodItems,
		activityCategories,
		foodCategories,
	}), [entries, activityItems, foodItems, activityCategories, foodCategories]);

	const filteredEntries = useMemo(() => {
		let result = entries;

		if (typeFilter !== 'all') {
			result = filterEntriesByType(result, typeFilter);
		}

		if (selectedCategories.length > 0) {
			result = filterEntriesByCategories(result, selectedCategories, dataForFilters);
		}

		if (selectedItems.length > 0) {
			result = filterEntriesByItems(result, selectedItems);
		}

		return result;
	}, [entries, dataForFilters, typeFilter, selectedCategories, selectedItems]);

	function handleTypeChange(newType: 'all' | 'activity' | 'food') {
		if (newType !== typeFilter) {
			if (newType === 'activity') {
				setSelectedCategories((prev) => prev.filter((id) =>
					activityCategories.some((c) => c.id === id)
				));
				setSelectedItems((prev) => prev.filter((id) =>
					activityItems.some((i) => i.id === id)
				));
			} else if (newType === 'food') {
				setSelectedCategories((prev) => prev.filter((id) =>
					foodCategories.some((c) => c.id === id)
				));
				setSelectedItems((prev) => prev.filter((id) =>
					foodItems.some((i) => i.id === id)
				));
			}
			setTypeFilter(newType);
		}
	}

	function clearAllFilters() {
		setSelectedCategories([]);
		setSelectedItems([]);
	}

	return {
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
	};
}
