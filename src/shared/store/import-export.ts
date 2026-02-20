import type { TrackerData } from '@/shared/lib/types';
import { TrackerDataImportSchema } from '@/shared/lib/schemas';
import { migrateData } from './migration';

// ============================================================
// Export
// ============================================================

export function triggerExportDownload(data: TrackerData): void {
	const json = JSON.stringify(data, null, 2);
	const blob = new Blob([json], { type: 'application/json' });
	const url = URL.createObjectURL(blob);

	const a = document.createElement('a');
	a.href = url;
	a.download = `tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

// ============================================================
// Import — validates and returns migrated data, or null on failure
// ============================================================

export function validateAndParseImport(jsonString: string): TrackerData | null {
	try {
		const raw = JSON.parse(jsonString);
		const result = TrackerDataImportSchema.safeParse(raw);
		if (!result.success) return null;
		return migrateData(result.data as TrackerData);
	} catch {
		return null;
	}
}
