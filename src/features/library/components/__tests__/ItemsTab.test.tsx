import { act, fireEvent, render, screen, within } from '@testing-library/react';
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

function renderLibraryPage() {
	return render(
		<MemoryRouter>
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

function getSheetAction(dialog: HTMLElement, label: string): HTMLButtonElement {
	const button = within(dialog)
		.getAllByRole('button', { name: label })
		.find((candidate) => candidate.className.includes('btn-primary'));

	if (!(button instanceof HTMLButtonElement)) {
		throw new Error(`Could not find sheet action ${label}`);
	}

	return button;
}

describe('LibraryPage items tab', () => {
	beforeEach(() => {
		localStorage.clear();
		resetIdCounter();

		const fruit = makeCategory({ id: 'cat-fruit', name: 'Fruit', sentiment: 'positive' });
		const apple = makeItem({ id: 'item-apple', name: 'Apple', categories: ['cat-fruit'] });
		const banana = makeItem({ id: 'item-banana', name: 'Banana', categories: ['cat-fruit'] });
		const appleEntry = makeEntry({ id: 'entry-apple', type: 'food', itemId: 'item-apple', notes: null });

		act(() => {
			importData(
				JSON.stringify(
					makeValidData({
						foodCategories: [fruit],
						foodItems: [apple, banana],
						entries: [appleEntry],
					}),
				),
			);
		});
	});

	it('wires add, edit, merge, and delete flows through the page scaffold', () => {
		renderLibraryPage();

		fireEvent.click(screen.getByRole('button', { name: 'Add item' }));
		let dialog = screen.getByRole('dialog');
		fireEvent.click(within(dialog).getByRole('button', { name: 'Food' }));
		fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Cherry' } });
		fireEvent.click(getSheetAction(dialog, 'Add'));

		expect(dataStore.getSnapshot().foodItems.map((item) => item.name)).toContain('Cherry');

		fireEvent.click(within(getRowByText('Banana')).getByLabelText('Edit item'));
		dialog = screen.getByRole('dialog');
		fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Banana Split' } });
		fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

		expect(dataStore.getSnapshot().foodItems.find((item) => item.id === 'item-banana')?.name).toBe('Banana Split');

		fireEvent.click(within(getRowByText('Apple')).getByLabelText('Edit item'));
		dialog = screen.getByRole('dialog');
		fireEvent.click(within(dialog).getByRole('button', { name: 'Merge into...' }));

		dialog = screen.getByRole('dialog');
		fireEvent.click(within(dialog).getByRole('button', { name: 'Banana Split' }));

		dialog = screen.getByRole('dialog');
		fireEvent.change(within(dialog).getByLabelText('Note to append to affected entries (optional)'), {
			target: { value: 'Merged from Apple' },
		});
		fireEvent.click(within(dialog).getByRole('button', { name: 'Merge' }));

		let snapshot = dataStore.getSnapshot();
		expect(snapshot.foodItems.find((item) => item.id === 'item-apple')).toBeUndefined();
		expect(snapshot.entries.find((entry) => entry.id === 'entry-apple')?.itemId).toBe('item-banana');

		fireEvent.click(within(getRowByText('Cherry')).getByLabelText('Delete item'));
		dialog = screen.getByRole('dialog');
		fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

		snapshot = dataStore.getSnapshot();
		expect(snapshot.foodItems.find((item) => item.name === 'Cherry')).toBeUndefined();
		expect(snapshot.foodItems.map((item) => item.name)).toEqual(['Banana Split']);
	});
});
