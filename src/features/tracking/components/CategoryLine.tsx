import type { Category } from '@/shared/lib/types';
import { getCategorySentimentCounts } from '../utils/category-utils';

interface Props {
	categoryIds: string[];
	categories: Category[];
	emptyText?: string;
}

export default function CategoryLine({ categoryIds, categories, emptyText }: Props) {
	if (categoryIds.length === 0) {
		return emptyText ? (
			<p className="text-xs text-subtle mt-0.5">{emptyText}</p>
		) : null;
	}

	const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
	const names = categoryIds.map((id) => categoryMap.get(id)).filter(Boolean);
	const { positive, limit } = getCategorySentimentCounts(categoryIds, categories);
	const hasIndicators = positive > 0 || limit > 0;

	return (
		<p className="text-xs text-label mt-0.5 truncate flex items-center gap-1">
			{hasIndicators && (
				<span className="flex-shrink-0" aria-label={`${positive} positive, ${limit} limit`}>
					{positive > 0 && (
						<span className="font-bold text-[var(--color-success)]">
							{'+'.repeat(positive)}
						</span>
					)}
					{limit > 0 && (
						<span className="font-bold text-[var(--color-danger)]">
							{'\u2212'.repeat(limit)}
						</span>
					)}
				</span>
			)}
			<span className="truncate">{names.join(' \u00B7 ')}</span>
		</p>
	);
}
