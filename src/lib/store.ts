import { writable, derived, get } from 'svelte/store';
import type {
	TrackerData,
	ActivityItem,
	FoodItem,
	Entry,
	SyncStatus,
	EntryType,
	Category
} from './types';
import { createEmptyData, generateId } from './types';
import { getConfig, fetchGist, updateGist, isConfigured } from './github';

/**
 * Merges two TrackerData objects to prevent data loss from stale tabs.
 * Strategy: Union of all items by ID, with local taking precedence for conflicts.
 * This ensures data added on other devices is never silently deleted.
 */
function mergeTrackerData(local: TrackerData, remote: TrackerData): TrackerData {
	return {
		activityItems: mergeById(local.activityItems, remote.activityItems),
		foodItems: mergeById(local.foodItems, remote.foodItems),
		activityCategories: mergeById(local.activityCategories, remote.activityCategories),
		foodCategories: mergeById(local.foodCategories, remote.foodCategories),
		entries: mergeById(local.entries, remote.entries)
	};
}

/**
 * Merges two arrays by ID, creating a union.
 * Local items take precedence for items with the same ID.
 */
function mergeById<T extends { id: string }>(local: T[], remote: T[]): T[] {
	const localMap = new Map(local.map((item) => [item.id, item]));
	const merged = [...local];

	for (const remoteItem of remote) {
		if (!localMap.has(remoteItem.id)) {
			merged.push(remoteItem);
		}
	}

	return merged;
}

const LOCAL_STORAGE_KEY = 'tracker_data';

function loadFromLocalStorage(): TrackerData {
	if (typeof localStorage === 'undefined') {
		return createEmptyData();
	}
	const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
	if (stored) {
		try {
			return JSON.parse(stored) as TrackerData;
		} catch {
			return createEmptyData();
		}
	}
	return createEmptyData();
}

function saveToLocalStorage(data: TrackerData): void {
	if (typeof localStorage !== 'undefined') {
		localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
	}
}

export const trackerData = writable<TrackerData>(loadFromLocalStorage());
export const syncStatus = writable<SyncStatus>('idle');

trackerData.subscribe((data) => {
	saveToLocalStorage(data);
});

export const activityItems = derived(trackerData, ($data) => $data.activityItems);
export const foodItems = derived(trackerData, ($data) => $data.foodItems);
export const entries = derived(trackerData, ($data) => $data.entries);

// Category stores - return Category arrays
export const activityCategories = derived(trackerData, ($data) => $data.activityCategories);
export const foodCategories = derived(trackerData, ($data) => $data.foodCategories);

// Combined categories for suggestions (returns Category arrays)
export const allCategories = derived(trackerData, ($data) => [
	...$data.activityCategories,
	...$data.foodCategories
]);

// Helper to get category by ID
export function getCategoryById(
	type: EntryType,
	categoryId: string
): Category | undefined {
	const data = get(trackerData);
	const categories = type === 'activity' ? data.activityCategories : data.foodCategories;
	return categories.find((c) => c.id === categoryId);
}

// Helper to get category name by ID
export function getCategoryName(type: EntryType, categoryId: string): string {
	const category = getCategoryById(type, categoryId);
	return category?.name ?? '';
}

// Helper to get multiple category names by IDs
export function getCategoryNames(type: EntryType, categoryIds: string[]): string[] {
	const data = get(trackerData);
	const categories = type === 'activity' ? data.activityCategories : data.foodCategories;
	const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
	return categoryIds.map((id) => categoryMap.get(id) ?? '').filter(Boolean);
}

async function pushToGist(): Promise<void> {
	if (!isConfigured()) return;

	const config = getConfig();
	if (!config.gistId || !config.token) return;

	syncStatus.set('syncing');
	try {
		// Fetch current remote data first to prevent overwriting data from other devices
		const remoteData = await fetchGist(config.gistId, config.token);
		const localData = get(trackerData);

		// Merge local and remote data - ensures we don't lose entries added elsewhere
		const mergedData = mergeTrackerData(localData, remoteData);

		// Update local store with merged data (adds any entries from remote we didn't have)
		trackerData.set(mergedData);

		// Push merged data to Gist
		await updateGist(config.gistId, config.token, mergedData);
		syncStatus.set('idle');
	} catch (error) {
		console.error('Failed to sync to Gist:', error);
		syncStatus.set('error');
	}
}

export async function loadFromGist(): Promise<void> {
	if (!isConfigured()) return;

	const config = getConfig();
	if (!config.gistId || !config.token) return;

	syncStatus.set('syncing');
	try {
		const data = await fetchGist(config.gistId, config.token);
		trackerData.set(data);
		syncStatus.set('idle');
	} catch (error) {
		console.error('Failed to load from Gist:', error);
		syncStatus.set('error');
	}
}

export async function forceRefresh(): Promise<void> {
	await loadFromGist();
}

// Category CRUD operations

export function addCategory(type: EntryType, name: string): Category {
	const category: Category = {
		id: generateId(),
		name: name.trim()
	};

	trackerData.update((data) => {
		if (type === 'activity') {
			return {
				...data,
				activityCategories: [...data.activityCategories, category]
			};
		} else {
			return {
				...data,
				foodCategories: [...data.foodCategories, category]
			};
		}
	});

	pushToGist();
	return category;
}

