import { writable, derived, get } from 'svelte/store';
import type {
	TrackerData,
	Item,
	Entry,
	SyncStatus,
	EntryType,
	Category
} from './types';
import { createEmptyData, generateId, getItems, getCategories, getItemsKey, getCategoriesKey } from './types';
import { getConfig, fetchGist, updateGist, isConfigured } from './github';

/**
 * Tracks IDs that have been deleted locally but not yet synced.
 * This prevents deleted items from being restored during merge.
 */
interface PendingDeletions {
	entries: Set<string>;
	activityItems: Set<string>;
	foodItems: Set<string>;
	activityCategories: Set<string>;
	foodCategories: Set<string>;
}

const pendingDeletions: PendingDeletions = {
	entries: new Set(),
	activityItems: new Set(),
	foodItems: new Set(),
	activityCategories: new Set(),
	foodCategories: new Set()
};

function clearPendingDeletions(): void {
	pendingDeletions.entries.clear();
	pendingDeletions.activityItems.clear();
	pendingDeletions.foodItems.clear();
	pendingDeletions.activityCategories.clear();
	pendingDeletions.foodCategories.clear();
}

/**
 * Merges two TrackerData objects to prevent data loss from stale tabs.
 * Strategy: Union of all items by ID, with local taking precedence for conflicts.
 * Respects pending deletions - items deleted locally won't be restored from remote.
 */
function mergeTrackerData(local: TrackerData, remote: TrackerData): TrackerData {
	return {
		activityItems: mergeById(local.activityItems, remote.activityItems, pendingDeletions.activityItems),
		foodItems: mergeById(local.foodItems, remote.foodItems, pendingDeletions.foodItems),
		activityCategories: mergeById(local.activityCategories, remote.activityCategories, pendingDeletions.activityCategories),
		foodCategories: mergeById(local.foodCategories, remote.foodCategories, pendingDeletions.foodCategories),
		entries: mergeById(local.entries, remote.entries, pendingDeletions.entries)
	};
}

/**
 * Merges two arrays by ID, creating a union.
 * Local items take precedence for items with the same ID.
 * Items in excludeIds are filtered out from remote (they were deleted locally).
 */
