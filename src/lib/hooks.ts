import { useSyncExternalStore, useCallback } from 'react';
import { dataStore, syncStatusStore } from './store';
import type { TrackerData, SyncStatus } from './types';

export function useTrackerData(): TrackerData {
	return useSyncExternalStore(dataStore.subscribe, dataStore.getSnapshot);
}

export function useSyncStatus(): SyncStatus {
	return useSyncExternalStore(syncStatusStore.subscribe, syncStatusStore.getSnapshot);
}

export function useIsMobile(breakpoint = 640): boolean {
	const subscribe = useCallback((cb: () => void) => {
		const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
		mql.addEventListener('change', cb);
		return () => mql.removeEventListener('change', cb);
	}, [breakpoint]);

	const getSnapshot = useCallback(() => {
		return window.matchMedia(`(max-width: ${breakpoint - 1}px)`).matches;
	}, [breakpoint]);

	return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
