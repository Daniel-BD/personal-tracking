import type { TrackerData, Entry, Item, Category, CategorySentiment, EntryType } from '@/shared/lib/types';

let idCounter = 0;

function nextId(): string {
	return `test-${++idCounter}`;
}

/** Reset the ID counter between tests if needed */
export function resetIdCounter(): void {
	idCounter = 0;
}

export function makeEntry(overrides: Partial<Entry> = {}): Entry {
	return {
		id: nextId(),
		type: 'food',
		itemId: 'item-1',
		date: '2025-01-15',
		time: '12:00',
		notes: null,
		categoryOverrides: null,
		...overrides,
	};
}

export function makeItem(overrides: Partial<Item> = {}): Item {
	return {
		id: nextId(),
		name: 'Test Item',
		categories: [],
		...overrides,
	};
}

export function makeCategory(overrides: Partial<Category> = {}): Category {
	return {
		id: nextId(),
		name: 'Test Category',
		sentiment: 'neutral' as CategorySentiment,
		...overrides,
	};
}

export function makeValidData(overrides: Partial<TrackerData> = {}): TrackerData {
	return {
		activityItems: [],
		foodItems: [],
		activityCategories: [],
		foodCategories: [],
		entries: [],
		dashboardCards: [],
		dashboardInitialized: true,
		favoriteItems: [],
		...overrides,
	};
}

export function flushPromises() {
	return new Promise<void>((resolve) => setTimeout(resolve, 0));
}
