import { describe, expect, it } from 'vitest';
import { makeCategory, makeEntry, makeItem, makeValidData } from '@/shared/store/__tests__/fixtures';
import { buildItemAccentColorLookup, buildItemLookup, rankItems } from '../utils/ranking-utils';

describe('ranking-utils', () => {
	it('builds item accent colors using dashboard-card sentiment logic', () => {
		const pos = makeCategory({ id: 'pos', sentiment: 'positive' });
		const lim = makeCategory({ id: 'lim', sentiment: 'limit' });
		const neutral = makeCategory({ id: 'neu', sentiment: 'neutral' });

		const data = makeValidData({
			foodCategories: [pos, lim, neutral],
			foodItems: [
				makeItem({ id: 'item-positive', categories: ['pos'] }),
				makeItem({ id: 'item-limit', categories: ['lim'] }),
				makeItem({ id: 'item-neutral', categories: ['pos', 'lim', 'neu'] }),
			],
		});

		const accentLookup = buildItemAccentColorLookup(data);

		expect(accentLookup.get('item-positive')).toBe('var(--color-success)');
		expect(accentLookup.get('item-limit')).toBe('var(--color-danger)');
		expect(accentLookup.get('item-neutral')).toBe('var(--color-accent)');
	});

	it('includes accent colors in ranked items when provided', () => {
		const item = makeItem({ id: 'item-1', name: 'Apple' });
		const lookup = buildItemLookup(makeValidData({ foodItems: [item] }));
		const accentLookup = new Map([['item-1', 'var(--color-success)']]);
		const entries = [makeEntry({ itemId: 'item-1' }), makeEntry({ itemId: 'item-1' })];

		const ranked = rankItems(entries, lookup, accentLookup);

		expect(ranked).toEqual([
			{
				id: 'item-1',
				name: 'Apple',
				count: 2,
				type: 'food',
				accentColor: 'var(--color-success)',
			},
		]);
	});
});
