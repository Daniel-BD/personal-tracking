import type { TrackerData, Entry, Item, Category } from '@/shared/lib/types';
import { migrateData } from './migration';

// ============================================================
// Validation helpers
// ============================================================

function isValidEntry(e: unknown): e is Entry {
	if (typeof e !== 'object' || e === null) return false;
	const obj = e as Record<string, unknown>;
	if (
		typeof obj.id !== 'string' ||
		(obj.type !== 'activity' && obj.type !== 'food') ||
		typeof obj.itemId !== 'string' ||
		typeof obj.date !== 'string'
	) return false;
	if (obj.time != null && typeof obj.time !== 'string') return false;
	if (obj.notes != null && typeof obj.notes !== 'string') return false;
	if (obj.categoryOverrides != null && (!Array.isArray(obj.categoryOverrides) || !obj.categoryOverrides.every((id: unknown) => typeof id === 'string'))) return false;
	return true;
}

function isValidItem(i: unknown): i is Item {
	if (typeof i !== 'object' || i === null) return false;
	const obj = i as Record<string, unknown>;
	return (
		typeof obj.id === 'string' &&
		typeof obj.name === 'string' &&
		Array.isArray(obj.categories) &&
		obj.categories.every((catId) => typeof catId === 'string')
	);
}

const VALID_SENTIMENTS = new Set(['positive', 'neutral', 'limit']);

function isValidCategory(c: unknown): c is Category {
	if (typeof c !== 'object' || c === null) return false;
	const obj = c as Record<string, unknown>;
	if (typeof obj.id !== 'string' || typeof obj.name !== 'string') return false;
	if (obj.sentiment !== undefined && !VALID_SENTIMENTS.has(obj.sentiment as string)) return false;
	return true;
}

// ============================================================
// Export
// ============================================================

export function triggerExportDownload(data: TrackerData): void {
	const json = JSON.stringify(data, null, 2);
	const blob = new Blob([json], { type: 'application/json' });
	const url = URL.createObjectURL(blob);

	const a = document.createElement('a');
	a.href = url;
	a.download = `tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

// ============================================================
// Import — validates and returns migrated data, or null on failure
// ============================================================

export function validateAndParseImport(jsonString: string): TrackerData | null {
	try {
		const data = JSON.parse(jsonString) as TrackerData;

		if (
			!Array.isArray(data.entries) ||
			!Array.isArray(data.activityItems) ||
			!Array.isArray(data.foodItems) ||
			!Array.isArray(data.activityCategories) ||
			!Array.isArray(data.foodCategories)
		) {
			return null;
		}

		// Validate individual objects have required fields
		if (!data.entries.every(isValidEntry)) return null;
		if (!data.activityItems.every(isValidItem)) return null;
		if (!data.foodItems.every(isValidItem)) return null;
		if (!data.activityCategories.every(isValidCategory)) return null;
		if (!data.foodCategories.every(isValidCategory)) return null;

		return migrateData(data);
	} catch {
		return null;
	}
}
