import { useRef, useState } from 'react';
import { exportData, importData } from '@/shared/store/store';
import ConfirmDialog from '@/shared/ui/ConfirmDialog';

interface Props {
	onMessage: (message: string, isError: boolean) => void;
}

export default function ExportImportSection({ onMessage }: Props) {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [pendingFile, setPendingFile] = useState<File | null>(null);

	function handleExport() {
		exportData();
	}

	function handleImportClick() {
		fileInputRef.current?.click();
	}

	function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		if (!file) return;
		setPendingFile(file);
		event.target.value = '';
	}

	function handleConfirmImport() {
		if (!pendingFile) return;
		const reader = new FileReader();
		reader.onload = (e) => {
			const content = e.target?.result as string;
			const success = importData(content);
			if (success) {
				onMessage('Import successful!', false);
			} else {
				onMessage('Import failed: Invalid file format', true);
			}
			setPendingFile(null);
		};
		reader.readAsText(pendingFile);
	}

	return (
		<div className="card p-6 space-y-4">
			<h3 className="text-lg font-semibold text-heading">Export &amp; Import</h3>
			<p className="text-sm text-body">
				Download your data as a JSON file for safekeeping, or restore from a previous backup.
			</p>
			<div className="flex gap-2">
				<button onClick={handleExport} className="flex-1 btn-primary">
					Export JSON
				</button>
				<button onClick={handleImportClick} className="flex-1 btn-secondary">
					Import JSON
				</button>
			</div>
			<input
				type="file"
				accept=".json,application/json"
				className="hidden"
				ref={fileInputRef}
				onChange={handleFileSelect}
			/>
			<ConfirmDialog
				open={pendingFile !== null}
				onClose={() => setPendingFile(null)}
				onConfirm={handleConfirmImport}
				title="Import Data"
				message="This will replace all current data. Are you sure?"
				confirmLabel="Import"
			/>
		</div>
	);
}
