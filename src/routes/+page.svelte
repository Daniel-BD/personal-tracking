<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { isConfigured } from '$lib/github';
	import {
		initializeStore,
		entries,
		forceRefresh,
		syncStatus,
		activityItems,
		foodItems,
		addEntry
	} from '$lib/store';
	import {
		filterEntriesByDateRange,
		getMonthRange,
		compareMonths,
		filterEntriesByType
	} from '$lib/analysis';
	import { getTodayDate, getCurrentTime } from '$lib/types';
	import QuickLogForm from '../components/QuickLogForm.svelte';

	let configured = $state(false);
	let showSuccess = $state(false);
	let successMessage = $state('Entry logged successfully!');
	let errorMessage = $state<string | null>(null);

	function handleUrlAddParam() {
		const addParam = $page.url.searchParams.get('add');
		if (!addParam) return;

		const searchName = addParam.toLowerCase();

		// Find exact case-insensitive matches
		const activityMatch = $activityItems.find(
			(item) => item.name.toLowerCase() === searchName
		);
		const foodMatch = $foodItems.find((item) => item.name.toLowerCase() === searchName);

		// Clear the URL parameter
		goto(base || '/', { replaceState: true });

		if (activityMatch && foodMatch) {
			// Found in both - show error
			errorMessage = `"${addParam}" exists in both Activities and Food. Please log manually.`;
			setTimeout(() => (errorMessage = null), 4000);
		} else if (activityMatch) {
			// Log activity
			addEntry('activity', activityMatch.id, getTodayDate(), getCurrentTime());
			successMessage = `Logged "${activityMatch.name}" as activity!`;
			showSuccess = true;
			setTimeout(() => (showSuccess = false), 2000);
		} else if (foodMatch) {
			// Log food
			addEntry('food', foodMatch.id, getTodayDate(), getCurrentTime());
			successMessage = `Logged "${foodMatch.name}" as food!`;
			showSuccess = true;
			setTimeout(() => (showSuccess = false), 2000);
		} else {
			// Not found - show error
			errorMessage = `No item named "${addParam}" found in your library.`;
			setTimeout(() => (errorMessage = null), 4000);
		}
	}

	onMount(() => {
		configured = isConfigured();
		if (configured) {
			initializeStore();
			// Small delay to let store load before checking URL param
			setTimeout(handleUrlAddParam, 100);
		} else {
			// Even if not configured, check for URL param to show appropriate message
			handleUrlAddParam();
		}
	});

	function handleSave() {
		successMessage = 'Entry logged successfully!';
		showSuccess = true;
		setTimeout(() => (showSuccess = false), 2000);
	}

	async function handleRefresh() {
		await forceRefresh();
	}

	const thisMonthRange = $derived(getMonthRange());
	const thisMonthEntries = $derived(filterEntriesByDateRange($entries, thisMonthRange));
	const activityComparison = $derived(compareMonths(filterEntriesByType($entries, 'activity')));
	const foodComparison = $derived(compareMonths(filterEntriesByType($entries, 'food')));
</script>

<div class="space-y-6">
	{#if !configured}
		<div class="card p-4" style="background: var(--color-warning-bg); border-color: var(--color-warning-border);">
			<h2 class="font-semibold" style="color: var(--color-warning-text);">Setup Required</h2>
			<p class="text-sm mt-1" style="color: var(--color-warning-text); opacity: 0.85;">
				Configure your GitHub token to start tracking.
			</p>
			<a
				href="{base}/settings"
				class="inline-block mt-2 px-4 py-2 rounded-md text-sm font-medium text-white transition-colors"
				style="background: var(--color-warning);"
			>
				Go to Settings
			</a>
		</div>
	{:else}
		<div class="flex justify-between items-center">
			<h2 class="text-2xl font-bold text-heading">Quick Log</h2>
			<button
				onclick={handleRefresh}
				disabled={$syncStatus === 'syncing'}
				class="text-sm text-[var(--color-activity)] hover:text-[var(--color-activity-hover)] disabled:opacity-50"
			>
				{$syncStatus === 'syncing' ? 'Syncing...' : 'Refresh'}
			</button>
		</div>

		{#if showSuccess}
			<div class="card p-3 text-sm" style="background: var(--color-success-bg); border-color: var(--color-success-border); color: var(--color-success-text);">
				{successMessage}
			</div>
		{/if}

		{#if errorMessage}
			<div class="card p-3 text-sm" style="background: var(--color-danger-bg); border-color: var(--color-danger-border); color: var(--color-danger-text);">
				{errorMessage}
			</div>
		{/if}

		<QuickLogForm onsave={handleSave} />

		<div class="grid grid-cols-2 gap-4">
			<div class="card p-4">
				<div class="text-sm text-label">Activities this month</div>
				<div class="text-2xl font-bold text-[var(--color-activity)]">{activityComparison.current}</div>
				{#if activityComparison.difference !== 0}
					<div class="text-xs" style="color: var({activityComparison.difference > 0 ? '--color-success' : '--color-danger'});">
						{activityComparison.difference > 0 ? '+' : ''}{activityComparison.difference} vs last month
					</div>
				{/if}
			</div>
			<div class="card p-4">
				<div class="text-sm text-label">Food logged this month</div>
				<div class="text-2xl font-bold text-[var(--color-food)]">{foodComparison.current}</div>
				{#if foodComparison.difference !== 0}
					<div class="text-xs" style="color: var({foodComparison.difference > 0 ? '--color-success' : '--color-danger'});">
						{foodComparison.difference > 0 ? '+' : ''}{foodComparison.difference} vs last month
					</div>
				{/if}
			</div>
		</div>

		<div class="text-center text-sm text-label">
			{thisMonthEntries.length} total entries this month
		</div>
	{/if}
</div>
