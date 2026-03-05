import { describe, it, expect } from 'vitest';
import { makeEntry, makeItem } from '@/shared/store/__tests__/fixtures';
import { countAffectedEntriesForItemMerge, countAffectedForCategoryMerge } from '../utils/merge-utils';

describe('countAffectedEntriesForItemMerge', () => {
	it('counts entries matching source item and type', () => {
		const entries = [
			makeEntry({ itemId: 'source', type: 'food' }),
			makeEntry({ itemId: 'source', type: 'food' }),
			makeEntry({ itemId: 'other', type: 'food' }),
			makeEntry({ itemId: 'source', type: 'activity' }),
		];

		expect(countAffectedEntriesForItemMerge(entries, 'food', 'source')).toBe(2);
	});

	it('returns 0 when no entries match', () => {
		const entries = [makeEntry({ itemId: 'other', type: 'food' })];

		expect(countAffectedEntriesForItemMerge(entries, 'food', 'source')).toBe(0);
	});
});

describe('countAffectedForCategoryMerge', () => {
	it('counts items and entries referencing source category', () => {
		const items = [
			makeItem({ categories: ['source', 'other'] }),
			makeItem({ categories: ['source'] }),
			makeItem({ categories: ['other'] }),
		];
		const entries = [
			makeEntry({ type: 'food', categoryOverrides: ['source'] }),
			makeEntry({ type: 'food', categoryOverrides: ['other'] }),
			makeEntry({ type: 'food', categoryOverrides: null }),
		];

		const result = countAffectedForCategoryMerge(items, entries, 'food', 'source');

		expect(result.itemCount).toBe(2);
		expect(result.entryCount).toBe(1);
	});

	it('returns zeros when source is unused', () => {
		const items = [makeItem({ categories: ['other'] })];
		const entries = [makeEntry({ type: 'food', categoryOverrides: null })];

		const result = countAffectedForCategoryMerge(items, entries, 'food', 'source');

		expect(result.itemCount).toBe(0);
		expect(result.entryCount).toBe(0);
	});
});
