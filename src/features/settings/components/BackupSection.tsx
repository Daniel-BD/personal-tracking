import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getConfig, saveConfig, createGist, listUserGists } from '@/shared/lib/github';
import { backupToGist, restoreFromBackupGist } from '@/shared/store/store';
import ConfirmDialog from '@/shared/ui/ConfirmDialog';
import type { GistInfo } from '../types';

interface Props {
	token: string;
	onBrowseGists: (gists: GistInfo[], mode: 'primary' | 'backup') => void;
	selectedGistId?: string | null;
}

export default function BackupSection({ token, onBrowseGists, selectedGistId }: Props) {
	const { t } = useTranslation('settings');
	const [backupGistId, setBackupGistId] = useState(getConfig().backupGistId || '');
	const [backupStatus, setBackupStatus] = useState<'idle' | 'backing-up' | 'restoring' | 'success' | 'error'>('idle');
	const [backupMessage, setBackupMessage] = useState('');
	const [confirmRestoreOpen, setConfirmRestoreOpen] = useState(false);

	// Handle gist selection from parent's shared gist list
	useEffect(() => {
		if (selectedGistId) {
			setBackupGistId(selectedGistId);
			saveConfig({ backupGistId: selectedGistId });
			setBackupMessage(t('backup.messages.backupGistSelected'));
			setBackupStatus('success');
		}
	}, [selectedGistId, t]);

	async function handleBrowseGistsForBackup() {
		if (!token.trim()) {
			setBackupMessage(t('backup.messages.tokenRequired'));
			setBackupStatus('error');
			return;
		}

		try {
			const gists = await listUserGists(token.trim());
			onBrowseGists(gists, 'backup');
		} catch {
			setBackupMessage(t('backup.messages.loadGistsFailed'));
			setBackupStatus('error');
		}
	}

	async function handleBackupNow() {
		if (!backupGistId.trim()) {
			setBackupMessage(t('backup.messages.backupGistRequired'));
			setBackupStatus('error');
			return;
		}

		setBackupStatus('backing-up');
		setBackupMessage('');
		try {
			await backupToGist(backupGistId.trim());
			setBackupMessage(t('backup.messages.backupComplete'));
			setBackupStatus('success');
		} catch {
			setBackupMessage(t('backup.messages.backupFailed'));
			setBackupStatus('error');
		}
	}

	function handleRestoreFromBackup() {
		if (!backupGistId.trim()) {
			setBackupMessage(t('backup.messages.backupGistRequired'));
			setBackupStatus('error');
			return;
		}
		setConfirmRestoreOpen(true);
	}

	async function confirmRestore() {
		setBackupStatus('restoring');
		setBackupMessage('');
		try {
			await restoreFromBackupGist(backupGistId.trim());
			setBackupMessage(t('backup.messages.restoreComplete'));
			setBackupStatus('success');
		} catch {
			setBackupMessage(t('backup.messages.restoreFailed'));
			setBackupStatus('error');
		}
	}

	async function handleCreateBackupGist() {
		if (!token.trim()) {
			setBackupMessage(t('backup.messages.tokenRequired'));
			setBackupStatus('error');
			return;
		}

		setBackupStatus('backing-up');
		try {
			const newGistId = await createGist(token.trim());
			setBackupGistId(newGistId);
			saveConfig({ backupGistId: newGistId });
			setBackupMessage(t('backup.messages.backupGistCreated'));
			setBackupStatus('success');
		} catch {
			setBackupMessage(t('backup.messages.createBackupFailed'));
			setBackupStatus('error');
		}
	}

	function handleSaveBackupGistId() {
		saveConfig({ backupGistId: backupGistId.trim() || null });
		setBackupMessage(t('backup.messages.backupGistIdSaved'));
		setBackupStatus('success');
	}

	return (
		<div className="card p-6 space-y-4">
			<h3 className="text-lg font-semibold text-heading">{t('backup.title')}</h3>
			<p className="text-sm text-body">{t('backup.description')}</p>

			<div className="space-y-2">
				<label htmlFor="backupGistId" className="form-label">
					{t('backup.gistIdLabel')}
				</label>
				<input
					id="backupGistId"
					type="text"
					value={backupGistId}
					onChange={(e) => setBackupGistId(e.target.value)}
					placeholder={t('backup.gistIdPlaceholder')}
					className="form-input"
				/>
				<div className="flex gap-2">
					<button onClick={handleSaveBackupGistId} className="flex-1 btn-secondary">
						{t('backup.saveButton')}
					</button>
					<button onClick={handleBrowseGistsForBackup} className="flex-1 btn-secondary">
						{t('backup.browseButton')}
					</button>
					<button onClick={handleCreateBackupGist} className="flex-1 btn-primary">
						{t('backup.createNewButton')}
					</button>
				</div>
			</div>

			{backupGistId && (
				<div className="border-t border-[var(--border-default)] pt-4 space-y-2">
					<div className="flex gap-2">
						<button
							onClick={handleBackupNow}
							disabled={backupStatus === 'backing-up' || backupStatus === 'restoring'}
							className="flex-1 btn-success"
						>
							{backupStatus === 'backing-up' ? t('backup.backingUpButton') : t('backup.backupNowButton')}
						</button>
						<button
							onClick={handleRestoreFromBackup}
							disabled={backupStatus === 'backing-up' || backupStatus === 'restoring'}
							className="flex-1 btn-danger"
						>
							{backupStatus === 'restoring' ? t('backup.restoringButton') : t('backup.restoreButton')}
						</button>
					</div>
				</div>
			)}

			{backupMessage && (
				<p
					className="text-sm"
					style={{ color: `var(${backupStatus === 'error' ? '--color-danger' : '--color-success'})` }}
				>
					{backupMessage}
				</p>
			)}

			<ConfirmDialog
				open={confirmRestoreOpen}
				onClose={() => setConfirmRestoreOpen(false)}
				onConfirm={confirmRestore}
				title={t('backup.confirmTitle')}
				message={t('backup.confirmMessage')}
				confirmLabel={t('backup.confirmLabel')}
			/>
		</div>
	);
}
