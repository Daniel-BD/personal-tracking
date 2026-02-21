import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { exportData, importData } from '@/shared/store/store';
import ConfirmDialog from '@/shared/ui/ConfirmDialog';

interface Props {
	onMessage: (message: string, isError: boolean) => void;
}

export default function ExportImportSection({ onMessage }: Props) {
	const { t } = useTranslation('settings');
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
				onMessage(t('exportImport.importSuccess'), false);
			} else {
				onMessage(t('exportImport.importFailed'), true);
			}
			setPendingFile(null);
		};
		reader.readAsText(pendingFile);
	}

	return (
		<div className="card p-6 space-y-4">
			<h3 className="text-lg font-semibold text-heading">{t('exportImport.title')}</h3>
			<p className="text-sm text-body">{t('exportImport.description')}</p>
			<div className="flex gap-2">
				<button onClick={handleExport} className="flex-1 btn-primary">
					{t('exportImport.exportButton')}
				</button>
				<button onClick={handleImportClick} className="flex-1 btn-secondary">
					{t('exportImport.importButton')}
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
				title={t('exportImport.confirmTitle')}
				message={t('exportImport.confirmMessage')}
				confirmLabel={t('exportImport.confirmLabel')}
			/>
		</div>
	);
}
