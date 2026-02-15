import type { TrackerData, DashboardCard } from '@/shared/lib/types';
import { getConfig, fetchGist, updateGist, isConfigured } from '@/shared/lib/github';

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

export const pendingDeletions: PendingDeletions = {
	entries: new Set(),
	activityItems: new Set(),
	foodItems: new Set(),
	activityCategories: new Set(),
	foodCategories: new Set(),
	dashboardCards: new Set(),
};

export function clearPendingDeletions(): void {
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

	// Local cards take precedence
	localCards.forEach((c) => cardMap.set(c.categoryId, c));

	const mergedActivityItems = mergeById(local.activityItems, remote.activityItems, pendingDeletions.activityItems);
	const mergedFoodItems = mergeById(local.foodItems, remote.foodItems, pendingDeletions.foodItems);

	// Merge favorites: union of both sets, filtered to only existing merged items
	const mergedItemIds = new Set([...mergedActivityItems.map((i) => i.id), ...mergedFoodItems.map((i) => i.id)]);
	const favSet = new Set([...(local.favoriteItems || []), ...(remote.favoriteItems || [])]);
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
	const merged = [...local];

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
		const remoteData = await fetchGist(config.gistId, config.token);
		const localData = getCurrentData();
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

export async function loadFromGistFn(
	setData: (data: TrackerData) => void,
	setSyncStatus: (status: 'idle' | 'syncing' | 'error') => void,
): Promise<void> {
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

	const data = await fetchGist(backupGistId, config.token);
	setData(data);
	clearPendingDeletions();
	triggerPush();
}
