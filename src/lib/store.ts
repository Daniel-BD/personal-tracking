import type {
	TrackerData,
	Item,
	Entry,
	SyncStatus,
	EntryType,
	Category,
	CategorySentiment,
	DashboardCard
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
	dashboardCards: Set<string>;
}

const pendingDeletions: PendingDeletions = {
	entries: new Set(),
	activityItems: new Set(),
	foodItems: new Set(),
	activityCategories: new Set(),
	foodCategories: new Set(),
	dashboardCards: new Set()
};

function clearPendingDeletions(): void {
	pendingDeletions.entries.clear();
	pendingDeletions.activityItems.clear();
	pendingDeletions.foodItems.clear();
	pendingDeletions.activityCategories.clear();
	pendingDeletions.foodCategories.clear();
	pendingDeletions.dashboardCards.clear();
}

/**
 * Merges two TrackerData objects to prevent data loss from stale tabs.
 * Strategy: Union of all items by ID, with local taking precedence for conflicts.
 * Respects pending deletions - items deleted locally won't be restored from remote.
 */
function mergeTrackerData(local: TrackerData, remote: TrackerData): TrackerData {
	const localCards = local.dashboardCards || [];
	const remoteCards = remote.dashboardCards || [];

	// Merge dashboard cards by categoryId, respecting pending deletions
	const cardMap = new Map<string, DashboardCard>();

	// Add remote cards first if not deleted locally
	remoteCards.forEach((c) => {
		if (!pendingDeletions.dashboardCards.has(c.categoryId)) {
			cardMap.set(c.categoryId, c);
		}
	});

	// Local cards take precedence
	localCards.forEach((c) => cardMap.set(c.categoryId, c));

	const mergedActivityItems = mergeById(local.activityItems, remote.activityItems, pendingDeletions.activityItems);
	const mergedFoodItems = mergeById(local.foodItems, remote.foodItems, pendingDeletions.foodItems);

	// Merge favorites: union of both sets, filtered to only existing merged items
	const mergedItemIds = new Set([
		...mergedActivityItems.map((i) => i.id),
		...mergedFoodItems.map((i) => i.id)
	]);
	const favSet = new Set([...(local.favoriteItems || []), ...(remote.favoriteItems || [])]);
	const mergedFavorites = Array.from(favSet).filter((id) => mergedItemIds.has(id));

	return {
		activityItems: mergedActivityItems,
		foodItems: mergedFoodItems,
		activityCategories: mergeById(local.activityCategories, remote.activityCategories, pendingDeletions.activityCategories),
		foodCategories: mergeById(local.foodCategories, remote.foodCategories, pendingDeletions.foodCategories),
		entries: mergeById(local.entries, remote.entries, pendingDeletions.entries),
		dashboardCards: Array.from(cardMap.values()),
		dashboardInitialized: local.dashboardInitialized || remote.dashboardInitialized,
		favoriteItems: mergedFavorites
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

function initializeDefaultDashboardCards(data: TrackerData): TrackerData {
	if (data.dashboardInitialized) {
		return data;
	}

	const defaultNames = ['Fruit', 'Vegetables', 'Sugary drinks'];
	const allCategories = [...data.foodCategories, ...data.activityCategories];
	const cards: DashboardCard[] = [];

	for (const name of defaultNames) {
		const category = allCategories.find((c) => c.name.toLowerCase() === name.toLowerCase());
		if (category) {
			cards.push({
				categoryId: category.id,
				baseline: 'rolling_4_week_avg',
				comparison: 'last_week'
			});
		}
	}

	return {
		...data,
		dashboardCards: cards.length > 0 ? cards : (data.dashboardCards || []),
		dashboardInitialized: true
	};
}

/**
 * Ensure all categories have a sentiment field (migration for data created before sentiment was added)
 */
function migrateData(data: TrackerData): TrackerData {
	let migrated = false;
	const migrateCategories = (cats: Category[]) =>
		cats.map((c) => {
			if (c.sentiment === undefined) {
				migrated = true;
				return { ...c, sentiment: 'neutral' as CategorySentiment };
			}
			return c;
		});

	const result = {
		...data,
		activityCategories: migrateCategories(data.activityCategories),
		foodCategories: migrateCategories(data.foodCategories)
	};

	return migrated ? result : data;
}

function loadFromLocalStorage(): TrackerData {
	if (typeof localStorage === 'undefined') {
		return createEmptyData();
	}
	const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
	if (stored) {
		try {
			const data = JSON.parse(stored) as TrackerData;
			return initializeDefaultDashboardCards(migrateData(data));
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
	const dataWithDashboard = initializeDefaultDashboardCards(data);
	currentData = dataWithDashboard;
	saveToLocalStorage(dataWithDashboard);
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

export function addCategory(type: EntryType, name: string, sentiment: CategorySentiment = 'neutral'): Category {
	const category: Category = {
		id: generateId(),
		name: name.trim(),
		sentiment
	};

	const key = getCategoriesKey(type);
	updateData((data) => ({
		...data,
		[key]: [...data[key], category]
	}));

	pushToGist();
	return category;
}

export function updateCategory(type: EntryType, id: string, name: string, sentiment?: CategorySentiment): void {
	if (!name.trim()) return;

	const key = getCategoriesKey(type);
	updateData((data) => ({
		...data,
		[key]: data[key].map((c) => {
			if (c.id !== id) return c;
			const updated = { ...c, name: name.trim() };
			if (sentiment !== undefined) updated.sentiment = sentiment;
			return updated;
		})
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
		entries: data.entries.filter((e) => !(e.type === type && e.itemId === id)),
		favoriteItems: (data.favoriteItems || []).filter((fid) => fid !== id)
	}));

	pushToGist();
}

// ============================================================
// Dashboard Card CRUD
// ============================================================

export function addDashboardCard(categoryId: string): void {
	const card: DashboardCard = {
		categoryId,
		baseline: 'rolling_4_week_avg',
		comparison: 'last_week'
	};

	updateData((data) => ({
		...data,
		dashboardCards: [...(data.dashboardCards || []), card]
	}));

	pushToGist();
}

export function removeDashboardCard(categoryId: string): void {
	pendingDeletions.dashboardCards.add(categoryId);

	updateData((data) => ({
		...data,
		dashboardCards: (data.dashboardCards || []).filter((c) => c.categoryId !== categoryId)
	}));

	pushToGist();
}

// ============================================================
// Favorites
// ============================================================

export function toggleFavorite(itemId: string): void {
	updateData((data) => {
		const favorites = data.favoriteItems || [];
		const isFav = favorites.includes(itemId);
		return {
			...data,
			favoriteItems: isFav
				? favorites.filter((id) => id !== itemId)
				: [...favorites, itemId]
		};
	});

	pushToGist();
}

export function isFavorite(itemId: string): boolean {
	return (currentData.favoriteItems || []).includes(itemId);
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

let storeInitialized = false;

export function initializeStore(): void {
	if (storeInitialized) return;
	storeInitialized = true;
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

function isValidEntry(e: unknown): e is Entry {
	if (typeof e !== 'object' || e === null) return false;
	const obj = e as Record<string, unknown>;
	if (
		typeof obj.id !== 'string' ||
		(obj.type !== 'activity' && obj.type !== 'food') ||
		typeof obj.itemId !== 'string' ||
		typeof obj.date !== 'string'
	) return false;
	if (obj.time != null && typeof obj.time !== 'string') return false;
	if (obj.notes != null && typeof obj.notes !== 'string') return false;
	if (obj.categoryOverrides != null && (!Array.isArray(obj.categoryOverrides) || !obj.categoryOverrides.every((id: unknown) => typeof id === 'string'))) return false;
	return true;
}

function isValidItem(i: unknown): i is Item {
	if (typeof i !== 'object' || i === null) return false;
	const obj = i as Record<string, unknown>;
	return (
		typeof obj.id === 'string' &&
		typeof obj.name === 'string' &&
		Array.isArray(obj.categories) &&
		obj.categories.every((catId) => typeof catId === 'string')
	);
}

const VALID_SENTIMENTS = new Set(['positive', 'neutral', 'limit']);

function isValidCategory(c: unknown): c is Category {
	if (typeof c !== 'object' || c === null) return false;
	const obj = c as Record<string, unknown>;
	if (typeof obj.id !== 'string' || typeof obj.name !== 'string') return false;
	if (obj.sentiment !== undefined && !VALID_SENTIMENTS.has(obj.sentiment as string)) return false;
	return true;
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

		// Validate individual objects have required fields
		if (!data.entries.every(isValidEntry)) return false;
		if (!data.activityItems.every(isValidItem)) return false;
		if (!data.foodItems.every(isValidItem)) return false;
		if (!data.activityCategories.every(isValidCategory)) return false;
		if (!data.foodCategories.every(isValidCategory)) return false;

		setData(migrateData(data));
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
