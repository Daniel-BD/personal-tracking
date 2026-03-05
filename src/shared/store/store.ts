import type {
	TrackerData,
	Item,
	Entry,
	SyncStatus,
	EntryType,
	Category,
	CategorySentiment,
	DashboardCard,
	TombstoneEntityType,
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
	persistPendingDeletions,
	clearPendingDeletions,
	filterPendingDeletions,
	pushToGist,
	loadFromGistFn,
	backupToGistFn,
	restoreFromBackupGistFn,
	addTombstone,
	addTombstones,
	removeTombstone,
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
			// Filter pending deletions at load time — if a sync wrote deleted items back
			// to localStorage before the push completed, this ensures they stay deleted.
			return filterPendingDeletions(initializeDefaultDashboardCards(migrateData(data)));
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
// Gist sync wrappers (debounced + serialized)
// ============================================================

const PUSH_DEBOUNCE_MS = 500;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let activeSync: Promise<void> | null = null;
let pushQueued = false;

function triggerPush(): void {
	if (pushTimer) clearTimeout(pushTimer);
	pushTimer = setTimeout(executePush, PUSH_DEBOUNCE_MS);
}

async function executePush(): Promise<void> {
	pushTimer = null;

	if (activeSync) {
		// A sync (push or load) is already in-flight — queue another push after it finishes
		pushQueued = true;
		return;
	}

	activeSync = pushToGist(() => currentData, setData, setSyncStatus);
	try {
		await activeSync;
	} finally {
		activeSync = null;
		if (pushQueued) {
			pushQueued = false;
			executePush();
		}
	}
}

/** Flush any pending debounced push immediately (e.g. on page hide). */
export function flushPendingSync(): void {
	if (pushTimer) {
		clearTimeout(pushTimer);
		void executePush();
	}
}

export async function loadFromGist(): Promise<void> {
	// Wait for any in-flight sync operation (push or load) to complete.
	// This prevents concurrent operations that race on pendingDeletions,
	// which can cause deleted items to reappear after merge.
	while (activeSync) {
		try {
			await activeSync;
		} catch {
			// Ignore — we'll proceed with our load regardless
		}
	}

	activeSync = loadFromGistFn(() => currentData, setData, setSyncStatus);
	try {
		await activeSync;
	} finally {
		activeSync = null;
		if (pushQueued) {
			pushQueued = false;
			void executePush();
		}
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
	persistPendingDeletions();

	const catKey = getCategoriesKey(type);
	const itemsKey = getItemsKey(type);
	const entityType = type === 'activity' ? 'activityCategory' : 'foodCategory';
	updateData((data) =>
		addTombstone(
			{
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
			},
			categoryId,
			entityType,
		),
	);

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
	const oldItem = currentData[key].find((item) => item.id === id);
	const oldCategories = oldItem?.categories ?? [];

	const oldSet = new Set(oldCategories);
	const newSet = new Set(categoryIds);
	const added = categoryIds.filter((c) => !oldSet.has(c));
	const removed = oldCategories.filter((c) => !newSet.has(c));

	updateData((data) => {
		const updatedItems = data[key].map((item) => (item.id === id ? { ...item, name, categories: categoryIds } : item));

		// Propagate category changes to entries with overrides
		let updatedEntries = data.entries;
		if (added.length > 0 || removed.length > 0) {
			const removedSet = new Set(removed);
			updatedEntries = data.entries.map((entry) => {
				if (entry.type !== type || entry.itemId !== id || !entry.categoryOverrides) return entry;

				// Remove item-default categories that were dropped; keep user-added ones
				// (user-added categories are never in removedSet since it's a subset of oldCategories)
				const filtered = entry.categoryOverrides.filter((c) => !removedSet.has(c));
				const existing = new Set(filtered);
				const newOverrides = filtered.concat(added.filter((c) => !existing.has(c)));

				// Normalize: if overrides match new item categories, clear to null
				const matchesDefaults = newOverrides.length === categoryIds.length && newOverrides.every((c) => newSet.has(c));

				return { ...entry, categoryOverrides: matchesDefaults ? null : newOverrides };
			});
		}

		return { ...data, [key]: updatedItems, entries: updatedEntries };
	});

	triggerPush();
}

export function deleteItem(type: EntryType, id: string): void {
	const entityType = type === 'activity' ? 'activityItem' : 'foodItem';
	pendingDeletions[getItemsKey(type)].add(id);

	// Snapshot for pendingDeletions (best-effort, these are a safety net).
	// The authoritative filtering happens inside updateData using fresh `data`.
	currentData.entries
		.filter((e) => e.type === type && e.itemId === id)
		.forEach((e) => pendingDeletions.entries.add(e.id));
	if ((currentData.favoriteItems || []).includes(id)) {
		pendingDeletions.favoriteItems.add(id);
	}
	persistPendingDeletions();

	const key = getItemsKey(type);
	updateData((data) => {
		const entriesToDelete = data.entries.filter((e) => e.type === type && e.itemId === id);
		const wasFavorite = (data.favoriteItems || []).includes(id);

		const updated: TrackerData = {
			...data,
			[key]: data[key].filter((item) => item.id !== id),
			entries: data.entries.filter((e) => !(e.type === type && e.itemId === id)),
			favoriteItems: (data.favoriteItems || []).filter((fid) => fid !== id),
		};

		const tombstoneEntries: { id: string; entityType: TombstoneEntityType }[] = [
			{ id, entityType },
			...entriesToDelete.map((e) => ({ id: e.id, entityType: 'entry' as const })),
		];
		if (wasFavorite) {
			tombstoneEntries.push({ id, entityType: 'favoriteItem' });
		}
		return addTombstones(updated, tombstoneEntries);
	});

	triggerPush();
}

// ============================================================
// Merge operations
// ============================================================

export function mergeItem(type: EntryType, sourceId: string, targetId: string, noteToAppend?: string): number {
	if (sourceId === targetId) return 0;

	const key = getItemsKey(type);
	const entityType = type === 'activity' ? 'activityItem' : 'foodItem';
	const note = noteToAppend?.trim() || null;

	pendingDeletions[key].add(sourceId);
	const favorites = currentData.favoriteItems || [];
	const sourceIsFavorite = favorites.includes(sourceId);
	if (sourceIsFavorite) {
		pendingDeletions.favoriteItems.add(sourceId);
	}
	persistPendingDeletions();

	let affectedCount = 0;

	updateData((data) => {
		const updatedEntries = data.entries.map((entry) => {
			if (entry.type !== type || entry.itemId !== sourceId) return entry;
			affectedCount++;
			const updatedEntry = { ...entry, itemId: targetId };
			if (note) {
				updatedEntry.notes = entry.notes ? entry.notes + '\n' + note : note;
			}
			return updatedEntry;
		});

		const updatedFavorites = data.favoriteItems || [];
		let newFavorites = updatedFavorites.filter((id) => id !== sourceId);
		if (sourceIsFavorite && !newFavorites.includes(targetId)) {
			newFavorites = [...newFavorites, targetId];
		}

		let updated: TrackerData = {
			...data,
			[key]: data[key].filter((item) => item.id !== sourceId),
			entries: updatedEntries,
			favoriteItems: newFavorites,
		};

		const tombstoneEntries: { id: string; entityType: TombstoneEntityType }[] = [{ id: sourceId, entityType }];
		if (sourceIsFavorite) {
			tombstoneEntries.push({ id: sourceId, entityType: 'favoriteItem' });
		}
		updated = addTombstones(updated, tombstoneEntries);
		return updated;
	});

	triggerPush();
	return affectedCount;
}

export function mergeCategory(
	type: EntryType,
	sourceId: string,
	targetId: string,
): { itemCount: number; entryCount: number } {
	if (sourceId === targetId) return { itemCount: 0, entryCount: 0 };

	const catKey = getCategoriesKey(type);
	const itemsKey = getItemsKey(type);
	const entityType = type === 'activity' ? 'activityCategory' : 'foodCategory';

	// Determine if source has a dashboard card that needs deletion (both source and target have cards)
	const cards = currentData.dashboardCards || [];
	const sourceCard = cards.find((c) => c.categoryId === sourceId);
	const targetCard = cards.find((c) => c.categoryId === targetId);
	const shouldDeleteSourceCard = sourceCard && targetCard;

	pendingDeletions[catKey].add(sourceId);
	if (shouldDeleteSourceCard) {
		pendingDeletions.dashboardCards.add(sourceId);
	}
	persistPendingDeletions();

	let itemCount = 0;
	let entryCount = 0;

	updateData((data) => {
		// Replace sourceId with targetId in item category arrays
		const updatedItems = data[itemsKey].map((item) => {
			if (!item.categories.includes(sourceId)) return item;
			itemCount++;
			const hasTarget = item.categories.includes(targetId);
			return {
				...item,
				categories: hasTarget
					? item.categories.filter((id) => id !== sourceId)
					: item.categories.map((id) => (id === sourceId ? targetId : id)),
			};
		});

		// Replace sourceId with targetId in entry categoryOverrides
		const updatedEntries = data.entries.map((entry) => {
			if (entry.type !== type || !entry.categoryOverrides || !entry.categoryOverrides.includes(sourceId)) return entry;
			entryCount++;
			const hasTarget = entry.categoryOverrides.includes(targetId);
			return {
				...entry,
				categoryOverrides: hasTarget
					? entry.categoryOverrides.filter((id) => id !== sourceId)
					: entry.categoryOverrides.map((id) => (id === sourceId ? targetId : id)),
			};
		});

		// Handle dashboard cards: transfer or remove
		const currentCards = data.dashboardCards || [];
		let updatedCards = currentCards;
		const extraTombstones: { id: string; entityType: TombstoneEntityType }[] = [];

		const srcCard = currentCards.find((c) => c.categoryId === sourceId);
		if (srcCard) {
			if (shouldDeleteSourceCard) {
				updatedCards = currentCards.filter((c) => c.categoryId !== sourceId);
				extraTombstones.push({ id: sourceId, entityType: 'dashboardCard' });
			} else {
				// Transfer source card to target
				updatedCards = currentCards.map((c) => (c.categoryId === sourceId ? { ...c, categoryId: targetId } : c));
			}
		}

		let updated: TrackerData = {
			...data,
			[catKey]: data[catKey].filter((c) => c.id !== sourceId),
			[itemsKey]: updatedItems,
			entries: updatedEntries,
			dashboardCards: updatedCards,
		};

		updated = addTombstones(updated, [{ id: sourceId, entityType }, ...extraTombstones]);
		return updated;
	});
	triggerPush();
	return { itemCount, entryCount };
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
	persistPendingDeletions();

	updateData((data) =>
		addTombstone(
			{
				...data,
				dashboardCards: (data.dashboardCards || []).filter((c) => c.categoryId !== categoryId),
			},
			categoryId,
			'dashboardCard',
		),
	);

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
	persistPendingDeletions();

	updateData((data) => {
		const favs = data.favoriteItems || [];
		const updated = {
			...data,
			favoriteItems: isFav ? favs.filter((id) => id !== itemId) : [...favs, itemId],
		};
		if (isFav) {
			return addTombstone(updated, itemId, 'favoriteItem');
		}
		// Re-favoriting: remove any existing tombstone so the favorite syncs correctly
		return removeTombstone(updated, itemId, 'favoriteItem');
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
	persistPendingDeletions();

	updateData((data) =>
		addTombstone(
			{
				...data,
				entries: data.entries.filter((entry) => entry.id !== id),
			},
			id,
			'entry',
		),
	);

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

	// Flush pending sync when user leaves the page or switches tabs
	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'hidden') {
			flushPendingSync();
		}
	});

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