function mergeById<T extends { id: string }>(local: T[], remote: T[], excludeIds: Set<string>): T[] {
	const localMap = new Map(local.map((item) => [item.id, item]));
	const merged = [...local];

	for (const remoteItem of remote) {
		// Skip if already in local, or if it was deleted locally
		if (!localMap.has(remoteItem.id) && !excludeIds.has(remoteItem.id)) {
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
	return getCategories(data, type).find((c) => c.id === categoryId);
}

// Helper to get category name by ID
export function getCategoryName(type: EntryType, categoryId: string): string {
	const category = getCategoryById(type, categoryId);
	return category?.name ?? '';
}

// Helper to get multiple category names by IDs
export function getCategoryNames(type: EntryType, categoryIds: string[]): string[] {
	const data = get(trackerData);
	const categoryMap = new Map(getCategories(data, type).map((c) => [c.id, c.name]));
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
		// Pending deletions are respected so deleted items don't come back
		const mergedData = mergeTrackerData(localData, remoteData);

		// Update local store with merged data (adds any entries from remote we didn't have)
		trackerData.set(mergedData);

		// Push merged data to Gist
		await updateGist(config.gistId, config.token, mergedData);

		// Clear pending deletions after successful sync
		clearPendingDeletions();

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
		// Clear pending deletions since we're accepting fresh remote data
		clearPendingDeletions();
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

	const key = getCategoriesKey(type);
	trackerData.update((data) => ({
		...data,
		[key]: [...data[key], category]
	}));

	pushToGist();
	return category;
}

export function updateCategory(type: EntryType, id: string, name: string): void {
	if (!name.trim()) return;

	const key = getCategoriesKey(type);
	trackerData.update((data) => ({
		...data,
		[key]: data[key].map((c) => (c.id === id ? { ...c, name: name.trim() } : c))
	}));

	pushToGist();
}

export function deleteCategory(type: EntryType, categoryId: string): void {
	// Track deletion to prevent it from being restored during merge
	pendingDeletions[getCategoriesKey(type)].add(categoryId);

	const catKey = getCategoriesKey(type);
	const itemsKey = getItemsKey(type);
	trackerData.update((data) => ({
		...data,
		[catKey]: data[catKey].filter((c) => c.id !== categoryId),
		[itemsKey]: data[itemsKey].map((item) => ({
			...item,
			categories: item.categories.filter((id) => id !== categoryId)
		})),
		entries: data.entries.map((entry) => {
			if (entry.type !== type || !entry.categoryOverrides) return entry;
			return {
				...entry,
				categoryOverrides: entry.categoryOverrides.filter((id) => id !== categoryId)
			};
		})
	}));

	pushToGist();
}

// Item CRUD operations (categories param is now array of category IDs)

export function addItem(type: EntryType, name: string, categoryIds: string[]): Item {
	const item: Item = {
		id: generateId(),
		name,
		categories: categoryIds
	};

	const key = getItemsKey(type);
	trackerData.update((data) => ({
		...data,
		[key]: [...data[key], item]
	}));

	pushToGist();
	return item;
}

export function updateItem(type: EntryType, id: string, name: string, categoryIds: string[]): void {
	const key = getItemsKey(type);
	trackerData.update((data) => ({
		...data,
		[key]: data[key].map((item) =>
			item.id === id ? { ...item, name, categories: categoryIds } : item
		)
	}));

	pushToGist();
}

export function deleteItem(type: EntryType, id: string): void {
	// Track deletion to prevent it from being restored during merge
	pendingDeletions[getItemsKey(type)].add(id);

	// Also track deletion of related entries
	const data = get(trackerData);
	data.entries
		.filter((e) => e.type === type && e.itemId === id)
		.forEach((e) => pendingDeletions.entries.add(e.id));

	const key = getItemsKey(type);
	trackerData.update((data) => ({
		...data,
		[key]: data[key].filter((item) => item.id !== id),
		entries: data.entries.filter((e) => !(e.type === type && e.itemId === id))
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
	// Track deletion to prevent it from being restored during merge
	pendingDeletions.entries.add(id);

	trackerData.update((data) => ({
		...data,
		entries: data.entries.filter((entry) => entry.id !== id)
	}));

	pushToGist();
}

export function getItemById(type: EntryType, itemId: string): Item | undefined {
	const data = get(trackerData);
	return getItems(data, type).find((item) => item.id === itemId);
}

export function initializeStore(): void {
	if (isConfigured()) {
		loadFromGist();
	}
}

/**
 * Export current data as a JSON file download.
 */
export function exportData(): void {
	const data = get(trackerData);
	const json = JSON.stringify(data, null, 2);
	const blob = new Blob([json], { type: 'application/json' });
	const url = URL.createObjectURL(blob);

	const a = document.createElement('a');
	a.href = url;
	a.download = `tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

/**
 * Import data from a JSON file, replacing current data.
 * Returns true if successful, false if the file is invalid.
 */
export function importData(jsonString: string): boolean {
	try {
		const data = JSON.parse(jsonString) as TrackerData;

		// Basic validation - check required arrays exist
		if (
			!Array.isArray(data.entries) ||
			!Array.isArray(data.activityItems) ||
			!Array.isArray(data.foodItems) ||
			!Array.isArray(data.activityCategories) ||
			!Array.isArray(data.foodCategories)
		) {
			return false;
		}

		trackerData.set(data);
		clearPendingDeletions();
		pushToGist();
		return true;
	} catch {
		return false;
	}
}

/**
 * Backup current data to a secondary Gist.
 */
export async function backupToGist(backupGistId: string): Promise<void> {
	const config = getConfig();
	if (!config.token || !backupGistId) {
		throw new Error('Token and backup Gist ID are required');
	}

	await updateGist(backupGistId, config.token, get(trackerData));
}

/**
 * Restore data from a backup Gist.
 */
export async function restoreFromBackupGist(backupGistId: string): Promise<void> {
	const config = getConfig();
	if (!config.token || !backupGistId) {
		throw new Error('Token and backup Gist ID are required');
	}

	const data = await fetchGist(backupGistId, config.token);
	trackerData.set(data);
	clearPendingDeletions();
	// Also sync to primary Gist
	pushToGist();
}
