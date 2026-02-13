import { useRef } from 'react';
import { exportData, importData } from '@/shared/store/store';

interface Props {
	onMessage: (message: string, isError: boolean) => void;
}

export default function ExportImportSection({ onMessage }: Props) {
	const fileInputRef = useRef<HTMLInputElement>(null);

	function handleExport() {
		exportData();
	}

	function handleImportClick() {
		fileInputRef.current?.click();
	}

	function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		if (!file) return;

		if (!confirm('This will replace all current data. Are you sure?')) {
			event.target.value = '';
			return;
		}

		const reader = new FileReader();
		reader.onload = (e) => {
			const content = e.target?.result as string;
			const success = importData(content);
			if (success) {
				onMessage('Import successful!', false);
			} else {
				onMessage('Import failed: Invalid file format', true);
			}
			if (fileInputRef.current) fileInputRef.current.value = '';
		};
		reader.readAsText(file);
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
		</div>
	);
}
