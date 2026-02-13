import { useSyncExternalStore } from 'react';
import { dataStore, syncStatusStore } from './store';
import type { TrackerData, SyncStatus, Entry, Item, Category, DashboardCard } from '@/shared/lib/types';

// Stable empty arrays for optional fields to maintain reference equality
const EMPTY_STRING_ARRAY: string[] = [];
const EMPTY_DASHBOARD_ARRAY: DashboardCard[] = [];

// Module-level snapshot functions — stable references, no re-creation per render.
// Since updateData() uses object spread, unchanged sub-arrays keep the same
// reference, so useSyncExternalStore's Object.is comparison correctly skips
// re-renders for unaffected slices.

function getEntriesSnapshot(): Entry[] {
	return dataStore.getSnapshot().entries;
}

function getActivityItemsSnapshot(): Item[] {
	return dataStore.getSnapshot().activityItems;
}

function getFoodItemsSnapshot(): Item[] {
	return dataStore.getSnapshot().foodItems;
}

function getActivityCategoriesSnapshot(): Category[] {
	return dataStore.getSnapshot().activityCategories;
}

function getFoodCategoriesSnapshot(): Category[] {
	return dataStore.getSnapshot().foodCategories;
}

function getDashboardCardsSnapshot(): DashboardCard[] {
	return dataStore.getSnapshot().dashboardCards ?? EMPTY_DASHBOARD_ARRAY;
}

function getFavoriteItemsSnapshot(): string[] {
	return dataStore.getSnapshot().favoriteItems ?? EMPTY_STRING_ARRAY;
}

// Full data hook — use when you need the entire TrackerData object
export function useTrackerData(): TrackerData {
	return useSyncExternalStore(dataStore.subscribe, dataStore.getSnapshot);
}

export function useSyncStatus(): SyncStatus {
	return useSyncExternalStore(syncStatusStore.subscribe, syncStatusStore.getSnapshot);
}

// Fine-grained selector hooks — use the most specific hook available
// to prevent re-renders when unrelated data changes

export function useEntries(): Entry[] {
	return useSyncExternalStore(dataStore.subscribe, getEntriesSnapshot);
}

export function useActivityItems(): Item[] {
	return useSyncExternalStore(dataStore.subscribe, getActivityItemsSnapshot);
}

export function useFoodItems(): Item[] {
	return useSyncExternalStore(dataStore.subscribe, getFoodItemsSnapshot);
}

export function useActivityCategories(): Category[] {
	return useSyncExternalStore(dataStore.subscribe, getActivityCategoriesSnapshot);
}

export function useFoodCategories(): Category[] {
	return useSyncExternalStore(dataStore.subscribe, getFoodCategoriesSnapshot);
}

export function useDashboardCards(): DashboardCard[] {
	return useSyncExternalStore(dataStore.subscribe, getDashboardCardsSnapshot);
}

export function useFavoriteItems(): string[] {
	return useSyncExternalStore(dataStore.subscribe, getFavoriteItemsSnapshot);
}
