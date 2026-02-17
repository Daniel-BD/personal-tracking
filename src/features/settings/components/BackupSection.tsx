import { useState, useEffect } from 'react';
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
	const [backupGistId, setBackupGistId] = useState(getConfig().backupGistId || '');
	const [backupStatus, setBackupStatus] = useState<'idle' | 'backing-up' | 'restoring' | 'success' | 'error'>('idle');
	const [backupMessage, setBackupMessage] = useState('');
	const [confirmRestoreOpen, setConfirmRestoreOpen] = useState(false);

	// Handle gist selection from parent's shared gist list
	useEffect(() => {
		if (selectedGistId) {
			setBackupGistId(selectedGistId);
			saveConfig({ backupGistId: selectedGistId });
			setBackupMessage('Backup Gist selected!');
			setBackupStatus('success');
		}
	}, [selectedGistId]);

	async function handleBrowseGistsForBackup() {
		if (!token.trim()) {
			setBackupMessage('Please enter and validate a token first');
			setBackupStatus('error');
			return;
		}

		try {
			const gists = await listUserGists(token.trim());
			onBrowseGists(gists, 'backup');
		} catch {
			setBackupMessage('Failed to load gists');
			setBackupStatus('error');
		}
	}

	async function handleBackupNow() {
		if (!backupGistId.trim()) {
			setBackupMessage('Please set a backup Gist ID first');
			setBackupStatus('error');
			return;
		}

		setBackupStatus('backing-up');
		setBackupMessage('');
		try {
			await backupToGist(backupGistId.trim());
			setBackupMessage('Backup complete!');
			setBackupStatus('success');
		} catch {
			setBackupMessage('Backup failed');
			setBackupStatus('error');
		}
	}

	function handleRestoreFromBackup() {
		if (!backupGistId.trim()) {
			setBackupMessage('Please set a backup Gist ID first');
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
			setBackupMessage('Restore complete!');
			setBackupStatus('success');
		} catch {
			setBackupMessage('Restore failed');
			setBackupStatus('error');
		}
	}

	async function handleCreateBackupGist() {
		if (!token.trim()) {
			setBackupMessage('Please enter and validate a token first');
			setBackupStatus('error');
			return;
		}

		setBackupStatus('backing-up');
		try {
			const newGistId = await createGist(token.trim());
			setBackupGistId(newGistId);
			saveConfig({ backupGistId: newGistId });
			setBackupMessage('Backup gist created!');
			setBackupStatus('success');
		} catch {
			setBackupMessage('Failed to create backup gist');
			setBackupStatus('error');
		}
	}

	function handleSaveBackupGistId() {
		saveConfig({ backupGistId: backupGistId.trim() || null });
		setBackupMessage('Backup Gist ID saved!');
		setBackupStatus('success');
	}

	return (
		<div className="card p-6 space-y-4">
			<h3 className="text-lg font-semibold text-heading">Backup Gist</h3>
			<p className="text-sm text-body">
				Configure a secondary Gist for manual backups. Use this before making major changes.
			</p>

			<div className="space-y-2">
				<label htmlFor="backupGistId" className="form-label">
					Backup Gist ID
				</label>
				<input
					id="backupGistId"
					type="text"
					value={backupGistId}
					onChange={(e) => setBackupGistId(e.target.value)}
					placeholder="Enter backup Gist ID"
					className="form-input"
				/>
				<div className="flex gap-2">
					<button onClick={handleSaveBackupGistId} className="flex-1 btn-secondary">
						Save
					</button>
					<button onClick={handleBrowseGistsForBackup} className="flex-1 btn-secondary">
						Browse
					</button>
					<button onClick={handleCreateBackupGist} className="flex-1 btn-primary">
						Create New
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
							{backupStatus === 'backing-up' ? 'Backing up...' : 'Backup Now'}
						</button>
						<button
							onClick={handleRestoreFromBackup}
							disabled={backupStatus === 'backing-up' || backupStatus === 'restoring'}
							className="flex-1 btn-danger"
						>
							{backupStatus === 'restoring' ? 'Restoring...' : 'Restore from Backup'}
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
				title="Restore from Backup"
				message="This will replace all current data with the backup. Are you sure?"
				confirmLabel="Restore"
			/>
		</div>
	);
}
