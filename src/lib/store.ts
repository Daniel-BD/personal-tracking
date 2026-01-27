import { writable, derived, get } from 'svelte/store';
import type {
	TrackerData,
	ActivityItem,
	FoodItem,
	Entry,
	SyncStatus,
	EntryType,
	Category
} from './types';
import { createEmptyData, generateId } from './types';
import { getConfig, fetchGist, updateGist, isConfigured } from './github';

const LOCAL_STORAGE_KEY = 'tracker_data';

// Type for old data format (before category migration)
interface OldTrackerData {
	activityItems: ActivityItem[];
	foodItems: FoodItem[];
	entries: Entry[];
	activityCategories?: Category[];
	foodCategories?: Category[];
}

function migrateData(data: OldTrackerData): TrackerData {
	// Check if data is already in new format
	if (data.activityCategories && data.foodCategories) {
		return data as TrackerData;
	}

	// Migrate from old format: categories are stored as names in items
	// Create category entities and update items to use IDs

	// Collect unique activity category names
	const activityCategoryNames = new Set<string>();
	data.activityItems.forEach((item) => {
		item.categories.forEach((name) => activityCategoryNames.add(name));
	});

	// Collect unique food category names
	const foodCategoryNames = new Set<string>();
	data.foodItems.forEach((item) => {
		item.categories.forEach((name) => foodCategoryNames.add(name));
	});

	// Also check categoryOverrides in entries
	data.entries.forEach((entry) => {
		if (entry.categoryOverrides) {
			const categorySet =
				entry.type === 'activity' ? activityCategoryNames : foodCategoryNames;
			entry.categoryOverrides.forEach((name) => categorySet.add(name));
		}
	});

	// Create category entities with IDs
	const activityCategoryMap = new Map<string, string>(); // name -> id
	const activityCategories: Category[] = [];
	activityCategoryNames.forEach((name) => {
		const id = generateId();
		activityCategoryMap.set(name, id);
		activityCategories.push({ id, name });
	});

	const foodCategoryMap = new Map<string, string>(); // name -> id
	const foodCategories: Category[] = [];
	foodCategoryNames.forEach((name) => {
		const id = generateId();
		foodCategoryMap.set(name, id);
		foodCategories.push({ id, name });
	});

	// Update activity items to use category IDs
	const migratedActivityItems = data.activityItems.map((item) => ({
		...item,
		categories: item.categories.map((name) => activityCategoryMap.get(name)!).filter(Boolean)
	}));

	// Update food items to use category IDs
	const migratedFoodItems = data.foodItems.map((item) => ({
		...item,
		categories: item.categories.map((name) => foodCategoryMap.get(name)!).filter(Boolean)
	}));

	// Update entries with categoryOverrides
	const migratedEntries = data.entries.map((entry) => {
		if (!entry.categoryOverrides) return entry;
		const categoryMap = entry.type === 'activity' ? activityCategoryMap : foodCategoryMap;
		return {
			...entry,
			categoryOverrides: entry.categoryOverrides.map((name) => categoryMap.get(name)!).filter(Boolean)
		};
	});

	return {
		activityItems: migratedActivityItems,
		foodItems: migratedFoodItems,
		activityCategories,
		foodCategories,
		entries: migratedEntries
	};
}

