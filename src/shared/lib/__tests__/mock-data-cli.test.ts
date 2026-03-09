import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';

describe('mock-data CLI generator', () => {
	it('writes tracker data and playwright storage state files', () => {
		const tempDir = mkdtempSync(path.join(tmpdir(), 'mock-data-cli-'));
		const dataPath = path.join(tempDir, 'tracker.json');
		const storageStatePath = path.join(tempDir, 'storage-state.json');

		try {
			execFileSync(
				'node',
				[
					'.agents/skills/mock-data-preview/scripts/generate-storage-state.mjs',
					'--origin',
					'http://127.0.0.1:4173',
					'--days',
					'14',
					'--average',
					'3',
					'--seed',
					'7',
					'--data-path',
					dataPath,
					'--storage-state-path',
					storageStatePath,
				],
				{ cwd: process.cwd(), encoding: 'utf-8' },
			);

			const data = JSON.parse(readFileSync(dataPath, 'utf-8'));
			const state = JSON.parse(readFileSync(storageStatePath, 'utf-8'));

			expect(data.entries.length).toBeGreaterThan(0);
			expect(state.origins).toHaveLength(1);
			expect(state.origins[0].origin).toBe('http://127.0.0.1:4173');
			expect(state.origins[0].localStorage[0].name).toBe('tracker_data');
			expect(JSON.parse(state.origins[0].localStorage[0].value)).toEqual(data);
		} finally {
			rmSync(tempDir, { recursive: true, force: true });
		}
	});

	it('is deterministic for the same seed and options', () => {
		const tempDir = mkdtempSync(path.join(tmpdir(), 'mock-data-cli-deterministic-'));
		const firstDataPath = path.join(tempDir, 'first-data.json');
		const firstStoragePath = path.join(tempDir, 'first-storage.json');
		const secondDataPath = path.join(tempDir, 'second-data.json');
		const secondStoragePath = path.join(tempDir, 'second-storage.json');

		try {
			const args = [
				'.agents/skills/mock-data-preview/scripts/generate-storage-state.mjs',
				'--origin',
				'http://127.0.0.1:4173',
				'--days',
				'30',
				'--average',
				'4',
				'--seed',
				'12345',
			];

			execFileSync('node', [...args, '--data-path', firstDataPath, '--storage-state-path', firstStoragePath], {
				cwd: process.cwd(),
				encoding: 'utf-8',
			});
			execFileSync('node', [...args, '--data-path', secondDataPath, '--storage-state-path', secondStoragePath], {
				cwd: process.cwd(),
				encoding: 'utf-8',
			});

			const firstData = readFileSync(firstDataPath, 'utf-8');
			const secondData = readFileSync(secondDataPath, 'utf-8');
			const firstStorage = readFileSync(firstStoragePath, 'utf-8');
			const secondStorage = readFileSync(secondStoragePath, 'utf-8');

			expect(secondData).toBe(firstData);
			expect(secondStorage).toBe(firstStorage);
		} finally {
			rmSync(tempDir, { recursive: true, force: true });
		}
	});

	it('fails when a flag value is missing', () => {
		expect(() => {
			execFileSync(
				'node',
				['.agents/skills/mock-data-preview/scripts/generate-storage-state.mjs', '--origin', '--days', '10'],
				{ cwd: process.cwd(), encoding: 'utf-8', stdio: 'pipe' },
			);
		}).toThrow();
	});
});