export function updateCategory(type: EntryType, id: string, name: string): void {
	if (!name.trim()) return;

	trackerData.update((data) => {
		if (type === 'activity') {
			return {
				...data,
				activityCategories: data.activityCategories.map((c) =>
					c.id === id ? { ...c, name: name.trim() } : c
				)
			};
		} else {
			return {
				...data,
				foodCategories: data.foodCategories.map((c) =>
					c.id === id ? { ...c, name: name.trim() } : c
				)
			};
		}
	});

	pushToGist();
}

export function deleteCategory(type: EntryType, categoryId: string): void {
	trackerData.update((data) => {
		if (type === 'activity') {
			return {
				...data,
				activityCategories: data.activityCategories.filter((c) => c.id !== categoryId),
				activityItems: data.activityItems.map((item) => ({
					...item,
					categories: item.categories.filter((id) => id !== categoryId)
				})),
				entries: data.entries.map((entry) => {
					if (entry.type !== 'activity' || !entry.categoryOverrides) return entry;
					return {
						...entry,
						categoryOverrides: entry.categoryOverrides.filter((id) => id !== categoryId)
					};
				})
			};
		} else {
			return {
				...data,
				foodCategories: data.foodCategories.filter((c) => c.id !== categoryId),
				foodItems: data.foodItems.map((item) => ({
					...item,
					categories: item.categories.filter((id) => id !== categoryId)
				})),
				entries: data.entries.map((entry) => {
					if (entry.type !== 'food' || !entry.categoryOverrides) return entry;
					return {
						...entry,
						categoryOverrides: entry.categoryOverrides.filter((id) => id !== categoryId)
					};
				})
			};
		}
	});

	pushToGist();
}

// Item CRUD operations (categories param is now array of category IDs)

export function addActivityItem(name: string, categoryIds: string[]): ActivityItem {
	const item: ActivityItem = {
		id: generateId(),
		name,
		categories: categoryIds
	};

	trackerData.update((data) => ({
		...data,
		activityItems: [...data.activityItems, item]
	}));

	pushToGist();
	return item;
}

export function updateActivityItem(id: string, name: string, categoryIds: string[]): void {
	trackerData.update((data) => ({
		...data,
		activityItems: data.activityItems.map((item) =>
			item.id === id ? { ...item, name, categories: categoryIds } : item
		)
	}));

	pushToGist();
}

export function deleteActivityItem(id: string): void {
	trackerData.update((data) => ({
		...data,
		activityItems: data.activityItems.filter((item) => item.id !== id),
		entries: data.entries.filter((e) => !(e.type === 'activity' && e.itemId === id))
	}));

	pushToGist();
}

export function addFoodItem(name: string, categoryIds: string[]): FoodItem {
	const item: FoodItem = {
		id: generateId(),
		name,
		categories: categoryIds
	};

	trackerData.update((data) => ({
		...data,
		foodItems: [...data.foodItems, item]
	}));

	pushToGist();
	return item;
}

export function updateFoodItem(id: string, name: string, categoryIds: string[]): void {
	trackerData.update((data) => ({
		...data,
		foodItems: data.foodItems.map((item) =>
			item.id === id ? { ...item, name, categories: categoryIds } : item
		)
	}));

	pushToGist();
}

export function deleteFoodItem(id: string): void {
	trackerData.update((data) => ({
		...data,
		foodItems: data.foodItems.filter((item) => item.id !== id),
		entries: data.entries.filter((e) => !(e.type === 'food' && e.itemId === id))
	}));

	pushToGist();
}

// Entry CRUD operations

export function addEntry(
	type: EntryType,
	itemId: string,
	date: string,
	time: string | null = null,
	notes: string | null = null,
	categoryOverrides: string[] | null = null
): Entry {
	const entry: Entry = {
		id: generateId(),
		type,
		itemId,
		date,
		time,
		notes,
		categoryOverrides
	};

	trackerData.update((data) => ({
		...data,
		entries: [...data.entries, entry]
	}));

	pushToGist();
	return entry;
}

export function updateEntry(
	id: string,
	updates: Partial<Omit<Entry, 'id' | 'type' | 'itemId'>>
): void {
	trackerData.update((data) => ({
		...data,
		entries: data.entries.map((entry) =>
			entry.id === id ? { ...entry, ...updates } : entry
		)
	}));

	pushToGist();
}

export function deleteEntry(id: string): void {
	trackerData.update((data) => ({
		...data,
		entries: data.entries.filter((entry) => entry.id !== id)
	}));

	pushToGist();
}

export function getItemById(type: EntryType, itemId: string): ActivityItem | FoodItem | undefined {
	const data = get(trackerData);
	if (type === 'activity') {
		return data.activityItems.find((item) => item.id === itemId);
	}
	return data.foodItems.find((item) => item.id === itemId);
}

export function initializeStore(): void {
	if (isConfigured()) {
		loadFromGist();
	}
}
