import type { Entry, EntryType, CategorySentiment, Item, TrackerData } from '@/shared/lib/types';

export interface RankedItem {
	id: string;
	name: string;
	count: number;
	type: EntryType;
	sentiment?: CategorySentiment;
}

export function buildItemLookup(data: TrackerData): Map<string, Item> {
	return new Map([...data.activityItems, ...data.foodItems].map((item) => [item.id, item]));
}

export function rankItems(entries: Entry[], itemLookup: Map<string, Item>): RankedItem[] {
	const counts = new Map<string, RankedItem>();

	for (const entry of entries) {
		const existing = counts.get(entry.itemId);
		if (existing) {
			existing.count++;
		} else {
			const item = itemLookup.get(entry.itemId);
			counts.set(entry.itemId, {
				id: entry.itemId,
				name: item?.name ?? 'Unknown',
				count: 1,
				type: entry.type,
			});
		}
	}

	return Array.from(counts.values()).sort((a, b) => b.count - a.count);
}
