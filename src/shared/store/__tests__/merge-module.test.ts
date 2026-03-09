import { describe, expect, it } from 'vitest';
import { filterPendingDeletions, mergeTrackerData } from '../merge';
import { makeItem, makeTombstone, makeValidData } from './fixtures';

function createPendingSyncSnapshot() {
	return {
		pendingDeletions: {
			entries: new Set<string>(),
			activityItems: new Set<string>(),
			foodItems: new Set<string>(),
			activityCategories: new Set<string>(),
			foodCategories: new Set<string>(),
			dashboardCards: new Set<string>(),
			favoriteItems: new Set<string>(),
		},
		pendingRestorations: {
			dashboardCards: new Set<string>(),
		},
	};
}

describe('merge module', () => {
	it('filters pending deletions using an explicit pending-sync snapshot', () => {
		const pendingSync = createPendingSyncSnapshot();
		pendingSync.pendingDeletions.foodItems.add('gone');
		pendingSync.pendingDeletions.favoriteItems.add('gone');

		const filtered = filterPendingDeletions(
			makeValidData({
				foodItems: [makeItem({ id: 'keep' }), makeItem({ id: 'gone' })],
				favoriteItems: ['keep', 'gone'],
			}),
			pendingSync,
		);

		expect(filtered.foodItems.map((item) => item.id)).toEqual(['keep']);
		expect(filtered.favoriteItems).toEqual(['keep']);
	});

	it('keeps a locally restored dashboard card when the pending-sync snapshot says it was restored', () => {
		const pendingSync = createPendingSyncSnapshot();
		pendingSync.pendingRestorations.dashboardCards.add('card-x');

		const merged = mergeTrackerData(
			makeValidData({
				dashboardCards: [{ categoryId: 'card-x', baseline: 'rolling_4_week_avg', comparison: 'last_week' }],
			}),
			makeValidData({
				tombstones: [makeTombstone({ id: 'card-x', entityType: 'dashboardCard' })],
			}),
			pendingSync,
		);

		expect(merged.dashboardCards).toHaveLength(1);
		expect(merged.dashboardCards?.[0].categoryId).toBe('card-x');
		expect(
			merged.tombstones?.some((tombstone) => tombstone.entityType === 'dashboardCard' && tombstone.id === 'card-x'),
		).toBe(false);
	});
});
