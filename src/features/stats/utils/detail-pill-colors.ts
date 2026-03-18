import type { CategorySentiment } from '@/shared/lib/types';

export function getDetailPillColors(sentiment: CategorySentiment, accentColor?: string) {
	if (accentColor && sentiment !== 'neutral') {
		return {
			bg: `color-mix(in srgb, ${accentColor} 15%, var(--bg-card))`,
			text: accentColor,
		};
	}

	if (accentColor && sentiment === 'neutral' && accentColor !== 'var(--color-neutral)') {
		return {
			bg: `color-mix(in srgb, ${accentColor} 15%, var(--bg-card))`,
			text: accentColor,
		};
	}

	return {
		bg: 'var(--bg-inset)',
		text: 'var(--text-secondary)',
	};
}
