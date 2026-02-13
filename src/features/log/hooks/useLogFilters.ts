import { useState, useMemo } from 'react';
import type { TrackerData } from '@/shared/lib/types';
import {
	filterEntriesByType,
	filterEntriesByItems,
	filterEntriesByCategories
} from '@/features/tracking/utils/entry-filters';

export function useLogFilters(data: TrackerData) {
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
