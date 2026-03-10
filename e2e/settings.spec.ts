import { readFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';
import type { TrackerData } from '../src/shared/lib/types';
import { expectSyncPillTransition, expectToast } from './support/assertions';
import { expect, test, testWithSyncFailure } from './support/fixtures';
import { TEST_BACKUP_GIST_ID, TEST_GIST_ID, TEST_GITHUB_TOKEN, TEST_PRIMARY_ALT_GIST_ID } from './support/mock-app';

async function gotoSettings(page: Page) {
	await page.goto('/settings');
	await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
}

async function getLocalStorageItem(page: Page, key: string): Promise<string | null> {
	return page.evaluate((storageKey) => window.localStorage.getItem(storageKey), key);
}

test.describe('Settings e2e @full-regression', () => {
	test('@smoke settings route renders seeded sync config and backup section when a token exists', async ({
		seededPage,
	}) => {
		await gotoSettings(seededPage);

		await expect(seededPage.getByLabel('GitHub Personal Access Token')).toHaveValue(TEST_GITHUB_TOKEN);
		await expect(seededPage.getByLabel(/^Gist ID$/)).toHaveValue(TEST_GIST_ID);
		await expect(seededPage.getByRole('heading', { name: 'Backup Gist' })).toBeVisible();
		await expect(seededPage.getByRole('heading', { name: 'Export & Import' })).toBeVisible();
	});

	test('theme picker changes theme and persists across reload', async ({ seededPage }) => {
		await gotoSettings(seededPage);

		await seededPage.getByRole('button', { name: 'Dark', exact: true }).click();

		await expect.poll(() => getLocalStorageItem(seededPage, 'theme-preference')).toBe('dark');
		await expect(seededPage.locator('html')).toHaveClass(/dark/);

		await seededPage.reload();
		await expect(seededPage.getByRole('heading', { name: 'Settings' })).toBeVisible();
		await expect.poll(() => getLocalStorageItem(seededPage, 'theme-preference')).toBe('dark');
		await expect(seededPage.locator('html')).toHaveClass(/dark/);
	});

	test('sync status pill shows syncing then synced during Save and Load', async ({ seededPage }) => {
		await gotoSettings(seededPage);

		await seededPage.route(`https://api.github.com/gists/${TEST_GIST_ID}`, async (route) => {
			if (route.request().method() === 'GET') {
				await new Promise((resolve) => setTimeout(resolve, 300));
			}
			await route.fallback();
		});

		await expectSyncPillTransition(seededPage, async () => {
			await seededPage.getByRole('button', { name: 'Save & Load' }).click();
		});
	});

	test('browse gists shows mocked results and selecting a primary gist updates stored config', async ({
		seededPage,
	}) => {
		await gotoSettings(seededPage);
		await seededPage.getByRole('button', { name: 'Browse Gists' }).click();

		await expect(seededPage.getByText('Your Gists')).toBeVisible();
		await expect(seededPage.getByRole('button', { name: /Playwright primary tracker gist/ })).toBeVisible();
		await expect(seededPage.getByRole('button', { name: /Playwright alternate tracker gist/ })).toBeVisible();
		await expect(seededPage.getByRole('button', { name: /Playwright notes gist/ })).toBeVisible();
		await seededPage.getByRole('button', { name: /Playwright alternate tracker gist/ }).click();

		await expect.poll(() => getLocalStorageItem(seededPage, 'gist_id')).toBe(TEST_PRIMARY_ALT_GIST_ID);
		await expect(seededPage.getByLabel(/^Gist ID$/)).toHaveValue(TEST_PRIMARY_ALT_GIST_ID);
		await expectToast(seededPage, 'Gist selected! Loading data...');
	});

	test('selecting a backup gist updates stored config', async ({ seededPage }) => {
		await gotoSettings(seededPage);
		await seededPage.getByRole('button', { name: 'Browse', exact: true }).click();

		await expect(seededPage.getByText('Select Backup Gist')).toBeVisible();
		await expect(seededPage.getByRole('button', { name: /Playwright backup tracker gist/ })).toBeVisible();
		await seededPage.getByRole('button', { name: /Playwright backup tracker gist/ }).click();

		await expect.poll(() => getLocalStorageItem(seededPage, 'backup_gist_id')).toBe(TEST_BACKUP_GIST_ID);
		await expect(seededPage.getByLabel(/^Backup Gist ID$/)).toHaveValue(TEST_BACKUP_GIST_ID);
		await expectToast(seededPage, 'Backup Gist selected!');
	});

	test('importing invalid JSON shows the error state', async ({ seededPage }) => {
		await gotoSettings(seededPage);

		await seededPage.locator('input[type="file"]').setInputFiles({
			name: 'invalid-tracker-data.json',
			mimeType: 'application/json',
			buffer: Buffer.from('{"entries":"nope"}'),
		});

		const confirmDialog = seededPage.getByRole('dialog', { name: 'Import Data' });
		await expect(confirmDialog).toBeVisible();
		await confirmDialog.getByRole('button', { name: 'Import', exact: true }).click();

		await expectToast(seededPage, 'Import failed: Invalid file format');
	});

	test('export action triggers a download with tracker data', async ({ appData, seededPage }) => {
		await gotoSettings(seededPage);

		const downloadPromise = seededPage.waitForEvent('download');
		await seededPage.getByRole('button', { name: 'Export JSON' }).click();

		const download = await downloadPromise;
		expect(download.suggestedFilename()).toMatch(/^tracker-backup-\d{4}-\d{2}-\d{2}\.json$/);

		const downloadPath = await download.path();
		if (!downloadPath) {
			throw new Error('Expected Playwright export download to be persisted to disk');
		}

		const exportedData = JSON.parse(await readFile(downloadPath, 'utf8')) as TrackerData;
		expect(exportedData).toEqual(appData);
	});
});

testWithSyncFailure.describe('Settings sync failure @full-regression', () => {
	testWithSyncFailure('sync failure shows the localized load failure toast', async ({ seededPage }) => {
		await gotoSettings(seededPage);
		await seededPage.getByRole('button', { name: 'Save & Load' }).click();

		await expect(seededPage.getByText('Sync failed')).toBeVisible();
		await expectToast(seededPage, 'Failed to load from Gist');
	});
});
