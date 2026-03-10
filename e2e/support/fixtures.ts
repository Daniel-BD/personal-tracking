import { test as base, expect, type Page, type TestInfo } from '@playwright/test';
import type { TrackerData } from '../../src/shared/lib/types';
import {
	createTrackerDataSet,
	type AppDatasetName,
	buildStorageState,
	type GitHubMockScenario,
	installGitHubRouteMocks,
} from './mock-app';

type TestFixtures = {
	appData: TrackerData;
	seededPage: Page;
};

type TestOptions = {
	appDataset: AppDatasetName;
	githubScenario: GitHubMockScenario;
};

const HIGH_VALUE_ROUTE_NAMES = new Map<string, string>([
	['/', 'home'],
	['/log', 'log'],
	['/library', 'library'],
	['/stats', 'stats'],
	['/settings', 'settings'],
]);

async function attachRouteFailureScreenshot(page: Page, testInfo: TestInfo): Promise<void> {
	if (testInfo.status === testInfo.expectedStatus || page.isClosed()) {
		return;
	}

	const pathname = new URL(page.url() || 'http://127.0.0.1/').pathname;
	const routeName = HIGH_VALUE_ROUTE_NAMES.get(pathname);

	if (!routeName) {
		return;
	}

	try {
		await testInfo.attach(`${routeName}-failure`, {
			body: await page.screenshot({ fullPage: true }),
			contentType: 'image/png',
		});
	} catch {
		// Ignore attachment failures so the original test failure remains primary.
	}
}

export const test = base.extend<TestFixtures & TestOptions>({
	appDataset: ['seeded', { option: true }],
	githubScenario: ['default', { option: true }],
	appData: async ({ appDataset }, runFixture) => {
		await runFixture(createTrackerDataSet(appDataset));
	},
	context: async ({ browser, contextOptions, appData, githubScenario }, runFixture) => {
		const context = await browser.newContext({
			...contextOptions,
			storageState: buildStorageState(appData),
		});

		await installGitHubRouteMocks(context, appData, { scenario: githubScenario });
		await runFixture(context);
		await context.close();
	},
	seededPage: async ({ page }, runFixture, testInfo) => {
		await page.goto('/');
		await expect(page.getByPlaceholder('Search or create item...')).toBeVisible();
		await runFixture(page);
		await attachRouteFailureScreenshot(page, testInfo);
	},
});

export const testWithEmptyState = test.extend<TestFixtures & TestOptions>({
	appDataset: ['empty', { option: true }],
});

export const testWithSyncFailure = test.extend<TestFixtures & TestOptions>({
	githubScenario: ['sync-load-failure', { option: true }],
});

export { expect };
