<script lang="ts">
	import { getConfig, saveConfig, validateToken, createGist, listUserGists } from '$lib/github';
	import { loadFromGist } from '$lib/store';

	let token = $state(getConfig().token);
	let gistId = $state(getConfig().gistId || '');
	let status = $state<'idle' | 'validating' | 'valid' | 'invalid' | 'loading'>('idle');
	let message = $state('');
	let existingGists = $state<Array<{ id: string; description: string; files: string[] }>>([]);
	let showGistList = $state(false);

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
		gistId = id;
		showGistList = false;
		saveConfig({ token: token.trim(), gistId });
		message = 'Gist selected! Loading data...';
		loadFromGist();
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
				<h4 class="text-sm font-medium text-gray-700 mb-2">Your Gists</h4>
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
