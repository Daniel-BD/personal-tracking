import type { DashboardCard, Tombstone, TombstoneEntityType, TrackerData } from '@/shared/lib/types';
import { getCardId } from '@/shared/lib/types';
import type { PendingDeletionKey, PendingDeletions, PendingSyncSnapshot } from './sync-state';

const PENDING_KEY_TO_ENTITY_TYPE: Record<PendingDeletionKey, TombstoneEntityType> = {
	entries: 'entry',
	activityItems: 'activityItem',
	foodItems: 'foodItem',
	activityCategories: 'activityCategory',
	foodCategories: 'foodCategory',
	dashboardCards: 'dashboardCard',
	favoriteItems: 'favoriteItem',
};

const TOMBSTONE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export function tombstoneExcludeIds(tombstones: Tombstone[], entityType: TombstoneEntityType): Set<string> {
	return new Set(
		tombstones.filter((tombstone) => tombstone.entityType === entityType).map((tombstone) => tombstone.id),
	);
}

function pruneTombstones(tombstones: Tombstone[]): Tombstone[] {
	const cutoff = Date.now() - TOMBSTONE_RETENTION_MS;
	return tombstones.filter((tombstone) => new Date(tombstone.deletedAt).getTime() > cutoff);
}

function mergeTombstones(local: Tombstone[], remote: Tombstone[]): Tombstone[] {
	const map = new Map<string, Tombstone>();

	for (const tombstone of [...local, ...remote]) {
		const key = `${tombstone.entityType}:${tombstone.id}`;
		const existing = map.get(key);
		if (!existing || tombstone.deletedAt > existing.deletedAt) {
			map.set(key, tombstone);
		}
	}

	return pruneTombstones(Array.from(map.values()));
}

function excludeFor(
	pendingKey: PendingDeletionKey,
	tombstones: Tombstone[],
	{ pendingDeletions }: PendingSyncSnapshot,
): Set<string> {
	const entityType = PENDING_KEY_TO_ENTITY_TYPE[pendingKey];
	const fromTombstones = tombstoneExcludeIds(tombstones, entityType);
	const fromPending = pendingDeletions[pendingKey];
	return new Set([...fromPending, ...fromTombstones]);
}

function shouldTreatDashboardCardAsRestored(
	cardId: string,
	{ pendingDeletions, pendingRestorations }: PendingSyncSnapshot,
): boolean {
	return pendingRestorations.dashboardCards.has(cardId) && !pendingDeletions.dashboardCards.has(cardId);
}

export function addTombstone(data: TrackerData, id: string, entityType: TombstoneEntityType): TrackerData {
	const now = new Date().toISOString();
	const previous = (data.tombstones || []).find(
		(tombstone) => tombstone.id === id && tombstone.entityType === entityType,
	);
	const deletedAt = previous && previous.deletedAt > now ? previous.deletedAt : now;
	const existing = (data.tombstones || []).filter(
		(tombstone) => !(tombstone.id === id && tombstone.entityType === entityType),
	);

	return {
		...data,
		tombstones: [...existing, { id, entityType, deletedAt }],
	};
}

export function addTombstones(
	data: TrackerData,
	entries: { id: string; entityType: TombstoneEntityType }[],
): TrackerData {
	if (entries.length === 0) {
		return data;
	}

	const now = new Date().toISOString();
	const replacementKeys = new Set(entries.map((entry) => `${entry.entityType}:${entry.id}`));
	const previousDeletedAtByKey = new Map<string, string>();

	for (const tombstone of data.tombstones || []) {
		const key = `${tombstone.entityType}:${tombstone.id}`;
		if (replacementKeys.has(key)) {
			previousDeletedAtByKey.set(key, tombstone.deletedAt);
		}
	}

	const existing = (data.tombstones || []).filter(
		(tombstone) => !replacementKeys.has(`${tombstone.entityType}:${tombstone.id}`),
	);

	return {
		...data,
		tombstones: [
			...existing,
			...entries.map((entry) => {
				const previousDeletedAt = previousDeletedAtByKey.get(`${entry.entityType}:${entry.id}`);
				return {
					...entry,
					deletedAt: previousDeletedAt && previousDeletedAt > now ? previousDeletedAt : now,
				};
			}),
		],
	};
}

export function removeTombstone(data: TrackerData, id: string, entityType: TombstoneEntityType): TrackerData {
	return {
		...data,
		tombstones: (data.tombstones || []).filter(
			(tombstone) => !(tombstone.id === id && tombstone.entityType === entityType),
		),
	};
}

