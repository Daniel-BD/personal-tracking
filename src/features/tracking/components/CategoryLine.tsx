import type { Category } from '@/shared/lib/types';
import { CategorySentimentPills } from '@/shared/ui/EntityMetaBadges';

interface Props {
	categoryIds: string[];
	categories: Category[];
	emptyText?: string;
}

export default function CategoryLine({ categoryIds, categories, emptyText }: Props) {
	const categoryMap = new Map(categories.map((c) => [c.id, c]));
	const resolvedCategories: Category[] = [];
	for (const id of categoryIds) {
		const cat = categoryMap.get(id);
		if (!cat) continue;
		resolvedCategories.push(cat);
	}

	return <CategorySentimentPills categories={resolvedCategories} emptyText={emptyText} className="mt-0.5" />;
}
