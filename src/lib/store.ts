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

function mergeById<T extends { id: string }>(local: T[], remote: T[], excludeIds: Set<string>): T[] {
	const localMap = new Map(local.map((item) => [item.id, item]));
	const merged = [...local];

	for (const remoteItem of remote) {
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

// ============================================================
// Singleton store — useSyncExternalStore-compatible
// ============================================================

type Listener = () => void;

let currentData: TrackerData = loadFromLocalStorage();
let currentSyncStatus: SyncStatus = 'idle';
const listeners = new Set<Listener>();
const syncListeners = new Set<Listener>();

function notifyListeners() {
	listeners.forEach((l) => l());
}

function notifySyncListeners() {
	syncListeners.forEach((l) => l());
}

function setData(data: TrackerData) {
	currentData = data;
	saveToLocalStorage(data);
	notifyListeners();
}

function updateData(updater: (data: TrackerData) => TrackerData) {
	setData(updater(currentData));
}

function setSyncStatus(status: SyncStatus) {
	currentSyncStatus = status;
	notifySyncListeners();
}

export const dataStore = {
	subscribe(listener: Listener) {
		listeners.add(listener);
		return () => { listeners.delete(listener); };
	},
	getSnapshot(): TrackerData {
		return currentData;
	}
};

export const syncStatusStore = {
	subscribe(listener: Listener) {
		syncListeners.add(listener);
		return () => { syncListeners.delete(listener); };
	},
	getSnapshot(): SyncStatus {
		return currentSyncStatus;
	}
};

// ============================================================
// Gist sync
// ============================================================

async function pushToGist(): Promise<void> {
	if (!isConfigured()) return;

	const config = getConfig();
	if (!config.gistId || !config.token) return;

	setSyncStatus('syncing');
	try {
		const remoteData = await fetchGist(config.gistId, config.token);
		const localData = currentData;
		const mergedData = mergeTrackerData(localData, remoteData);
		setData(mergedData);
		await updateGist(config.gistId, config.token, mergedData);
		clearPendingDeletions();
		setSyncStatus('idle');
	} catch (error) {
		console.error('Failed to sync to Gist:', error);
		setSyncStatus('error');
	}
}

export async function loadFromGist(): Promise<void> {
	if (!isConfigured()) return;

	const config = getConfig();
	if (!config.gistId || !config.token) return;

	setSyncStatus('syncing');
	try {
		const data = await fetchGist(config.gistId, config.token);
		setData(data);
		clearPendingDeletions();
		setSyncStatus('idle');
	} catch (error) {
		console.error('Failed to load from Gist:', error);
		setSyncStatus('error');
	}
}

export async function forceRefresh(): Promise<void> {
	await loadFromGist();
}

// ============================================================
// Category CRUD
// ============================================================

export function addCategory(type: EntryType, name: string): Category {
	const category: Category = {
		id: generateId(),
		name: name.trim()
	};

	const key = getCategoriesKey(type);
	updateData((data) => ({
		...data,
		[key]: [...data[key], category]
	}));

	pushToGist();
	return category;
}

export function updateCategory(type: EntryType, id: string, name: string): void {
	if (!name.trim()) return;

	const key = getCategoriesKey(type);
	updateData((data) => ({
		...data,
		[key]: data[key].map((c) => (c.id === id ? { ...c, name: name.trim() } : c))
	}));

	pushToGist();
}

export function deleteCategory(type: EntryType, categoryId: string): void {
	pendingDeletions[getCategoriesKey(type)].add(categoryId);

	const catKey = getCategoriesKey(type);
	const itemsKey = getItemsKey(type);
	updateData((data) => ({
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

// ============================================================
// Item CRUD
// ============================================================

export function addItem(type: EntryType, name: string, categoryIds: string[]): Item {
	const item: Item = {
		id: generateId(),
		name,
		categories: categoryIds
	};

	const key = getItemsKey(type);
	updateData((data) => ({
		...data,
		[key]: [...data[key], item]
	}));

	pushToGist();
	return item;
}

export function updateItem(type: EntryType, id: string, name: string, categoryIds: string[]): void {
	const key = getItemsKey(type);
	updateData((data) => ({
		...data,
		[key]: data[key].map((item) =>
			item.id === id ? { ...item, name, categories: categoryIds } : item
		)
	}));

	pushToGist();
}

export function deleteItem(type: EntryType, id: string): void {
	pendingDeletions[getItemsKey(type)].add(id);

	currentData.entries
		.filter((e) => e.type === type && e.itemId === id)
		.forEach((e) => pendingDeletions.entries.add(e.id));

	const key = getItemsKey(type);
	updateData((data) => ({
		...data,
		[key]: data[key].filter((item) => item.id !== id),
		entries: data.entries.filter((e) => !(e.type === type && e.itemId === id))
	}));

	pushToGist();
}

// ============================================================
// Entry CRUD
// ============================================================

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

	updateData((data) => ({
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
	updateData((data) => ({
		...data,
		entries: data.entries.map((entry) =>
			entry.id === id ? { ...entry, ...updates } : entry
		)
	}));

	pushToGist();
}

export function deleteEntry(id: string): void {
	pendingDeletions.entries.add(id);

	updateData((data) => ({
		...data,
		entries: data.entries.filter((entry) => entry.id !== id)
	}));

	pushToGist();
}

// ============================================================
// Accessors
// ============================================================

export function getItemById(type: EntryType, itemId: string): Item | undefined {
	return getItems(currentData, type).find((item) => item.id === itemId);
}

export function getCategoryById(
	type: EntryType,
	categoryId: string
): Category | undefined {
	return getCategories(currentData, type).find((c) => c.id === categoryId);
}

export function getCategoryName(type: EntryType, categoryId: string): string {
	const category = getCategoryById(type, categoryId);
	return category?.name ?? '';
}

export function getCategoryNames(type: EntryType, categoryIds: string[]): string[] {
	const data = currentData;
	const categoryMap = new Map(getCategories(data, type).map((c) => [c.id, c.name]));
	return categoryIds.map((id) => categoryMap.get(id) ?? '').filter(Boolean);
}

export function initializeStore(): void {
	if (isConfigured()) {
		loadFromGist();
	}
}

// ============================================================
// Export / Import
// ============================================================

export function exportData(): void {
	const data = currentData;
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

export function importData(jsonString: string): boolean {
	try {
		const data = JSON.parse(jsonString) as TrackerData;

		if (
			!Array.isArray(data.entries) ||
			!Array.isArray(data.activityItems) ||
			!Array.isArray(data.foodItems) ||
			!Array.isArray(data.activityCategories) ||
			!Array.isArray(data.foodCategories)
		) {
			return false;
		}

		setData(data);
		clearPendingDeletions();
		pushToGist();
		return true;
	} catch {
		return false;
	}
}

// ============================================================
// Backup operations
// ============================================================

export async function backupToGist(backupGistId: string): Promise<void> {
	const config = getConfig();
	if (!config.token || !backupGistId) {
		throw new Error('Token and backup Gist ID are required');
	}

	await updateGist(backupGistId, config.token, currentData);
}

export async function restoreFromBackupGist(backupGistId: string): Promise<void> {
	const config = getConfig();
	if (!config.token || !backupGistId) {
		throw new Error('Token and backup Gist ID are required');
	}

	const data = await fetchGist(backupGistId, config.token);
	setData(data);
	clearPendingDeletions();
	pushToGist();
}
