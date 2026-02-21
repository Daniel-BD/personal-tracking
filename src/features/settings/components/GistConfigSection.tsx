import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getConfig, saveConfig, validateToken, createGist, listUserGists } from '@/shared/lib/github';
import { loadFromGist } from '@/shared/store/store';
import type { GistInfo } from '../types';

interface Props {
	onBrowseGists: (gists: GistInfo[], mode: 'primary' | 'backup') => void;
	selectedGistId?: string | null;
}

export default function GistConfigSection({ onBrowseGists, selectedGistId }: Props) {
	const { t } = useTranslation('settings');
	const [token, setToken] = useState(getConfig().token);
	const [gistId, setGistId] = useState(getConfig().gistId || '');
	const [status, setStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid' | 'loading'>('idle');
	const [message, setMessage] = useState('');

	// Handle gist selection from parent's shared gist list
	useEffect(() => {
		if (selectedGistId) {
			setGistId(selectedGistId);
			saveConfig({ gistId: selectedGistId });
			setMessage(t('gistConfig.messages.gistSelected'));
			loadFromGist();
		}
	}, [selectedGistId, t]);

	async function handleValidate() {
		if (!token.trim()) {
			setMessage(t('gistConfig.messages.enterToken'));
			setStatus('invalid');
			return;
		}

		setStatus('validating');
		setMessage('');

		const isValid = await validateToken(token.trim());
		if (isValid) {
			setStatus('valid');
			setMessage(t('gistConfig.messages.tokenValid'));
			saveConfig({ token: token.trim(), gistId: gistId || null });
		} else {
			setStatus('invalid');
			setMessage(t('gistConfig.messages.tokenInvalid'));
		}
	}

	async function handleLoadGists() {
		if (!token.trim()) {
			setMessage(t('gistConfig.messages.tokenRequired'));
			return;
		}

		setStatus('loading');
		try {
			const gists = await listUserGists(token.trim());
			onBrowseGists(gists, 'primary');
			setStatus('idle');
		} catch {
			setMessage(t('gistConfig.messages.loadGistsFailed'));
			setStatus('invalid');
		}
	}

	async function handleCreateGist() {
		if (!token.trim()) {
			setMessage(t('gistConfig.messages.tokenRequired'));
			return;
		}

		setStatus('loading');
		try {
			const newGistId = await createGist(token.trim());
			setGistId(newGistId);
			saveConfig({ token: token.trim(), gistId: newGistId });
			setMessage(t('gistConfig.messages.gistCreated'));
			setStatus('valid');
		} catch {
			setMessage(t('gistConfig.messages.gistCreateFailed'));
			setStatus('invalid');
		}
	}

	function handleSaveGistId() {
		if (!gistId.trim()) {
			setMessage(t('gistConfig.messages.gistIdRequired'));
			return;
		}

		saveConfig({ token: token.trim(), gistId: gistId.trim() });
		setMessage(t('gistConfig.messages.settingsSaved'));
		loadFromGist();
	}

	return (
		<div className="card p-6 space-y-4">
			<h3 className="text-lg font-semibold text-heading">{t('gistConfig.title')}</h3>

			<p className="text-sm text-body">
				{t('gistConfig.description')} <code className="bg-[var(--bg-inset)] px-1 rounded text-heading">gist</code>
			</p>

			<div className="space-y-2">
				<label htmlFor="token" className="form-label">
					{t('gistConfig.tokenLabel')}
				</label>
				<input
					id="token"
					type="password"
					value={token}
					onChange={(e) => setToken(e.target.value)}
					placeholder={t('gistConfig.tokenPlaceholder')}
					className="form-input"
				/>
				<button onClick={handleValidate} disabled={status === 'validating'} className="w-full btn-primary">
					{status === 'validating' ? t('gistConfig.validatingButton') : t('gistConfig.validateButton')}
				</button>
			</div>

			{(status === 'valid' || gistId) && (
				<div className="border-t border-[var(--border-default)] pt-4 space-y-2">
					<label htmlFor="gistId" className="form-label">
						{t('gistConfig.gistIdLabel')}
					</label>
					<input
						id="gistId"
						type="text"
						value={gistId}
						onChange={(e) => setGistId(e.target.value)}
						placeholder={t('gistConfig.gistIdPlaceholder')}
						className="form-input"
					/>

					<div className="flex gap-2">
						<button onClick={handleSaveGistId} className="flex-1 btn-success">
							{t('gistConfig.saveLoadButton')}
						</button>
						<button onClick={handleLoadGists} className="flex-1 btn-secondary">
							{t('gistConfig.browseGistsButton')}
						</button>
						<button onClick={handleCreateGist} className="flex-1 btn-primary">
							{t('gistConfig.createNewButton')}
						</button>
					</div>
				</div>
			)}

			{message && (
				<p className="text-sm" style={{ color: `var(${status === 'invalid' ? '--color-danger' : '--color-success'})` }}>
					{message}
				</p>
			)}
		</div>
	);
}
