import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createMockTrackerData } from '../../../../public/mock-data/inject-mock-data.js';

const DEFAULT_ORIGIN = 'http://127.0.0.1:4173';
const DEFAULT_DATA_PATH = '.artifacts/mock-tracker-data.json';
const DEFAULT_STORAGE_STATE_PATH = '.artifacts/mock-storage-state.json';

function parseNumber(value, flagName) {
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) {
		throw new Error(`Invalid value for ${flagName}: ${value}`);
	}
	return parsed;
}

function parseArgs(argv) {
	const options = {
		origin: DEFAULT_ORIGIN,
		days: 70,
		averageEntriesPerDay: 4,
		seed: 20260308,
		dataPath: DEFAULT_DATA_PATH,
		storageStatePath: DEFAULT_STORAGE_STATE_PATH,
	};

	for (let i = 0; i < argv.length; i += 1) {
		const arg = argv[i];
		const next = argv[i + 1];
		switch (arg) {
			case '--origin':
				options.origin = next;
				i += 1;
				break;
			case '--days':
				options.days = parseNumber(next, '--days');
				i += 1;
				break;
			case '--average':
				options.averageEntriesPerDay = parseNumber(next, '--average');
				i += 1;
				break;
			case '--seed':
				options.seed = parseNumber(next, '--seed');
				i += 1;
				break;
			case '--data-path':
				options.dataPath = next;
				i += 1;
				break;
			case '--storage-state-path':
				options.storageStatePath = next;
				i += 1;
				break;
			case '--help':
				console.log(
					`Usage: npm run mock-data:generate -- [options]\n\nOptions:\n  --origin <url>               Origin used in Playwright storage state\n  --days <number>              Days of history (default: 70)\n  --average <number>           Average entries per day (default: 4)\n  --seed <number>              RNG seed (default: 20260308)\n  --data-path <path>           JSON output path (default: .artifacts/mock-tracker-data.json)\n  --storage-state-path <path>  Playwright storage state path (default: .artifacts/mock-storage-state.json)\n`,
				);
				process.exit(0);
			default:
				if (arg.startsWith('--')) {
					throw new Error(`Unknown option: ${arg}`);
				}
		}
	}

	if (!options.origin) {
		throw new Error('--origin cannot be empty');
	}
	return options;
}

async function ensureParentDir(filePath) {
	const dir = path.dirname(filePath);
	await mkdir(dir, { recursive: true });
}

async function main() {
	const options = parseArgs(process.argv.slice(2));
	const data = createMockTrackerData({
		days: options.days,
		averageEntriesPerDay: options.averageEntriesPerDay,
		seed: options.seed,
	});

	const storageState = {
		cookies: [],
		origins: [
			{
				origin: options.origin,
				localStorage: [{ name: 'tracker_data', value: JSON.stringify(data) }],
			},
		],
	};

	await ensureParentDir(options.dataPath);
	await ensureParentDir(options.storageStatePath);
	await writeFile(options.dataPath, `${JSON.stringify(data, null, 2)}\n`);
	await writeFile(options.storageStatePath, `${JSON.stringify(storageState, null, 2)}\n`);

	console.log(
		JSON.stringify(
			{
				dataPath: options.dataPath,
				storageStatePath: options.storageStatePath,
				origin: options.origin,
				summary: {
					entries: data.entries.length,
					activityItems: data.activityItems.length,
					foodItems: data.foodItems.length,
					activityCategories: data.activityCategories.length,
					foodCategories: data.foodCategories.length,
				},
			},
			null,
			2,
		),
	);
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
});
