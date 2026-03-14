import { expect, type Locator, type Page } from '@playwright/test';

type SyncPillTerminalState = 'synced' | 'error';

function getSyncPillText(state: SyncPillTerminalState): string {
	return state === 'synced' ? 'Synced' : 'Sync failed';
}

export function getDateGroup(page: Page, dateKey: string): Locator {
	return page.getByTestId(`entries-date-group-${dateKey}`);
}

export async function expectDateGroupToContain(page: Page, dateKey: string, text: string): Promise<void> {
	await expect(getDateGroup(page, dateKey)).toContainText(text);
}

export async function expectToast(page: Page, text: string): Promise<void> {
	await expect(page.getByText(text)).toBeVisible();
}

export async function expectSyncPillTransition(
	page: Page,
	trigger: () => Promise<unknown>,
	terminalState: SyncPillTerminalState = 'synced',
): Promise<void> {
	const syncingPill = page.getByText('Syncing…');
	const terminalPill = page.getByText(getSyncPillText(terminalState));

	await expect(syncingPill).toHaveCount(0);
	await expect(terminalPill).toHaveCount(0);

	await trigger();

	await expect(syncingPill).toBeVisible();
	await expect(terminalPill).toBeVisible();
}
