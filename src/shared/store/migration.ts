import type { TrackerData, Category, CategorySentiment, DashboardCard } from '@/shared/lib/types';

/**
 * Ensure all categories have a sentiment field (migration for data created before sentiment was added)
 */
export function migrateData(data: TrackerData): TrackerData {
	let migrated = false;
	const migrateCategories = (cats: Category[]) =>
		cats.map((c) => {
			if (c.sentiment === undefined) {
				migrated = true;
				return { ...c, sentiment: 'neutral' as CategorySentiment };
			}
			return c;
		});

	const result = {
		...data,
		activityCategories: migrateCategories(data.activityCategories),
		foodCategories: migrateCategories(data.foodCategories)
	};

	return migrated ? result : data;
}

export function initializeDefaultDashboardCards(data: TrackerData): TrackerData {
	if (data.dashboardInitialized) {
		return data;
	}

	const defaultNames = ['Fruit', 'Vegetables', 'Sugary drinks'];
	const allCategories = [...data.foodCategories, ...data.activityCategories];
	const cards: DashboardCard[] = [];

	for (const name of defaultNames) {
		const category = allCategories.find((c) => c.name.toLowerCase() === name.toLowerCase());
		if (category) {
			cards.push({
				categoryId: category.id,
				baseline: 'rolling_4_week_avg',
				comparison: 'last_week'
			});
		}
	}

	return {
		...data,
		dashboardCards: cards.length > 0 ? cards : (data.dashboardCards || []),
		dashboardInitialized: true
	};
}
