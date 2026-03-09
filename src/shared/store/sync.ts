import type { TrackerData, DashboardCard, Tombstone, TombstoneEntityType } from '@/shared/lib/types';
import { getCardId } from '@/shared/lib/types';
import { getConfig, fetchGist, updateGist, isConfigured } from '@/shared/lib/github';
import { migrateData } from './migration';
import { showToast } from '@/shared/ui/toast-store';
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

interface PendingRestorations {
	dashboardCards: Set<string>;
}

const PENDING_DELETIONS_KEY = 'pending_deletions';
const PENDING_RESTORATIONS_KEY = 'pending_restorations';

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

export const pendingRestorations: PendingRestorations = {
	dashboardCards: new Set(),
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

function persistPendingRestorations(): void {
	if (typeof localStorage === 'undefined') return;
	if (pendingRestorations.dashboardCards.size === 0) {
		localStorage.removeItem(PENDING_RESTORATIONS_KEY);
		return;
	}

	localStorage.setItem(
		PENDING_RESTORATIONS_KEY,
		JSON.stringify({ dashboardCards: Array.from(pendingRestorations.dashboardCards) }),
	);
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

function loadPersistedPendingRestorations(): void {
	if (typeof localStorage === 'undefined') return;
	const stored = localStorage.getItem(PENDING_RESTORATIONS_KEY);
	if (!stored) return;
	try {
		const parsed = JSON.parse(stored) as { dashboardCards?: string[] };
		if (Array.isArray(parsed.dashboardCards)) {
			for (const id of parsed.dashboardCards) pendingRestorations.dashboardCards.add(id);
		}
	} catch {
		// Corrupt data — ignore and start fresh
	}
}

// Restore any pending deletions from a previous session
loadPersistedPendingDeletions();
loadPersistedPendingRestorations();

export function clearPendingDeletions(): void {
	for (const key of PENDING_DELETION_KEYS) {
		pendingDeletions[key].clear();
	}
	pendingRestorations.dashboardCards.clear();
	if (typeof localStorage !== 'undefined') {
		localStorage.removeItem(PENDING_DELETIONS_KEY);
		localStorage.removeItem(PENDING_RESTORATIONS_KEY);
	}
}

export function markDashboardCardRestored(cardId: string): void {
	pendingRestorations.dashboardCards.add(cardId);
	persistPendingRestorations();
}

export function clearDashboardCardRestored(cardId: string): void {
	if (!pendingRestorations.dashboardCards.delete(cardId)) return;
	persistPendingRestorations();
}

function shouldTreatDashboardCardAsRestored(cardId: string): boolean {
	return pendingRestorations.dashboardCards.has(cardId) && !pendingDeletions.dashboardCards.has(cardId);
}

// ── Tombstone helpers ────────────────────────────────────────

/** Mapping from PendingDeletions keys to TombstoneEntityType values. */
const PENDING_KEY_TO_ENTITY_TYPE: Record<keyof PendingDeletions, TombstoneEntityType> = {
	entries: 'entry',
	activityItems: 'activityItem',
	foodItems: 'foodItem',
	activityCategories: 'activityCategory',
	foodCategories: 'foodCategory',
	dashboardCards: 'dashboardCard',
	favoriteItems: 'favoriteItem',
};

const TOMBSTONE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/** Extract IDs from tombstones for a given entity type. */
function tombstoneExcludeIds(tombstones: Tombstone[], entityType: TombstoneEntityType): Set<string> {
	return new Set(tombstones.filter((t) => t.entityType === entityType).map((t) => t.id));
}

/** Remove tombstones older than the retention period. */
function pruneTombstones(tombstones: Tombstone[]): Tombstone[] {
	const cutoff = Date.now() - TOMBSTONE_RETENTION_MS;
	return tombstones.filter((t) => new Date(t.deletedAt).getTime() > cutoff);
}

/** Merge and deduplicate tombstones from local and remote, then prune old ones.
 *  When duplicates exist, keeps the newer deletedAt to maximize retention window. */
function mergeTombstones(local: Tombstone[], remote: Tombstone[]): Tombstone[] {
	const map = new Map<string, Tombstone>();
	for (const t of [...local, ...remote]) {
		const key = `${t.entityType}:${t.id}`;
		const existing = map.get(key);
		if (!existing || t.deletedAt > existing.deletedAt) {
			map.set(key, t);
		}
	}
	return pruneTombstones(Array.from(map.values()));
}

/** Build an exclude set as the union of pendingDeletions + tombstone IDs for a given key. */
function excludeFor(pendingKey: keyof PendingDeletions, tombstones: Tombstone[]): Set<string> {
	const entityType = PENDING_KEY_TO_ENTITY_TYPE[pendingKey];
	const fromTombstones = tombstoneExcludeIds(tombstones, entityType);
	const fromPending = pendingDeletions[pendingKey];
	return new Set([...fromPending, ...fromTombstones]);
}

/** Add a tombstone to TrackerData (deduplicates by id + entityType, keeps later timestamp). */
export function addTombstone(data: TrackerData, id: string, entityType: TombstoneEntityType): TrackerData {
	const now = new Date().toISOString();
	const prev = (data.tombstones || []).find((t) => t.id === id && t.entityType === entityType);
	const deletedAt = prev && prev.deletedAt > now ? prev.deletedAt : now;
	const existing = (data.tombstones || []).filter((t) => !(t.id === id && t.entityType === entityType));
	return {
		...data,
		tombstones: [...existing, { id, entityType, deletedAt }],
	};
}

/** Add multiple tombstones to TrackerData in a single pass (keeps later timestamps). */
export function addTombstones(
	data: TrackerData,
	entries: { id: string; entityType: TombstoneEntityType }[],
): TrackerData {
	if (entries.length === 0) return data;
	const now = new Date().toISOString();
	const newKeys = new Set(entries.map((e) => `${e.entityType}:${e.id}`));
	// Build a map of existing tombstones that are being replaced, to preserve later timestamps
	const prevMap = new Map<string, string>();
	for (const t of data.tombstones || []) {
		const key = `${t.entityType}:${t.id}`;
		if (newKeys.has(key)) prevMap.set(key, t.deletedAt);
	}
	const existing = (data.tombstones || []).filter((t) => !newKeys.has(`${t.entityType}:${t.id}`));
	return {
		...data,
		tombstones: [
			...existing,
			...entries.map((e) => {
				const prevDeletedAt = prevMap.get(`${e.entityType}:${e.id}`);
				return { ...e, deletedAt: prevDeletedAt && prevDeletedAt > now ? prevDeletedAt : now };
			}),
		],
	};
}

/** Remove a tombstone from TrackerData (e.g., when re-favoriting). */
export function removeTombstone(data: TrackerData, id: string, entityType: TombstoneEntityType): TrackerData {
	return {
		...data,
		tombstones: (data.tombstones || []).filter((t) => !(t.id === id && t.entityType === entityType)),
	};
}

/**
 * Selectively clear pending deletions for IDs confirmed absent from remote.
 *
 * Why this exists instead of clearPendingDeletions():
 * After a successful push, GitHub's Gist API can still return the old (pre-delete)
 * data for a short window due to caching. If we eagerly cleared all pendingDeletions
 * after a push, a subsequent sync that hits stale cached data would find the deleted
 * item in remote with no pendingDeletion to block it — restoring the item.
 *
 * By only clearing IDs that are NOT present in the fetched remote, we ensure:
 * - Stale remote (item still there) → ID stays in pendingDeletions, merge keeps filtering it.
 * - Fresh remote (item gone) → ID cleared from pendingDeletions, no unnecessary overhead.
 */
export function clearConfirmedDeletions(remote: TrackerData): void {
	function clearConfirmedFor(key: keyof PendingDeletions, remoteIds: Set<string>): void {
		for (const id of Array.from(pendingDeletions[key])) {
			if (!remoteIds.has(id)) pendingDeletions[key].delete(id);
		}
	}

	clearConfirmedFor('entries', new Set(remote.entries.map((e) => e.id)));
	clearConfirmedFor('activityItems', new Set(remote.activityItems.map((i) => i.id)));
	clearConfirmedFor('foodItems', new Set(remote.foodItems.map((i) => i.id)));
	clearConfirmedFor('activityCategories', new Set(remote.activityCategories.map((c) => c.id)));
	clearConfirmedFor('foodCategories', new Set(remote.foodCategories.map((c) => c.id)));
	clearConfirmedFor('dashboardCards', new Set((remote.dashboardCards || []).map((c) => getCardId(c))));
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

/**
 * Actively remove any items whose IDs are in pendingDeletions or tombstones.
 * Applied at load time (loadFromLocalStorage) as defense-in-depth:
 * even if a previous setData() call somehow wrote deleted items back
 * to localStorage, this ensures they're filtered out on the next load.
 */
export function filterPendingDeletions(data: TrackerData): TrackerData {
	const tombstones = data.tombstones || [];
	const hasPending = PENDING_DELETION_KEYS.some((key) => pendingDeletions[key].size > 0);
	if (!hasPending && tombstones.length === 0) {
		return data;
	}

	const entryExclude = excludeFor('entries', tombstones);
	const activityItemExclude = excludeFor('activityItems', tombstones);
	const foodItemExclude = excludeFor('foodItems', tombstones);
	const activityCategoryExclude = excludeFor('activityCategories', tombstones);
	const foodCategoryExclude = excludeFor('foodCategories', tombstones);
	const dashboardCardExclude = excludeFor('dashboardCards', tombstones);
	const favoriteItemExclude = excludeFor('favoriteItems', tombstones);

	return {
		...data,
		entries: data.entries.filter((e) => !entryExclude.has(e.id)),
		activityItems: data.activityItems.filter((i) => !activityItemExclude.has(i.id)),
		foodItems: data.foodItems.filter((i) => !foodItemExclude.has(i.id)),
		activityCategories: data.activityCategories.filter((c) => !activityCategoryExclude.has(c.id)),
		foodCategories: data.foodCategories.filter((c) => !foodCategoryExclude.has(c.id)),
		dashboardCards: (data.dashboardCards || []).filter((c) => {
			const id = getCardId(c);
			if (pendingDeletions.dashboardCards.has(id)) return false;
			if (shouldTreatDashboardCardAsRestored(id)) {
				const hasDashboardCardTombstone = tombstones.some((t) => t.entityType === 'dashboardCard' && t.id === id);
				if (hasDashboardCardTombstone) return true;
			}
			return !dashboardCardExclude.has(id);
		}),
		favoriteItems: (data.favoriteItems || []).filter((id) => !favoriteItemExclude.has(id)),
	};
}

/**
 * Merges two TrackerData objects to prevent data loss from stale tabs.
 * Strategy: Union of all items by ID, with local taking precedence for conflicts.
 * Respects both pending deletions (local-only) and tombstones (synced) —
 * items deleted on any device won't be restored from the other.
 */
export function mergeTrackerData(local: TrackerData, remote: TrackerData): TrackerData {
	// Merge tombstones first — they inform all other merges
	const mergedTombstones = mergeTombstones(local.tombstones || [], remote.tombstones || []);
	const localCardIds = new Set((local.dashboardCards || []).map((c) => getCardId(c)));
	const effectiveTombstones = mergedTombstones.filter((t) => {
		if (t.entityType !== 'dashboardCard') return true;
		if (!shouldTreatDashboardCardAsRestored(t.id)) return true;
		return !localCardIds.has(t.id);
	});

	const localCards = local.dashboardCards || [];
	const remoteCards = remote.dashboardCards || [];
	const cardExclude = excludeFor('dashboardCards', effectiveTombstones);

	// Merge dashboard cards by card ID (categoryId or itemId), respecting deletions
	const cardMap = new Map<string, DashboardCard>();

	// Add remote cards first if not deleted
	remoteCards.forEach((c) => {
		const id = getCardId(c);
		if (!cardExclude.has(id)) {
			cardMap.set(id, c);
		}
	});

	// Local cards take precedence, but also filter deletions
	localCards.forEach((c) => {
		const id = getCardId(c);
		if (!cardExclude.has(id)) {
			cardMap.set(id, c);
		}
	});

	const activityItemExclude = excludeFor('activityItems', effectiveTombstones);
	const foodItemExclude = excludeFor('foodItems', effectiveTombstones);
	const favoriteExclude = excludeFor('favoriteItems', effectiveTombstones);

	const mergedActivityItems = mergeById(local.activityItems, remote.activityItems, activityItemExclude);
	const mergedFoodItems = mergeById(local.foodItems, remote.foodItems, foodItemExclude);

	// Merge favorites: union of both sets, filtered to only existing merged items.
	// Respects deletions — items unfavorited on any device won't be restored.
	const mergedItemIds = new Set([...mergedActivityItems.map((i) => i.id), ...mergedFoodItems.map((i) => i.id)]);
	const favSet = new Set((local.favoriteItems || []).filter((id) => !favoriteExclude.has(id)));
	for (const id of remote.favoriteItems || []) {
		if (!favoriteExclude.has(id)) {
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
			excludeFor('activityCategories', effectiveTombstones),
		),
		foodCategories: mergeById(
			local.foodCategories,
			remote.foodCategories,
			excludeFor('foodCategories', effectiveTombstones),
		),
		entries: mergeById(local.entries, remote.entries, excludeFor('entries', effectiveTombstones)),
		dashboardCards: Array.from(cardMap.values()),
		dashboardInitialized: local.dashboardInitialized || remote.dashboardInitialized,
		favoriteItems: mergedFavorites,
		tombstones: effectiveTombstones,
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
		// Only clear pending deletions for IDs confirmed absent from remote.
		// If GitHub returns stale cached data (item still present), keep the ID in
		// pendingDeletions so subsequent syncs continue to filter it correctly.
		clearConfirmedDeletions(remoteData);
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
		// Selectively clear pending deletions for IDs confirmed absent from remote.
		// A queued push may still need them if its fetchGist returns stale data,
		// but IDs not present in remote are safe to clear now.
		clearConfirmedDeletions(remoteData);
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
