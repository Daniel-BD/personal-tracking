import type { Locator, Page } from '@playwright/test';

export async function getLogEntryCount(page: Page): Promise<number> {
	const subtitle = page.getByText(/^\d+ entr(y|ies)( \(filtered\))?$/).first();
	const text = (await subtitle.textContent()) ?? '';
	const match = text.match(/^(\d+)/);

	if (!match) {
		throw new Error(`Could not parse log entry count from: ${text}`);
	}

	return Number(match[1]);
}

export function getDateKeyOffset(daysAgo = 0): string {
	const now = new Date();
	now.setHours(0, 0, 0, 0);
	now.setDate(now.getDate() - daysAgo);

	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const day = String(now.getDate()).padStart(2, '0');

	return `${year}-${month}-${day}`;
}

export function getLogEntryRow(page: Page, itemName: string, dateKey?: string): Locator {
	const scope = dateKey
		? page.getByTestId(`entries-date-group-${dateKey}`)
		: page.locator('[data-testid^="entries-date-group-"]');

	return scope
		.locator('.card > div')
		.filter({ has: page.getByText(itemName, { exact: true }) })
		.first();
}
