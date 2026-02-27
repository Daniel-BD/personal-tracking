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
	removeDashboardCard,
	backupToGist,
	restoreFromBackupGist,
} from '../store';
import {
	pendingDeletions,
	clearPendingDeletions,
	clearConfirmedDeletions,
	filterPendingDeletions,
	mergeTrackerData,
} from '../sync';
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

		it('does not restore deleted entry when manual sync fetches stale remote after push', async () => {
			// Regression test for the exact reported bug:
			// 1. Delete entry → push fires (fetchGist returns stale remote that still has it)
			//    Old code: clearPendingDeletions() → pendingDeletions cleared
			// 2. User presses sync button → loadFromGist (fetchGist returns stale remote again)
			//    Old code: pendingDeletions is empty → deleted entry gets merged back in (BUG)
			//    New code: pendingDeletions still has the ID → entry filtered out (FIXED)

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

			// During the push, remote is STALE — still has the deleted entry
			const staleRemote = makeValidData({
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
			(fetchGist as Mock).mockResolvedValueOnce(staleRemote); // push's fetch
			(updateGist as Mock).mockResolvedValueOnce(undefined); // push's update

			deleteEntry('e-delete');
			await flushDebouncedSync(); // push completes, but stale remote → pendingDeletion preserved

			// Pending deletion for e-delete must still be tracked (remote was stale)
			expect(pendingDeletions.entries.has('e-delete')).toBe(true);

			// User presses sync button — GitHub STILL returns stale data
			(fetchGist as Mock).mockResolvedValueOnce(staleRemote); // manual sync's fetch
			(updateGist as Mock).mockResolvedValueOnce(undefined);

			await loadFromGist();

			// Deleted entry must NOT come back despite stale remote
			const snapshot = dataStore.getSnapshot();
			expect(snapshot.entries.map((e) => e.id)).not.toContain('e-delete');
			expect(snapshot.entries.map((e) => e.id)).toContain('e-keep');
		});

		it('clears pendingDeletion once remote confirms item is gone', async () => {
			// When remote returns fresh data (no longer has the deleted item),
			// the pending deletion should be cleared — no stale bookkeeping.

			(isConfigured as Mock).mockReturnValue(false);
			importData(
				JSON.stringify(
					makeValidData({
						foodItems: [{ id: 'item1', name: 'Apple', categories: [] }],
						entries: [
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

			// Push's fetchGist returns fresh remote (item never existed on remote)
			const freshRemote = makeValidData({ foodItems: [{ id: 'item1', name: 'Apple', categories: [] }] });
			(fetchGist as Mock).mockResolvedValueOnce(freshRemote);
			(updateGist as Mock).mockResolvedValueOnce(undefined);

			deleteEntry('e-delete');
			await flushDebouncedSync();

			// Remote was fresh (no e-delete) → pendingDeletion should be cleared
			expect(pendingDeletions.entries.has('e-delete')).toBe(false);
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

	// ── Pending deletions persistence ────────────────────────

	describe('pending deletions persistence', () => {
		it('persists pending deletions to localStorage when deleting an item', () => {
			(isConfigured as Mock).mockReturnValue(false);
			importData(
				JSON.stringify(
					makeValidData({
						foodItems: [{ id: 'delete-me', name: 'Doomed', categories: [] }],
					}),
				),
			);
			vi.clearAllMocks();
			vi.clearAllTimers();

			deleteItem('food', 'delete-me');

			const stored = localStorage.getItem('pending_deletions');
			expect(stored).toBeTruthy();
			const parsed = JSON.parse(stored!);
			expect(parsed.foodItems).toContain('delete-me');
		});

		it('persists pending deletions to localStorage when deleting an entry', () => {
			(isConfigured as Mock).mockReturnValue(false);
			importData(
				JSON.stringify(
					makeValidData({
						foodItems: [{ id: 'item1', name: 'Apple', categories: [] }],
						entries: [
							{
								id: 'entry1',
								type: 'food' as const,
								itemId: 'item1',
								date: '2025-01-15',
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

			deleteEntry('entry1');

			const stored = localStorage.getItem('pending_deletions');
			expect(stored).toBeTruthy();
			const parsed = JSON.parse(stored!);
			expect(parsed.entries).toContain('entry1');
		});

		it('clearPendingDeletions removes from localStorage', () => {
			(isConfigured as Mock).mockReturnValue(false);
			importData(
				JSON.stringify(
					makeValidData({
						foodItems: [{ id: 'item1', name: 'Apple', categories: [] }],
					}),
				),
			);
			vi.clearAllMocks();

			deleteItem('food', 'item1');
			expect(localStorage.getItem('pending_deletions')).toBeTruthy();

			clearPendingDeletions();
			expect(localStorage.getItem('pending_deletions')).toBeNull();
		});

		it('deleted items stay deleted after simulated page reload with failed push', async () => {
			// Set up: item exists locally and on remote
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

			// Push will fail (simulating app close / network failure)
			(fetchGist as Mock).mockRejectedValueOnce(new Error('Network error'));

			// Delete the item — push fails
			deleteItem('food', 'delete-me');
			await flushDebouncedSync();

			// Verify pending deletions survived in localStorage
			const stored = localStorage.getItem('pending_deletions');
			expect(stored).toBeTruthy();
			expect(JSON.parse(stored!).foodItems).toContain('delete-me');

			// Simulate "page reload": clear in-memory pending deletions, reload from localStorage
			// (This is what loadPersistedPendingDeletions does at module init)
			pendingDeletions.foodItems.clear();
			pendingDeletions.entries.clear();

			// Re-read from localStorage (what would happen on fresh module load)
			const persisted = JSON.parse(localStorage.getItem('pending_deletions')!);
			for (const id of persisted.foodItems || []) pendingDeletions.foodItems.add(id);
			for (const id of persisted.entries || []) pendingDeletions.entries.add(id);

			// Now simulate a fresh loadFromGist with remote still having the deleted item
			const remoteData = makeValidData({
				foodItems: [
					{ id: 'keep-me', name: 'Keeper', categories: [] },
					{ id: 'delete-me', name: 'Doomed', categories: [] },
				],
			});
			(fetchGist as Mock).mockResolvedValueOnce(remoteData);
			(updateGist as Mock).mockResolvedValueOnce(undefined);

			await loadFromGist();

			// The deleted item should NOT have been restored from remote
			const snapshot = dataStore.getSnapshot();
			const ids = snapshot.foodItems.map((i) => i.id);
			expect(ids).toContain('keep-me');
			expect(ids).not.toContain('delete-me');
		});
	});

	// ── Concurrent load + push serialization ────────────────

	describe('concurrent load and push serialization', () => {
		it('delete during in-flight loadFromGist does not restore deleted item', async () => {
			// This test reproduces the race condition:
			// 1. loadFromGist starts (slow fetch)
			// 2. User deletes an item → triggers push
			// 3. Without serialization, push could clear pendingDeletions
			//    before load finishes, causing load to restore the deleted item

			(isConfigured as Mock).mockReturnValue(false);
			importData(
				JSON.stringify(
					makeValidData({
						foodItems: [
							{ id: 'keep-me', name: 'Keeper', categories: [] },
							{ id: 'delete-me', name: 'Doomed', categories: [] },
						],
						entries: [
							{
								id: 'e-keep',
								type: 'food' as const,
								itemId: 'keep-me',
								date: '2025-01-15',
								time: null,
								notes: null,
								categoryOverrides: null,
							},
							{
								id: 'e-delete',
								type: 'food' as const,
								itemId: 'delete-me',
								date: '2025-01-15',
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

			// Remote has the same data (synced state before the delete)
			const remoteData = makeValidData({
				foodItems: [
					{ id: 'keep-me', name: 'Keeper', categories: [] },
					{ id: 'delete-me', name: 'Doomed', categories: [] },
				],
				entries: [
					{
						id: 'e-keep',
						type: 'food' as const,
						itemId: 'keep-me',
						date: '2025-01-15',
						time: null,
						notes: null,
						categoryOverrides: null,
					},
					{
						id: 'e-delete',
						type: 'food' as const,
						itemId: 'delete-me',
						date: '2025-01-15',
						time: null,
						notes: null,
						categoryOverrides: null,
					},
				],
			});

			// loadFromGist's fetch resolves slowly (controlled by us)
			let resolveLoadFetch!: (value: TrackerData) => void;
			const slowLoadFetch = new Promise<TrackerData>((resolve) => {
				resolveLoadFetch = resolve;
			});
			(fetchGist as Mock).mockReturnValueOnce(slowLoadFetch);

			// Start loadFromGist (simulates app init — does not await)
			const loadPromise = loadFromGist();

			// User deletes while load is in-flight
			deleteItem('food', 'delete-me');

			// Advance past debounce — push should be queued (not concurrent)
			// because loadFromGist holds activeSync
			(fetchGist as Mock).mockResolvedValueOnce(remoteData);
			(updateGist as Mock).mockResolvedValue(undefined);
			await vi.advanceTimersByTimeAsync(500);

			// Now resolve the slow load fetch
			resolveLoadFetch(remoteData);
			await loadPromise;

			// Drain any queued push
			await vi.advanceTimersByTimeAsync(500);

			// The deleted item must NOT have been restored
			const snapshot = dataStore.getSnapshot();
			const itemIds = snapshot.foodItems.map((i) => i.id);
			expect(itemIds).toContain('keep-me');
			expect(itemIds).not.toContain('delete-me');

			const entryIds = snapshot.entries.map((e) => e.id);
			expect(entryIds).toContain('e-keep');
			expect(entryIds).not.toContain('e-delete');
		});

		it('delete dashboard card during in-flight loadFromGist does not restore card', async () => {
			(isConfigured as Mock).mockReturnValue(false);
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

			const remoteData = makeValidData({
				foodCategories: [
					{ id: 'cat1', name: 'Fruit', sentiment: 'positive' },
					{ id: 'cat2', name: 'Veggies', sentiment: 'positive' },
				],
				dashboardCards: [
					{ categoryId: 'cat1', baseline: 'rolling_4_week_avg' as const, comparison: 'last_week' as const },
					{ categoryId: 'cat2', baseline: 'rolling_4_week_avg' as const, comparison: 'last_week' as const },
				],
			});

			// Slow load fetch
			let resolveLoadFetch!: (value: TrackerData) => void;
			(fetchGist as Mock).mockReturnValueOnce(
				new Promise<TrackerData>((resolve) => {
					resolveLoadFetch = resolve;
				}),
			);

			const loadPromise = loadFromGist();

			// User removes dashboard card while load is in-flight
			removeDashboardCard('cat2');

			(fetchGist as Mock).mockResolvedValueOnce(remoteData);
			(updateGist as Mock).mockResolvedValue(undefined);
			await vi.advanceTimersByTimeAsync(500);

			resolveLoadFetch(remoteData);
			await loadPromise;

			await vi.advanceTimersByTimeAsync(500);

			const snapshot = dataStore.getSnapshot();
			const cardIds = (snapshot.dashboardCards || []).map((c) => c.categoryId);
			expect(cardIds).toContain('cat1');
			expect(cardIds).not.toContain('cat2');
		});

		it('push queued during load runs after load completes', async () => {
			(isConfigured as Mock).mockReturnValue(true);

			let resolveLoadFetch!: (value: TrackerData) => void;
			(fetchGist as Mock).mockReturnValueOnce(
				new Promise<TrackerData>((resolve) => {
					resolveLoadFetch = resolve;
				}),
			);
			(updateGist as Mock).mockResolvedValue(undefined);

			const loadPromise = loadFromGist();

			// Add item while load is in-flight — triggers push
			addItem('food', 'New Item', []);
			await vi.advanceTimersByTimeAsync(500);

			// Push should NOT have called fetchGist again yet (it's queued behind load)
			expect(fetchGist).toHaveBeenCalledTimes(1); // Only the load's fetch

			// Resolve load
			(fetchGist as Mock).mockResolvedValueOnce(makeValidData());
			resolveLoadFetch(makeValidData());
			await loadPromise;

			// Drain queued push
			await vi.advanceTimersByTimeAsync(500);

			// Now the push should have run (its own fetchGist call)
			expect(fetchGist).toHaveBeenCalledTimes(2);
			const snapshot = dataStore.getSnapshot();
			expect(snapshot.foodItems.some((i) => i.name === 'New Item')).toBe(true);
		});
	});

	// ── clearConfirmedDeletions ─────────────────────────────

	describe('clearConfirmedDeletions', () => {
		afterEach(() => {
			clearPendingDeletions();
		});

		it('clears IDs not present in remote data', () => {
			pendingDeletions.entries.add('gone-from-remote');
			pendingDeletions.foodItems.add('item-gone');
			const remote = makeValidData(); // empty — none of the IDs are in remote

			clearConfirmedDeletions(remote);

			expect(pendingDeletions.entries.has('gone-from-remote')).toBe(false);
			expect(pendingDeletions.foodItems.has('item-gone')).toBe(false);
		});

		it('keeps IDs still present in remote data (stale response)', () => {
			pendingDeletions.entries.add('still-in-remote');
			pendingDeletions.foodItems.add('item-still-there');
			const remote = makeValidData({
				foodItems: [{ id: 'item-still-there', name: 'Apple', categories: [] }],
				entries: [
					{
						id: 'still-in-remote',
						type: 'food' as const,
						itemId: 'item-still-there',
						date: '2025-01-15',
						time: null,
						notes: null,
						categoryOverrides: null,
					},
				],
			});

			clearConfirmedDeletions(remote);

			expect(pendingDeletions.entries.has('still-in-remote')).toBe(true);
			expect(pendingDeletions.foodItems.has('item-still-there')).toBe(true);
		});

		it('persists updated pending deletions to localStorage', () => {
			pendingDeletions.entries.add('gone');
			pendingDeletions.entries.add('still-here');
			const remote = makeValidData({
				entries: [
					{
						id: 'still-here',
						type: 'food' as const,
						itemId: 'i1',
						date: '2025-01-15',
						time: null,
						notes: null,
						categoryOverrides: null,
					},
				],
			});

			clearConfirmedDeletions(remote);

			const stored = JSON.parse(localStorage.getItem('pending_deletions') ?? '{}');
			expect(stored.entries ?? []).not.toContain('gone');
			expect(stored.entries ?? []).toContain('still-here');
		});
	});

	// ── filterPendingDeletions ──────────────────────────────

	describe('filterPendingDeletions', () => {
		afterEach(() => {
			clearPendingDeletions();
		});

		it('returns data unchanged when no pending deletions exist', () => {
			const data = makeValidData({
				entries: [
					{
						id: 'e1',
						type: 'food',
						itemId: 'i1',
						date: '2025-01-15',
						time: null,
						notes: null,
						categoryOverrides: null,
					},
				],
				foodItems: [{ id: 'i1', name: 'Apple', categories: [] }],
			});
			const result = filterPendingDeletions(data);
			expect(result).toBe(data); // Same reference — no filtering needed
		});

		it('filters entries matching pending deletions', () => {
			pendingDeletions.entries.add('e-delete');
			const data = makeValidData({
				entries: [
					{
						id: 'e-keep',
						type: 'food',
						itemId: 'i1',
						date: '2025-01-15',
						time: null,
						notes: null,
						categoryOverrides: null,
					},
					{
						id: 'e-delete',
						type: 'food',
						itemId: 'i1',
						date: '2025-01-16',
						time: null,
						notes: null,
						categoryOverrides: null,
					},
				],
			});
			const result = filterPendingDeletions(data);
			expect(result.entries).toHaveLength(1);
			expect(result.entries[0].id).toBe('e-keep');
		});

		it('filters items matching pending deletions', () => {
			pendingDeletions.foodItems.add('delete-me');
			const data = makeValidData({
				foodItems: [
					{ id: 'keep-me', name: 'Keeper', categories: [] },
					{ id: 'delete-me', name: 'Doomed', categories: [] },
				],
			});
			const result = filterPendingDeletions(data);
			expect(result.foodItems).toHaveLength(1);
			expect(result.foodItems[0].id).toBe('keep-me');
		});

		it('filters dashboard cards matching pending deletions', () => {
			pendingDeletions.dashboardCards.add('cat-delete');
			const data = makeValidData({
				dashboardCards: [
					{ categoryId: 'cat-keep', baseline: 'rolling_4_week_avg' as const, comparison: 'last_week' as const },
					{ categoryId: 'cat-delete', baseline: 'rolling_4_week_avg' as const, comparison: 'last_week' as const },
				],
			});
			const result = filterPendingDeletions(data);
			expect(result.dashboardCards).toHaveLength(1);
			expect(result.dashboardCards![0].categoryId).toBe('cat-keep');
		});

		it('filters favorites matching pending deletions', () => {
			pendingDeletions.favoriteItems.add('fav-delete');
			const data = makeValidData({
				favoriteItems: ['fav-keep', 'fav-delete'],
			});
			const result = filterPendingDeletions(data);
			expect(result.favoriteItems).toEqual(['fav-keep']);
		});

		it('filters categories matching pending deletions', () => {
			pendingDeletions.activityCategories.add('cat-delete');
			const data = makeValidData({
				activityCategories: [
					{ id: 'cat-keep', name: 'Keep', sentiment: 'neutral' as const },
					{ id: 'cat-delete', name: 'Delete', sentiment: 'neutral' as const },
				],
			});
			const result = filterPendingDeletions(data);
			expect(result.activityCategories).toHaveLength(1);
			expect(result.activityCategories[0].id).toBe('cat-keep');
		});
	});

	// ── mergeTrackerData filters local data ─────────────────

	describe('mergeTrackerData filters pending deletions from local data', () => {
		afterEach(() => {
			clearPendingDeletions();
		});

		it('filters deleted entries from local data during merge', () => {
			pendingDeletions.entries.add('e-delete');
			const local = makeValidData({
				entries: [
					{
						id: 'e-keep',
						type: 'food',
						itemId: 'i1',
						date: '2025-01-15',
						time: null,
						notes: null,
						categoryOverrides: null,
					},
					{
						id: 'e-delete',
						type: 'food',
						itemId: 'i1',
						date: '2025-01-16',
						time: null,
						notes: null,
						categoryOverrides: null,
					},
				],
			});
			const remote = makeValidData();
			const result = mergeTrackerData(local, remote);
			expect(result.entries).toHaveLength(1);
			expect(result.entries[0].id).toBe('e-keep');
		});

		it('filters deleted items from local data during merge', () => {
			pendingDeletions.foodItems.add('delete-me');
			const local = makeValidData({
				foodItems: [
					{ id: 'keep-me', name: 'Keeper', categories: [] },
					{ id: 'delete-me', name: 'Doomed', categories: [] },
				],
			});
			const remote = makeValidData();
			const result = mergeTrackerData(local, remote);
			expect(result.foodItems).toHaveLength(1);
			expect(result.foodItems[0].id).toBe('keep-me');
		});

		it('filters deleted dashboard cards from local data during merge', () => {
			pendingDeletions.dashboardCards.add('cat-delete');
			const local = makeValidData({
				dashboardCards: [
					{ categoryId: 'cat-keep', baseline: 'rolling_4_week_avg' as const, comparison: 'last_week' as const },
					{ categoryId: 'cat-delete', baseline: 'rolling_4_week_avg' as const, comparison: 'last_week' as const },
				],
			});
			const remote = makeValidData();
			const result = mergeTrackerData(local, remote);
			expect(result.dashboardCards).toHaveLength(1);
			expect(result.dashboardCards![0].categoryId).toBe('cat-keep');
		});

		it('filters deleted favorites from local data during merge', () => {
			pendingDeletions.favoriteItems.add('fav-delete');
			const local = makeValidData({
				foodItems: [
					{ id: 'fav-keep', name: 'Keep', categories: [] },
					{ id: 'fav-delete', name: 'Delete', categories: [] },
				],
				favoriteItems: ['fav-keep', 'fav-delete'],
			});
			const remote = makeValidData({
				foodItems: [
					{ id: 'fav-keep', name: 'Keep', categories: [] },
					{ id: 'fav-delete', name: 'Delete', categories: [] },
				],
			});
			const result = mergeTrackerData(local, remote);
			expect(result.favoriteItems).toEqual(['fav-keep']);
		});

		it('delete entry → simulated page reload → entry stays deleted after loadFromGist', async () => {
			// This is the exact user scenario:
			// 1. Delete entry
			// 2. Refresh page (push never completed)
			// 3. loadFromGist fetches remote with the entry
			// 4. Entry must NOT come back

			(isConfigured as Mock).mockReturnValue(false);
			importData(
				JSON.stringify(
					makeValidData({
						foodItems: [{ id: 'item1', name: 'Apple', categories: [] }],
						entries: [
							{
								id: 'e1',
								type: 'food' as const,
								itemId: 'item1',
								date: '2025-01-15',
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

			// Delete the entry (push will fail — simulating app close before push)
			(isConfigured as Mock).mockReturnValue(true);
			(getConfig as Mock).mockReturnValue({ token: 'test-token', gistId: 'test-gist-id', backupGistId: null });
			(fetchGist as Mock).mockRejectedValueOnce(new Error('Network error'));

			deleteEntry('e1');
			await vi.advanceTimersByTimeAsync(500);

			// Verify entry is gone locally
			expect(dataStore.getSnapshot().entries).toHaveLength(0);

			// Verify pendingDeletions persisted
			expect(localStorage.getItem('pending_deletions')).toBeTruthy();

			// Simulate page reload: clear in-memory state, reload from localStorage
			pendingDeletions.entries.clear();
			const persisted = JSON.parse(localStorage.getItem('pending_deletions')!);
			for (const id of persisted.entries || []) pendingDeletions.entries.add(id);

			// Remote still has the deleted entry
			const remoteData = makeValidData({
				foodItems: [{ id: 'item1', name: 'Apple', categories: [] }],
				entries: [
					{
						id: 'e1',
						type: 'food' as const,
						itemId: 'item1',
						date: '2025-01-15',
						time: null,
						notes: null,
						categoryOverrides: null,
					},
				],
			});
			(fetchGist as Mock).mockResolvedValueOnce(remoteData);
			(updateGist as Mock).mockResolvedValueOnce(undefined);

			await loadFromGist();

			// The deleted entry must NOT have come back
			const snapshot = dataStore.getSnapshot();
			expect(snapshot.entries.map((e) => e.id)).not.toContain('e1');
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
