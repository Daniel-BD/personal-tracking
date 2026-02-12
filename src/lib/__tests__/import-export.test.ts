import { describe, it, expect, beforeEach } from 'vitest';
import { importData, dataStore } from '../store';
import type { TrackerData } from '../types';

function makeValidData(overrides: Partial<TrackerData> = {}): TrackerData {
	return {
		activityItems: [],
		foodItems: [],
		activityCategories: [],
		foodCategories: [],
		entries: [],
		dashboardCards: [],
		dashboardInitialized: true,
		...overrides,
	};
}

function resetStore() {
	importData(JSON.stringify(makeValidData()));
}

describe('importData', () => {
	beforeEach(() => {
		localStorage.clear();
		resetStore();
	});

	// ── Valid data acceptance ────────────────────────────────

	it('accepts valid empty data', () => {
		const result = importData(JSON.stringify(makeValidData()));
		expect(result).toBe(true);
	});

	it('accepts valid data with items, categories, and entries', () => {
		const data = makeValidData({
			foodCategories: [{ id: 'cat1', name: 'Fruit', sentiment: 'positive' }],
			foodItems: [{ id: 'item1', name: 'Apple', categories: ['cat1'] }],
			entries: [
				{
					id: 'e1',
					type: 'food',
					itemId: 'item1',
					date: '2025-01-15',
					time: '12:30',
					notes: 'Lunch snack',
					categoryOverrides: null,
				},
			],
		});

		expect(importData(JSON.stringify(data))).toBe(true);

		const snapshot = dataStore.getSnapshot();
		expect(snapshot.foodItems).toHaveLength(1);
		expect(snapshot.foodItems[0].name).toBe('Apple');
		expect(snapshot.foodCategories).toHaveLength(1);
		expect(snapshot.entries).toHaveLength(1);
	});

	it('accepts entries with null optional fields', () => {
		const data = makeValidData({
			entries: [
				{
					id: 'e1',
					type: 'activity',
					itemId: 'item1',
					date: '2025-01-15',
					time: null,
					notes: null,
					categoryOverrides: null,
				},
			],
		});

		expect(importData(JSON.stringify(data))).toBe(true);
	});

	it('accepts entries with omitted optional fields', () => {
		const data = {
			...makeValidData(),
			entries: [
				{
					id: 'e1',
					type: 'food',
					itemId: 'item1',
					date: '2025-01-15',
				},
			],
		};

		expect(importData(JSON.stringify(data))).toBe(true);
	});

	it('accepts all three sentiment values', () => {
		const data = makeValidData({
			foodCategories: [
				{ id: 'c1', name: 'Fruit', sentiment: 'positive' },
				{ id: 'c2', name: 'Snacks', sentiment: 'neutral' },
				{ id: 'c3', name: 'Soda', sentiment: 'limit' },
			],
		});

		expect(importData(JSON.stringify(data))).toBe(true);

		const snapshot = dataStore.getSnapshot();
		expect(snapshot.foodCategories.map((c) => c.sentiment)).toEqual([
			'positive',
			'neutral',
			'limit',
		]);
	});

	it('migrates categories without sentiment to neutral', () => {
		const data = {
			...makeValidData(),
			foodCategories: [{ id: 'c1', name: 'Fruit' }],
		};

		expect(importData(JSON.stringify(data))).toBe(true);

		const snapshot = dataStore.getSnapshot();
		expect(snapshot.foodCategories[0].sentiment).toBe('neutral');
	});

	it('accepts both activity and food types in entries', () => {
		const data = makeValidData({
			entries: [
				{ id: 'e1', type: 'activity', itemId: 'i1', date: '2025-01-15', time: null, notes: null, categoryOverrides: null },
				{ id: 'e2', type: 'food', itemId: 'i2', date: '2025-01-15', time: null, notes: null, categoryOverrides: null },
			],
		});

		expect(importData(JSON.stringify(data))).toBe(true);
		expect(dataStore.getSnapshot().entries).toHaveLength(2);
	});

	// ── Data persistence ────────────────────────────────────

	it('persists imported data to localStorage', () => {
		const data = makeValidData({
			foodItems: [{ id: 'item1', name: 'Banana', categories: [] }],
		});

		importData(JSON.stringify(data));

		const stored = JSON.parse(localStorage.getItem('tracker_data')!);
		expect(stored.foodItems).toHaveLength(1);
		expect(stored.foodItems[0].name).toBe('Banana');
	});

	it('makes imported data available via dataStore snapshot', () => {
		const data = makeValidData({
			activityItems: [{ id: 'a1', name: 'Running', categories: [] }],
			activityCategories: [{ id: 'ac1', name: 'Cardio', sentiment: 'positive' }],
		});

		importData(JSON.stringify(data));

		const snapshot = dataStore.getSnapshot();
		expect(snapshot.activityItems[0].name).toBe('Running');
		expect(snapshot.activityCategories[0].name).toBe('Cardio');
	});

	// ── Rejection of invalid data ───────────────────────────

	it('rejects non-JSON strings', () => {
		expect(importData('not json')).toBe(false);
	});

	it('rejects empty string', () => {
		expect(importData('')).toBe(false);
	});

	it('rejects empty object', () => {
		expect(importData('{}')).toBe(false);
	});

	it('rejects null', () => {
		expect(importData('null')).toBe(false);
	});

	it('rejects data missing entries array', () => {
		const data = makeValidData();
		const { entries: _, ...incomplete } = data;
		expect(importData(JSON.stringify(incomplete))).toBe(false);
	});

	it('rejects data missing activityItems array', () => {
		const data = makeValidData();
		const { activityItems: _, ...incomplete } = data;
		expect(importData(JSON.stringify(incomplete))).toBe(false);
	});

	it('rejects data missing foodItems array', () => {
		const data = makeValidData();
		const { foodItems: _, ...incomplete } = data;
		expect(importData(JSON.stringify(incomplete))).toBe(false);
	});

	it('rejects data missing activityCategories array', () => {
		const data = makeValidData();
		const { activityCategories: _, ...incomplete } = data;
		expect(importData(JSON.stringify(incomplete))).toBe(false);
	});

	it('rejects data missing foodCategories array', () => {
		const data = makeValidData();
		const { foodCategories: _, ...incomplete } = data;
		expect(importData(JSON.stringify(incomplete))).toBe(false);
	});

	it('rejects entries with non-string id', () => {
		const data = makeValidData({
			entries: [
				{ id: 123 as unknown as string, type: 'food', itemId: 'i1', date: '2025-01-15', time: null, notes: null, categoryOverrides: null },
			],
		});
		expect(importData(JSON.stringify(data))).toBe(false);
	});

	it('rejects entries with invalid type', () => {
		const data = {
			...makeValidData(),
			entries: [
				{ id: 'e1', type: 'invalid', itemId: 'i1', date: '2025-01-15' },
			],
		};
		expect(importData(JSON.stringify(data))).toBe(false);
	});

	it('rejects entries with non-string date', () => {
		const data = {
			...makeValidData(),
			entries: [
				{ id: 'e1', type: 'food', itemId: 'i1', date: 12345 },
			],
		};
		expect(importData(JSON.stringify(data))).toBe(false);
	});

	it('rejects entries with non-string time', () => {
		const data = {
			...makeValidData(),
			entries: [
				{ id: 'e1', type: 'food', itemId: 'i1', date: '2025-01-15', time: 123 },
			],
		};
		expect(importData(JSON.stringify(data))).toBe(false);
	});

	it('rejects entries with non-string notes', () => {
		const data = {
			...makeValidData(),
			entries: [
				{ id: 'e1', type: 'food', itemId: 'i1', date: '2025-01-15', notes: 123 },
			],
		};
		expect(importData(JSON.stringify(data))).toBe(false);
	});

	it('rejects entries with non-array categoryOverrides', () => {
		const data = {
			...makeValidData(),
			entries: [
				{ id: 'e1', type: 'food', itemId: 'i1', date: '2025-01-15', categoryOverrides: 'cat1' },
			],
		};
		expect(importData(JSON.stringify(data))).toBe(false);
	});

	it('rejects entries with non-string categoryOverride IDs', () => {
		const data = {
			...makeValidData(),
			entries: [
				{ id: 'e1', type: 'food', itemId: 'i1', date: '2025-01-15', categoryOverrides: [123] },
			],
		};
		expect(importData(JSON.stringify(data))).toBe(false);
	});

	it('rejects items with non-string name', () => {
		const data = makeValidData({
			foodItems: [{ id: 'i1', name: 123 as unknown as string, categories: [] }],
		});
		expect(importData(JSON.stringify(data))).toBe(false);
	});

	it('rejects items with non-array categories', () => {
		const data = {
			...makeValidData(),
			foodItems: [{ id: 'i1', name: 'Apple', categories: 'not-array' }],
		};
		expect(importData(JSON.stringify(data))).toBe(false);
	});

	it('rejects items with non-string category IDs', () => {
		const data = {
			...makeValidData(),
			activityItems: [{ id: 'i1', name: 'Running', categories: [123] }],
		};
		expect(importData(JSON.stringify(data))).toBe(false);
	});

	it('rejects categories with invalid sentiment value', () => {
		const data = {
			...makeValidData(),
			foodCategories: [{ id: 'c1', name: 'Fruit', sentiment: 'bad' }],
		};
		expect(importData(JSON.stringify(data))).toBe(false);
	});

	it('rejects categories with non-string id', () => {
		const data = {
			...makeValidData(),
			foodCategories: [{ id: 42, name: 'Fruit', sentiment: 'neutral' }],
		};
		expect(importData(JSON.stringify(data))).toBe(false);
	});

	it('rejects categories with non-string name', () => {
		const data = {
			...makeValidData(),
			activityCategories: [{ id: 'c1', name: true, sentiment: 'neutral' }],
		};
		expect(importData(JSON.stringify(data))).toBe(false);
	});

	// ── Does not corrupt store on failure ───────────────────

	it('does not modify store data when import fails', () => {
		const validData = makeValidData({
			foodItems: [{ id: 'existing', name: 'Existing Item', categories: [] }],
		});
		importData(JSON.stringify(validData));

		const snapshotBefore = dataStore.getSnapshot();

		// Attempt invalid import
		importData('invalid json');

		const snapshotAfter = dataStore.getSnapshot();
		expect(snapshotAfter.foodItems).toEqual(snapshotBefore.foodItems);
	});

	// ── Round-trip ──────────────────────────────────────────

	it('round-trips data through JSON serialization', () => {
		const data = makeValidData({
			foodCategories: [
				{ id: 'cat1', name: 'Fruit', sentiment: 'positive' },
				{ id: 'cat2', name: 'Junk Food', sentiment: 'limit' },
			],
			foodItems: [
				{ id: 'item1', name: 'Apple', categories: ['cat1'] },
				{ id: 'item2', name: 'Chips', categories: ['cat2'] },
			],
			activityCategories: [{ id: 'acat1', name: 'Cardio', sentiment: 'neutral' }],
			activityItems: [{ id: 'aitem1', name: 'Running', categories: ['acat1'] }],
			entries: [
				{ id: 'e1', type: 'food', itemId: 'item1', date: '2025-01-15', time: '12:30', notes: 'Yummy', categoryOverrides: ['cat2'] },
				{ id: 'e2', type: 'activity', itemId: 'aitem1', date: '2025-01-15', time: null, notes: null, categoryOverrides: null },
			],
		});

		importData(JSON.stringify(data));

		// Serialize the snapshot back to JSON and re-import
		const snapshot = dataStore.getSnapshot();
		const serialized = JSON.stringify(snapshot);
		resetStore();
		expect(importData(serialized)).toBe(true);

		const final = dataStore.getSnapshot();
		expect(final.foodItems).toEqual(data.foodItems);
		expect(final.foodCategories).toEqual(data.foodCategories);
		expect(final.activityItems).toEqual(data.activityItems);
		expect(final.activityCategories).toEqual(data.activityCategories);
		expect(final.entries).toEqual(data.entries);
	});
});
