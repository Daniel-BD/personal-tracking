export type CategorySentiment = 'positive' | 'neutral' | 'limit';

export interface Category {
	id: string;
	name: string;
	sentiment: CategorySentiment;
}

export interface Item {
	id: string;
	name: string;
	categories: string[]; // Array of category IDs
}
export type ActivityItem = Item;
export type FoodItem = Item;

export type EntryType = 'activity' | 'food';

export interface Entry {
	id: string;
	type: EntryType;
	itemId: string;
	date: string; // YYYY-MM-DD format
	time: string | null; // HH:MM format, optional
	notes: string | null;
	categoryOverrides: string[] | null; // Array of category IDs
}

export interface TrackerData {
	activityItems: ActivityItem[];
	foodItems: FoodItem[];
	activityCategories: Category[];
	foodCategories: Category[];
	entries: Entry[];
}

export interface GistFile {
	filename: string;
	content: string;
}

export interface GistResponse {
	id: string;
	files: Record<string, GistFile>;
	updated_at: string;
}

export type SyncStatus = 'idle' | 'syncing' | 'error';

export function createEmptyData(): TrackerData {
	return {
		activityItems: [],
		foodItems: [],
		activityCategories: [],
		foodCategories: [],
		entries: []
	};
}

export function generateId(): string {
	return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

export function getTodayDate(): string {
	return new Date().toISOString().split('T')[0];
}

export function getCurrentTime(): string {
	const now = new Date();
	return now.toTimeString().slice(0, 5); // HH:MM format
}

// Entry type display utilities
export function getTypeColor(type: EntryType): string {
	return type === 'activity' ? 'type-activity' : 'type-food';
}

export function getTypeLabel(type: EntryType): string {
	return type === 'activity' ? 'Activity' : 'Food';
}

export function getTypeIcon(type: EntryType): string {
	return type === 'activity' ? '🏃' : '🍽️';
}

export function getTypeColorMuted(type: EntryType): string {
	return type === 'activity' ? 'type-activity-muted' : 'type-food-muted';
}

// Collection accessor helpers
export function getItems(data: TrackerData, type: EntryType): Item[] {
	return type === 'activity' ? data.activityItems : data.foodItems;
}

export function getCategories(data: TrackerData, type: EntryType): Category[] {
	return type === 'activity' ? data.activityCategories : data.foodCategories;
}

export function getItemsKey(type: EntryType): 'activityItems' | 'foodItems' {
	return type === 'activity' ? 'activityItems' : 'foodItems';
}

export function getCategoriesKey(type: EntryType): 'activityCategories' | 'foodCategories' {
	return type === 'activity' ? 'activityCategories' : 'foodCategories';
}
