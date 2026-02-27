import type { TrackerData, DashboardCard } from '@/shared/lib/types';
import { getConfig, fetchGist, updateGist, isConfigured } from '@/shared/lib/github';
import { migrateData } from './migration';
import { showToast } from '@/shared/ui/Toast';
import i18n from '@/shared/lib/i18n';

/**
 * Tracks IDs that have been deleted locally but not yet synced.
 * This prevents deleted items from being restored during merge.
 * Persisted to localStorage so deletions survive page reloads.
 */
interface PendingDeletions {
	entries: Set<string>;
	activityItems: Set<string>;
	foodItems: Set<string>;
	activityCategories: Set<string>;
	foodCategories: Set<string>;
	dashboardCards: Set<string>;
	favoriteItems: Set<string>;
}

const PENDING_DELETIONS_KEY = 'pending_deletions';

const PENDING_DELETION_KEYS: (keyof PendingDeletions)[] = [
	'entries',
	'activityItems',
	'foodItems',
	'activityCategories',
	'foodCategories',
	'dashboardCards',
	'favoriteItems',
];

export const pendingDeletions: PendingDeletions = {
	entries: new Set(),
	activityItems: new Set(),
	foodItems: new Set(),
	activityCategories: new Set(),
	foodCategories: new Set(),
	dashboardCards: new Set(),
	favoriteItems: new Set(),
};

/** Persist pending deletions to localStorage so they survive page reloads. */
export function persistPendingDeletions(): void {
	if (typeof localStorage === 'undefined') return;
	const serialized: Record<string, string[]> = {};
	for (const key of PENDING_DELETION_KEYS) {
		if (pendingDeletions[key].size > 0) {
			serialized[key] = Array.from(pendingDeletions[key]);
		}
	}
	if (Object.keys(serialized).length === 0) {
		localStorage.removeItem(PENDING_DELETIONS_KEY);
	} else {
		localStorage.setItem(PENDING_DELETIONS_KEY, JSON.stringify(serialized));
	}
}

/** Load persisted pending deletions from localStorage (called at module init). */
function loadPersistedPendingDeletions(): void {
	if (typeof localStorage === 'undefined') return;
	const stored = localStorage.getItem(PENDING_DELETIONS_KEY);
	if (!stored) return;
	try {
		const parsed = JSON.parse(stored) as Record<string, string[]>;
		for (const key of PENDING_DELETION_KEYS) {
			const ids = parsed[key];
			if (Array.isArray(ids)) {
				for (const id of ids) pendingDeletions[key].add(id);
			}
		}
	} catch {
		// Corrupt data — ignore and start fresh
	}
}

// Restore any pending deletions from a previous session
loadPersistedPendingDeletions();

export function clearPendingDeletions(): void {
	for (const key of PENDING_DELETION_KEYS) {
		pendingDeletions[key].clear();
	}
	if (typeof localStorage !== 'undefined') {
		localStorage.removeItem(PENDING_DELETIONS_KEY);
	}
}

/**
 * Actively remove any items whose IDs are in pendingDeletions.
 * Applied at load time (loadFromLocalStorage) as defense-in-depth:
 * even if a previous setData() call somehow wrote deleted items back
 * to localStorage, this ensures they're filtered out on the next load.
 */
export function filterPendingDeletions(data: TrackerData): TrackerData {
	if (PENDING_DELETION_KEYS.every((key) => pendingDeletions[key].size === 0)) {
		return data;
	}
	return {
		...data,
		entries: data.entries.filter((e) => !pendingDeletions.entries.has(e.id)),
		activityItems: data.activityItems.filter((i) => !pendingDeletions.activityItems.has(i.id)),
		foodItems: data.foodItems.filter((i) => !pendingDeletions.foodItems.has(i.id)),
		activityCategories: data.activityCategories.filter((c) => !pendingDeletions.activityCategories.has(c.id)),
		foodCategories: data.foodCategories.filter((c) => !pendingDeletions.foodCategories.has(c.id)),
		dashboardCards: (data.dashboardCards || []).filter((c) => !pendingDeletions.dashboardCards.has(c.categoryId)),
		favoriteItems: (data.favoriteItems || []).filter((id) => !pendingDeletions.favoriteItems.has(id)),
	};
}

/**
 * Merges two TrackerData objects to prevent data loss from stale tabs.
 * Strategy: Union of all items by ID, with local taking precedence for conflicts.
 * Respects pending deletions - items deleted locally won't be restored from remote.
 */
