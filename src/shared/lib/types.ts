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
	TombstoneEntityTypeSchema,
	TombstoneSchema,
} from './schemas';
import { formatDateLocal } from './date-utils';

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
export type TombstoneEntityType = z.infer<typeof TombstoneEntityTypeSchema>;
export type Tombstone = z.infer<typeof TombstoneSchema>;

export type SyncStatus = 'idle' | 'syncing' | 'error';

/** Get the unique identifier for a dashboard card (either categoryId or itemId). */
export function getCardId(card: DashboardCard): string {
	const id = card.categoryId ?? card.itemId;
	if (!id) throw new Error('DashboardCard must have either categoryId or itemId');
	return id;
}

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
		tombstones: [],
	};
}

export function generateId(): string {
	return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

export function getTodayDate(): string {
	return formatDateLocal(new Date());
}

export function getCurrentTime(): string {
	const now = new Date();
	const hours = String(now.getHours()).padStart(2, '0');
	const minutes = String(now.getMinutes()).padStart(2, '0');
	return `${hours}:${minutes}`;
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

/** Search both food and activity items for the given ID, returning the item and its corresponding categories. */
export function findItemWithCategories(
	data: TrackerData,
	itemId: string,
): { item: Item; categories: Category[] } | undefined {
	const foodItem = data.foodItems.find((i) => i.id === itemId);
	if (foodItem) return { item: foodItem, categories: data.foodCategories };
	const activityItem = data.activityItems.find((i) => i.id === itemId);
	if (activityItem) return { item: activityItem, categories: data.activityCategories };
	return undefined;
}
