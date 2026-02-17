import { describe, it, expect, beforeEach } from 'vitest';
import { calculateDailyBalance } from '../utils/daily-balance';
import { makeEntry, makeItem, makeCategory, resetIdCounter } from '@/shared/store/__tests__/fixtures';

beforeEach(() => resetIdCounter());

describe('calculateDailyBalance', () => {
	it('returns hasEntries false when no food entries exist for today', () => {
		const entries = [makeEntry({ type: 'food', date: '2025-01-01' })];
		const result = calculateDailyBalance(entries, [], [], '2025-06-15');
		expect(result).toEqual({ score: 0, positive: 0, limit: 0, hasEntries: false });
	});

	it('returns hasEntries false when only activity entries exist for today', () => {
		const entries = [makeEntry({ type: 'activity', itemId: 'act-1', date: '2025-06-15' })];
		const result = calculateDailyBalance(entries, [], [], '2025-06-15');
		expect(result).toEqual({ score: 0, positive: 0, limit: 0, hasEntries: false });
	});

	it('calculates 100% when all categories are positive', () => {
		const cats = [makeCategory({ id: 'c1', sentiment: 'positive' }), makeCategory({ id: 'c2', sentiment: 'positive' })];
		const item = makeItem({ id: 'f1', categories: ['c1', 'c2'] });
		const entries = [makeEntry({ type: 'food', itemId: 'f1', date: '2025-06-15', categoryOverrides: null })];
		const result = calculateDailyBalance(entries, [item], cats, '2025-06-15');
		expect(result).toEqual({ score: 100, positive: 2, limit: 0, hasEntries: true });
	});

	it('calculates 0% when all categories are limit', () => {
		const cats = [makeCategory({ id: 'c1', sentiment: 'limit' })];
		const item = makeItem({ id: 'f1', categories: ['c1'] });
		const entries = [makeEntry({ type: 'food', itemId: 'f1', date: '2025-06-15', categoryOverrides: null })];
		const result = calculateDailyBalance(entries, [item], cats, '2025-06-15');
		expect(result).toEqual({ score: 0, positive: 0, limit: 1, hasEntries: true });
	});

	it('calculates correct ratio with mixed sentiments', () => {
		const cats = [
			makeCategory({ id: 'c1', sentiment: 'positive' }),
			makeCategory({ id: 'c2', sentiment: 'limit' }),
			makeCategory({ id: 'c3', sentiment: 'positive' }),
		];
		const item1 = makeItem({ id: 'f1', categories: ['c1'] });
		const item2 = makeItem({ id: 'f2', categories: ['c2'] });
		const item3 = makeItem({ id: 'f3', categories: ['c3'] });
		const entries = [
			makeEntry({ type: 'food', itemId: 'f1', date: '2025-06-15', categoryOverrides: null }),
			makeEntry({ type: 'food', itemId: 'f2', date: '2025-06-15', categoryOverrides: null }),
			makeEntry({ type: 'food', itemId: 'f3', date: '2025-06-15', categoryOverrides: null }),
		];
		const result = calculateDailyBalance(entries, [item1, item2, item3], cats, '2025-06-15');
		// 2 positive / (2 positive + 1 limit) = 66.67%
		expect(result.hasEntries).toBe(true);
		expect(result.positive).toBe(2);
		expect(result.limit).toBe(1);
		expect(result.score).toBeCloseTo(66.67, 1);
	});

	it('returns score 0 when all categories are neutral', () => {
		const cats = [makeCategory({ id: 'c1', sentiment: 'neutral' })];
		const item = makeItem({ id: 'f1', categories: ['c1'] });
		const entries = [makeEntry({ type: 'food', itemId: 'f1', date: '2025-06-15', categoryOverrides: null })];
		const result = calculateDailyBalance(entries, [item], cats, '2025-06-15');
		expect(result).toEqual({ score: 0, positive: 0, limit: 0, hasEntries: true });
	});

	it('only counts food entries for the specified date', () => {
		const cats = [makeCategory({ id: 'c1', sentiment: 'positive' }), makeCategory({ id: 'c2', sentiment: 'limit' })];
		const item1 = makeItem({ id: 'f1', categories: ['c1'] });
		const item2 = makeItem({ id: 'f2', categories: ['c2'] });
		const entries = [
			makeEntry({ type: 'food', itemId: 'f1', date: '2025-06-15', categoryOverrides: null }),
			makeEntry({ type: 'food', itemId: 'f2', date: '2025-06-14', categoryOverrides: null }), // different day
		];
		const result = calculateDailyBalance(entries, [item1, item2], cats, '2025-06-15');
		expect(result).toEqual({ score: 100, positive: 1, limit: 0, hasEntries: true });
	});
});
