import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { EntryType } from '@/shared/lib/types';
import { makeItem } from '@/shared/store/__tests__/fixtures';

vi.mock('@/shared/lib/github', () => ({
	isConfigured: () => false,
}));

vi.mock('@/shared/store/sync', () => ({
	pendingDeletions: {
		activityItems: new Set(),
		foodItems: new Set(),
		activityCategories: new Set(),
		foodCategories: new Set(),
		entries: new Set(),
		dashboardCards: new Set(),
	},
	clearPendingDeletions: vi.fn(),
	pushToGist: vi.fn(),
	loadFromGistFn: vi.fn(),
	backupToGistFn: vi.fn(),
	restoreFromBackupGistFn: vi.fn(),
}));

import { dataStore, addEntry, deleteEntry, importData } from '@/shared/store/store';
import { makeValidData } from '@/shared/store/__tests__/fixtures';

interface UnifiedItem {
	item: ReturnType<typeof makeItem>;
	type: EntryType;
}

/**
 * Replicates the quickLogItem logic from useQuickLogForm
 * to test without React hooks.
 */
function quickLogItem(unified: UnifiedItem) {
	const today = new Date();
	const date = today.toISOString().split('T')[0];
	const time = today.toTimeString().slice(0, 5);

	return addEntry(
		unified.type,
		unified.item.id,
		date,
		time,
		null,
		null
	);
}

describe('quickLogItem', () => {
	beforeEach(() => {
		importData(JSON.stringify(makeValidData({
			foodItems: [makeItem({ id: 'f1', name: 'Apple' })],
			activityItems: [makeItem({ id: 'a1', name: 'Running' })],
		})));
	});

	it('creates an entry with today date and current time', () => {
		const unified: UnifiedItem = {
			item: makeItem({ id: 'f1', name: 'Apple' }),
			type: 'food',
		};

		const entry = quickLogItem(unified);

		const today = new Date().toISOString().split('T')[0];
		expect(entry.date).toBe(today);
		expect(entry.time).toMatch(/^\d{2}:\d{2}$/);
		expect(entry.type).toBe('food');
		expect(entry.itemId).toBe('f1');
		expect(entry.notes).toBeNull();
		expect(entry.categoryOverrides).toBeNull();
	});

	it('creates an entry for activity type', () => {
		const unified: UnifiedItem = {
			item: makeItem({ id: 'a1', name: 'Running' }),
			type: 'activity',
		};

		const entry = quickLogItem(unified);

		expect(entry.type).toBe('activity');
		expect(entry.itemId).toBe('a1');
	});

	it('adds entry to the store', () => {
		const unified: UnifiedItem = {
			item: makeItem({ id: 'f1', name: 'Apple' }),
			type: 'food',
		};

		const entry = quickLogItem(unified);
		const data = dataStore.getSnapshot();

		expect(data.entries).toContainEqual(expect.objectContaining({ id: entry.id }));
	});

	it('entry can be undone by deleting it', () => {
		const unified: UnifiedItem = {
			item: makeItem({ id: 'f1', name: 'Apple' }),
			type: 'food',
		};

		const entriesBefore = dataStore.getSnapshot().entries.length;
		const entry = quickLogItem(unified);
		expect(dataStore.getSnapshot().entries).toHaveLength(entriesBefore + 1);

		deleteEntry(entry.id);
		expect(dataStore.getSnapshot().entries).toHaveLength(entriesBefore);
	});
});
