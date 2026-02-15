import { useState, useEffect } from 'react';
import { getConfig, saveConfig, validateToken, createGist, listUserGists } from '@/shared/lib/github';
import { loadFromGist } from '@/shared/store/store';
import type { GistInfo } from '../types';

interface Props {
	onBrowseGists: (gists: GistInfo[], mode: 'primary' | 'backup') => void;
	selectedGistId?: string | null;
}

export default function GistConfigSection({ onBrowseGists, selectedGistId }: Props) {
	const [token, setToken] = useState(getConfig().token);
	const [gistId, setGistId] = useState(getConfig().gistId || '');
	const [status, setStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid' | 'loading'>('idle');
	const [message, setMessage] = useState('');

	// Handle gist selection from parent's shared gist list
	useEffect(() => {
		if (selectedGistId) {
			setGistId(selectedGistId);
			saveConfig({ gistId: selectedGistId });
			setMessage('Gist selected! Loading data...');
			loadFromGist();
		}
	}, [selectedGistId]);

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
			onBrowseGists(gists, 'primary');
			setStatus('idle');
		} catch {
			setMessage('Failed to load gists');
			setStatus('invalid');
		}
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
						<button onClick={handleLoadGists} className="flex-1 btn-secondary">
							Browse Gists
						</button>
						<button onClick={handleCreateGist} className="flex-1 btn-primary">
							Create New
						</button>
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
	);
}
