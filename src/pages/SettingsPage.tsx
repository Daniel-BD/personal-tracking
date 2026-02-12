import { useState, useRef } from 'react';
import { getConfig, saveConfig, validateToken, createGist, listUserGists } from '../lib/github';
import { loadFromGist, exportData, importData, backupToGist, restoreFromBackupGist } from '../lib/store';
import { getStoredTheme, storeTheme, applyTheme, type ThemePreference } from '../lib/theme';
import SegmentedControl from '../components/SegmentedControl';

export default function SettingsPage() {
	const [token, setToken] = useState(getConfig().token);
	const [gistId, setGistId] = useState(getConfig().gistId || '');
	const [backupGistId, setBackupGistId] = useState(getConfig().backupGistId || '');
	const [status, setStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid' | 'loading'>('idle');
	const [message, setMessage] = useState('');
	const [existingGists, setExistingGists] = useState<Array<{ id: string; description: string; files: string[] }>>([]);
	const [showGistList, setShowGistList] = useState(false);
	const [gistSelectMode, setGistSelectMode] = useState<'primary' | 'backup'>('primary');
	const [backupStatus, setBackupStatus] = useState<'idle' | 'backing-up' | 'restoring' | 'success' | 'error'>('idle');
	const [backupMessage, setBackupMessage] = useState('');
	const [themePreference, setThemePreference] = useState<ThemePreference>(getStoredTheme());
	const fileInputRef = useRef<HTMLInputElement>(null);

	function handleThemeChange(value: ThemePreference) {
		setThemePreference(value);
		storeTheme(value);
		applyTheme(value);
	}

	async function handleValidate() {
		if (!token.trim()) {
			setMessage('Please enter a token');
			setStatus('invalid');
			return;
		}

		setStatus('validating');
		setMessage('');

		const isValid = await validateToken(token.trim());
		if (isValid) {
			setStatus('valid');
			setMessage('Token is valid!');
			saveConfig({ token: token.trim(), gistId: gistId || null });
		} else {
			setStatus('invalid');
			setMessage('Invalid token. Please check and try again.');
		}
	}

	async function handleLoadGists() {
		if (!token.trim()) {
			setMessage('Please enter and validate a token first');
			return;
		}

		setStatus('loading');
		try {
			const gists = await listUserGists(token.trim());
			setExistingGists(gists);
			setShowGistList(true);
			setStatus('idle');
		} catch {
			setMessage('Failed to load gists');
			setStatus('invalid');
		}
	}

	function selectGist(id: string) {
		if (gistSelectMode === 'primary') {
			setGistId(id);
			saveConfig({ gistId: id });
			setMessage('Gist selected! Loading data...');
			loadFromGist();
		} else {
			setBackupGistId(id);
			saveConfig({ backupGistId: id });
			setBackupMessage('Backup Gist selected!');
			setBackupStatus('success');
		}
		setShowGistList(false);
	}

	function handleBrowseGistsForBackup() {
		setGistSelectMode('backup');
		handleLoadGists();
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

	async function handleRestoreFromBackup() {
		if (!backupGistId.trim()) {
			setBackupMessage('Please set a backup Gist ID first');
			setBackupStatus('error');
			return;
		}

		if (!confirm('This will replace all current data with the backup. Are you sure?')) {
			return;
		}

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
				setMessage('Import successful!');
				setStatus('valid');
			} else {
				setMessage('Import failed: Invalid file format');
				setStatus('invalid');
			}
			if (fileInputRef.current) fileInputRef.current.value = '';
		};
		reader.readAsText(file);
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

	async function handleCreateGist() {
		if (!token.trim()) {
			setMessage('Please enter and validate a token first');
			return;
		}

		setStatus('loading');
		try {
			const newGistId = await createGist(token.trim());
			setGistId(newGistId);
			saveConfig({ token: token.trim(), gistId: newGistId });
			setMessage('New gist created successfully!');
			setStatus('valid');
		} catch {
			setMessage('Failed to create gist');
			setStatus('invalid');
		}
	}

	function handleSaveGistId() {
		if (!gistId.trim()) {
			setMessage('Please enter a Gist ID');
			return;
		}

		saveConfig({ token: token.trim(), gistId: gistId.trim() });
		setMessage('Settings saved! Loading data...');
		loadFromGist();
	}

	return (
		<div className="space-y-6">
			<h2 className="text-2xl font-bold text-heading">Settings</h2>

			{/* Theme Section */}
			<div className="card p-6 space-y-4">
				<h3 className="text-lg font-semibold text-heading">Appearance</h3>
				<p className="text-sm text-body">Choose your preferred color scheme.</p>
				<SegmentedControl
					options={[
						{ value: 'light' as const, label: 'Light' },
						{ value: 'dark' as const, label: 'Dark' },
						{ value: 'system' as const, label: 'System' }
					]}
					value={themePreference}
					onchange={handleThemeChange}
					variant="segment"
				/>
			</div>

			<div className="card p-6 space-y-4">
				<h3 className="text-lg font-semibold text-heading">GitHub Gist Configuration</h3>

				<p className="text-sm text-body">
					Your data is stored in a private GitHub Gist. You&apos;ll need a GitHub Personal Access Token with{' '}
					<code className="bg-[var(--bg-inset)] px-1 rounded text-heading">gist</code> scope.
				</p>

				<div className="space-y-2">
					<label htmlFor="token" className="form-label">
						GitHub Personal Access Token
					</label>
					<input
						id="token"
						type="password"
						value={token}
						onChange={(e) => setToken(e.target.value)}
						placeholder="ghp_xxxxxxxxxxxx"
						className="form-input"
					/>
					<button
						onClick={handleValidate}
						disabled={status === 'validating'}
						className="w-full btn-primary"
					>
						{status === 'validating' ? 'Validating...' : 'Validate Token'}
					</button>
				</div>

				{(status === 'valid' || gistId) && (
					<div className="border-t border-[var(--border-default)] pt-4 space-y-2">
						<label htmlFor="gistId" className="form-label">Gist ID</label>
						<input
							id="gistId"
							type="text"
							value={gistId}
							onChange={(e) => setGistId(e.target.value)}
							placeholder="Enter Gist ID or select/create below"
							className="form-input"
						/>

						<div className="flex gap-2">
							<button onClick={handleSaveGistId} className="flex-1 btn-success">
								Save &amp; Load
							</button>
							<button onClick={() => { setGistSelectMode('primary'); handleLoadGists(); }} className="flex-1 btn-secondary">
								Browse Gists
							</button>
							<button onClick={handleCreateGist} className="flex-1 btn-primary">
								Create New
							</button>
						</div>
					</div>
				)}

				{showGistList && existingGists.length > 0 && (
					<div className="border-t border-[var(--border-default)] pt-4">
						<h4 className="text-sm font-medium text-body mb-2">
							{gistSelectMode === 'primary' ? 'Your Gists' : 'Select Backup Gist'}
						</h4>
						<div className="max-h-60 overflow-y-auto space-y-2">
							{existingGists.map((gist) => (
								<button
									key={gist.id}
									onClick={() => selectGist(gist.id)}
									className={`w-full text-left p-3 border rounded-md hover:bg-[var(--bg-card-hover)] transition-colors ${
										gist.files.includes('tracker-data.json')
											? 'border-[var(--color-success-border)] bg-[var(--color-success-bg)]'
											: 'border-[var(--border-default)]'
									}`}
								>
									<div className="text-sm font-medium truncate text-heading">{gist.description}</div>
									<div className="text-xs text-label">{gist.id}</div>
									<div className="text-xs text-subtle">
										Files: {gist.files.slice(0, 3).join(', ')}
										{gist.files.length > 3 ? '...' : ''}
									</div>
									{gist.files.includes('tracker-data.json') && (
										<span className="text-xs" style={{ color: 'var(--color-success)' }}>Contains tracker data</span>
									)}
								</button>
							))}
						</div>
					</div>
				)}

				{message && (
					<p
						className="text-sm"
						style={{ color: `var(${status === 'invalid' ? '--color-danger' : '--color-success'})` }}
					>
						{message}
					</p>
				)}
			</div>

			{/* Export/Import Section */}
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

			{/* Backup Gist Section */}
			{token && (
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
				</div>
			)}

			<div className="card p-6">
				<h3 className="text-lg font-semibold text-heading mb-4">How to get a GitHub Token</h3>
				<ol className="text-sm text-body space-y-2 list-decimal list-inside">
					<li>Go to GitHub Settings &rarr; Developer settings &rarr; Personal access tokens &rarr; Fine-grained tokens</li>
					<li>Click &quot;Generate new token&quot;</li>
					<li>Give it a name like &quot;Activity Tracker&quot;</li>
					<li>Under &quot;Account permissions&quot;, set Gists to &quot;Read and write&quot;</li>
					<li>Generate and copy the token</li>
				</ol>
			</div>
		</div>
	);
}
