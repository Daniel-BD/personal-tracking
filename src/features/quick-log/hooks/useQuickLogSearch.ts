import { useState, useMemo } from 'react';
import type { EntryType, Item } from '@/shared/lib/types';

export interface UnifiedItem {
	item: Item;
	type: EntryType;
}

export function useQuickLogSearch(activityItems: Item[], foodItems: Item[], favoriteIds: string[]) {
	const [query, setQuery] = useState('');
	const [isFocused, setIsFocused] = useState(false);

	// All items merged
	const allItems = useMemo(() => {
		const activities: UnifiedItem[] = activityItems.map((item) => ({ item, type: 'activity' as EntryType }));
		const foods: UnifiedItem[] = foodItems.map((item) => ({ item, type: 'food' as EntryType }));
		return [...activities, ...foods];
	}, [activityItems, foodItems]);

	// Favorite items — Map-based O(N+M) lookup
	const favoriteItemsList = useMemo(() => {
		if (favoriteIds.length === 0) return [];

		const itemMap = new Map<string, UnifiedItem>();
		for (const item of activityItems) {
			itemMap.set(item.id, { item, type: 'activity' });
		}
		for (const item of foodItems) {
			itemMap.set(item.id, { item, type: 'food' });
		}

		const result: UnifiedItem[] = [];
		for (const itemId of favoriteIds) {
			const unified = itemMap.get(itemId);
			if (unified) result.push(unified);
		}
		return result;
	}, [favoriteIds, activityItems, foodItems]);

	// Filtered search results
	const searchResults = useMemo(() => {
		if (!query.trim()) return [];
		return allItems.filter((u) => u.item.name.toLowerCase().includes(query.toLowerCase()));
	}, [allItems, query]);

	const showResults = isFocused && query.trim().length > 0;
	const hasExactMatch = searchResults.some((u) => u.item.name.toLowerCase() === query.trim().toLowerCase());

	function resetSearch() {
		setQuery('');
		setIsFocused(false);
	}

	return {
		query,
		setQuery,
		isFocused,
		setIsFocused,
		searchResults,
		showResults,
		hasExactMatch,
		favoriteItemsList,
		resetSearch,
	};
}
