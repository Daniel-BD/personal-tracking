import type { TrackerData, GistResponse } from './types';
import { createEmptyData } from './types';
import { TrackerDataImportSchema } from './schemas';

const GIST_FILENAME = 'tracker-data.json';
const GITHUB_API_BASE = 'https://api.github.com';

export interface GistConfig {
	token: string;
	gistId: string | null;
	backupGistId: string | null;
}

export function getConfig(): GistConfig {
	if (typeof localStorage === 'undefined') {
		return { token: '', gistId: null, backupGistId: null };
	}
	return {
		token: localStorage.getItem('github_token') || '',
		gistId: localStorage.getItem('gist_id') || null,
		backupGistId: localStorage.getItem('backup_gist_id') || null,
	};
}

export function saveConfig(config: Partial<GistConfig>): void {
	if (config.token !== undefined) {
		localStorage.setItem('github_token', config.token);
	}
	if (config.gistId !== undefined) {
		if (config.gistId) {
			localStorage.setItem('gist_id', config.gistId);
		} else {
			localStorage.removeItem('gist_id');
		}
	}
	if (config.backupGistId !== undefined) {
		if (config.backupGistId) {
			localStorage.setItem('backup_gist_id', config.backupGistId);
		} else {
			localStorage.removeItem('backup_gist_id');
		}
	}
}

export function isConfigured(): boolean {
	const config = getConfig();
	return !!config.token && !!config.gistId;
}

async function apiRequest<T>(endpoint: string, token: string, options: RequestInit = {}): Promise<T> {
	const response = await fetch(`${GITHUB_API_BASE}${endpoint}`, {
		...options,
		headers: {
			Authorization: `Bearer ${token}`,
			Accept: 'application/vnd.github+json',
			'X-GitHub-Api-Version': '2022-11-28',
			...options.headers,
		},
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`GitHub API error: ${response.status} - ${errorText}`);
	}

	return response.json();
}

export async function fetchGist(gistId: string, token: string): Promise<TrackerData> {
	const gist = await apiRequest<GistResponse>(`/gists/${gistId}`, token);

	const file = gist.files[GIST_FILENAME];
	if (!file || !file.content) {
		return createEmptyData();
	}

	const raw = JSON.parse(file.content);
	const result = TrackerDataImportSchema.safeParse(raw);
	if (!result.success) {
		throw new Error('Remote Gist data failed validation — refusing to overwrite. Check data format.');
	}
	return result.data as TrackerData;
}

export async function updateGist(gistId: string, token: string, data: TrackerData): Promise<void> {
	await apiRequest(`/gists/${gistId}`, token, {
		method: 'PATCH',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			files: {
				[GIST_FILENAME]: {
					content: JSON.stringify(data, null, 2),
				},
			},
		}),
	});
}

export async function createGist(token: string): Promise<string> {
	const response = await apiRequest<GistResponse>('/gists', token, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			description: 'Personal Activity & Food Tracker Data',
			public: false,
			files: {
				[GIST_FILENAME]: {
					content: JSON.stringify(createEmptyData(), null, 2),
				},
			},
		}),
	});

	return response.id;
}

export async function listUserGists(
	token: string,
): Promise<Array<{ id: string; description: string; files: string[] }>> {
	const gists = await apiRequest<GistResponse[]>('/gists', token);

	return gists.map((gist) => ({
		id: gist.id,
		description: (gist as unknown as { description: string }).description || 'No description',
		files: Object.keys(gist.files),
	}));
}

export async function validateToken(token: string): Promise<boolean> {
	try {
		await apiRequest('/user', token);
		return true;
	} catch {
		return false;
	}
}
