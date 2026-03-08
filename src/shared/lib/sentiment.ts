import type { Category, CategorySentiment } from './types';

export const SENTIMENT_COLORS: Record<CategorySentiment, string> = {
	positive: 'var(--color-success)',
	limit: 'var(--color-danger)',
	neutral: 'var(--color-neutral)',
};

export const SENTIMENT_PILL_COLORS: Record<CategorySentiment, { bg: string; text: string }> = {
	positive: { bg: 'color-mix(in srgb, var(--color-success) 15%, var(--bg-card))', text: 'var(--color-success)' },
	limit: { bg: 'color-mix(in srgb, var(--color-danger) 15%, var(--bg-card))', text: 'var(--color-danger)' },
	neutral: { bg: 'color-mix(in srgb, var(--color-neutral) 15%, var(--bg-card))', text: 'var(--color-neutral)' },
};

/**
 * Shared sentiment accent color resolver used across the app.
 * Neutral categories do not affect balance direction.
 */
export function getSentimentAccentColor(categoryIds: string[], categories: Category[]): string {
	const sentimentById = new Map(categories.map((category) => [category.id, category.sentiment] as const));
	let positive = 0;
	let limit = 0;

	for (const categoryId of categoryIds) {
		const sentiment = sentimentById.get(categoryId);
		if (sentiment === 'positive') positive += 1;
		if (sentiment === 'limit') limit += 1;
	}

	if (limit > positive) return SENTIMENT_COLORS.limit;
	if (positive > limit) return SENTIMENT_COLORS.positive;
	return SENTIMENT_COLORS.neutral;
}
