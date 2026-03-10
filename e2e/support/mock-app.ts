import type { BrowserContext, Route } from '@playwright/test';
import { createMockTrackerData } from '../../public/mock-data/inject-mock-data.js';
import type { TrackerData } from '../../src/shared/lib/types';

const GIST_FILENAME = 'tracker-data.json';
const TEST_ORIGIN = 'http://127.0.0.1:4173';
const OTHER_GIST_FILENAME = 'notes.txt';

export const TEST_GITHUB_TOKEN = 'playwright-demo-token';
export const TEST_GIST_ID = 'playwright-demo-gist';
export const TEST_PRIMARY_ALT_GIST_ID = 'playwright-alt-gist';
export const TEST_BACKUP_GIST_ID = 'playwright-backup-gist';

export type AppDatasetName = 'seeded' | 'empty';
export type GitHubMockScenario = 'default' | 'sync-load-failure';

type MockGistRecord = {
	data: TrackerData | null;
	description: string;
	fileNames: string[];
};

interface BuildStorageStateOptions {
	backupGistId?: string | null;
	gistId?: string | null;
	token?: string;
}

interface InstallGitHubRouteMockOptions {
	scenario?: GitHubMockScenario;
}

function formatDateLocal(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function buildMockGistResponse(id: string, gist: MockGistRecord) {
	const fileNames = gist.data ? Array.from(new Set([GIST_FILENAME, ...gist.fileNames])) : gist.fileNames;

	const files = Object.fromEntries(
		fileNames.map((fileName) => [
			fileName,
			{
				filename: fileName,
				...(fileName === GIST_FILENAME && gist.data ? { content: JSON.stringify(gist.data) } : {}),
			},
		]),
	);

	return {
		id,
		description: gist.description,
		files,
	};
}

function createMockGistCatalog(initialData: TrackerData): Map<string, MockGistRecord> {
	return new Map<string, MockGistRecord>([
		[
			TEST_GIST_ID,
			{
				data: structuredClone(initialData),
				description: 'Playwright primary tracker gist',
				fileNames: [GIST_FILENAME],
			},
		],
		[
			TEST_PRIMARY_ALT_GIST_ID,
			{
				data: structuredClone(initialData),
				description: 'Playwright alternate tracker gist',
				fileNames: [GIST_FILENAME],
			},
		],
		[
			TEST_BACKUP_GIST_ID,
			{
				data: structuredClone(initialData),
				description: 'Playwright backup tracker gist',
				fileNames: [GIST_FILENAME],
			},
		],
		[
			'playwright-notes-gist',
			{
				data: null,
				description: 'Playwright notes gist',
				fileNames: [OTHER_GIST_FILENAME],
			},
		],
	]);
}

export function createSeededTrackerData(): TrackerData {
	const data = createMockTrackerData({
		seed: 20260308,
		days: 28,
		averageEntriesPerDay: 3,
	});
	const today = formatDateLocal(new Date());

	// Keep "Eggs" available as a favorite, but ensure it does not already exist
	// in today's group so the quick-log assertion is unambiguous.
	data.entries = data.entries.filter(
		(entry) => !(entry.date === today && entry.type === 'food' && entry.itemId === 'fi-eggs'),
	);

	return data;
}

export function createEmptyTrackerData(): TrackerData {
	const data = createSeededTrackerData();
	return {
		...data,
		entries: [],
		dashboardCards: [],
		favoriteItems: [],
	};
}

export function createTrackerDataSet(dataset: AppDatasetName): TrackerData {
	switch (dataset) {
		case 'seeded':
			return createSeededTrackerData();
		case 'empty':
			return createEmptyTrackerData();
	}
}

export function buildStorageState(data: TrackerData, options: BuildStorageStateOptions = {}) {
	const { backupGistId = null, gistId = TEST_GIST_ID, token = TEST_GITHUB_TOKEN } = options;
	const localStorage = [{ name: 'tracker_data', value: JSON.stringify(data) }];

	if (token) {
		localStorage.push({ name: 'github_token', value: token });
	}

	if (gistId) {
		localStorage.push({ name: 'gist_id', value: gistId });
	}

	if (backupGistId) {
		localStorage.push({ name: 'backup_gist_id', value: backupGistId });
	}

	return {
		cookies: [],
		origins: [
			{
				origin: TEST_ORIGIN,
				localStorage,
			},
		],
	};
}

export async function installGitHubRouteMocks(
	context: BrowserContext,
	initialData: TrackerData,
	options: InstallGitHubRouteMockOptions = {},
): Promise<void> {
	const remoteGists = createMockGistCatalog(initialData);
	const scenario = options.scenario ?? 'default';

	await context.route('https://api.github.com/**', async (route: Route) => {
		const request = route.request();
		const url = new URL(request.url());

		if (request.method() === 'GET' && url.pathname === '/gists') {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify([...remoteGists.entries()].map(([gistId, gist]) => buildMockGistResponse(gistId, gist))),
			});
			return;
		}

		if (request.method() === 'GET' && url.pathname.startsWith('/gists/')) {
			const gistId = url.pathname.split('/').at(-1);
			const gist = gistId ? remoteGists.get(gistId) : undefined;

			if (scenario === 'sync-load-failure' && gistId === TEST_GIST_ID) {
				await route.fulfill({
					status: 500,
					contentType: 'application/json',
					body: JSON.stringify({ message: 'Mocked sync load failure' }),
				});
				return;
			}

			if (!gistId || !gist) {
				await route.fulfill({
					status: 404,
					contentType: 'application/json',
					body: JSON.stringify({ message: `Unknown mocked gist: ${gistId ?? 'missing-id'}` }),
				});
				return;
			}

			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(buildMockGistResponse(gistId, gist)),
			});
			return;
		}

		if (request.method() === 'PATCH' && url.pathname.startsWith('/gists/')) {
			const gistId = url.pathname.split('/').at(-1);
			const payload = request.postDataJSON() as {
				files?: Record<string, { content?: string }>;
			};
			const nextContent = payload.files?.[GIST_FILENAME]?.content;

			if (typeof nextContent === 'string') {
				const existingGist = gistId ? remoteGists.get(gistId) : undefined;
				if (gistId) {
					remoteGists.set(gistId, {
						data: JSON.parse(nextContent) as TrackerData,
						description: existingGist?.description ?? `Playwright gist ${gistId}`,
						fileNames: existingGist?.fileNames ?? [GIST_FILENAME],
					});
				}
			}

			if (!gistId) {
				await route.fulfill({
					status: 400,
					contentType: 'application/json',
					body: JSON.stringify({ message: 'Missing gist id in mocked PATCH request' }),
				});
				return;
			}

			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(buildMockGistResponse(gistId, remoteGists.get(gistId)!)),
			});
			return;
		}

		if (request.method() === 'GET' && url.pathname === '/user') {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ login: 'playwright-user', id: 1 }),
			});
			return;
		}

		await route.fulfill({
			status: 404,
			contentType: 'application/json',
			body: JSON.stringify({ message: `Unhandled mocked GitHub request: ${request.method()} ${url.pathname}` }),
		});
	});
}
