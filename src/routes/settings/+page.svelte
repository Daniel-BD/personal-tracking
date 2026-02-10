<script lang="ts">
	import { getConfig, saveConfig, validateToken, createGist, listUserGists } from '$lib/github';
	import { loadFromGist, exportData, importData, backupToGist, restoreFromBackupGist } from '$lib/store';
	import { getStoredTheme, storeTheme, applyTheme, type ThemePreference } from '$lib/theme';
	import SegmentedControl from '../../components/SegmentedControl.svelte';

	let token = $state(getConfig().token);
	let gistId = $state(getConfig().gistId || '');
	let backupGistId = $state(getConfig().backupGistId || '');
	let status = $state<'idle' | 'validating' | 'valid' | 'invalid' | 'loading'>('idle');
	let message = $state('');
	let existingGists = $state<Array<{ id: string; description: string; files: string[] }>>([]);
	let showGistList = $state(false);
	let gistSelectMode = $state<'primary' | 'backup'>('primary');
	let backupStatus = $state<'idle' | 'backing-up' | 'restoring' | 'success' | 'error'>('idle');
	let backupMessage = $state('');
	let themePreference = $state<ThemePreference>(getStoredTheme());

	function handleThemeChange(value: ThemePreference) {
		themePreference = value;
		storeTheme(value);
		applyTheme(value);
	}

	async function handleValidate() {
		if (!token.trim()) {
			message = 'Please enter a token';
			status = 'invalid';
			return;
		}

		status = 'validating';
		message = '';

		const isValid = await validateToken(token.trim());
		if (isValid) {
			status = 'valid';
			message = 'Token is valid!';
			saveConfig({ token: token.trim(), gistId: gistId || null });
		} else {
			status = 'invalid';
			message = 'Invalid token. Please check and try again.';
		}
	}

	async function handleLoadGists() {
		if (!token.trim()) {
			message = 'Please enter and validate a token first';
			return;
		}

		gistSelectMode = 'primary';
		status = 'loading';
		try {
			existingGists = await listUserGists(token.trim());
			showGistList = true;
			status = 'idle';
		} catch {
			message = 'Failed to load gists';
			status = 'invalid';
		}
	}

	function selectGist(id: string) {
		if (gistSelectMode === 'primary') {
			gistId = id;
			saveConfig({ gistId });
			message = 'Gist selected! Loading data...';
			loadFromGist();
		} else {
			backupGistId = id;
			saveConfig({ backupGistId });
			backupMessage = 'Backup Gist selected!';
			backupStatus = 'success';
		}
		showGistList = false;
	}

	function handleBrowseGistsForBackup() {
		gistSelectMode = 'backup';
		handleLoadGists();
	}

	async function handleBackupNow() {
		if (!backupGistId.trim()) {
			backupMessage = 'Please set a backup Gist ID first';
			backupStatus = 'error';
			return;
		}

		backupStatus = 'backing-up';
		backupMessage = '';
		try {
			await backupToGist(backupGistId.trim());
			backupMessage = 'Backup complete!';
			backupStatus = 'success';
		} catch {
			backupMessage = 'Backup failed';
			backupStatus = 'error';
		}
	}

	async function handleRestoreFromBackup() {
		if (!backupGistId.trim()) {
			backupMessage = 'Please set a backup Gist ID first';
			backupStatus = 'error';
			return;
		}

		if (!confirm('This will replace all current data with the backup. Are you sure?')) {
			return;
		}

		backupStatus = 'restoring';
		backupMessage = '';
		try {
			await restoreFromBackupGist(backupGistId.trim());
			backupMessage = 'Restore complete!';
			backupStatus = 'success';
		} catch {
			backupMessage = 'Restore failed';
			backupStatus = 'error';
		}
	}

	function handleExport() {
		exportData();
	}

	let fileInput: HTMLInputElement;

	function handleImportClick() {
		fileInput?.click();
	}

	function handleFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		if (!confirm('This will replace all current data. Are you sure?')) {
			input.value = '';
			return;
		}

		const reader = new FileReader();
		reader.onload = (e) => {
			const content = e.target?.result as string;
			const success = importData(content);
			if (success) {
				message = 'Import successful!';
				status = 'valid';
			} else {
				message = 'Import failed: Invalid file format';
				status = 'invalid';
			}
			input.value = '';
		};
		reader.readAsText(file);
	}

	async function handleCreateBackupGist() {
		if (!token.trim()) {
			backupMessage = 'Please enter and validate a token first';
			backupStatus = 'error';
			return;
		}

		backupStatus = 'backing-up';
		try {
			const newGistId = await createGist(token.trim());
			backupGistId = newGistId;
			saveConfig({ backupGistId: newGistId });
			backupMessage = 'Backup gist created!';
			backupStatus = 'success';
		} catch {
			backupMessage = 'Failed to create backup gist';
			backupStatus = 'error';
		}
	}

	function handleSaveBackupGistId() {
		saveConfig({ backupGistId: backupGistId.trim() || null });
		backupMessage = 'Backup Gist ID saved!';
		backupStatus = 'success';
	}

	async function handleCreateGist() {
		if (!token.trim()) {
			message = 'Please enter and validate a token first';
			return;
		}

		status = 'loading';
		try {
			const newGistId = await createGist(token.trim());
			gistId = newGistId;
			saveConfig({ token: token.trim(), gistId: newGistId });
			message = 'New gist created successfully!';
			status = 'valid';
		} catch {
			message = 'Failed to create gist';
			status = 'invalid';
		}
	}

	function handleSaveGistId() {
		if (!gistId.trim()) {
			message = 'Please enter a Gist ID';
			return;
		}

		saveConfig({ token: token.trim(), gistId: gistId.trim() });
		message = 'Settings saved! Loading data...';
		loadFromGist();
	}
