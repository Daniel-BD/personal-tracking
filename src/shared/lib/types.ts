import type { z } from 'zod';
import type {
	CategorySentimentSchema,
	CategorySchema,
	ItemSchema,
	EntryTypeSchema,
	EntrySchema,
	DashboardCardSchema,
	TrackerDataSchema,
	GistFileSchema,
	GistResponseSchema,
} from './schemas';

// ── Types derived from Zod schemas (single source of truth) ──

export type CategorySentiment = z.infer<typeof CategorySentimentSchema>;
export type Category = z.infer<typeof CategorySchema>;
export type Item = z.infer<typeof ItemSchema>;
export type ActivityItem = Item;
export type FoodItem = Item;
export type EntryType = z.infer<typeof EntryTypeSchema>;
export type Entry = z.infer<typeof EntrySchema>;
export type DashboardCard = z.infer<typeof DashboardCardSchema>;
export type TrackerData = z.infer<typeof TrackerDataSchema>;
export type GistFile = z.infer<typeof GistFileSchema>;
export type GistResponse = z.infer<typeof GistResponseSchema>;

export type SyncStatus = 'idle' | 'syncing' | 'error';

// ── Factory & utility functions ────────────────────────────

export function createEmptyData(): TrackerData {
	return {
		activityItems: [],
		foodItems: [],
		activityCategories: [],
		foodCategories: [],
		entries: [],
		dashboardCards: [],
		dashboardInitialized: false,
		favoriteItems: [],
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
