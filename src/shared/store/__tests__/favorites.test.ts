import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import type { TrackerData } from '@/shared/lib/types';
import { makeValidData, flushPromises } from './fixtures';

// Mock the github module before importing store
vi.mock('@/shared/lib/github', () => ({
	getConfig: vi.fn(() => ({ token: '', gistId: null, backupGistId: null })),
	saveConfig: vi.fn(),
	isConfigured: vi.fn(() => false),
	fetchGist: vi.fn(),
	updateGist: vi.fn(),
	createGist: vi.fn(),
	listUserGists: vi.fn(),
	validateToken: vi.fn(),
}));

import { importData, dataStore, toggleFavorite, isFavorite, addItem, deleteItem } from '../store';
import { isConfigured, fetchGist, updateGist, getConfig } from '@/shared/lib/github';

describe('favorites', () => {
	beforeEach(() => {
		localStorage.clear();
		(isConfigured as Mock).mockReturnValue(false);
		importData(JSON.stringify(makeValidData()));
		vi.clearAllMocks();
	});

	it('toggleFavorite adds an item to favorites', () => {
		importData(
			JSON.stringify(
				makeValidData({
					foodItems: [{ id: 'apple', name: 'Apple', categories: [] }],
				}),
			),
		);

		toggleFavorite('apple');

		expect(isFavorite('apple')).toBe(true);
		expect(dataStore.getSnapshot().favoriteItems).toContain('apple');
	});

	it('toggleFavorite removes an already-favorited item', () => {
		importData(
			JSON.stringify(
				makeValidData({
					foodItems: [{ id: 'apple', name: 'Apple', categories: [] }],
					favoriteItems: ['apple'],
				}),
			),
		);

		expect(isFavorite('apple')).toBe(true);

		toggleFavorite('apple');

		expect(isFavorite('apple')).toBe(false);
		expect(dataStore.getSnapshot().favoriteItems).not.toContain('apple');
	});

	it('deleteItem removes the item from favorites', () => {
		importData(
			JSON.stringify(
				makeValidData({
					foodItems: [
						{ id: 'apple', name: 'Apple', categories: [] },
						{ id: 'banana', name: 'Banana', categories: [] },
					],
					favoriteItems: ['apple', 'banana'],
				}),
			),
		);

		deleteItem('food', 'apple');

		expect(dataStore.getSnapshot().favoriteItems).not.toContain('apple');
		expect(dataStore.getSnapshot().favoriteItems).toContain('banana');
	});

	it('merge filters out favorites for deleted items', async () => {
		// Set up local state with one item + favorite, then delete it
		importData(
			JSON.stringify(
				makeValidData({
					foodItems: [
						{ id: 'keep', name: 'Keeper', categories: [] },
						{ id: 'gone', name: 'Doomed', categories: [] },
					],
					favoriteItems: ['keep', 'gone'],
				}),
			),
		);
		vi.clearAllMocks();

		(isConfigured as Mock).mockReturnValue(true);
		(getConfig as Mock).mockReturnValue({ token: 'tok', gistId: 'gist', backupGistId: null });

		// Remote still has both items favorited
		const remoteData = makeValidData({
			foodItems: [
				{ id: 'keep', name: 'Keeper', categories: [] },
				{ id: 'gone', name: 'Doomed', categories: [] },
			],
			favoriteItems: ['keep', 'gone'],
		});
		(fetchGist as Mock).mockResolvedValue(remoteData);
		(updateGist as Mock).mockResolvedValue(undefined);

		// Delete the item — triggers merge with remote
		deleteItem('food', 'gone');
		await flushPromises();

		expect(updateGist).toHaveBeenCalled();
		const pushed = (updateGist as Mock).mock.calls[0][2] as TrackerData;
		expect(pushed.favoriteItems).toContain('keep');
		expect(pushed.favoriteItems).not.toContain('gone');
	});

	it('isFavorite returns false for unknown item IDs', () => {
		expect(isFavorite('nonexistent')).toBe(false);
	});

	it('toggleFavorite triggers gist sync', async () => {
		(isConfigured as Mock).mockReturnValue(true);
		(getConfig as Mock).mockReturnValue({ token: 'tok', gistId: 'gist', backupGistId: null });
		(fetchGist as Mock).mockResolvedValue(makeValidData());
		(updateGist as Mock).mockResolvedValue(undefined);

		toggleFavorite('some-id');
		await flushPromises();

		expect(updateGist).toHaveBeenCalled();
	});
});