</script>

<div class="space-y-6">
	<h2 class="text-2xl font-bold text-heading">Settings</h2>

	<!-- Theme Section -->
	<div class="card p-6 space-y-4">
		<h3 class="text-lg font-semibold text-heading">Appearance</h3>
		<p class="text-sm text-body">Choose your preferred color scheme.</p>
		<SegmentedControl
			options={[
				{ value: 'light', label: 'Light' },
				{ value: 'dark', label: 'Dark' },
				{ value: 'system', label: 'System' }
			]}
			value={themePreference}
			onchange={handleThemeChange}
			variant="segment"
		/>
	</div>

	<div class="card p-6 space-y-4">
		<h3 class="text-lg font-semibold text-heading">GitHub Gist Configuration</h3>

		<p class="text-sm text-body">
			Your data is stored in a private GitHub Gist. You'll need a GitHub Personal Access Token with
			<code class="bg-[var(--bg-inset)] px-1 rounded text-heading">gist</code> scope.
		</p>

		<div class="space-y-2">
			<label for="token" class="form-label">
				GitHub Personal Access Token
			</label>
			<input
				id="token"
				type="password"
				bind:value={token}
				placeholder="ghp_xxxxxxxxxxxx"
				class="form-input"
			/>
			<button
				onclick={handleValidate}
				disabled={status === 'validating'}
				class="w-full btn-primary"
			>
				{status === 'validating' ? 'Validating...' : 'Validate Token'}
			</button>
		</div>

		{#if status === 'valid' || gistId}
			<div class="border-t border-[var(--border-default)] pt-4 space-y-2">
				<label for="gistId" class="form-label">Gist ID</label>
				<input
					id="gistId"
					type="text"
					bind:value={gistId}
					placeholder="Enter Gist ID or select/create below"
					class="form-input"
				/>

				<div class="flex gap-2">
					<button
						onclick={handleSaveGistId}
						class="flex-1 btn-success"
					>
						Save & Load
					</button>
					<button
						onclick={handleLoadGists}
						class="flex-1 btn-secondary"
					>
						Browse Gists
					</button>
					<button
						onclick={handleCreateGist}
						class="flex-1 btn-primary"
					>
						Create New
					</button>
				</div>
			</div>
		{/if}

		{#if showGistList && existingGists.length > 0}
			<div class="border-t border-[var(--border-default)] pt-4">
				<h4 class="text-sm font-medium text-body mb-2">
					{gistSelectMode === 'primary' ? 'Your Gists' : 'Select Backup Gist'}
				</h4>
				<div class="max-h-60 overflow-y-auto space-y-2">
					{#each existingGists as gist}
						<button
							onclick={() => selectGist(gist.id)}
							class="w-full text-left p-3 border rounded-md hover:bg-[var(--bg-card-hover)] transition-colors {gist.files.includes(
								'tracker-data.json'
							)
								? 'border-[var(--color-success-border)] bg-[var(--color-success-bg)]'
								: 'border-[var(--border-default)]'}"
						>
							<div class="text-sm font-medium truncate text-heading">{gist.description}</div>
							<div class="text-xs text-label">{gist.id}</div>
							<div class="text-xs text-subtle">
								Files: {gist.files.slice(0, 3).join(', ')}
								{gist.files.length > 3 ? '...' : ''}
							</div>
							{#if gist.files.includes('tracker-data.json')}
								<span class="text-xs" style="color: var(--color-success);">Contains tracker data</span>
							{/if}
						</button>
					{/each}
				</div>
			</div>
		{/if}

		{#if message}
			<p
				class="text-sm"
				style="color: var({status === 'invalid' ? '--color-danger' : '--color-success'});"
			>
				{message}
			</p>
		{/if}
	</div>

	<!-- Export/Import Section -->
	<div class="card p-6 space-y-4">
		<h3 class="text-lg font-semibold text-heading">Export & Import</h3>
		<p class="text-sm text-body">
			Download your data as a JSON file for safekeeping, or restore from a previous backup.
		</p>
		<div class="flex gap-2">
			<button
				onclick={handleExport}
				class="flex-1 btn-primary"
			>
				Export JSON
			</button>
			<button
				onclick={handleImportClick}
				class="flex-1 btn-secondary"
			>
				Import JSON
			</button>
		</div>
		<input
			type="file"
			accept=".json,application/json"
			class="hidden"
			bind:this={fileInput}
			onchange={handleFileSelect}
		/>
	</div>

	<!-- Backup Gist Section -->
	{#if token}
		<div class="card p-6 space-y-4">
			<h3 class="text-lg font-semibold text-heading">Backup Gist</h3>
			<p class="text-sm text-body">
				Configure a secondary Gist for manual backups. Use this before making major changes.
			</p>

			<div class="space-y-2">
				<label for="backupGistId" class="form-label">
					Backup Gist ID
				</label>
				<input
					id="backupGistId"
					type="text"
					bind:value={backupGistId}
					placeholder="Enter backup Gist ID"
					class="form-input"
				/>
				<div class="flex gap-2">
					<button
						onclick={handleSaveBackupGistId}
						class="flex-1 btn-secondary"
					>
						Save
					</button>
					<button
						onclick={handleBrowseGistsForBackup}
						class="flex-1 btn-secondary"
					>
						Browse
					</button>
					<button
						onclick={handleCreateBackupGist}
						class="flex-1 btn-primary"
					>
						Create New
					</button>
				</div>
			</div>

			{#if backupGistId}
				<div class="border-t border-[var(--border-default)] pt-4 space-y-2">
					<div class="flex gap-2">
						<button
							onclick={handleBackupNow}
							disabled={backupStatus === 'backing-up' || backupStatus === 'restoring'}
							class="flex-1 btn-success"
						>
							{backupStatus === 'backing-up' ? 'Backing up...' : 'Backup Now'}
						</button>
						<button
							onclick={handleRestoreFromBackup}
							disabled={backupStatus === 'backing-up' || backupStatus === 'restoring'}
							class="flex-1 btn-danger"
						>
							{backupStatus === 'restoring' ? 'Restoring...' : 'Restore from Backup'}
						</button>
					</div>
				</div>
			{/if}

			{#if backupMessage}
				<p
					class="text-sm"
					style="color: var({backupStatus === 'error' ? '--color-danger' : '--color-success'});"
				>
					{backupMessage}
				</p>
			{/if}
		</div>
	{/if}

	<div class="card p-6">
		<h3 class="text-lg font-semibold text-heading mb-4">How to get a GitHub Token</h3>
		<ol class="text-sm text-body space-y-2 list-decimal list-inside">
			<li>Go to GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens</li>
			<li>Click "Generate new token"</li>
			<li>Give it a name like "Activity Tracker"</li>
			<li>Under "Account permissions", set Gists to "Read and write"</li>
			<li>Generate and copy the token</li>
		</ol>
	</div>
</div>
