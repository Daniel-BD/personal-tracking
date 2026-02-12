import type { TrackerData } from '@/shared/lib/types';

export function makeValidData(overrides: Partial<TrackerData> = {}): TrackerData {
	return {
		activityItems: [],
		foodItems: [],
		activityCategories: [],
		foodCategories: [],
		entries: [],
		dashboardCards: [],
		dashboardInitialized: true,
		favoriteItems: [],
		...overrides,
	};
}

export function flushPromises() {
	return new Promise<void>((resolve) => setTimeout(resolve, 0));
}
