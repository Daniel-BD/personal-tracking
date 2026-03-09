import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs as nodeParseArgs } from 'node:util';
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
	const { values } = nodeParseArgs({
		args: argv,
		options: {
			origin: { type: 'string', default: DEFAULT_ORIGIN },
			days: { type: 'string', default: '70' },
			average: { type: 'string', default: '4' },
			seed: { type: 'string', default: '20260308' },
			'data-path': { type: 'string', default: DEFAULT_DATA_PATH },
			'storage-state-path': { type: 'string', default: DEFAULT_STORAGE_STATE_PATH },
			help: { type: 'boolean' },
		},
		allowPositionals: false,
		strict: true,
	});

	if (values.help) {
		console.log(
			`Usage: npm run mock-data:generate -- [options]\n\nOptions:\n  --origin <url>               Origin used in Playwright storage state (default: "${DEFAULT_ORIGIN}")\n  --days <number>              Days of history (default: 70)\n  --average <number>           Average entries per day (default: 4)\n  --seed <number>              RNG seed (default: 20260308)\n  --data-path <path>           JSON output path (default: "${DEFAULT_DATA_PATH}")\n  --storage-state-path <path>  Playwright storage state path (default: "${DEFAULT_STORAGE_STATE_PATH}")\n`,
		);
		process.exit(0);
	}

	if (!values.origin) {
		throw new Error('--origin cannot be empty');
	}

	return {
		origin: values.origin,
		days: parseNumber(values.days, '--days'),
		averageEntriesPerDay: parseNumber(values.average, '--average'),
		seed: parseNumber(values.seed, '--seed'),
		dataPath: values['data-path'],
		storageStatePath: values['storage-state-path'],
	};
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
