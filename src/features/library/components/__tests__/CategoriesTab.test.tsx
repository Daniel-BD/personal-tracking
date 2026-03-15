import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import '@/shared/lib/i18n';
import { LibraryPage } from '@/features/library';
import { ToastProvider } from '@/shared/ui/Toast';
import { dataStore, importData } from '@/shared/store/store';
import { makeCategory, makeEntry, makeItem, makeValidData, resetIdCounter } from '@/shared/store/__tests__/fixtures';

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
		favoriteItems: new Set(),
	},
	persistPendingDeletions: vi.fn(),
	clearPendingDeletions: vi.fn(),
	pushToGist: vi.fn(),
	loadFromGistFn: vi.fn(),
	backupToGistFn: vi.fn(),
	restoreFromBackupGistFn: vi.fn(),
	addTombstone: vi.fn((data: unknown) => data),
	addTombstones: vi.fn((data: unknown) => data),
	removeTombstone: vi.fn((data: unknown) => data),
	markDashboardCardRestored: vi.fn(),
	clearDashboardCardRestored: vi.fn(),
}));

function renderLibraryPage(initialEntry: string = '/library') {
	return render(
		<MemoryRouter initialEntries={[initialEntry]}>
			<ToastProvider>
				<LibraryPage />
			</ToastProvider>
		</MemoryRouter>,
	);
}

function getRowByText(text: string): HTMLElement {
	const row = screen.getByText(text).closest('[role="button"]');

	if (!(row instanceof HTMLElement)) {
		throw new Error(`Could not find row for ${text}`);
	}

	return row;
}

describe('LibraryPage categories tab', () => {
	beforeEach(() => {
		cleanup();
		localStorage.clear();
		resetIdCounter();

		const fruit = makeCategory({ id: 'cat-fruit', name: 'Fruit', sentiment: 'positive' });
		const snack = makeCategory({ id: 'cat-snack', name: 'Snack', sentiment: 'neutral' });
		const apple = makeItem({ id: 'item-apple', name: 'Apple', categories: ['cat-fruit'] });
		const banana = makeItem({ id: 'item-banana', name: 'Banana', categories: ['cat-fruit', 'cat-snack'] });
		const overrideEntry = makeEntry({
			id: 'entry-override',
			type: 'food',
			itemId: 'item-banana',
			categoryOverrides: ['cat-fruit'],
		});

		act(() => {
			importData(
				JSON.stringify(
					makeValidData({
						foodCategories: [fruit, snack],
						foodItems: [apple, banana],
						entries: [overrideEntry],
					}),
				),
			);
		});
	});

	it('opens category edit sheet from deep-link query params', () => {
		renderLibraryPage('/library?tab=categories&edit=category&id=cat-fruit');

		const dialog = screen.getByRole('dialog');
		expect(within(dialog).getByRole('heading', { name: 'Edit Fruit' })).toBeTruthy();
	});

	it('wires add, edit, merge, and delete flows through the page scaffold', () => {
		renderLibraryPage();
		fireEvent.click(screen.getByRole('button', { name: 'Categories' }));

		fireEvent.click(screen.getByRole('button', { name: 'Add category' }));
		let dialog = screen.getByRole('dialog');
		fireEvent.click(within(dialog).getByRole('button', { name: 'Food' }));
		fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Dessert' } });
		fireEvent.click(within(dialog).getByRole('button', { name: 'Add' }));

		expect(dataStore.getSnapshot().foodCategories.map((category) => category.name)).toContain('Dessert');

		fireEvent.click(within(getRowByText('Dessert')).getByLabelText('Edit category'));
		dialog = screen.getByRole('dialog');
		fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Dessert Updated' } });
		fireEvent.click(within(dialog).getByRole('button', { name: 'Positive' }));
		fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

		expect(
			dataStore.getSnapshot().foodCategories.find((category) => category.name === 'Dessert Updated')?.sentiment,
		).toBe('positive');

		fireEvent.click(within(getRowByText('Fruit')).getByLabelText('Edit category'));
		dialog = screen.getByRole('dialog');
		fireEvent.click(within(dialog).getByRole('button', { name: 'Merge into...' }));

		dialog = screen.getByRole('dialog');
		fireEvent.click(within(dialog).getByRole('button', { name: 'Snack' }));

		dialog = screen.getByRole('dialog');
		expect(within(dialog).getByText('2 items will be updated.')).toBeTruthy();
		expect(within(dialog).getByText('1 entry override will be updated.')).toBeTruthy();
		fireEvent.click(within(dialog).getByRole('button', { name: 'Merge' }));

		let snapshot = dataStore.getSnapshot();
		expect(snapshot.foodCategories.find((category) => category.id === 'cat-fruit')).toBeUndefined();
		expect(snapshot.foodItems.every((item) => !item.categories.includes('cat-fruit'))).toBe(true);
		expect(snapshot.foodItems.every((item) => item.categories.includes('cat-snack'))).toBe(true);
		expect(snapshot.entries.find((entry) => entry.id === 'entry-override')?.categoryOverrides).toEqual(['cat-snack']);

		fireEvent.click(within(getRowByText('Dessert Updated')).getByLabelText('Delete category'));
		dialog = screen.getByRole('dialog');
		fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

		snapshot = dataStore.getSnapshot();
		expect(snapshot.foodCategories.find((category) => category.name === 'Dessert Updated')).toBeUndefined();
		expect(snapshot.foodCategories.map((category) => category.name)).toEqual(['Snack']);
	});
});
