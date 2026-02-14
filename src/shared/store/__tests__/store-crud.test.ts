import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/shared/lib/github', () => ({
	isConfigured: () => false,
}));

vi.mock('@/shared/store/sync', () => ({
	pendingDeletions: {
		activityItems: new Set(),
		foodItems: new Set(),
		activityCategories: new Set(),
		foodCategories: new Set(),
		entries: new Set(),
		dashboardCards: new Set(),
	},
	clearPendingDeletions: vi.fn(),
	pushToGist: vi.fn(),
	loadFromGistFn: vi.fn(),
	backupToGistFn: vi.fn(),
	restoreFromBackupGistFn: vi.fn(),
}));

import {
	dataStore,
	importData,
	addCategory,
	updateCategory,
	deleteCategory,
	addItem,
	updateItem,
	deleteItem,
	addEntry,
	updateEntry,
	deleteEntry,
	addDashboardCard,
	removeDashboardCard,
	getItemById,
	getCategoryById,
	getCategoryName,
	getCategoryNames,
	toggleFavorite,
	isFavorite,
} from '@/shared/store/store';
import { createEmptyData } from '@/shared/lib/types';

function resetStore() {
	importData(JSON.stringify(createEmptyData()));
}

describe('store CRUD', () => {
	beforeEach(() => {
		localStorage.clear();
		resetStore();
	});

	describe('category CRUD', () => {
		it('addCategory creates a food category', () => {
			const cat = addCategory('food', 'Fruit');
			const data = dataStore.getSnapshot();
			expect(data.foodCategories).toHaveLength(1);
			expect(data.foodCategories[0].name).toBe('Fruit');
			expect(data.foodCategories[0].id).toBe(cat.id);
			expect(data.foodCategories[0].sentiment).toBe('neutral');
		});

		it('addCategory creates with specified sentiment', () => {
			const cat = addCategory('food', 'Sugary drinks', 'limit');
			expect(cat.sentiment).toBe('limit');
			expect(dataStore.getSnapshot().foodCategories[0].sentiment).toBe('limit');
		});

		it('addCategory creates an activity category', () => {
			addCategory('activity', 'Cardio');
			const data = dataStore.getSnapshot();
			expect(data.activityCategories).toHaveLength(1);
			expect(data.activityCategories[0].name).toBe('Cardio');
		});

		it('updateCategory changes name', () => {
			const cat = addCategory('food', 'Froot');
			updateCategory('food', cat.id, 'Fruit');
			expect(dataStore.getSnapshot().foodCategories[0].name).toBe('Fruit');
		});

		it('updateCategory changes sentiment', () => {
			const cat = addCategory('food', 'Snacks', 'neutral');
			updateCategory('food', cat.id, 'Snacks', 'limit');
			expect(dataStore.getSnapshot().foodCategories[0].sentiment).toBe('limit');
		});

		it('updateCategory skips empty name', () => {
			const cat = addCategory('food', 'Fruit');
			updateCategory('food', cat.id, '   ');
			expect(dataStore.getSnapshot().foodCategories[0].name).toBe('Fruit');
		});

		it('deleteCategory removes category and cleans up items and entries', () => {
			const cat = addCategory('food', 'Fruit');
			const item = addItem('food', 'Apple', [cat.id]);
			addEntry('food', item.id, '2025-01-15', null, null, [cat.id]);

			deleteCategory('food', cat.id);
			const data = dataStore.getSnapshot();

			expect(data.foodCategories).toHaveLength(0);
			expect(data.foodItems[0].categories).toEqual([]);
			expect(data.entries[0].categoryOverrides).toEqual([]);
		});
	});

	describe('item CRUD', () => {
		it('addItem creates a food item', () => {
			const item = addItem('food', 'Apple', []);
			const data = dataStore.getSnapshot();
			expect(data.foodItems).toHaveLength(1);
			expect(data.foodItems[0].name).toBe('Apple');
			expect(data.foodItems[0].id).toBe(item.id);
		});

		it('addItem creates with category IDs', () => {
			const cat = addCategory('food', 'Fruit');
			const item = addItem('food', 'Apple', [cat.id]);
			expect(dataStore.getSnapshot().foodItems[0].categories).toEqual([cat.id]);
		});

		it('updateItem changes name and categories', () => {
			const cat1 = addCategory('food', 'Fruit');
			const cat2 = addCategory('food', 'Healthy');
			const item = addItem('food', 'Aple', [cat1.id]);

			updateItem('food', item.id, 'Apple', [cat1.id, cat2.id]);
			const updated = dataStore.getSnapshot().foodItems[0];
			expect(updated.name).toBe('Apple');
			expect(updated.categories).toEqual([cat1.id, cat2.id]);
		});

		it('deleteItem removes item, its entries, and favorite status', () => {
			const item = addItem('food', 'Apple', []);
			const entry = addEntry('food', item.id, '2025-01-15');
			toggleFavorite(item.id);

			deleteItem('food', item.id);
			const data = dataStore.getSnapshot();

			expect(data.foodItems).toHaveLength(0);
			expect(data.entries).toHaveLength(0);
			expect((data.favoriteItems || []).includes(item.id)).toBe(false);
		});
	});

	describe('entry CRUD', () => {
		it('addEntry creates an entry with all fields', () => {
			const item = addItem('food', 'Apple', []);
			const entry = addEntry('food', item.id, '2025-01-15', '12:30', 'Lunch', ['cat1']);

			expect(entry.type).toBe('food');
			expect(entry.itemId).toBe(item.id);
			expect(entry.date).toBe('2025-01-15');
			expect(entry.time).toBe('12:30');
			expect(entry.notes).toBe('Lunch');
			expect(entry.categoryOverrides).toEqual(['cat1']);

			const data = dataStore.getSnapshot();
			expect(data.entries).toHaveLength(1);
		});

		it('addEntry defaults optional fields to null', () => {
			const item = addItem('food', 'Apple', []);
			const entry = addEntry('food', item.id, '2025-01-15');

			expect(entry.time).toBeNull();
			expect(entry.notes).toBeNull();
			expect(entry.categoryOverrides).toBeNull();
		});

		it('updateEntry modifies specific fields', () => {
			const item = addItem('food', 'Apple', []);
			const entry = addEntry('food', item.id, '2025-01-15', '12:00');

			updateEntry(entry.id, { date: '2025-01-16', notes: 'Updated' });
			const updated = dataStore.getSnapshot().entries[0];

			expect(updated.date).toBe('2025-01-16');
			expect(updated.notes).toBe('Updated');
			expect(updated.time).toBe('12:00'); // unchanged
		});

		it('deleteEntry removes entry', () => {
			const item = addItem('food', 'Apple', []);
			const entry = addEntry('food', item.id, '2025-01-15');

			deleteEntry(entry.id);
			expect(dataStore.getSnapshot().entries).toHaveLength(0);
		});
	});

	describe('dashboard cards', () => {
		it('addDashboardCard and removeDashboardCard', () => {
			addDashboardCard('cat-1');
			const data1 = dataStore.getSnapshot();
			expect(data1.dashboardCards).toHaveLength(1);
			expect(data1.dashboardCards![0].categoryId).toBe('cat-1');

			removeDashboardCard('cat-1');
			const data2 = dataStore.getSnapshot();
			expect(data2.dashboardCards).toHaveLength(0);
		});
	});

	describe('accessors', () => {
		it('getItemById returns item or undefined', () => {
			const item = addItem('food', 'Apple', []);
			expect(getItemById('food', item.id)?.name).toBe('Apple');
			expect(getItemById('food', 'nonexistent')).toBeUndefined();
		});

		it('getCategoryById returns category or undefined', () => {
			const cat = addCategory('activity', 'Cardio');
			expect(getCategoryById('activity', cat.id)?.name).toBe('Cardio');
			expect(getCategoryById('activity', 'nonexistent')).toBeUndefined();
		});

		it('getCategoryName returns name or empty string', () => {
			const cat = addCategory('food', 'Fruit');
			expect(getCategoryName('food', cat.id)).toBe('Fruit');
			expect(getCategoryName('food', 'nonexistent')).toBe('');
		});

		it('getCategoryNames returns names, filtering out missing', () => {
			const cat1 = addCategory('food', 'Fruit');
			const cat2 = addCategory('food', 'Healthy');
			const names = getCategoryNames('food', [cat1.id, 'missing', cat2.id]);
			expect(names).toEqual(['Fruit', 'Healthy']);
		});
	});

	describe('favorites', () => {
		it('toggleFavorite adds and removes', () => {
			const item = addItem('food', 'Apple', []);

			toggleFavorite(item.id);
			expect(isFavorite(item.id)).toBe(true);

			toggleFavorite(item.id);
			expect(isFavorite(item.id)).toBe(false);
		});
	});

	describe('store subscription', () => {
		it('notifies listeners on data change', () => {
			const listener = vi.fn();
			const unsub = dataStore.subscribe(listener);

			addItem('food', 'Apple', []);
			expect(listener).toHaveBeenCalled();

			unsub();
			listener.mockClear();
			addItem('food', 'Banana', []);
			expect(listener).not.toHaveBeenCalled();
		});
	});
});
