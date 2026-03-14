import type { Category, EntryType, Item } from '@/shared/lib/types';
import { getCategories, getItems } from '@/shared/lib/types';
import { isConfigured } from '@/shared/lib/github';
import { createCategoryDashboardCommands } from './commands/categories-dashboard-cards';
import { createEntryCommands } from './commands/entries';
import { createImportExportBackupCommands } from './commands/import-export-backup';
import { createItemFavoriteCommands } from './commands/items-favorites';
import { triggerExportDownload, validateAndParseImport } from './import-export';
import { dataStore, storeRuntime, syncStatusStore } from './store-runtime';
import {
	addTombstone,
	addTombstones,
	backupToGistFn,
	clearDashboardCardRestored,
	clearPendingDeletions,
	loadFromGistFn,
	markDashboardCardRestored,
	pendingDeletions,
	persistPendingDeletions,
	pushToGist,
	removeTombstone,
	restoreFromBackupGistFn,
} from './sync';
import { createSyncController } from './sync-state';
export { subscribeToStoreEvents } from './store-events';
export type { StoreEvent, StoreEventListener, SyncFailureCode, SyncOperation } from './store-events';

export { dataStore, syncStatusStore };

const syncController = createSyncController(() =>
	pushToGist(storeRuntime.getData, storeRuntime.setData, storeRuntime.setSyncStatus),
);

function triggerPush(): void {
	syncController.trigger();
}

export function flushPendingSync(): void {
	syncController.flush();
}

export async function loadFromGist(): Promise<void> {
	await syncController.runExclusive(() =>
		loadFromGistFn(storeRuntime.getData, storeRuntime.setData, storeRuntime.setSyncStatus),
	);
}

export async function forceRefresh(): Promise<void> {
	await loadFromGist();
}

const commandRuntime = {
	...storeRuntime,
	triggerPush,
};

const entryCommands = createEntryCommands(commandRuntime, {
	addTombstone,
	pendingDeletions,
	persistPendingDeletions,
});

const itemFavoriteCommands = createItemFavoriteCommands(commandRuntime, {
	addTombstone,
	addTombstones,
	pendingDeletions,
	persistPendingDeletions,
	removeTombstone,
});

const categoryDashboardCommands = createCategoryDashboardCommands(commandRuntime, {
	addTombstone,
	addTombstones,
	clearDashboardCardRestored,
	markDashboardCardRestored,
	pendingDeletions,
	persistPendingDeletions,
	removeTombstone,
});

const importExportBackupCommands = createImportExportBackupCommands(commandRuntime, {
	backupToGistFn,
	clearPendingDeletions,
	restoreFromBackupGistFn,
	triggerExportDownload,
	validateAndParseImport,
});

export const { addEntry, updateEntry, deleteEntry } = entryCommands;
export const { addItem, updateItem, deleteItem, mergeItem, toggleFavorite, isFavorite } = itemFavoriteCommands;
export const { addCategory, updateCategory, deleteCategory, mergeCategory, addDashboardCard, removeDashboardCard } =
	categoryDashboardCommands;
export const { exportData, importData, backupToGist, restoreFromBackupGist } = importExportBackupCommands;

export function getItemById(type: EntryType, itemId: string): Item | undefined {
	return getItems(storeRuntime.getData(), type).find((item) => item.id === itemId);
}

export function getCategoryById(type: EntryType, categoryId: string): Category | undefined {
	return getCategories(storeRuntime.getData(), type).find((category) => category.id === categoryId);
}

export function getCategoryName(type: EntryType, categoryId: string): string {
	return getCategoryById(type, categoryId)?.name ?? '';
}

export function getCategoryNames(type: EntryType, categoryIds: string[]): string[] {
	const categoryMap = new Map(
		getCategories(storeRuntime.getData(), type).map((category) => [category.id, category.name]),
	);
	return categoryIds.map((categoryId) => categoryMap.get(categoryId) ?? '').filter(Boolean);
}

let storeInitialized = false;

export function initializeStore(): void {
	if (storeInitialized) {
		return;
	}

	storeInitialized = true;

	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'hidden') {
			flushPendingSync();
		}
	});

	if (isConfigured()) {
		void loadFromGist();
	}
}
