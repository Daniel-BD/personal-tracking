import { cn } from '@/shared/lib/cn';
import type { Category, CategorySentiment, EntryType } from '@/shared/lib/types';

const SENTIMENT_PILL_COLORS: Record<CategorySentiment, { bg: string; text: string }> = {
	positive: { bg: 'color-mix(in srgb, var(--color-success) 15%, var(--bg-card))', text: 'var(--color-success)' },
	limit: { bg: 'color-mix(in srgb, var(--color-danger) 15%, var(--bg-card))', text: 'var(--color-danger)' },
	neutral: { bg: 'var(--bg-inset)', text: 'var(--text-secondary)' },
};

interface EntityHeaderMetaProps {
	dotColor: string;
	type: EntryType;
	className?: string;
}

export function EntityHeaderMeta({ dotColor, type, className }: EntityHeaderMetaProps) {
	return (
		<div className={cn('flex items-center gap-2', className)}>
			<div className="w-2 h-2 rounded-full" style={{ backgroundColor: dotColor }} />
			<span className="text-xs text-label px-1.5 py-0.5 rounded-full bg-inset capitalize">{type}</span>
		</div>
	);
}

interface CategorySentimentPillsProps {
	categories: Category[];
	emptyText?: string;
	className?: string;
}

export function CategorySentimentPills({ categories, emptyText, className }: CategorySentimentPillsProps) {
	if (categories.length === 0 && !emptyText) return null;

	if (categories.length === 0) {
		return <p className={cn('text-xs text-subtle mt-1', className)}>{emptyText}</p>;
	}

	return (
		<div className={cn('flex flex-wrap gap-1.5 mt-1', className)}>
			{categories.map((category) => {
				const colors = SENTIMENT_PILL_COLORS[category.sentiment];
				return (
					<span
						key={category.id}
						className="text-[11px] font-medium px-2 py-0.5 rounded-full"
						style={{ backgroundColor: colors.bg, color: colors.text }}
					>
						{category.name}
					</span>
				);
			})}
		</div>
	);
}
