import type {
	TrackerData,
	Item,
	Entry,
	SyncStatus,
	EntryType,
	Category,
	CategorySentiment,
	DashboardCard,
} from '@/shared/lib/types';
import {
	createEmptyData,
	generateId,
	getItems,
	getCategories,
	getItemsKey,
	getCategoriesKey,
} from '@/shared/lib/types';
import { isConfigured } from '@/shared/lib/github';
import { migrateData, initializeDefaultDashboardCards } from './migration';
import {
	pendingDeletions,
	clearPendingDeletions,
	pushToGist,
	loadFromGistFn,
	backupToGistFn,
	restoreFromBackupGistFn,
} from './sync';
import { triggerExportDownload, validateAndParseImport } from './import-export';

const LOCAL_STORAGE_KEY = 'tracker_data';

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
		return () => {
			listeners.delete(listener);
		};
	},
	getSnapshot(): TrackerData {
		return currentData;
	},
};

export const syncStatusStore = {
	subscribe(listener: Listener) {
		syncListeners.add(listener);
		return () => {
			syncListeners.delete(listener);
		};
	},
	getSnapshot(): SyncStatus {
		return currentSyncStatus;
	},
};

// ============================================================
// Gist sync wrappers
// ============================================================

function triggerPush(): void {
	pushToGist(() => currentData, setData, setSyncStatus);
}

export async function loadFromGist(): Promise<void> {
	await loadFromGistFn(setData, setSyncStatus);
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
		sentiment,
	};

	const key = getCategoriesKey(type);
	updateData((data) => ({
		...data,
		[key]: [...data[key], category],
	}));

	triggerPush();
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
		}),
	}));

	triggerPush();
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
			categories: item.categories.filter((id) => id !== categoryId),
		})),
		entries: data.entries.map((entry) => {
			if (entry.type !== type || !entry.categoryOverrides) return entry;
			return {
				...entry,
				categoryOverrides: entry.categoryOverrides.filter((id) => id !== categoryId),
			};
		}),
	}));

	triggerPush();
}

// ============================================================
// Item CRUD
// ============================================================

export function addItem(type: EntryType, name: string, categoryIds: string[]): Item {
	const item: Item = {
		id: generateId(),
		name,
		categories: categoryIds,
	};

	const key = getItemsKey(type);
	updateData((data) => ({
		...data,
		[key]: [...data[key], item],
	}));

	triggerPush();
	return item;
}

export function updateItem(type: EntryType, id: string, name: string, categoryIds: string[]): void {
	const key = getItemsKey(type);
	updateData((data) => ({
		...data,
		[key]: data[key].map((item) => (item.id === id ? { ...item, name, categories: categoryIds } : item)),
	}));

	triggerPush();
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
		favoriteItems: (data.favoriteItems || []).filter((fid) => fid !== id),
	}));

	triggerPush();
}

// ============================================================
// Dashboard Card CRUD
// ============================================================

export function addDashboardCard(categoryId: string): void {
	const card: DashboardCard = {
		categoryId,
		baseline: 'rolling_4_week_avg',
		comparison: 'last_week',
	};

	updateData((data) => ({
		...data,
		dashboardCards: [...(data.dashboardCards || []), card],
	}));

	triggerPush();
}

export function removeDashboardCard(categoryId: string): void {
	pendingDeletions.dashboardCards.add(categoryId);

	updateData((data) => ({
		...data,
		dashboardCards: (data.dashboardCards || []).filter((c) => c.categoryId !== categoryId),
	}));

	triggerPush();
}

// ============================================================
// Favorites
// ============================================================

export function toggleFavorite(itemId: string): void {
	const favorites = currentData.favoriteItems || [];
	const isFav = favorites.includes(itemId);

	if (isFav) {
		pendingDeletions.favoriteItems.add(itemId);
	} else {
		pendingDeletions.favoriteItems.delete(itemId);
	}

	updateData((data) => {
		const favs = data.favoriteItems || [];
		return {
			...data,
			favoriteItems: isFav ? favs.filter((id) => id !== itemId) : [...favs, itemId],
		};
	});

	triggerPush();
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
	categoryOverrides: string[] | null = null,
): Entry {
	const entry: Entry = {
		id: generateId(),
		type,
		itemId,
		date,
		time,
		notes,
		categoryOverrides,
	};

	updateData((data) => ({
		...data,
		entries: [...data.entries, entry],
	}));

	triggerPush();
	return entry;
}

export function updateEntry(id: string, updates: Partial<Omit<Entry, 'id' | 'type' | 'itemId'>>): void {
	updateData((data) => ({
		...data,
		entries: data.entries.map((entry) => (entry.id === id ? { ...entry, ...updates } : entry)),
	}));

	triggerPush();
}

export function deleteEntry(id: string): void {
	pendingDeletions.entries.add(id);

	updateData((data) => ({
		...data,
		entries: data.entries.filter((entry) => entry.id !== id),
	}));

	triggerPush();
}

// ============================================================
// Accessors
// ============================================================

export function getItemById(type: EntryType, itemId: string): Item | undefined {
	return getItems(currentData, type).find((item) => item.id === itemId);
}

export function getCategoryById(type: EntryType, categoryId: string): Category | undefined {
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
	triggerExportDownload(currentData);
}

export function importData(jsonString: string): boolean {
	const data = validateAndParseImport(jsonString);
	if (!data) return false;

	setData(data);
	clearPendingDeletions();
	triggerPush();
	return true;
}

// ============================================================
// Backup operations
// ============================================================

export async function backupToGist(backupGistId: string): Promise<void> {
	await backupToGistFn(backupGistId, () => currentData);
}

export async function restoreFromBackupGist(backupGistId: string): Promise<void> {
	await restoreFromBackupGistFn(backupGistId, setData, triggerPush);
}
