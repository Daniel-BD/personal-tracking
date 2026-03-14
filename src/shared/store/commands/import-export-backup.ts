import type { TrackerData } from '@/shared/lib/types';
import type { StoreCommandRuntime } from '../command-types';

interface ImportExportBackupDeps {
	backupToGistFn(backupGistId: string, getCurrentData: () => TrackerData): Promise<void>;
	clearPendingDeletions(): void;
	restoreFromBackupGistFn(
		backupGistId: string,
		setData: (data: TrackerData) => void,
		triggerPush: () => void,
	): Promise<void>;
	triggerExportDownload(data: TrackerData): void;
	validateAndParseImport(jsonString: string): TrackerData | null;
}

export function createImportExportBackupCommands(runtime: StoreCommandRuntime, deps: ImportExportBackupDeps) {
	function exportData(): void {
		deps.triggerExportDownload(runtime.getData());
	}

	function importData(jsonString: string): boolean {
		const data = deps.validateAndParseImport(jsonString);
		if (!data) {
			return false;
		}

		runtime.setData(data);
		deps.clearPendingDeletions();
		runtime.triggerPush();
		return true;
	}

	async function backupToGist(backupGistId: string): Promise<void> {
		await deps.backupToGistFn(backupGistId, runtime.getData);
	}

	async function restoreFromBackupGist(backupGistId: string): Promise<void> {
		await deps.restoreFromBackupGistFn(backupGistId, runtime.setData, runtime.triggerPush);
	}

	return {
		exportData,
		importData,
		backupToGist,
		restoreFromBackupGist,
	};
}
