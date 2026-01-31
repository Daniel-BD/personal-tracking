<script lang="ts">
	import { getConfig, saveConfig, validateToken, createGist, listUserGists } from '$lib/github';
	import { loadFromGist, exportData, importData, backupToGist, restoreFromBackupGist } from '$lib/store';

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
	<h2 class="text-2xl font-bold text-gray-900">Settings</h2>

	<div class="bg-white rounded-lg shadow p-6 space-y-4">
		<h3 class="text-lg font-semibold text-gray-800">GitHub Gist Configuration</h3>

		<p class="text-sm text-gray-600">
			Your data is stored in a private GitHub Gist. You'll need a GitHub Personal Access Token with
			<code class="bg-gray-100 px-1 rounded">gist</code> scope.
		</p>

		<div class="space-y-2">
			<label for="token" class="block text-sm font-medium text-gray-700">
				GitHub Personal Access Token
			</label>
			<input
				id="token"
				type="password"
				bind:value={token}
				placeholder="ghp_xxxxxxxxxxxx"
				class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
			/>
			<button
				onclick={handleValidate}
				disabled={status === 'validating'}
				class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
			>
				{status === 'validating' ? 'Validating...' : 'Validate Token'}
			</button>
		</div>

		{#if status === 'valid' || gistId}
			<div class="border-t pt-4 space-y-2">
				<label for="gistId" class="block text-sm font-medium text-gray-700"> Gist ID </label>
				<input
					id="gistId"
					type="text"
					bind:value={gistId}
					placeholder="Enter Gist ID or select/create below"
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>

				<div class="flex gap-2">
					<button
						onclick={handleSaveGistId}
						class="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700"
					>
						Save & Load
					</button>
					<button
						onclick={handleLoadGists}
						class="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700"
					>
						Browse Gists
					</button>
					<button
						onclick={handleCreateGist}
						class="flex-1 bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700"
					>
						Create New
					</button>
				</div>
			</div>
		{/if}

		{#if showGistList && existingGists.length > 0}
			<div class="border-t pt-4">
				<h4 class="text-sm font-medium text-gray-700 mb-2">
					{gistSelectMode === 'primary' ? 'Your Gists' : 'Select Backup Gist'}
				</h4>
				<div class="max-h-60 overflow-y-auto space-y-2">
					{#each existingGists as gist}
						<button
							onclick={() => selectGist(gist.id)}
							class="w-full text-left p-3 border rounded-md hover:bg-gray-50 {gist.files.includes(
								'tracker-data.json'
							)
								? 'border-green-300 bg-green-50'
								: 'border-gray-200'}"
						>
							<div class="text-sm font-medium truncate">{gist.description}</div>
							<div class="text-xs text-gray-500">{gist.id}</div>
							<div class="text-xs text-gray-400">
								Files: {gist.files.slice(0, 3).join(', ')}
								{gist.files.length > 3 ? '...' : ''}
							</div>
							{#if gist.files.includes('tracker-data.json')}
								<span class="text-xs text-green-600">Contains tracker data</span>
							{/if}
						</button>
					{/each}
				</div>
			</div>
		{/if}

		{#if message}
			<p
				class="text-sm {status === 'invalid' ? 'text-red-600' : 'text-green-600'}"
			>
				{message}
			</p>
		{/if}
	</div>

	<!-- Export/Import Section -->
	<div class="bg-white rounded-lg shadow p-6 space-y-4">
		<h3 class="text-lg font-semibold text-gray-800">Export & Import</h3>
		<p class="text-sm text-gray-600">
			Download your data as a JSON file for safekeeping, or restore from a previous backup.
		</p>
		<div class="flex gap-2">
			<button
				onclick={handleExport}
				class="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
			>
				Export JSON
			</button>
			<button
				onclick={handleImportClick}
				class="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700"
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
		<div class="bg-white rounded-lg shadow p-6 space-y-4">
			<h3 class="text-lg font-semibold text-gray-800">Backup Gist</h3>
			<p class="text-sm text-gray-600">
				Configure a secondary Gist for manual backups. Use this before making major changes.
			</p>

			<div class="space-y-2">
				<label for="backupGistId" class="block text-sm font-medium text-gray-700">
					Backup Gist ID
				</label>
				<input
					id="backupGistId"
					type="text"
					bind:value={backupGistId}
					placeholder="Enter backup Gist ID"
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
				<div class="flex gap-2">
					<button
						onclick={handleSaveBackupGistId}
						class="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700"
					>
						Save
					</button>
					<button
						onclick={handleBrowseGistsForBackup}
						class="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700"
					>
						Browse
					</button>
					<button
						onclick={handleCreateBackupGist}
						class="flex-1 bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700"
					>
						Create New
					</button>
				</div>
			</div>

			{#if backupGistId}
				<div class="border-t pt-4 space-y-2">
					<div class="flex gap-2">
						<button
							onclick={handleBackupNow}
							disabled={backupStatus === 'backing-up' || backupStatus === 'restoring'}
							class="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
						>
							{backupStatus === 'backing-up' ? 'Backing up...' : 'Backup Now'}
						</button>
						<button
							onclick={handleRestoreFromBackup}
							disabled={backupStatus === 'backing-up' || backupStatus === 'restoring'}
							class="flex-1 bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700 disabled:opacity-50"
						>
							{backupStatus === 'restoring' ? 'Restoring...' : 'Restore from Backup'}
						</button>
					</div>
				</div>
			{/if}

			{#if backupMessage}
				<p
					class="text-sm {backupStatus === 'error' ? 'text-red-600' : 'text-green-600'}"
				>
					{backupMessage}
				</p>
			{/if}
		</div>
	{/if}

	<div class="bg-white rounded-lg shadow p-6">
		<h3 class="text-lg font-semibold text-gray-800 mb-4">How to get a GitHub Token</h3>
		<ol class="text-sm text-gray-600 space-y-2 list-decimal list-inside">
			<li>Go to GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens</li>
			<li>Click "Generate new token"</li>
			<li>Give it a name like "Activity Tracker"</li>
			<li>Under "Account permissions", set Gists to "Read and write"</li>
			<li>Generate and copy the token</li>
		</ol>
	</div>
</div>
