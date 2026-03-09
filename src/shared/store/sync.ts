import type { SyncStatus, TrackerData, TombstoneEntityType } from '@/shared/lib/types';
import { getCardId } from '@/shared/lib/types';
import { fetchGist, getConfig, isConfigured, updateGist } from '@/shared/lib/github';
import {
	addTombstone,
	addTombstones,
	filterPendingDeletions as filterPendingDeletionsWithState,
	mergeTrackerData as mergeTrackerDataWithState,
	removeTombstone,
	tombstoneExcludeIds,
} from './merge';
import { migrateData } from './migration';
import {
	clearDashboardCardRestored,
	clearPendingDeletions,
	getPendingSyncSnapshot,
	markDashboardCardRestored,
	pendingDeletions,
	pendingRestorations,
	PENDING_DELETION_KEYS,
	persistPendingDeletions,
	persistPendingRestorations,
} from './sync-state';
import { emitStoreEvent, type SyncFailureCode } from './store-events';

export {
	addTombstone,
	addTombstones,
	clearDashboardCardRestored,
	clearPendingDeletions,
	markDashboardCardRestored,
	pendingDeletions,
	pendingRestorations,
	persistPendingDeletions,
	removeTombstone,
};

export function filterPendingDeletions(data: TrackerData): TrackerData {
	return filterPendingDeletionsWithState(data, getPendingSyncSnapshot());
}

export function mergeTrackerData(local: TrackerData, remote: TrackerData): TrackerData {
	return mergeTrackerDataWithState(local, remote, getPendingSyncSnapshot());
}

export function clearConfirmedDeletions(remote: TrackerData): void {
	function clearConfirmedFor(key: (typeof PENDING_DELETION_KEYS)[number], remoteIds: Set<string>): void {
		for (const id of Array.from(pendingDeletions[key])) {
			if (!remoteIds.has(id)) {
				pendingDeletions[key].delete(id);
			}
		}
	}

	clearConfirmedFor('entries', new Set(remote.entries.map((entry) => entry.id)));
	clearConfirmedFor('activityItems', new Set(remote.activityItems.map((item) => item.id)));
	clearConfirmedFor('foodItems', new Set(remote.foodItems.map((item) => item.id)));
	clearConfirmedFor('activityCategories', new Set(remote.activityCategories.map((category) => category.id)));
	clearConfirmedFor('foodCategories', new Set(remote.foodCategories.map((category) => category.id)));
	clearConfirmedFor('dashboardCards', new Set((remote.dashboardCards || []).map((card) => getCardId(card))));
	clearConfirmedFor('favoriteItems', new Set(remote.favoriteItems || []));

	const remoteDashboardCardTombstones = tombstoneExcludeIds(remote.tombstones || [], 'dashboardCard');
	for (const id of Array.from(pendingRestorations.dashboardCards)) {
		if (!remoteDashboardCardTombstones.has(id)) {
			pendingRestorations.dashboardCards.delete(id);
		}
	}

	persistPendingDeletions();
	persistPendingRestorations();
}

export async function pushToGist(
	getCurrentData: () => TrackerData,
	setData: (data: TrackerData) => void,
	setSyncStatus: (status: SyncStatus) => void,
): Promise<void> {
	if (!isConfigured()) return;

	const config = getConfig();
	if (!config.gistId || !config.token) return;

	setSyncStatus('syncing');
	let failureCode: SyncFailureCode = 'unknown';

	try {
		failureCode = 'fetch_failed';
		const remoteRaw = await fetchGist(config.gistId, config.token);
		const remoteData = migrateData(remoteRaw);
		const localData = getCurrentData();
		const mergedData = mergeTrackerDataWithState(localData, remoteData, getPendingSyncSnapshot());
		setData(mergedData);
		failureCode = 'update_failed';
		await updateGist(config.gistId, config.token, mergedData);
		clearConfirmedDeletions(remoteData);
		setSyncStatus('idle');
		emitStoreEvent({ type: 'sync-completed', operation: 'push' });
	} catch (error) {
		console.error('Failed to sync to Gist:', error);
		setSyncStatus('error');
		emitStoreEvent({ type: 'sync-push-failed', code: failureCode });
	}
}

export async function loadFromGistFn(
	getCurrentData: () => TrackerData,
	setData: (data: TrackerData) => void,
	setSyncStatus: (status: SyncStatus) => void,
): Promise<void> {
	if (!isConfigured()) return;

	const config = getConfig();
	if (!config.gistId || !config.token) return;

	setSyncStatus('syncing');
	let failureCode: SyncFailureCode = 'unknown';

	try {
		failureCode = 'fetch_failed';
		const raw = await fetchGist(config.gistId, config.token);
		const remoteData = migrateData(raw);
		const localData = getCurrentData();
		const mergedData = mergeTrackerDataWithState(localData, remoteData, getPendingSyncSnapshot());
		setData(mergedData);
		failureCode = 'update_failed';
		await updateGist(config.gistId, config.token, mergedData);
		clearConfirmedDeletions(remoteData);
		setSyncStatus('idle');
		emitStoreEvent({ type: 'sync-completed', operation: 'load' });
	} catch (error) {
		console.error('Failed to load from Gist:', error);
		setSyncStatus('error');
		emitStoreEvent({ type: 'sync-load-failed', code: failureCode });
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

export type { TombstoneEntityType };
