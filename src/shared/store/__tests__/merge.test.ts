import { describe, it, expect, beforeEach, vi } from 'vitest';

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
		favoriteItems: new Set(),
	},
	persistPendingDeletions: vi.fn(),
	clearPendingDeletions: vi.fn(),
	pushToGist: vi.fn(),
	loadFromGistFn: vi.fn(),
	backupToGistFn: vi.fn(),
	restoreFromBackupGistFn: vi.fn(),
	addTombstone: vi.fn((data: unknown) => data),
	addTombstones: vi.fn((data: unknown) => data),
	removeTombstone: vi.fn((data: unknown) => data),
	markDashboardCardRestored: vi.fn(),
	clearDashboardCardRestored: vi.fn(),
	filterPendingDeletions: vi.fn((data: unknown) => data),
}));

import {
	dataStore,
	importData,
	addItem,
	addCategory,
	addEntry,
	addDashboardCard,
	toggleFavorite,
	isFavorite,
	mergeItem,
	mergeCategory,
} from '@/shared/store/store';
import { createEmptyData } from '@/shared/lib/types';

function resetStore() {
	importData(JSON.stringify(createEmptyData()));
}

function getData() {
	return dataStore.getSnapshot();
}

describe('mergeItem', () => {
	beforeEach(() => {
		localStorage.clear();
		resetStore();
	});

	it('reassigns all entries from source to target', () => {
		const source = addItem('food', 'Source', []);
		const target = addItem('food', 'Target', []);
		addEntry('food', source.id, '2025-01-01');
		addEntry('food', source.id, '2025-01-02');
		addEntry('food', target.id, '2025-01-03');

		const count = mergeItem('food', source.id, target.id);

		expect(count).toBe(2);
		const data = getData();
		// All entries now point to target
		expect(data.entries.every((e) => e.itemId === target.id)).toBe(true);
		// Source item is removed
		expect(data.foodItems.find((i) => i.id === source.id)).toBeUndefined();
		// Target item still exists
		expect(data.foodItems.find((i) => i.id === target.id)).toBeDefined();
	});

	it('appends note to entries with no existing note', () => {
		const source = addItem('food', 'Source', []);
		addItem('food', 'Target', []);
		addEntry('food', source.id, '2025-01-01');

		mergeItem('food', source.id, getData().foodItems[1].id, 'Was Source');

		const entry = getData().entries[0];
		expect(entry.notes).toBe('Was Source');
	});

	it('appends note to entries with existing note', () => {
		const source = addItem('food', 'Source', []);
		addItem('food', 'Target', []);
		addEntry('food', source.id, '2025-01-01', null, 'Existing note');

		mergeItem('food', source.id, getData().foodItems[1].id, 'Was Source');

		const entry = getData().entries[0];
		expect(entry.notes).toBe('Existing note\nWas Source');
	});

	it('does not modify notes when noteToAppend is empty', () => {
		const source = addItem('food', 'Source', []);
		addItem('food', 'Target', []);
		addEntry('food', source.id, '2025-01-01', null, 'Keep this');

		mergeItem('food', source.id, getData().foodItems[1].id, '  ');

		const entry = getData().entries[0];
		expect(entry.notes).toBe('Keep this');
	});

	it('transfers favorites from source to target', () => {
		const source = addItem('food', 'Source', []);
		const target = addItem('food', 'Target', []);
		toggleFavorite(source.id);

		expect(isFavorite(source.id)).toBe(true);
		expect(isFavorite(target.id)).toBe(false);

		mergeItem('food', source.id, target.id);

		expect(isFavorite(source.id)).toBe(false);
		expect(isFavorite(target.id)).toBe(true);
	});

	it('does not duplicate favorite if target is already favorited', () => {
		const source = addItem('food', 'Source', []);
		const target = addItem('food', 'Target', []);
		toggleFavorite(source.id);
		toggleFavorite(target.id);

		mergeItem('food', source.id, target.id);

		const data = getData();
		const targetFavCount = data.favoriteItems!.filter((id) => id === target.id).length;
		expect(targetFavCount).toBe(1);
	});

	it('returns 0 when source has no entries', () => {
		const source = addItem('food', 'Source', []);
		const target = addItem('food', 'Target', []);

		const count = mergeItem('food', source.id, target.id);

		expect(count).toBe(0);
		expect(getData().foodItems).toHaveLength(1);
	});

	it('only affects entries of the correct type', () => {
		const foodSource = addItem('food', 'Food Source', []);
		const foodTarget = addItem('food', 'Food Target', []);
		const activityItem = addItem('activity', 'Activity Item', []);
		addEntry('food', foodSource.id, '2025-01-01');
		addEntry('activity', activityItem.id, '2025-01-01');

		mergeItem('food', foodSource.id, foodTarget.id);

		const data = getData();
		const activityEntry = data.entries.find((e) => e.type === 'activity');
		expect(activityEntry?.itemId).toBe(activityItem.id);
	});
});

