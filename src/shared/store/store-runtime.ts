import type { SyncStatus, TrackerData } from '@/shared/lib/types';
import { initializeDefaultDashboardCards } from './migration';
import { loadTrackerData, saveTrackerData } from './local-persistence';

type Listener = () => void;

let currentData: TrackerData = loadTrackerData();
let currentSyncStatus: SyncStatus = 'idle';
const listeners = new Set<Listener>();
const syncListeners = new Set<Listener>();

function notifyListeners(): void {
	listeners.forEach((listener) => listener());
}

function notifySyncListeners(): void {
	syncListeners.forEach((listener) => listener());
}

export function getCurrentData(): TrackerData {
	return currentData;
}

export function setCurrentData(data: TrackerData): void {
	const dataWithDashboard = initializeDefaultDashboardCards(data);
	currentData = dataWithDashboard;
	saveTrackerData(dataWithDashboard);
	notifyListeners();
}

export function updateCurrentData(updater: (data: TrackerData) => TrackerData): void {
	setCurrentData(updater(currentData));
}

export function setCurrentSyncStatus(status: SyncStatus): void {
	currentSyncStatus = status;
	notifySyncListeners();
}

export const dataStore = {
	subscribe(listener: Listener) {
		listeners.add(listener);
		return () => {
			listeners.delete(listener);
		};
	},
	getSnapshot(): TrackerData {
		return currentData;
	},
};

export const syncStatusStore = {
	subscribe(listener: Listener) {
		syncListeners.add(listener);
		return () => {
			syncListeners.delete(listener);
		};
	},
	getSnapshot(): SyncStatus {
		return currentSyncStatus;
	},
};

export const storeRuntime = {
	getData: getCurrentData,
	setData: setCurrentData,
	updateData: updateCurrentData,
	setSyncStatus: setCurrentSyncStatus,
};
