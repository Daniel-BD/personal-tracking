import type { TrackerData } from '@/shared/lib/types';

export interface PendingDeletions {
	entries: Set<string>;
	activityItems: Set<string>;
	foodItems: Set<string>;
	activityCategories: Set<string>;
	foodCategories: Set<string>;
	dashboardCards: Set<string>;
	favoriteItems: Set<string>;
}

export interface PendingRestorations {
	dashboardCards: Set<string>;
}

export interface PendingSyncSnapshot {
	pendingDeletions: PendingDeletions;
	pendingRestorations: PendingRestorations;
}

export type PendingDeletionKey = keyof PendingDeletions;

const PENDING_DELETIONS_KEY = 'pending_deletions';
const PENDING_RESTORATIONS_KEY = 'pending_restorations';

export const PENDING_DELETION_KEYS: PendingDeletionKey[] = [
	'entries',
	'activityItems',
	'foodItems',
	'activityCategories',
	'foodCategories',
	'dashboardCards',
	'favoriteItems',
];

function createPendingDeletions(): PendingDeletions {
	return {
		entries: new Set(),
		activityItems: new Set(),
		foodItems: new Set(),
		activityCategories: new Set(),
		foodCategories: new Set(),
		dashboardCards: new Set(),
		favoriteItems: new Set(),
	};
}

function createPendingRestorations(): PendingRestorations {
	return {
		dashboardCards: new Set(),
	};
}

export const pendingDeletions = createPendingDeletions();
export const pendingRestorations = createPendingRestorations();

export function getPendingSyncSnapshot(): PendingSyncSnapshot {
	return {
		pendingDeletions,
		pendingRestorations,
	};
}

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
		return;
	}

	localStorage.setItem(PENDING_DELETIONS_KEY, JSON.stringify(serialized));
}

export function persistPendingRestorations(): void {
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

function loadPersistedPendingDeletions(): void {
	if (typeof localStorage === 'undefined') return;

	const stored = localStorage.getItem(PENDING_DELETIONS_KEY);
	if (!stored) return;

	try {
		const parsed = JSON.parse(stored) as Record<string, string[]>;
		for (const key of PENDING_DELETION_KEYS) {
			const ids = parsed[key];
			if (!Array.isArray(ids)) continue;

			for (const id of ids) {
				pendingDeletions[key].add(id);
			}
		}
	} catch {
		// Ignore corrupt persisted state and start fresh.
	}
}

function loadPersistedPendingRestorations(): void {
	if (typeof localStorage === 'undefined') return;

	const stored = localStorage.getItem(PENDING_RESTORATIONS_KEY);
	if (!stored) return;

	try {
		const parsed = JSON.parse(stored) as { dashboardCards?: string[] };
		if (!Array.isArray(parsed.dashboardCards)) return;

		for (const id of parsed.dashboardCards) {
			pendingRestorations.dashboardCards.add(id);
		}
	} catch {
		// Ignore corrupt persisted state and start fresh.
	}
}

loadPersistedPendingDeletions();
loadPersistedPendingRestorations();

export function clearPendingDeletions(): void {
	for (const key of PENDING_DELETION_KEYS) {
		pendingDeletions[key].clear();
	}

	pendingRestorations.dashboardCards.clear();

	if (typeof localStorage === 'undefined') return;

	localStorage.removeItem(PENDING_DELETIONS_KEY);
	localStorage.removeItem(PENDING_RESTORATIONS_KEY);
}

export function markDashboardCardRestored(cardId: string): void {
	pendingRestorations.dashboardCards.add(cardId);
	persistPendingRestorations();
}

export function clearDashboardCardRestored(cardId: string): void {
	if (!pendingRestorations.dashboardCards.delete(cardId)) {
		return;
	}

	persistPendingRestorations();
}

export interface SyncController {
	flush(): void;
	runExclusive(task: () => Promise<void>): Promise<void>;
	trigger(): void;
}

export function createSyncController(executeSync: () => Promise<void>, debounceMs = 500): SyncController {
	let pushTimer: ReturnType<typeof setTimeout> | null = null;
	let activeSync: Promise<void> | null = null;
	let pushQueued = false;

	async function executePush(): Promise<void> {
		pushTimer = null;

		if (activeSync) {
			pushQueued = true;
			return;
		}

		activeSync = executeSync();
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

	return {
		trigger() {
			if (pushTimer) {
				clearTimeout(pushTimer);
			}

			pushTimer = setTimeout(() => {
				void executePush();
			}, debounceMs);
		},
		flush() {
			if (!pushTimer) {
				return;
			}

			clearTimeout(pushTimer);
			void executePush();
		},
		async runExclusive(task: () => Promise<void>) {
			while (activeSync) {
				try {
					await activeSync;
				} catch {
					// Ignore failures from the previous operation and continue.
				}
			}

			activeSync = task();
			try {
				await activeSync;
			} finally {
				activeSync = null;
				if (pushQueued) {
					pushQueued = false;
					void executePush();
				}
			}
		},
	};
}

export function getRemoteIdsByPendingKey(key: PendingDeletionKey, remote: TrackerData): Set<string> {
	switch (key) {
		case 'entries':
			return new Set(remote.entries.map((entry) => entry.id));
		case 'activityItems':
			return new Set(remote.activityItems.map((item) => item.id));
		case 'foodItems':
			return new Set(remote.foodItems.map((item) => item.id));
		case 'activityCategories':
			return new Set(remote.activityCategories.map((category) => category.id));
		case 'foodCategories':
			return new Set(remote.foodCategories.map((category) => category.id));
		case 'dashboardCards':
			return new Set(
				(remote.dashboardCards || []).map((card) => card.categoryId ?? card.itemId).filter(Boolean) as string[],
			);
		case 'favoriteItems':
			return new Set(remote.favoriteItems || []);
	}
}
