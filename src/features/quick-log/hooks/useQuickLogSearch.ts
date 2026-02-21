import { useState, useMemo } from 'react';
import type { EntryType, Item, Entry } from '@/shared/lib/types';

export interface UnifiedItem {
	item: Item;
	type: EntryType;
}

export function useQuickLogSearch(activityItems: Item[], foodItems: Item[], favoriteIds: string[], entries: Entry[]) {
	const [query, setQuery] = useState('');
	const [isFocused, setIsFocused] = useState(false);

	// Shared item map — O(N+M) lookup used by both favorites and recent
	const itemMap = useMemo(() => {
		const map = new Map<string, UnifiedItem>();
		for (const item of activityItems) map.set(item.id, { item, type: 'activity' });
		for (const item of foodItems) map.set(item.id, { item, type: 'food' });
		return map;
	}, [activityItems, foodItems]);

	// All items merged
	const allItems = useMemo(() => {
		const activities: UnifiedItem[] = activityItems.map((item) => ({ item, type: 'activity' as EntryType }));
		const foods: UnifiedItem[] = foodItems.map((item) => ({ item, type: 'food' as EntryType }));
		return [...activities, ...foods];
	}, [activityItems, foodItems]);

	// Favorite items — in order of favoriteIds
	const favoriteItemsList = useMemo(() => {
		if (favoriteIds.length === 0) return [];
		const result: UnifiedItem[] = [];
		for (const itemId of favoriteIds) {
			const unified = itemMap.get(itemId);
			if (unified) result.push(unified);
		}
		return result;
	}, [favoriteIds, itemMap]);

	// 20 most recently logged unique items, sorted by date+time descending
	const recentItemsList = useMemo(() => {
		if (entries.length === 0) return [];

		const sorted = [...entries].sort((a, b) => {
			const dateA = a.time ? `${a.date}T${a.time}` : a.date;
			const dateB = b.time ? `${b.date}T${b.time}` : b.date;
			return dateB.localeCompare(dateA);
		});

		const seen = new Set<string>();
		const result: UnifiedItem[] = [];
		for (const entry of sorted) {
			const key = `${entry.type}-${entry.itemId}`;
			if (seen.has(key)) continue;
			seen.add(key);
			const unified = itemMap.get(entry.itemId);
			if (unified) result.push(unified);
			if (result.length >= 20) break;
		}
		return result;
	}, [entries, itemMap]);

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
		recentItemsList,
		resetSearch,
	};
}
