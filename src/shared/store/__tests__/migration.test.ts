import { describe, it, expect } from 'vitest';
import { migrateData, initializeDefaultDashboardCards } from '@/shared/store/migration';
import type { Category } from '@/shared/lib/types';
import { makeCategory, makeValidData } from './fixtures';

describe('migrateData', () => {
	it('returns same reference when all categories already have sentiment', () => {
		const data = makeValidData({
			activityCategories: [makeCategory({ sentiment: 'positive' })],
			foodCategories: [makeCategory({ sentiment: 'limit' })],
		});

		const result = migrateData(data);

		expect(result).toBe(data);
	});

	it('adds neutral sentiment to categories missing it', () => {
		const legacyCategory = { id: 'cat-1', name: 'Legacy' } as Category;
		const data = makeValidData({
			foodCategories: [legacyCategory],
		});

		const result = migrateData(data);

		expect(result).not.toBe(data);
		expect(result.foodCategories[0].sentiment).toBe('neutral');
	});

	it('migrates both activityCategories and foodCategories', () => {
		const legacyActivity = { id: 'act-1', name: 'Running' } as Category;
		const legacyFood = { id: 'food-1', name: 'Snacks' } as Category;
		const data = makeValidData({
			activityCategories: [legacyActivity],
			foodCategories: [legacyFood],
		});

		const result = migrateData(data);

		expect(result).not.toBe(data);
		expect(result.activityCategories[0].sentiment).toBe('neutral');
		expect(result.foodCategories[0].sentiment).toBe('neutral');
	});
});

describe('initializeDefaultDashboardCards', () => {
	it('returns data unchanged when dashboardInitialized is already true', () => {
		const data = makeValidData({
			dashboardInitialized: true,
			foodCategories: [makeCategory({ name: 'Fruit' })],
		});

		const result = initializeDefaultDashboardCards(data);

		expect(result).toBe(data);
	});

	it('creates cards for matching category names (case-insensitive)', () => {
		const fruit = makeCategory({ id: 'fruit-id', name: 'fruit' });
		const veggies = makeCategory({ id: 'veg-id', name: 'VEGETABLES' });
		const sugary = makeCategory({ id: 'sugary-id', name: 'sugary Drinks' });

		const data = makeValidData({
			dashboardInitialized: false,
			foodCategories: [fruit, veggies, sugary],
		});

		const result = initializeDefaultDashboardCards(data);

		expect(result.dashboardCards).toHaveLength(3);
		expect(result.dashboardCards).toEqual([
			{ categoryId: 'fruit-id', baseline: 'rolling_4_week_avg', comparison: 'last_week' },
			{ categoryId: 'veg-id', baseline: 'rolling_4_week_avg', comparison: 'last_week' },
			{ categoryId: 'sugary-id', baseline: 'rolling_4_week_avg', comparison: 'last_week' },
		]);
	});

	it('sets dashboardInitialized to true', () => {
		const data = makeValidData({
			dashboardInitialized: false,
			foodCategories: [makeCategory({ name: 'Fruit' })],
		});

		const result = initializeDefaultDashboardCards(data);

		expect(result.dashboardInitialized).toBe(true);
	});

	it('keeps existing dashboardCards when no matches found', () => {
		const existingCards = [
			{ categoryId: 'existing-1', baseline: 'rolling_4_week_avg' as const, comparison: 'last_week' as const },
		];
		const data = makeValidData({
			dashboardInitialized: false,
			dashboardCards: existingCards,
			foodCategories: [makeCategory({ name: 'Unrelated' })],
		});

		const result = initializeDefaultDashboardCards(data);

		expect(result.dashboardCards).toEqual(existingCards);
		expect(result.dashboardInitialized).toBe(true);
	});

	it('handles empty categories list', () => {
		const data = makeValidData({
			dashboardInitialized: false,
			activityCategories: [],
			foodCategories: [],
			dashboardCards: [],
		});

		const result = initializeDefaultDashboardCards(data);

		expect(result.dashboardCards).toEqual([]);
		expect(result.dashboardInitialized).toBe(true);
	});
});
