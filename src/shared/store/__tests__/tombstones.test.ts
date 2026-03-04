import { describe, it, expect, beforeEach } from 'vitest';
import { mergeTrackerData, clearPendingDeletions, filterPendingDeletions, addTombstone, addTombstones } from '../sync';
import { makeValidData, makeEntry, makeItem, makeCategory, makeTombstone, resetIdCounter } from './fixtures';

describe('tombstone sync', () => {
	beforeEach(() => {
		resetIdCounter();
		clearPendingDeletions();
	});

	describe('mergeTrackerData with tombstones', () => {
		it('prevents deleted item resurrection across devices', () => {
			// Device A deleted item X and has a tombstone for it.
			// Device B still has item X locally with no tombstone.
			const itemX = makeItem({ id: 'item-x', name: 'Deleted Item' });
			const tombstone = makeTombstone({ id: 'item-x', entityType: 'foodItem' });

			const deviceA = makeValidData({ tombstones: [tombstone] });
			const deviceB = makeValidData({ foodItems: [itemX] });

			// Device B merges with Device A's data (remote)
			const merged = mergeTrackerData(deviceB, deviceA);

			// Item X should NOT be in the result
			expect(merged.foodItems).toHaveLength(0);
			// Tombstone should be preserved
			expect(merged.tombstones).toHaveLength(1);
			expect(merged.tombstones![0].id).toBe('item-x');
		});

		it('prevents deleted entry resurrection across devices', () => {
			const entry = makeEntry({ id: 'entry-x' });
			const tombstone = makeTombstone({ id: 'entry-x', entityType: 'entry' });

			const remote = makeValidData({ tombstones: [tombstone] });
			const local = makeValidData({ entries: [entry] });

			const merged = mergeTrackerData(local, remote);

			expect(merged.entries).toHaveLength(0);
			expect(merged.tombstones).toHaveLength(1);
		});

		it('prevents deleted category resurrection across devices', () => {
			const category = makeCategory({ id: 'cat-x' });
			const tombstone = makeTombstone({ id: 'cat-x', entityType: 'foodCategory' });

			const remote = makeValidData({ tombstones: [tombstone] });
			const local = makeValidData({ foodCategories: [category] });

			const merged = mergeTrackerData(local, remote);

			expect(merged.foodCategories).toHaveLength(0);
		});

		it('prevents deleted dashboard card resurrection across devices', () => {
			const card = { categoryId: 'card-x', baseline: 'rolling_4_week_avg' as const, comparison: 'last_week' as const };
			const tombstone = makeTombstone({ id: 'card-x', entityType: 'dashboardCard' });

			const remote = makeValidData({ tombstones: [tombstone] });
			const local = makeValidData({ dashboardCards: [card] });

			const merged = mergeTrackerData(local, remote);

			expect(merged.dashboardCards).toHaveLength(0);
		});

		it('prevents deleted favorite resurrection across devices', () => {
			const item = makeItem({ id: 'fav-item' });
			const tombstone = makeTombstone({ id: 'fav-item', entityType: 'favoriteItem' });

			const remote = makeValidData({ tombstones: [tombstone] });
			const local = makeValidData({ foodItems: [item], favoriteItems: ['fav-item'] });

			const merged = mergeTrackerData(local, remote);

			expect(merged.favoriteItems).not.toContain('fav-item');
			// The item itself should still exist (only the favorite was deleted)
			expect(merged.foodItems).toHaveLength(1);
		});

		it('merges tombstones from both local and remote', () => {
			const t1 = makeTombstone({ id: 'a', entityType: 'entry' });
			const t2 = makeTombstone({ id: 'b', entityType: 'foodItem' });

			const local = makeValidData({ tombstones: [t1] });
			const remote = makeValidData({ tombstones: [t2] });

			const merged = mergeTrackerData(local, remote);

			expect(merged.tombstones).toHaveLength(2);
		});

		it('deduplicates tombstones keeping the newer deletedAt', () => {
			const olderDate = new Date().toISOString();
			const t1 = makeTombstone({ id: 'same', entityType: 'entry', deletedAt: olderDate });
			const newerDate = new Date(Date.now() + 1000).toISOString();
			const t2 = makeTombstone({ id: 'same', entityType: 'entry', deletedAt: newerDate });

			const local = makeValidData({ tombstones: [t1] });
			const remote = makeValidData({ tombstones: [t2] });

			const merged = mergeTrackerData(local, remote);

			// Should keep the newer deletedAt to maximize retention window
			expect(merged.tombstones).toHaveLength(1);
			expect(merged.tombstones![0].deletedAt).toBe(newerDate);
		});

		it('prunes tombstones older than 30 days', () => {
			const oldDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
			const recentDate = new Date().toISOString();

			const oldTombstone = makeTombstone({ id: 'old', entityType: 'entry', deletedAt: oldDate });
			const recentTombstone = makeTombstone({ id: 'recent', entityType: 'entry', deletedAt: recentDate });

			const local = makeValidData({ tombstones: [oldTombstone, recentTombstone] });
			const remote = makeValidData();

			const merged = mergeTrackerData(local, remote);

			expect(merged.tombstones).toHaveLength(1);
			expect(merged.tombstones![0].id).toBe('recent');
		});

		it('still allows non-deleted items through merge', () => {
			const item1 = makeItem({ id: 'keep-me', name: 'Kept' });
			const item2 = makeItem({ id: 'also-keep', name: 'Also Kept' });
			const tombstone = makeTombstone({ id: 'delete-me', entityType: 'foodItem' });

			const local = makeValidData({ foodItems: [item1] });
			const remote = makeValidData({ foodItems: [item2], tombstones: [tombstone] });

			const merged = mergeTrackerData(local, remote);

			expect(merged.foodItems).toHaveLength(2);
			expect(merged.foodItems.map((i) => i.id)).toContain('keep-me');
			expect(merged.foodItems.map((i) => i.id)).toContain('also-keep');
		});
	});

	describe('addTombstone', () => {
		it('appends a tombstone to data', () => {
			const data = makeValidData();
			const result = addTombstone(data, 'item-1', 'foodItem');

			expect(result.tombstones).toHaveLength(1);
			expect(result.tombstones![0].id).toBe('item-1');
			expect(result.tombstones![0].entityType).toBe('foodItem');
			expect(result.tombstones![0].deletedAt).toBeDefined();
		});

		it('deduplicates when adding a tombstone for an existing id+entityType', () => {
			const data = makeValidData({
				tombstones: [makeTombstone({ id: 'dup', entityType: 'entry', deletedAt: '2020-01-01T00:00:00.000Z' })],
			});
			const result = addTombstone(data, 'dup', 'entry');

			expect(result.tombstones).toHaveLength(1);
			// Should have the newer deletedAt
			expect(result.tombstones![0].deletedAt).not.toBe('2020-01-01T00:00:00.000Z');
		});

		it('preserves existing deletedAt when it is later than now (clock skew)', () => {
			const futureDate = new Date(Date.now() + 60_000).toISOString();
			const data = makeValidData({
				tombstones: [makeTombstone({ id: 'skew', entityType: 'entry', deletedAt: futureDate })],
			});
			const result = addTombstone(data, 'skew', 'entry');

			expect(result.tombstones).toHaveLength(1);
			expect(result.tombstones![0].deletedAt).toBe(futureDate);
		});
	});

	describe('addTombstones (batch)', () => {
		it('adds multiple tombstones in a single pass', () => {
			const data = makeValidData();
			const result = addTombstones(data, [
				{ id: 'a', entityType: 'entry' },
				{ id: 'b', entityType: 'foodItem' },
			]);

			expect(result.tombstones).toHaveLength(2);
		});

		it('deduplicates against existing tombstones', () => {
			const data = makeValidData({
				tombstones: [makeTombstone({ id: 'a', entityType: 'entry' })],
			});
			const result = addTombstones(data, [
				{ id: 'a', entityType: 'entry' },
				{ id: 'b', entityType: 'foodItem' },
			]);

			expect(result.tombstones).toHaveLength(2);
		});

		it('returns data unchanged for empty entries', () => {
			const data = makeValidData();
			const result = addTombstones(data, []);
			expect(result).toBe(data);
		});

		it('preserves existing deletedAt when it is later than now (clock skew)', () => {
			const futureDate = new Date(Date.now() + 60_000).toISOString();
			const data = makeValidData({
				tombstones: [makeTombstone({ id: 'a', entityType: 'entry', deletedAt: futureDate })],
			});
			const result = addTombstones(data, [
				{ id: 'a', entityType: 'entry' },
				{ id: 'b', entityType: 'foodItem' },
			]);

			expect(result.tombstones).toHaveLength(2);
			const tombstoneA = result.tombstones!.find((t) => t.id === 'a');
			expect(tombstoneA!.deletedAt).toBe(futureDate);
		});
	});

	describe('filterPendingDeletions with tombstones', () => {
		it('filters items based on tombstones in the data', () => {
			const entry = makeEntry({ id: 'e1' });
			const tombstone = makeTombstone({ id: 'e1', entityType: 'entry' });
			const data = makeValidData({ entries: [entry], tombstones: [tombstone] });

			const filtered = filterPendingDeletions(data);

			expect(filtered.entries).toHaveLength(0);
		});
	});
});