export function mergeTrackerData(local: TrackerData, remote: TrackerData): TrackerData {
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

	// Local cards take precedence, but also filter pending deletions
	localCards.forEach((c) => {
		if (!pendingDeletions.dashboardCards.has(c.categoryId)) {
			cardMap.set(c.categoryId, c);
		}
	});

	const mergedActivityItems = mergeById(local.activityItems, remote.activityItems, pendingDeletions.activityItems);
	const mergedFoodItems = mergeById(local.foodItems, remote.foodItems, pendingDeletions.foodItems);

	// Merge favorites: union of both sets, filtered to only existing merged items.
	// Respects pending deletions — items unfavorited locally won't be restored from remote.
	const mergedItemIds = new Set([...mergedActivityItems.map((i) => i.id), ...mergedFoodItems.map((i) => i.id)]);
	const favSet = new Set((local.favoriteItems || []).filter((id) => !pendingDeletions.favoriteItems.has(id)));
	for (const id of remote.favoriteItems || []) {
		if (!pendingDeletions.favoriteItems.has(id)) {
			favSet.add(id);
		}
	}
	const mergedFavorites = Array.from(favSet).filter((id) => mergedItemIds.has(id));

	return {
		activityItems: mergedActivityItems,
		foodItems: mergedFoodItems,
		activityCategories: mergeById(
			local.activityCategories,
			remote.activityCategories,
			pendingDeletions.activityCategories,
		),
		foodCategories: mergeById(local.foodCategories, remote.foodCategories, pendingDeletions.foodCategories),
		entries: mergeById(local.entries, remote.entries, pendingDeletions.entries),
		dashboardCards: Array.from(cardMap.values()),
		dashboardInitialized: local.dashboardInitialized || remote.dashboardInitialized,
		favoriteItems: mergedFavorites,
	};
}

function mergeById<T extends { id: string }>(local: T[], remote: T[], excludeIds: Set<string>): T[] {
	const localMap = new Map(local.map((item) => [item.id, item]));
	// Filter pending deletions from BOTH local and remote — defense-in-depth.
	// Normally local shouldn't contain deleted items, but this guards against
	// edge cases where a setData() call wrote them back before the push completed.
	const merged = excludeIds.size > 0 ? local.filter((item) => !excludeIds.has(item.id)) : [...local];

	for (const remoteItem of remote) {
		if (!localMap.has(remoteItem.id) && !excludeIds.has(remoteItem.id)) {
			merged.push(remoteItem);
		}
	}

	return merged;
}

/**
 * Push local data to Gist, merging with remote first.
 * Requires access to current data and setData — these are passed in to avoid circular dependency.
 */
export async function pushToGist(
	getCurrentData: () => TrackerData,
	setData: (data: TrackerData) => void,
	setSyncStatus: (status: 'idle' | 'syncing' | 'error') => void,
): Promise<void> {
	if (!isConfigured()) return;

	const config = getConfig();
	if (!config.gistId || !config.token) return;

	setSyncStatus('syncing');
	try {
		const remoteRaw = await fetchGist(config.gistId, config.token);
		const remoteData = migrateData(remoteRaw);
		const localData = getCurrentData();
		const mergedData = mergeTrackerData(localData, remoteData);
		setData(mergedData);
		await updateGist(config.gistId, config.token, mergedData);
		clearPendingDeletions();
		setSyncStatus('idle');
	} catch (error) {
		console.error('Failed to sync to Gist:', error);
		setSyncStatus('error');
		showToast(i18n.t('common:sync.syncFailed'));
	}
}

export async function loadFromGistFn(
	getCurrentData: () => TrackerData,
	setData: (data: TrackerData) => void,
	setSyncStatus: (status: 'idle' | 'syncing' | 'error') => void,
): Promise<void> {
	if (!isConfigured()) return;

	const config = getConfig();
	if (!config.gistId || !config.token) return;

	setSyncStatus('syncing');
	try {
		const raw = await fetchGist(config.gistId, config.token);
		const remoteData = migrateData(raw);
		const localData = getCurrentData();
		const mergedData = mergeTrackerData(localData, remoteData);
		setData(mergedData);
		await updateGist(config.gistId, config.token, mergedData);
		// Don't clear pendingDeletions here — only pushToGist should clear them.
		// A queued push may still need them if its fetchGist returns stale data.
		setSyncStatus('idle');
	} catch (error) {
		console.error('Failed to load from Gist:', error);
		setSyncStatus('error');
		showToast(i18n.t('common:sync.loadFailed'));
	}
}

export async function backupToGistFn(backupGistId: string, getCurrentData: () => TrackerData): Promise<void> {
	const config = getConfig();
	if (!config.token || !backupGistId) {
		throw new Error('Token and backup Gist ID are required');
	}

	await updateGist(backupGistId, config.token, getCurrentData());
}

export async function restoreFromBackupGistFn(
	backupGistId: string,
	setData: (data: TrackerData) => void,
	triggerPush: () => void,
): Promise<void> {
	const config = getConfig();
	if (!config.token || !backupGistId) {
		throw new Error('Token and backup Gist ID are required');
	}

	const raw = await fetchGist(backupGistId, config.token);
	const data = migrateData(raw);
	setData(data);
	clearPendingDeletions();
	triggerPush();
}