function loadFromLocalStorage(): TrackerData {
	if (typeof localStorage === 'undefined') {
		return createEmptyData();
	}
	const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
	if (stored) {
		try {
			const data = JSON.parse(stored) as OldTrackerData;
			return migrateData(data);
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

// Category stores - return Category arrays
export const activityCategories = derived(trackerData, ($data) => $data.activityCategories);
export const foodCategories = derived(trackerData, ($data) => $data.foodCategories);

// Combined categories for suggestions (returns Category arrays)
export const allCategories = derived(trackerData, ($data) => [
	...$data.activityCategories,
	...$data.foodCategories
]);

// Helper to get category by ID
export function getCategoryById(
	type: EntryType,
	categoryId: string
): Category | undefined {
	const data = get(trackerData);
	const categories = type === 'activity' ? data.activityCategories : data.foodCategories;
	return categories.find((c) => c.id === categoryId);
}

// Helper to get category name by ID
export function getCategoryName(type: EntryType, categoryId: string): string {
	const category = getCategoryById(type, categoryId);
	return category?.name ?? '';
}

// Helper to get multiple category names by IDs
export function getCategoryNames(type: EntryType, categoryIds: string[]): string[] {
	const data = get(trackerData);
	const categories = type === 'activity' ? data.activityCategories : data.foodCategories;
	const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
	return categoryIds.map((id) => categoryMap.get(id) ?? '').filter(Boolean);
}

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
		const rawData = await fetchGist(config.gistId, config.token);
		// Migrate data from Gist if needed
		const data = migrateData(rawData as OldTrackerData);
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

// Category CRUD operations

export function addCategory(type: EntryType, name: string): Category {
	const category: Category = {
		id: generateId(),
		name: name.trim()
	};

	trackerData.update((data) => {
		if (type === 'activity') {
			return {
				...data,
				activityCategories: [...data.activityCategories, category]
			};
		} else {
			return {
				...data,
				foodCategories: [...data.foodCategories, category]
			};
		}
	});

	pushToGist();
	return category;
}

export function updateCategory(type: EntryType, id: string, name: string): void {
	if (!name.trim()) return;

	trackerData.update((data) => {
		if (type === 'activity') {
			return {
				...data,
				activityCategories: data.activityCategories.map((c) =>
					c.id === id ? { ...c, name: name.trim() } : c
				)
			};
		} else {
			return {
				...data,
				foodCategories: data.foodCategories.map((c) =>
					c.id === id ? { ...c, name: name.trim() } : c
				)
			};
		}
	});

	pushToGist();
}

export function deleteCategory(type: EntryType, categoryId: string): void {
	trackerData.update((data) => {
		if (type === 'activity') {
			return {
				...data,
				activityCategories: data.activityCategories.filter((c) => c.id !== categoryId),
				activityItems: data.activityItems.map((item) => ({
					...item,
					categories: item.categories.filter((id) => id !== categoryId)
				})),
				entries: data.entries.map((entry) => {
					if (entry.type !== 'activity' || !entry.categoryOverrides) return entry;
					return {
						...entry,
						categoryOverrides: entry.categoryOverrides.filter((id) => id !== categoryId)
					};
				})
			};
		} else {
			return {
				...data,
				foodCategories: data.foodCategories.filter((c) => c.id !== categoryId),
				foodItems: data.foodItems.map((item) => ({
					...item,
					categories: item.categories.filter((id) => id !== categoryId)
				})),
				entries: data.entries.map((entry) => {
					if (entry.type !== 'food' || !entry.categoryOverrides) return entry;
					return {
						...entry,
						categoryOverrides: entry.categoryOverrides.filter((id) => id !== categoryId)
					};
				})
			};
		}
	});

	pushToGist();
}

// Item CRUD operations (categories param is now array of category IDs)

export function addActivityItem(name: string, categoryIds: string[]): ActivityItem {
	const item: ActivityItem = {
		id: generateId(),
		name,
		categories: categoryIds
	};

	trackerData.update((data) => ({
		...data,
		activityItems: [...data.activityItems, item]
	}));

	pushToGist();
	return item;
}

export function updateActivityItem(id: string, name: string, categoryIds: string[]): void {
	trackerData.update((data) => ({
		...data,
		activityItems: data.activityItems.map((item) =>
			item.id === id ? { ...item, name, categories: categoryIds } : item
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

export function addFoodItem(name: string, categoryIds: string[]): FoodItem {
	const item: FoodItem = {
		id: generateId(),
		name,
		categories: categoryIds
	};

	trackerData.update((data) => ({
		...data,
		foodItems: [...data.foodItems, item]
	}));

	pushToGist();
	return item;
}

export function updateFoodItem(id: string, name: string, categoryIds: string[]): void {
	trackerData.update((data) => ({
		...data,
		foodItems: data.foodItems.map((item) =>
			item.id === id ? { ...item, name, categories: categoryIds } : item
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

// Entry CRUD operations

export function addEntry(
	type: EntryType,
	itemId: string,
	date: string,
	time: string | null = null,
	notes: string | null = null,
	categoryOverrides: string[] | null = null
): Entry {
	const entry: Entry = {
		id: generateId(),
		type,
		itemId,
		date,
		time,
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
