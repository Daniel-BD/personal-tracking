import { describe, it, expect } from 'vitest';
import {
	createEmptyData,
	generateId,
	getTodayDate,
	getCurrentTime,
	getTypeColor,
	getTypeLabel,
	getTypeIcon,
	getTypeColorMuted,
	getItems,
	getCategories,
	getItemsKey,
	getCategoriesKey,
	type TrackerData,
} from '@/shared/lib/types';

describe('createEmptyData', () => {
	it('returns a TrackerData with all empty arrays and dashboardInitialized false', () => {
		const data = createEmptyData();
		expect(data.activityItems).toEqual([]);
		expect(data.foodItems).toEqual([]);
		expect(data.activityCategories).toEqual([]);
		expect(data.foodCategories).toEqual([]);
		expect(data.entries).toEqual([]);
		expect(data.dashboardCards).toEqual([]);
		expect(data.favoriteItems).toEqual([]);
		expect(data.dashboardInitialized).toBe(false);
	});

	it('returns a new object each time', () => {
		const a = createEmptyData();
		const b = createEmptyData();
		expect(a).not.toBe(b);
		expect(a.entries).not.toBe(b.entries);
	});
});

describe('generateId', () => {
	it('returns a non-empty string', () => {
		const id = generateId();
		expect(typeof id).toBe('string');
		expect(id.length).toBeGreaterThan(0);
	});

	it('returns unique strings on repeated calls', () => {
		const ids = new Set(Array.from({ length: 100 }, () => generateId()));
		expect(ids.size).toBe(100);
	});
});

describe('getTodayDate', () => {
	it('returns a string matching YYYY-MM-DD format', () => {
		const today = getTodayDate();
		expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});
});

describe('getCurrentTime', () => {
	it('returns a string matching HH:MM format', () => {
		const time = getCurrentTime();
		expect(time).toMatch(/^\d{2}:\d{2}$/);
	});
});

describe('getTypeColor', () => {
	it('returns type-activity for activity', () => {
		expect(getTypeColor('activity')).toBe('type-activity');
	});

	it('returns type-food for food', () => {
		expect(getTypeColor('food')).toBe('type-food');
	});
});

describe('getTypeLabel', () => {
	it('returns Activity for activity', () => {
		expect(getTypeLabel('activity')).toBe('Activity');
	});

	it('returns Food for food', () => {
		expect(getTypeLabel('food')).toBe('Food');
	});
});

describe('getTypeIcon', () => {
	it('returns runner emoji for activity', () => {
		expect(getTypeIcon('activity')).toBe('\u{1F3C3}');
	});

	it('returns plate emoji for food', () => {
		expect(getTypeIcon('food')).toBe('\u{1F37D}\uFE0F');
	});
});

describe('getTypeColorMuted', () => {
	it('returns type-activity-muted for activity', () => {
		expect(getTypeColorMuted('activity')).toBe('type-activity-muted');
	});

	it('returns type-food-muted for food', () => {
		expect(getTypeColorMuted('food')).toBe('type-food-muted');
	});
});

describe('getItems', () => {
	const data: TrackerData = {
		activityItems: [{ id: 'a1', name: 'Running', categories: [] }],
		foodItems: [{ id: 'f1', name: 'Apple', categories: [] }],
		activityCategories: [],
		foodCategories: [],
		entries: [],
	};

	it('returns activityItems for activity type', () => {
		const items = getItems(data, 'activity');
		expect(items).toBe(data.activityItems);
		expect(items).toHaveLength(1);
		expect(items[0].name).toBe('Running');
	});

	it('returns foodItems for food type', () => {
		const items = getItems(data, 'food');
		expect(items).toBe(data.foodItems);
		expect(items).toHaveLength(1);
		expect(items[0].name).toBe('Apple');
	});
});

describe('getCategories', () => {
	const data: TrackerData = {
		activityItems: [],
		foodItems: [],
		activityCategories: [{ id: 'ac1', name: 'Cardio', sentiment: 'neutral' }],
		foodCategories: [{ id: 'fc1', name: 'Fruit', sentiment: 'positive' }],
		entries: [],
	};

	it('returns activityCategories for activity type', () => {
		const cats = getCategories(data, 'activity');
		expect(cats).toBe(data.activityCategories);
		expect(cats[0].name).toBe('Cardio');
	});

	it('returns foodCategories for food type', () => {
		const cats = getCategories(data, 'food');
		expect(cats).toBe(data.foodCategories);
		expect(cats[0].name).toBe('Fruit');
	});
});

describe('getItemsKey', () => {
	it('returns activityItems for activity', () => {
		expect(getItemsKey('activity')).toBe('activityItems');
	});

	it('returns foodItems for food', () => {
		expect(getItemsKey('food')).toBe('foodItems');
	});
});

describe('getCategoriesKey', () => {
	it('returns activityCategories for activity', () => {
		expect(getCategoriesKey('activity')).toBe('activityCategories');
	});

	it('returns foodCategories for food', () => {
		expect(getCategoriesKey('food')).toBe('foodCategories');
	});
});
