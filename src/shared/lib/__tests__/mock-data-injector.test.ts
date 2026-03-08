import { describe, expect, it, beforeEach } from 'vitest';
// @ts-expect-error Plain JS helper script in /public is intentionally imported for validation.
import { createMockTrackerData, injectMockTrackerData } from '../../../../public/mock-data/inject-mock-data.js';

describe('inject-mock-data script', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('creates deterministic mock tracker data for a given seed', () => {
		const first = createMockTrackerData({ seed: 123, days: 10, averageEntriesPerDay: 3 });
		const second = createMockTrackerData({ seed: 123, days: 10, averageEntriesPerDay: 3 });

		expect(second).toEqual(first);
		expect(first.entries.length).toBeGreaterThan(0);
		expect(first.foodItems.length).toBeGreaterThan(0);
		expect(first.activityItems.length).toBeGreaterThan(0);
	});

	it('creates entries that reference known items and valid category overrides', () => {
		const data = createMockTrackerData({ seed: 88, days: 14, averageEntriesPerDay: 4 });
		const itemMap = new Map([...data.foodItems, ...data.activityItems].map((item) => [item.id, item]));

		for (const entry of data.entries) {
			const item = itemMap.get(entry.itemId);
			expect(item).toBeDefined();
			if (entry.categoryOverrides) {
				for (const categoryId of entry.categoryOverrides) {
					expect(item?.categories).toContain(categoryId);
				}
			}
		}
	});

	it('injects generated data into localStorage and clears sync keys', () => {
		localStorage.setItem('pending_deletions', '{}');
		localStorage.setItem('pending_restorations', '{}');

		const result = injectMockTrackerData({ seed: 44, days: 7, averageEntriesPerDay: 2 });
		const stored = JSON.parse(localStorage.getItem('tracker_data') ?? '{}');

		expect(stored).toEqual(result.data);
		expect(result.summary.entries).toBe(result.data.entries.length);
		expect(localStorage.getItem('pending_deletions')).toBeNull();
		expect(localStorage.getItem('pending_restorations')).toBeNull();
	});
});
