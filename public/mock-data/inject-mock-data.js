const DEFAULT_SEED = 20260308;

function createRng(seed = DEFAULT_SEED) {
	let state = seed >>> 0;
	return () => {
		state = (state * 1664525 + 1013904223) >>> 0;
		return state / 4294967296;
	};
}

function sample(rng, values) {
	return values[Math.floor(rng() * values.length)];
}

function formatDate(date) {
	return date.toISOString().slice(0, 10);
}

function makeId(prefix, index) {
	return `${prefix}-${String(index + 1).padStart(2, '0')}`;
}

export function createMockTrackerData(options = {}) {
	const { days = 70, averageEntriesPerDay = 4, seed = DEFAULT_SEED } = options;
	const rng = createRng(seed);

	const activityCategories = [
		{ id: 'ac-endurance', name: 'Endurance', sentiment: 'positive' },
		{ id: 'ac-strength', name: 'Strength', sentiment: 'positive' },
		{ id: 'ac-mobility', name: 'Mobility', sentiment: 'neutral' },
		{ id: 'ac-recovery', name: 'Recovery', sentiment: 'positive' },
	];

	const foodCategories = [
		{ id: 'fc-protein', name: 'Protein', sentiment: 'positive' },
		{ id: 'fc-veggies', name: 'Vegetables', sentiment: 'positive' },
		{ id: 'fc-hydration', name: 'Hydration', sentiment: 'positive' },
		{ id: 'fc-snack', name: 'Snacks', sentiment: 'neutral' },
		{ id: 'fc-sugar', name: 'Sugar', sentiment: 'limit' },
	];

	const activityItems = [
		{ id: 'ai-run', name: 'Run', categories: ['ac-endurance'] },
		{ id: 'ai-walk', name: 'Walk', categories: ['ac-endurance', 'ac-recovery'] },
		{ id: 'ai-lift', name: 'Strength Training', categories: ['ac-strength'] },
		{ id: 'ai-yoga', name: 'Yoga', categories: ['ac-mobility', 'ac-recovery'] },
		{ id: 'ai-bike', name: 'Cycling', categories: ['ac-endurance'] },
		{ id: 'ai-rest', name: 'Rest Day', categories: ['ac-recovery'] },
	];

	const foodItems = [
		{ id: 'fi-eggs', name: 'Eggs', categories: ['fc-protein'] },
		{ id: 'fi-salad', name: 'Salad Bowl', categories: ['fc-veggies'] },
		{ id: 'fi-chicken', name: 'Chicken + Rice', categories: ['fc-protein', 'fc-veggies'] },
		{ id: 'fi-water', name: 'Water', categories: ['fc-hydration'] },
		{ id: 'fi-chocolate', name: 'Chocolate', categories: ['fc-sugar', 'fc-snack'] },
		{ id: 'fi-smoothie', name: 'Protein Smoothie', categories: ['fc-protein', 'fc-hydration'] },
	];

	const dayOffsets = Array.from({ length: days }, (_, i) => i);
	const entries = [];
	let entryIndex = 0;

	for (const offset of dayOffsets) {
		const date = new Date();
		date.setHours(0, 0, 0, 0);
		date.setDate(date.getDate() - offset);
		const dateString = formatDate(date);

		const entriesForDay = Math.max(1, Math.floor(averageEntriesPerDay * (0.65 + rng())));
		for (let i = 0; i < entriesForDay; i += 1) {
			const type = rng() > 0.45 ? 'food' : 'activity';
			const item = type === 'food' ? sample(rng, foodItems) : sample(rng, activityItems);
			const hour = String(Math.floor(rng() * 16) + 6).padStart(2, '0');
			const minute = sample(rng, ['00', '10', '15', '20', '30', '40', '45', '50']);
			const useOverride = rng() > 0.8;
			const notes = rng() > 0.88 ? 'Mock note for UI coverage' : null;

			entries.push({
				id: makeId('entry', entryIndex),
				type,
				itemId: item.id,
				date: dateString,
				time: `${hour}:${minute}`,
				notes,
				categoryOverrides: useOverride ? [sample(rng, item.categories)] : null,
			});
			entryIndex += 1;
		}
	}

	return {
		activityItems,
		foodItems,
		activityCategories,
		foodCategories,
		entries,
		dashboardCards: [
			{ categoryId: 'fc-protein', baseline: 'rolling_4_week_avg', comparison: 'last_week' },
			{ categoryId: 'fc-sugar', baseline: 'rolling_4_week_avg', comparison: 'last_week' },
			{ categoryId: 'ac-endurance', baseline: 'rolling_4_week_avg', comparison: 'last_week' },
		],
		dashboardInitialized: true,
		favoriteItems: ['fi-eggs', 'ai-run', 'fi-water', 'ai-yoga'],
		tombstones: [],
	};
}

export function injectMockTrackerData(options = {}) {
	if (typeof localStorage === 'undefined') {
		throw new Error('localStorage is not available. Run this in a browser context.');
	}

	const {
		storageKey = 'tracker_data',
		clearSyncKeys = true,
		seed = DEFAULT_SEED,
		days = 70,
		averageEntriesPerDay = 4,
	} = options;

	const data = createMockTrackerData({ seed, days, averageEntriesPerDay });
	localStorage.setItem(storageKey, JSON.stringify(data));

	if (clearSyncKeys) {
		localStorage.removeItem('pending_deletions');
		localStorage.removeItem('pending_restorations');
	}

	return {
		data,
		summary: {
			entries: data.entries.length,
			activityItems: data.activityItems.length,
			foodItems: data.foodItems.length,
			activityCategories: data.activityCategories.length,
			foodCategories: data.foodCategories.length,
		},
	};
}
