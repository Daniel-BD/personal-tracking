import { describe, expect, it } from 'vitest';
import { makeCategory } from '@/shared/store/__tests__/fixtures';
import { SENTIMENT_COLORS, getSentimentAccentColor } from '../sentiment';

describe('sentiment', () => {
	it('maps neutral sentiment to the shared neutral blue color token', () => {
		expect(SENTIMENT_COLORS.neutral).toBe('var(--color-neutral)');
	});

	it('resolves accent color from category sentiment balance', () => {
		const positive = makeCategory({ id: 'pos', sentiment: 'positive' });
		const limit = makeCategory({ id: 'lim', sentiment: 'limit' });
		const neutral = makeCategory({ id: 'neu', sentiment: 'neutral' });
		const categories = [positive, limit, neutral];

		expect(getSentimentAccentColor(['pos', 'neu'], categories)).toBe(SENTIMENT_COLORS.positive);
		expect(getSentimentAccentColor(['lim', 'neu'], categories)).toBe(SENTIMENT_COLORS.limit);
		expect(getSentimentAccentColor(['pos', 'lim', 'neu'], categories)).toBe(SENTIMENT_COLORS.neutral);
	});
});