export function filterPendingDeletions(data: TrackerData, pendingSync: PendingSyncSnapshot): TrackerData {
	const tombstones = data.tombstones || [];
	const hasPending = (Object.keys(pendingSync.pendingDeletions) as (keyof PendingDeletions)[]).some(
		(key) => pendingSync.pendingDeletions[key].size > 0,
	);

	if (!hasPending && tombstones.length === 0) {
		return data;
	}

	const entryExclude = excludeFor('entries', tombstones, pendingSync);
	const activityItemExclude = excludeFor('activityItems', tombstones, pendingSync);
	const foodItemExclude = excludeFor('foodItems', tombstones, pendingSync);
	const activityCategoryExclude = excludeFor('activityCategories', tombstones, pendingSync);
	const foodCategoryExclude = excludeFor('foodCategories', tombstones, pendingSync);
	const dashboardCardExclude = excludeFor('dashboardCards', tombstones, pendingSync);
	const favoriteItemExclude = excludeFor('favoriteItems', tombstones, pendingSync);

	return {
		...data,
		entries: data.entries.filter((entry) => !entryExclude.has(entry.id)),
		activityItems: data.activityItems.filter((item) => !activityItemExclude.has(item.id)),
		foodItems: data.foodItems.filter((item) => !foodItemExclude.has(item.id)),
		activityCategories: data.activityCategories.filter((category) => !activityCategoryExclude.has(category.id)),
		foodCategories: data.foodCategories.filter((category) => !foodCategoryExclude.has(category.id)),
		dashboardCards: (data.dashboardCards || []).filter((card) => {
			const cardId = getCardId(card);
			if (pendingSync.pendingDeletions.dashboardCards.has(cardId)) {
				return false;
			}

			if (shouldTreatDashboardCardAsRestored(cardId, pendingSync)) {
				const hasDashboardCardTombstone = tombstones.some(
					(tombstone) => tombstone.entityType === 'dashboardCard' && tombstone.id === cardId,
				);
				if (hasDashboardCardTombstone) {
					return true;
				}
			}

			return !dashboardCardExclude.has(cardId);
		}),
		favoriteItems: (data.favoriteItems || []).filter((itemId) => !favoriteItemExclude.has(itemId)),
	};
}

export function mergeTrackerData(
	local: TrackerData,
	remote: TrackerData,
	pendingSync: PendingSyncSnapshot,
): TrackerData {
	const mergedTombstones = mergeTombstones(local.tombstones || [], remote.tombstones || []);
	const localCardIds = new Set((local.dashboardCards || []).map((card) => getCardId(card)));
	const effectiveTombstones = mergedTombstones.filter((tombstone) => {
		if (tombstone.entityType !== 'dashboardCard') return true;
		if (!shouldTreatDashboardCardAsRestored(tombstone.id, pendingSync)) return true;
		return !localCardIds.has(tombstone.id);
	});

	const localCards = local.dashboardCards || [];
	const remoteCards = remote.dashboardCards || [];
	const cardExclude = excludeFor('dashboardCards', effectiveTombstones, pendingSync);
	const cardMap = new Map<string, DashboardCard>();

	for (const card of remoteCards) {
		const cardId = getCardId(card);
		if (!cardExclude.has(cardId)) {
			cardMap.set(cardId, card);
		}
	}

	for (const card of localCards) {
		const cardId = getCardId(card);
		if (!cardExclude.has(cardId)) {
			cardMap.set(cardId, card);
		}
	}

	const mergedActivityItems = mergeById(
		local.activityItems,
		remote.activityItems,
		excludeFor('activityItems', effectiveTombstones, pendingSync),
	);
	const mergedFoodItems = mergeById(
		local.foodItems,
		remote.foodItems,
		excludeFor('foodItems', effectiveTombstones, pendingSync),
	);
	const favoriteExclude = excludeFor('favoriteItems', effectiveTombstones, pendingSync);
	const mergedItemIds = new Set([
		...mergedActivityItems.map((item) => item.id),
		...mergedFoodItems.map((item) => item.id),
	]);
	const favoriteIds = new Set((local.favoriteItems || []).filter((itemId) => !favoriteExclude.has(itemId)));

	for (const itemId of remote.favoriteItems || []) {
		if (!favoriteExclude.has(itemId)) {
			favoriteIds.add(itemId);
		}
	}

	return {
		activityItems: mergedActivityItems,
		foodItems: mergedFoodItems,
		activityCategories: mergeById(
			local.activityCategories,
			remote.activityCategories,
			excludeFor('activityCategories', effectiveTombstones, pendingSync),
		),
		foodCategories: mergeById(
			local.foodCategories,
			remote.foodCategories,
			excludeFor('foodCategories', effectiveTombstones, pendingSync),
		),
		entries: mergeById(local.entries, remote.entries, excludeFor('entries', effectiveTombstones, pendingSync)),
		dashboardCards: Array.from(cardMap.values()),
		dashboardInitialized: local.dashboardInitialized || remote.dashboardInitialized,
		favoriteItems: Array.from(favoriteIds).filter((itemId) => mergedItemIds.has(itemId)),
		tombstones: effectiveTombstones,
	};
}

function mergeById<T extends { id: string }>(local: T[], remote: T[], excludeIds: Set<string>): T[] {
	const localMap = new Map(local.map((item) => [item.id, item]));
	const merged = excludeIds.size > 0 ? local.filter((item) => !excludeIds.has(item.id)) : [...local];

	for (const remoteItem of remote) {
		if (!localMap.has(remoteItem.id) && !excludeIds.has(remoteItem.id)) {
			merged.push(remoteItem);
		}
	}

	return merged;
}
