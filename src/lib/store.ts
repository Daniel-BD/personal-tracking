import { writable, derived, get } from 'svelte/store';
import type { TrackerData, ActivityItem, FoodItem, Entry, SyncStatus, EntryType } from './types';
import { createEmptyData, generateId } from './types';
import { getConfig, fetchGist, updateGist, isConfigured } from './github';

const LOCAL_STORAGE_KEY = 'tracker_data';

function loadFromLocalStorage(): TrackerData {
	if (typeof localStorage === 'undefined') {
		return createEmptyData();
	}
	const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
	if (stored) {
		try {
			return JSON.parse(stored) as TrackerData;
		} catch {
			return createEmptyData();
		}
	}
	return createEmptyData();
}

function saveToLocalStorage(data: TrackerData): void {
	if (typeof localStorage !== 'undefined') {
		localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
	}
}

export const trackerData = writable<TrackerData>(loadFromLocalStorage());
export const syncStatus = writable<SyncStatus>('idle');

trackerData.subscribe((data) => {
	saveToLocalStorage(data);
});

export const activityItems = derived(trackerData, ($data) => $data.activityItems);
export const foodItems = derived(trackerData, ($data) => $data.foodItems);
export const entries = derived(trackerData, ($data) => $data.entries);

export const allCategories = derived(trackerData, ($data) => {
	const categories = new Set<string>();
	$data.activityItems.forEach((item) => item.categories.forEach((c) => categories.add(c)));
	$data.foodItems.forEach((item) => item.categories.forEach((c) => categories.add(c)));
	return Array.from(categories).sort();
});

export const activityCategories = derived(trackerData, ($data) => {
	const categories = new Set<string>();
	$data.activityItems.forEach((item) => item.categories.forEach((c) => categories.add(c)));
	return Array.from(categories).sort();
});

export const foodCategories = derived(trackerData, ($data) => {
	const categories = new Set<string>();
	$data.foodItems.forEach((item) => item.categories.forEach((c) => categories.add(c)));
	return Array.from(categories).sort();
});

async function pushToGist(): Promise<void> {
	if (!isConfigured()) return;

	const config = getConfig();
	if (!config.gistId || !config.token) return;

	syncStatus.set('syncing');
	try {
		await updateGist(config.gistId, config.token, get(trackerData));
		syncStatus.set('idle');
	} catch (error) {
		console.error('Failed to sync to Gist:', error);
		syncStatus.set('error');
	}
}

export async function loadFromGist(): Promise<void> {
	if (!isConfigured()) return;

	const config = getConfig();
	if (!config.gistId || !config.token) return;

	syncStatus.set('syncing');
	try {
		const data = await fetchGist(config.gistId, config.token);
		trackerData.set(data);
		syncStatus.set('idle');
	} catch (error) {
		console.error('Failed to load from Gist:', error);
		syncStatus.set('error');
	}
}

export async function forceRefresh(): Promise<void> {
	await loadFromGist();
}

export function addActivityItem(name: string, categories: string[]): ActivityItem {
	const item: ActivityItem = {
		id: generateId(),
		name,
		categories
	};

	trackerData.update((data) => ({
		...data,
		activityItems: [...data.activityItems, item]
	}));

	pushToGist();
	return item;
}

export function updateActivityItem(id: string, name: string, categories: string[]): void {
	trackerData.update((data) => ({
		...data,
		activityItems: data.activityItems.map((item) =>
			item.id === id ? { ...item, name, categories } : item
		)
	}));

	pushToGist();
}

export function deleteActivityItem(id: string): void {
	trackerData.update((data) => ({
		...data,
		activityItems: data.activityItems.filter((item) => item.id !== id),
		entries: data.entries.filter((e) => !(e.type === 'activity' && e.itemId === id))
	}));

	pushToGist();
}

export function addFoodItem(name: string, categories: string[]): FoodItem {
	const item: FoodItem = {
		id: generateId(),
		name,
		categories
	};

	trackerData.update((data) => ({
		...data,
		foodItems: [...data.foodItems, item]
	}));

	pushToGist();
	return item;
}

export function updateFoodItem(id: string, name: string, categories: string[]): void {
	trackerData.update((data) => ({
		...data,
		foodItems: data.foodItems.map((item) =>
			item.id === id ? { ...item, name, categories } : item
		)
	}));

	pushToGist();
}

export function deleteFoodItem(id: string): void {
	trackerData.update((data) => ({
		...data,
		foodItems: data.foodItems.filter((item) => item.id !== id),
		entries: data.entries.filter((e) => !(e.type === 'food' && e.itemId === id))
	}));

	pushToGist();
}

export function addEntry(
	type: EntryType,
	itemId: string,
	date: string,
	notes: string | null = null,
	categoryOverrides: string[] | null = null
): Entry {
	const entry: Entry = {
		id: generateId(),
		type,
		itemId,
		date,
		notes,
		categoryOverrides
	};

	trackerData.update((data) => ({
		...data,
		entries: [...data.entries, entry]
	}));

	pushToGist();
	return entry;
}

export function updateEntry(
	id: string,
	updates: Partial<Omit<Entry, 'id' | 'type' | 'itemId'>>
): void {
	trackerData.update((data) => ({
		...data,
		entries: data.entries.map((entry) =>
			entry.id === id ? { ...entry, ...updates } : entry
		)
	}));

	pushToGist();
}

export function deleteEntry(id: string): void {
	trackerData.update((data) => ({
		...data,
		entries: data.entries.filter((entry) => entry.id !== id)
	}));

	pushToGist();
}

export function getItemById(type: EntryType, itemId: string): ActivityItem | FoodItem | undefined {
	const data = get(trackerData);
	if (type === 'activity') {
		return data.activityItems.find((item) => item.id === itemId);
	}
	return data.foodItems.find((item) => item.id === itemId);
}

export function initializeStore(): void {
	if (isConfigured()) {
		loadFromGist();
	}
}
