import type { Entry, Item, EntryType } from '@/shared/lib/types';

export function countAffectedEntriesForItemMerge(entries: Entry[], type: EntryType, sourceId: string): number {
	return entries.filter((e) => e.type === type && e.itemId === sourceId).length;
}

export function countAffectedEntryOverridesForCategoryMerge(
	entries: Entry[],
	type: EntryType,
	sourceId: string,
): number {
	return entries.filter(
		(entry) =>
			entry.type === type && Array.isArray(entry.categoryOverrides) && entry.categoryOverrides.includes(sourceId),
	).length;
}

export function countAffectedForCategoryMerge(
	items: Item[],
	entries: Entry[],
	type: EntryType,
	sourceId: string,
): { itemCount: number; entryCount: number } {
	const itemCount = items.filter((item) => item.categories.includes(sourceId)).length;
	const entryCount = entries.filter(
		(e) => e.type === type && e.categoryOverrides && e.categoryOverrides.includes(sourceId),
	).length;
	return { itemCount, entryCount };
}