describe('mergeCategory', () => {
	beforeEach(() => {
		localStorage.clear();
		resetStore();
	});

	it('replaces source category with target in items', () => {
		const source = addCategory('food', 'Source Cat');
		const target = addCategory('food', 'Target Cat');
		addItem('food', 'Item A', [source.id]);
		addItem('food', 'Item B', [source.id, target.id]);

		const result = mergeCategory('food', source.id, target.id);

		expect(result.itemCount).toBe(2);
		const data = getData();
		// Source category removed
		expect(data.foodCategories.find((c) => c.id === source.id)).toBeUndefined();
		// Item A now has target instead of source
		const itemA = data.foodItems.find((i) => i.name === 'Item A')!;
		expect(itemA.categories).toEqual([target.id]);
		// Item B had both — source removed, target kept (no duplicates)
		const itemB = data.foodItems.find((i) => i.name === 'Item B')!;
		expect(itemB.categories).toEqual([target.id]);
	});

	it('replaces source category in entry categoryOverrides', () => {
		const source = addCategory('food', 'Source Cat');
		const target = addCategory('food', 'Target Cat');
		const item = addItem('food', 'Item', [source.id]);
		addEntry('food', item.id, '2025-01-01', null, null, [source.id]);

		const result = mergeCategory('food', source.id, target.id);

		expect(result.entryCount).toBe(1);
		const entry = getData().entries[0];
		expect(entry.categoryOverrides).toEqual([target.id]);
	});

	it('avoids duplicates in entry categoryOverrides', () => {
		const source = addCategory('food', 'Source Cat');
		const target = addCategory('food', 'Target Cat');
		const item = addItem('food', 'Item', [source.id, target.id]);
		addEntry('food', item.id, '2025-01-01', null, null, [source.id, target.id]);

		mergeCategory('food', source.id, target.id);

		const entry = getData().entries[0];
		expect(entry.categoryOverrides).toEqual([target.id]);
	});

	it('transfers dashboard card from source to target when target has no card', async () => {
		const { clearDashboardCardRestored } = vi.mocked(await import('@/shared/store/sync'));
		const source = addCategory('food', 'Source Cat');
		const target = addCategory('food', 'Target Cat');
		addDashboardCard({ categoryId: source.id });

		mergeCategory('food', source.id, target.id);

		const data = getData();
		expect(data.dashboardCards!.find((c) => c.categoryId === source.id)).toBeUndefined();
		expect(data.dashboardCards!.find((c) => c.categoryId === target.id)).toBeDefined();
		expect(clearDashboardCardRestored).toHaveBeenCalledWith(source.id);
	});

	it('removes source dashboard card when target already has one', () => {
		const source = addCategory('food', 'Source Cat');
		const target = addCategory('food', 'Target Cat');
		addDashboardCard({ categoryId: source.id });
		addDashboardCard({ categoryId: target.id });

		mergeCategory('food', source.id, target.id);

		const data = getData();
		expect(data.dashboardCards!.filter((c) => c.categoryId === source.id)).toHaveLength(0);
		expect(data.dashboardCards!.filter((c) => c.categoryId === target.id)).toHaveLength(1);
	});

	it('returns zero counts when source is unused', () => {
		const source = addCategory('food', 'Source Cat');
		const target = addCategory('food', 'Target Cat');

		const result = mergeCategory('food', source.id, target.id);

		expect(result.itemCount).toBe(0);
		expect(result.entryCount).toBe(0);
		expect(getData().foodCategories).toHaveLength(1);
	});
});
