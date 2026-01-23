<script lang="ts">
	import { onMount } from 'svelte';
	import { isConfigured } from '$lib/github';
	import { initializeStore, entries, forceRefresh, syncStatus } from '$lib/store';
	import {
		filterEntriesByDateRange,
		getMonthRange,
		compareMonths,
		filterEntriesByType
	} from '$lib/analysis';
	import EntryForm from '../components/EntryForm.svelte';

	let configured = $state(false);
	let activeType = $state<'activity' | 'food'>('activity');
	let showSuccess = $state(false);

	onMount(() => {
		configured = isConfigured();
		if (configured) {
			initializeStore();
		}
	});

	function handleSave() {
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
		<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
			<h2 class="font-semibold text-yellow-800">Setup Required</h2>
			<p class="text-sm text-yellow-700 mt-1">
				Configure your GitHub token to start tracking.
			</p>
			<a
				href="/settings"
				class="inline-block mt-2 bg-yellow-600 text-white px-4 py-2 rounded-md text-sm hover:bg-yellow-700"
			>
				Go to Settings
			</a>
		</div>
	{:else}
		<div class="flex justify-between items-center">
			<h2 class="text-2xl font-bold text-gray-900">Quick Log</h2>
			<button
				onclick={handleRefresh}
				disabled={$syncStatus === 'syncing'}
				class="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
			>
				{$syncStatus === 'syncing' ? 'Syncing...' : 'Refresh'}
			</button>
		</div>

		{#if showSuccess}
			<div class="bg-green-50 border border-green-200 rounded-lg p-3 text-green-800 text-sm">
				Entry logged successfully!
			</div>
		{/if}

		<div class="flex gap-2">
			<button
				onclick={() => (activeType = 'activity')}
				class="flex-1 py-3 px-4 rounded-lg font-medium text-lg {activeType === 'activity'
					? 'bg-blue-600 text-white'
					: 'bg-gray-200 text-gray-700'}"
			>
				🏃 Activity
			</button>
			<button
				onclick={() => (activeType = 'food')}
				class="flex-1 py-3 px-4 rounded-lg font-medium text-lg {activeType === 'food'
					? 'bg-green-600 text-white'
					: 'bg-gray-200 text-gray-700'}"
			>
				🍽️ Food
			</button>
		</div>

		<EntryForm type={activeType} onsave={handleSave} />

		<div class="grid grid-cols-2 gap-4">
			<div class="bg-white rounded-lg shadow p-4">
				<div class="text-sm text-gray-500">Activities this month</div>
				<div class="text-2xl font-bold text-blue-600">{activityComparison.current}</div>
				{#if activityComparison.difference !== 0}
					<div class="text-xs {activityComparison.difference > 0 ? 'text-green-600' : 'text-red-600'}">
						{activityComparison.difference > 0 ? '+' : ''}{activityComparison.difference} vs last month
					</div>
				{/if}
			</div>
			<div class="bg-white rounded-lg shadow p-4">
				<div class="text-sm text-gray-500">Food logged this month</div>
				<div class="text-2xl font-bold text-green-600">{foodComparison.current}</div>
				{#if foodComparison.difference !== 0}
					<div class="text-xs {foodComparison.difference > 0 ? 'text-green-600' : 'text-red-600'}">
						{foodComparison.difference > 0 ? '+' : ''}{foodComparison.difference} vs last month
					</div>
				{/if}
			</div>
		</div>

		<div class="text-center text-sm text-gray-500">
			{thisMonthEntries.length} total entries this month
		</div>
	{/if}
</div>
