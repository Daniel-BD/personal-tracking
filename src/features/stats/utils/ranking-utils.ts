import type { Entry, EntryType, CategorySentiment, Item, TrackerData } from '@/shared/lib/types';
import { getItemAccentColor } from './stats-engine';

export interface RankedItem {
	id: string;
	name: string;
	count: number;
	type: EntryType;
	sentiment?: CategorySentiment;
	accentColor?: string;
}

export function buildItemLookup(data: TrackerData): Map<string, Item> {
	return new Map([...data.activityItems, ...data.foodItems].map((item) => [item.id, item]));
}

export function buildItemAccentColorLookup(data: TrackerData): Map<string, string> {
	const accents = new Map<string, string>();

	for (const item of data.activityItems) {
		accents.set(item.id, getItemAccentColor(item.categories, data.activityCategories));
	}

	for (const item of data.foodItems) {
		accents.set(item.id, getItemAccentColor(item.categories, data.foodCategories));
	}

	return accents;
}

export function rankItems(
	entries: Entry[],
	itemLookup: Map<string, Item>,
	accentColorLookup: Map<string, string> = new Map<string, string>(),
): RankedItem[] {
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
				accentColor: accentColorLookup.get(entry.itemId),
			});
		}
	}

	return Array.from(counts.values()).sort((a, b) => b.count - a.count);
}
