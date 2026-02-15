import { useState } from 'react';
import { getConfig } from '@/shared/lib/github';
import type { GistInfo } from '../types';
import ThemeSection from './ThemeSection';
import GistConfigSection from './GistConfigSection';
import ExportImportSection from './ExportImportSection';
import BackupSection from './BackupSection';

export default function SettingsPage() {
	const [existingGists, setExistingGists] = useState<GistInfo[]>([]);
	const [showGistList, setShowGistList] = useState(false);
	const [gistSelectMode, setGistSelectMode] = useState<'primary' | 'backup'>('primary');
	const [selectedPrimaryGistId, setSelectedPrimaryGistId] = useState<string | null>(null);
	const [selectedBackupGistId, setSelectedBackupGistId] = useState<string | null>(null);
	const [importMessage, setImportMessage] = useState<{ text: string; isError: boolean } | null>(null);

	const token = getConfig().token;

	function handleBrowseGists(gists: GistInfo[], mode: 'primary' | 'backup') {
		setExistingGists(gists);
		setGistSelectMode(mode);
		setShowGistList(true);
	}

	function selectGist(id: string) {
		if (gistSelectMode === 'primary') {
			setSelectedPrimaryGistId(id);
		} else {
			setSelectedBackupGistId(id);
		}
		setShowGistList(false);
	}

	function handleImportMessage(text: string, isError: boolean) {
		setImportMessage({ text, isError });
	}

	return (
		<div className="space-y-6">
			<h2 className="text-2xl font-bold text-heading">Settings</h2>

			<ThemeSection />

			<GistConfigSection onBrowseGists={handleBrowseGists} selectedGistId={selectedPrimaryGistId} />

			{/* Shared gist list — shown inline when browsing */}
			{showGistList && existingGists.length > 0 && (
				<div className="card p-6">
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
									<span className="text-xs" style={{ color: 'var(--color-success)' }}>
										Contains tracker data
									</span>
								)}
							</button>
						))}
					</div>
				</div>
			)}

			<ExportImportSection onMessage={handleImportMessage} />

			{importMessage && (
				<p
					className="text-sm px-6"
					style={{ color: `var(${importMessage.isError ? '--color-danger' : '--color-success'})` }}
				>
					{importMessage.text}
				</p>
			)}

			{token && <BackupSection token={token} onBrowseGists={handleBrowseGists} selectedGistId={selectedBackupGistId} />}

			<div className="card p-6">
				<h3 className="text-lg font-semibold text-heading mb-4">How to get a GitHub Token</h3>
				<ol className="text-sm text-body space-y-2 list-decimal list-inside">
					<li>
						Go to GitHub Settings &rarr; Developer settings &rarr; Personal access tokens &rarr; Fine-grained tokens
					</li>
					<li>Click &quot;Generate new token&quot;</li>
					<li>Give it a name like &quot;Activity Tracker&quot;</li>
					<li>Under &quot;Account permissions&quot;, set Gists to &quot;Read and write&quot;</li>
					<li>Generate and copy the token</li>
				</ol>
			</div>
		</div>
	);
}
