import type { TrackerData } from '@/shared/lib/types';
import { createEmptyData } from '@/shared/lib/types';
import { initializeDefaultDashboardCards, migrateData } from './migration';
import { filterPendingDeletions } from './merge';
import { getPendingSyncSnapshot } from './sync-state';

export const LOCAL_STORAGE_KEY = 'tracker_data';

export function loadTrackerData(): TrackerData {
	if (typeof localStorage === 'undefined') {
		return createEmptyData();
	}

	const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
	if (!stored) {
		return createEmptyData();
	}

	try {
		const data = JSON.parse(stored) as TrackerData;
		return filterPendingDeletions(initializeDefaultDashboardCards(migrateData(data)), getPendingSyncSnapshot());
	} catch {
		return createEmptyData();
	}
}

export function saveTrackerData(data: TrackerData): void {
	if (typeof localStorage === 'undefined') {
		return;
	}

	localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
}
