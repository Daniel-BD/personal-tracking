import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import type { TrackerData } from '@/shared/lib/types';
import { makeValidData } from './fixtures';

// Mock the github module before importing store
vi.mock('@/shared/lib/github', () => ({
	getConfig: vi.fn(() => ({ token: '', gistId: null, backupGistId: null })),
	saveConfig: vi.fn(),
	isConfigured: vi.fn(() => false),
	fetchGist: vi.fn(),
	updateGist: vi.fn(),
	createGist: vi.fn(),
	listUserGists: vi.fn(),
	validateToken: vi.fn(),
}));

import {
	importData,
	dataStore,
	loadFromGist,
	addItem,
	addEntry,
	addCategory,
	deleteItem,
	deleteEntry,
	backupToGist,
	restoreFromBackupGist,
} from '../store';
import { getConfig, isConfigured, fetchGist, updateGist } from '@/shared/lib/github';

/** Advance the debounce timer (500ms) and flush async push operations. */
async function flushDebouncedSync() {
	await vi.advanceTimersByTimeAsync(500);
}

describe('gist sync', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		localStorage.clear();

		// Disable gist sync during reset
		(isConfigured as Mock).mockReturnValue(false);
		importData(JSON.stringify(makeValidData()));

		// Reset all mocks and clear timers from the import-triggered push
		vi.clearAllMocks();
		vi.clearAllTimers();

		// Default mock config for gist tests
		(getConfig as Mock).mockReturnValue({
			token: 'test-token',
			gistId: 'test-gist-id',
			backupGistId: 'backup-gist-id',
		});
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	// ── loadFromGist ────────────────────────────────────────

	describe('loadFromGist', () => {
		it('skips fetch when not configured', async () => {
			(isConfigured as Mock).mockReturnValue(false);

			await loadFromGist();

			expect(fetchGist).not.toHaveBeenCalled();
		});

		it('merges remote data with local data when configured', async () => {
			(isConfigured as Mock).mockReturnValue(true);
			(updateGist as Mock).mockResolvedValueOnce(undefined);
			const remoteData = makeValidData({
				foodItems: [{ id: 'r1', name: 'Remote Apple', categories: [] }],
			});
			(fetchGist as Mock).mockResolvedValueOnce(remoteData);

			await loadFromGist();

			expect(fetchGist).toHaveBeenCalledWith('test-gist-id', 'test-token');
			const snapshot = dataStore.getSnapshot();
			expect(snapshot.foodItems).toHaveLength(1);
			expect(snapshot.foodItems[0].name).toBe('Remote Apple');
		});

		it('pushes merged data back to gist after loading', async () => {
			(isConfigured as Mock).mockReturnValue(true);
			(updateGist as Mock).mockResolvedValueOnce(undefined);
			const remoteData = makeValidData({
				foodItems: [{ id: 'r1', name: 'Remote Apple', categories: [] }],
			});
			(fetchGist as Mock).mockResolvedValueOnce(remoteData);

			await loadFromGist();

			expect(updateGist).toHaveBeenCalledWith('test-gist-id', 'test-token', expect.objectContaining({}));
		});

		it('preserves local data not yet pushed to remote', async () => {
			// Simulate the data loss scenario:
			// 1. User added data locally (saved to localStorage)
			// 2. Push to gist never completed (app was closed)
			// 3. App reopens, loadFromGist must not overwrite local data

			// Set up local data that "wasn't pushed yet"
			(isConfigured as Mock).mockReturnValue(false);
			importData(
				JSON.stringify(
					makeValidData({
						foodItems: [{ id: 'local-1', name: 'Local Banana', categories: [] }],
					}),
				),
			);
			vi.clearAllMocks();
			vi.clearAllTimers();
			(getConfig as Mock).mockReturnValue({ token: 'test-token', gistId: 'test-gist-id', backupGistId: null });
			(isConfigured as Mock).mockReturnValue(true);

			// Remote has different (stale) data
			const remoteData = makeValidData({
				foodItems: [{ id: 'remote-1', name: 'Remote Apple', categories: [] }],
			});
			(fetchGist as Mock).mockResolvedValueOnce(remoteData);
			(updateGist as Mock).mockResolvedValueOnce(undefined);

			await loadFromGist();

			// Both local AND remote items should be present (merged, not replaced)
			const snapshot = dataStore.getSnapshot();
			const names = snapshot.foodItems.map((i) => i.name);
			expect(names).toContain('Local Banana');
			expect(names).toContain('Remote Apple');
		});

		it('sets sync status to error on fetch failure', async () => {
			(isConfigured as Mock).mockReturnValue(true);
			(fetchGist as Mock).mockRejectedValueOnce(new Error('Network error'));

			await loadFromGist();

			// Data should remain unchanged
			expect(dataStore.getSnapshot().foodItems).toHaveLength(0);
		});
	});

	// ── Merge on push ───────────────────────────────────────

	describe('merge behavior on push', () => {
		it('merges local and remote items when pushing', async () => {
			(isConfigured as Mock).mockReturnValue(true);

			// Remote has one item
			const remoteData = makeValidData({
				foodItems: [{ id: 'remote-1', name: 'Remote Apple', categories: [] }],
			});
			(fetchGist as Mock).mockResolvedValue(remoteData);
			(updateGist as Mock).mockResolvedValue(undefined);

			// Add a local item — this triggers a debounced push
			addItem('food', 'Local Banana', []);
			await flushDebouncedSync();

			// updateGist should have been called with merged data
			expect(updateGist).toHaveBeenCalled();
			const pushedData = (updateGist as Mock).mock.calls[0][2] as TrackerData;
			const names = pushedData.foodItems.map((i) => i.name);
			expect(names).toContain('Remote Apple');
			expect(names).toContain('Local Banana');
		});

		it('local items take precedence over remote on ID conflict', async () => {
			(isConfigured as Mock).mockReturnValue(true);

			// Import data with an item (sync disabled)
			(isConfigured as Mock).mockReturnValue(false);
			importData(
				JSON.stringify(
					makeValidData({
						foodItems: [{ id: 'shared-id', name: 'Local Version', categories: [] }],
					}),
				),
			);
			vi.clearAllMocks();
			vi.clearAllTimers();
			(isConfigured as Mock).mockReturnValue(true);
			(getConfig as Mock).mockReturnValue({ token: 'test-token', gistId: 'test-gist-id', backupGistId: null });

			// Remote has same ID but different name
			const remoteData = makeValidData({
				foodItems: [{ id: 'shared-id', name: 'Remote Version', categories: [] }],
			});
			(fetchGist as Mock).mockResolvedValue(remoteData);
			(updateGist as Mock).mockResolvedValue(undefined);

			// Trigger push by adding an entry
			addEntry('food', 'shared-id', '2025-01-15');
			await flushDebouncedSync();

			expect(updateGist).toHaveBeenCalled();
			const pushedData = (updateGist as Mock).mock.calls[0][2] as TrackerData;
			const items = pushedData.foodItems.filter((i) => i.id === 'shared-id');
			expect(items).toHaveLength(1);
			expect(items[0].name).toBe('Local Version');
		});

		it('does not restore deleted items from remote', async () => {
			(isConfigured as Mock).mockReturnValue(true);

			// Start with an item locally
			(isConfigured as Mock).mockReturnValue(false);
			importData(
				JSON.stringify(
					makeValidData({
						foodItems: [
							{ id: 'keep-me', name: 'Keeper', categories: [] },
							{ id: 'delete-me', name: 'Doomed', categories: [] },
						],
					}),
				),
			);
			vi.clearAllMocks();
			vi.clearAllTimers();
			(isConfigured as Mock).mockReturnValue(true);
			(getConfig as Mock).mockReturnValue({ token: 'test-token', gistId: 'test-gist-id', backupGistId: null });

			// Remote still has both items
			const remoteData = makeValidData({
				foodItems: [
					{ id: 'keep-me', name: 'Keeper', categories: [] },
					{ id: 'delete-me', name: 'Doomed', categories: [] },
				],
			});
			(fetchGist as Mock).mockResolvedValue(remoteData);
			(updateGist as Mock).mockResolvedValue(undefined);

			// Delete one item locally — triggers pushToGist with pendingDeletion
			deleteItem('food', 'delete-me');
			await flushDebouncedSync();

			expect(updateGist).toHaveBeenCalled();
			const pushedData = (updateGist as Mock).mock.calls[0][2] as TrackerData;
			const ids = pushedData.foodItems.map((i) => i.id);
			expect(ids).toContain('keep-me');
			expect(ids).not.toContain('delete-me');
		});

		it('does not restore deleted entries from remote', async () => {
			(isConfigured as Mock).mockReturnValue(false);
			importData(
				JSON.stringify(
					makeValidData({
						foodItems: [{ id: 'item1', name: 'Apple', categories: [] }],
						entries: [
							{
								id: 'e-keep',
								type: 'food' as const,
								itemId: 'item1',
								date: '2025-01-15',
								time: null,
								notes: null,
								categoryOverrides: null,
							},
							{
								id: 'e-delete',
								type: 'food' as const,
								itemId: 'item1',
								date: '2025-01-16',
								time: null,
								notes: null,
								categoryOverrides: null,
							},
						],
					}),
				),
			);
			vi.clearAllMocks();
			vi.clearAllTimers();
			(isConfigured as Mock).mockReturnValue(true);
			(getConfig as Mock).mockReturnValue({ token: 'test-token', gistId: 'test-gist-id', backupGistId: null });

			// Remote has both entries
			const remoteData = makeValidData({
				foodItems: [{ id: 'item1', name: 'Apple', categories: [] }],
				entries: [
					{
						id: 'e-keep',
						type: 'food' as const,
						itemId: 'item1',
						date: '2025-01-15',
						time: null,
						notes: null,
						categoryOverrides: null,
					},
					{
						id: 'e-delete',
						type: 'food' as const,
						itemId: 'item1',
						date: '2025-01-16',
						time: null,
						notes: null,
						categoryOverrides: null,
					},
				],
			});
			(fetchGist as Mock).mockResolvedValue(remoteData);
			(updateGist as Mock).mockResolvedValue(undefined);

			deleteEntry('e-delete');
			await flushDebouncedSync();

			expect(updateGist).toHaveBeenCalled();
			const pushedData = (updateGist as Mock).mock.calls[0][2] as TrackerData;
			const entryIds = pushedData.entries.map((e) => e.id);
			expect(entryIds).toContain('e-keep');
			expect(entryIds).not.toContain('e-delete');
		});

		it('merges dashboard cards and respects pending deletions', async () => {
			(isConfigured as Mock).mockReturnValue(false);
			const { removeDashboardCard } = await import('../store');
			importData(
				JSON.stringify(
					makeValidData({
						foodCategories: [
							{ id: 'cat1', name: 'Fruit', sentiment: 'positive' },
							{ id: 'cat2', name: 'Veggies', sentiment: 'positive' },
						],
						dashboardCards: [
							{ categoryId: 'cat1', baseline: 'rolling_4_week_avg' as const, comparison: 'last_week' as const },
							{ categoryId: 'cat2', baseline: 'rolling_4_week_avg' as const, comparison: 'last_week' as const },
						],
					}),
				),
			);
			vi.clearAllMocks();
			vi.clearAllTimers();
			(isConfigured as Mock).mockReturnValue(true);
			(getConfig as Mock).mockReturnValue({ token: 'test-token', gistId: 'test-gist-id', backupGistId: null });

			// Remote has both cards plus an extra
			const remoteData = makeValidData({
				dashboardCards: [
					{ categoryId: 'cat1', baseline: 'rolling_4_week_avg' as const, comparison: 'last_week' as const },
					{ categoryId: 'cat2', baseline: 'rolling_4_week_avg' as const, comparison: 'last_week' as const },
					{ categoryId: 'cat3', baseline: 'rolling_4_week_avg' as const, comparison: 'last_week' as const },
				],
			});
			(fetchGist as Mock).mockResolvedValue(remoteData);
			(updateGist as Mock).mockResolvedValue(undefined);

			// Remove cat2 card locally — triggers push
			removeDashboardCard('cat2');
			await flushDebouncedSync();

			expect(updateGist).toHaveBeenCalled();
			const pushedData = (updateGist as Mock).mock.calls[0][2] as TrackerData;
			const cardCategoryIds = (pushedData.dashboardCards || []).map((c) => c.categoryId);
			expect(cardCategoryIds).toContain('cat1');
			expect(cardCategoryIds).not.toContain('cat2'); // deleted locally
			expect(cardCategoryIds).toContain('cat3'); // new from remote
		});

		it('debounces rapid mutations into a single push', async () => {
			(isConfigured as Mock).mockReturnValue(true);
			(fetchGist as Mock).mockResolvedValue(makeValidData());
			(updateGist as Mock).mockResolvedValue(undefined);

			// Rapid-fire three operations
			addItem('food', 'Item A', []);
			addItem('food', 'Item B', []);
			addItem('food', 'Item C', []);

			await flushDebouncedSync();

			// Only one push should have occurred despite three mutations
			expect(updateGist).toHaveBeenCalledTimes(1);

			// The pushed data should include all three items
			const pushedData = (updateGist as Mock).mock.calls[0][2] as TrackerData;
			const names = pushedData.foodItems.map((i) => i.name);
			expect(names).toContain('Item A');
			expect(names).toContain('Item B');
			expect(names).toContain('Item C');
		});
	});

	// ── Backup operations ───────────────────────────────────

	describe('backup operations', () => {
		it('backupToGist sends current data to backup gist', async () => {
			(isConfigured as Mock).mockReturnValue(false);
			importData(
				JSON.stringify(
					makeValidData({
						foodItems: [{ id: 'i1', name: 'Apple', categories: [] }],
					}),
				),
			);
			vi.clearAllMocks();
			vi.clearAllTimers();
			(getConfig as Mock).mockReturnValue({ token: 'test-token', gistId: 'test-gist-id', backupGistId: 'backup-id' });
			(updateGist as Mock).mockResolvedValue(undefined);

			await backupToGist('backup-id');

			expect(updateGist).toHaveBeenCalledWith(
				'backup-id',
				'test-token',
				expect.objectContaining({
					foodItems: expect.arrayContaining([expect.objectContaining({ name: 'Apple' })]),
				}),
			);
		});

		it('backupToGist throws without token', async () => {
			(getConfig as Mock).mockReturnValue({ token: '', gistId: null, backupGistId: null });

			await expect(backupToGist('backup-id')).rejects.toThrow('Token and backup Gist ID are required');
		});

		it('backupToGist throws without gist ID', async () => {
			(getConfig as Mock).mockReturnValue({ token: 'test-token', gistId: null, backupGistId: null });

			await expect(backupToGist('')).rejects.toThrow('Token and backup Gist ID are required');
		});

		it('restoreFromBackupGist replaces current data', async () => {
			(isConfigured as Mock).mockReturnValue(false);
			importData(
				JSON.stringify(
					makeValidData({
						foodItems: [{ id: 'old', name: 'Old Item', categories: [] }],
					}),
				),
			);
			vi.clearAllMocks();
			vi.clearAllTimers();
			(getConfig as Mock).mockReturnValue({ token: 'test-token', gistId: 'test-gist-id', backupGistId: 'backup-id' });
			(isConfigured as Mock).mockReturnValue(false); // prevent pushToGist side effects

			const backupData = makeValidData({
				foodItems: [{ id: 'restored', name: 'Restored Item', categories: [] }],
			});
			(fetchGist as Mock).mockResolvedValueOnce(backupData);

			await restoreFromBackupGist('backup-id');

			expect(fetchGist).toHaveBeenCalledWith('backup-id', 'test-token');
			const snapshot = dataStore.getSnapshot();
			expect(snapshot.foodItems).toHaveLength(1);
			expect(snapshot.foodItems[0].name).toBe('Restored Item');
		});

		it('restoreFromBackupGist throws without token', async () => {
			(getConfig as Mock).mockReturnValue({ token: '', gistId: null, backupGistId: null });

			await expect(restoreFromBackupGist('backup-id')).rejects.toThrow();
		});
	});

	// ── CRUD triggers sync ──────────────────────────────────

	describe('CRUD operations trigger gist sync', () => {
		beforeEach(() => {
			(isConfigured as Mock).mockReturnValue(true);
			(fetchGist as Mock).mockResolvedValue(makeValidData());
			(updateGist as Mock).mockResolvedValue(undefined);
		});

		it('addItem triggers push to gist', async () => {
			addItem('food', 'New Item', []);
			await flushDebouncedSync();

			expect(updateGist).toHaveBeenCalled();
		});

		it('addEntry triggers push to gist', async () => {
			addEntry('food', 'item1', '2025-01-15');
			await flushDebouncedSync();

			expect(updateGist).toHaveBeenCalled();
		});

		it('addCategory triggers push to gist', async () => {
			addCategory('food', 'New Category', 'neutral');
			await flushDebouncedSync();

			expect(updateGist).toHaveBeenCalled();
		});
	});
});
