import { useSyncExternalStore } from 'react';
import { dataStore, syncStatusStore } from './store';
import type { TrackerData, SyncStatus } from './types';

export function useTrackerData(): TrackerData {
	return useSyncExternalStore(dataStore.subscribe, dataStore.getSnapshot);
}

export function useSyncStatus(): SyncStatus {
	return useSyncExternalStore(syncStatusStore.subscribe, syncStatusStore.getSnapshot);
}
