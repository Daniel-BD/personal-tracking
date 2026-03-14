import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('sync-state', () => {
	beforeEach(() => {
		localStorage.clear();
		vi.resetModules();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('rehydrates persisted pending deletions and restorations on module load', async () => {
		localStorage.setItem(
			'pending_deletions',
			JSON.stringify({
				foodItems: ['food-1'],
				entries: ['entry-1'],
			}),
		);
		localStorage.setItem(
			'pending_restorations',
			JSON.stringify({
				dashboardCards: ['card-1'],
			}),
		);

		const syncState = await import('../sync-state');

		expect(syncState.pendingDeletions.foodItems.has('food-1')).toBe(true);
		expect(syncState.pendingDeletions.entries.has('entry-1')).toBe(true);
		expect(syncState.pendingRestorations.dashboardCards.has('card-1')).toBe(true);
	});

	it('persists and clears pending sync state through the extracted module', async () => {
		const syncState = await import('../sync-state');

		syncState.pendingDeletions.foodItems.add('food-1');
		syncState.pendingDeletions.favoriteItems.add('food-1');
		syncState.persistPendingDeletions();
		syncState.markDashboardCardRestored('card-1');

		expect(JSON.parse(localStorage.getItem('pending_deletions') || '{}')).toEqual({
			foodItems: ['food-1'],
			favoriteItems: ['food-1'],
		});
		expect(JSON.parse(localStorage.getItem('pending_restorations') || '{}')).toEqual({
			dashboardCards: ['card-1'],
		});

		syncState.clearPendingDeletions();

		expect(localStorage.getItem('pending_deletions')).toBeNull();
		expect(localStorage.getItem('pending_restorations')).toBeNull();
		expect(syncState.pendingDeletions.foodItems.size).toBe(0);
		expect(syncState.pendingDeletions.favoriteItems.size).toBe(0);
		expect(syncState.pendingRestorations.dashboardCards.size).toBe(0);
	});

	it('queues one more push when a second trigger happens during an active sync', async () => {
		vi.useFakeTimers();
		const { createSyncController } = await import('../sync-state');

		let resolveFirstSync: (() => void) | undefined;
		const executeSync = vi
			.fn<() => Promise<void>>()
			.mockImplementationOnce(
				() =>
					new Promise<void>((resolve) => {
						resolveFirstSync = resolve;
					}),
			)
			.mockResolvedValueOnce(undefined);

		const controller = createSyncController(executeSync, 5);

		controller.trigger();
		await vi.advanceTimersByTimeAsync(5);
		expect(executeSync).toHaveBeenCalledTimes(1);

		controller.trigger();
		await vi.advanceTimersByTimeAsync(5);
		expect(executeSync).toHaveBeenCalledTimes(1);

		resolveFirstSync?.();
		await vi.runAllTimersAsync();

		expect(executeSync).toHaveBeenCalledTimes(2);
	});
});
