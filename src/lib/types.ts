export interface ActivityItem {
	id: string;
	name: string;
	categories: string[];
}

export interface FoodItem {
	id: string;
	name: string;
	categories: string[];
}

export type EntryType = 'activity' | 'food';

export interface Entry {
	id: string;
	type: EntryType;
	itemId: string;
	date: string; // YYYY-MM-DD format
	time: string | null; // HH:MM format, optional
	notes: string | null;
	categoryOverrides: string[] | null;
}

export interface TrackerData {
	activityItems: ActivityItem[];
	foodItems: FoodItem[];
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
