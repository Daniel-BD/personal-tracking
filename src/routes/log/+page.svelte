<script lang="ts">
	import { base } from '$app/paths';
	import { entries, activityItems, foodItems } from '$lib/store';
	import { filterEntriesByType } from '$lib/analysis';
	import EntryForm from '../../components/EntryForm.svelte';
	import EntryList from '../../components/EntryList.svelte';

	const PAGE_SIZE = 50;

	let activeTab = $state<'all' | 'activity' | 'food'>('all');
	let showForm = $state(false);
	let formType = $state<'activity' | 'food'>('activity');
	let showSuccess = $state(false);
	let displayCount = $state(PAGE_SIZE);

	function handleSave() {
		showSuccess = true;
		showForm = false;
		setTimeout(() => (showSuccess = false), 2000);
	}

	function openForm(type: 'activity' | 'food') {
		formType = type;
		showForm = true;
	}

	function closeForm() {
		showForm = false;
	}

	function showMore() {
		displayCount += PAGE_SIZE;
	}

	// Reset display count when tab changes
	$effect(() => {
		activeTab;
		displayCount = PAGE_SIZE;
	});

	const filteredEntries = $derived(
		activeTab === 'all' ? $entries : filterEntriesByType($entries, activeTab)
	);
	const displayedEntries = $derived(filteredEntries.slice(0, displayCount));
	const hasMoreEntries = $derived(filteredEntries.length > displayCount);
	const remainingCount = $derived(filteredEntries.length - displayCount);

	const hasItems = $derived($activityItems.length > 0 || $foodItems.length > 0);
	const hasActivityItems = $derived($activityItems.length > 0);
	const hasFoodItems = $derived($foodItems.length > 0);

	const entryLabel = $derived(
		activeTab === 'all' ? 'entries' : activeTab === 'activity' ? 'activities' : 'entries'
	);
</script>

<div class="space-y-4">
	<h2 class="text-2xl font-bold text-gray-900">Log</h2>

	<!-- Tab switcher -->
	<div class="flex gap-2">
		<button
			onclick={() => (activeTab = 'all')}
			class="flex-1 py-2 px-4 rounded-md font-medium {activeTab === 'all'
				? 'bg-gray-700 text-white'
				: 'bg-gray-200 text-gray-700'}"
		>
			All
		</button>
		<button
			onclick={() => (activeTab = 'activity')}
			class="flex-1 py-2 px-4 rounded-md font-medium {activeTab === 'activity'
				? 'bg-blue-600 text-white'
				: 'bg-gray-200 text-gray-700'}"
		>
			Activities
		</button>
		<button
			onclick={() => (activeTab = 'food')}
			class="flex-1 py-2 px-4 rounded-md font-medium {activeTab === 'food'
				? 'bg-green-600 text-white'
				: 'bg-gray-200 text-gray-700'}"
		>
			Food
		</button>
	</div>

	<!-- Log buttons -->
	{#if activeTab === 'all'}
		<div class="flex gap-2">
			<button
				onclick={() => openForm('activity')}
				class="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
			>
				{showForm && formType === 'activity' ? 'Cancel' : '+ Log Activity'}
			</button>
			<button
				onclick={() => openForm('food')}
				class="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
			>
				{showForm && formType === 'food' ? 'Cancel' : '+ Log Food'}
			</button>
		</div>
	{:else if activeTab === 'activity'}
		<button
			onclick={() => {
				if (showForm && formType === 'activity') {
					closeForm();
				} else {
					openForm('activity');
				}
			}}
			class="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
		>
			{showForm && formType === 'activity' ? 'Cancel' : '+ Log Activity'}
		</button>
	{:else}
		<button
			onclick={() => {
				if (showForm && formType === 'food') {
					closeForm();
				} else {
					openForm('food');
				}
			}}
			class="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
		>
			{showForm && formType === 'food' ? 'Cancel' : '+ Log Food'}
		</button>
	{/if}

	{#if showSuccess}
		<div class="bg-green-50 border border-green-200 rounded-lg p-3 text-green-800 text-sm">
			{formType === 'activity' ? 'Activity' : 'Food'} logged successfully!
		</div>
	{/if}

	{#if showForm}
		<EntryForm type={formType} onsave={handleSave} />
	{/if}

	<div class="bg-white rounded-lg shadow p-4">
		<div class="flex justify-between items-center mb-4">
			<h3 class="font-semibold text-gray-800">Recent Entries</h3>
			<span class="text-sm text-gray-500">{filteredEntries.length} {entryLabel}</span>
		</div>

		{#if !hasItems}
			<div class="text-center py-8">
				<p class="text-gray-500 mb-4">No items yet</p>
				<a href="{base}/library" class="text-blue-600 hover:underline">
					Add some in the Library
				</a>
			</div>
		{:else if activeTab === 'activity' && !hasActivityItems}
			<div class="text-center py-8">
				<p class="text-gray-500 mb-4">No activity items yet</p>
				<a href="{base}/library" class="text-blue-600 hover:underline">
					Add some in the Library
				</a>
			</div>
		{:else if activeTab === 'food' && !hasFoodItems}
			<div class="text-center py-8">
				<p class="text-gray-500 mb-4">No food items yet</p>
				<a href="{base}/library" class="text-blue-600 hover:underline">
					Add some in the Library
				</a>
			</div>
		{:else}
			<EntryList entries={displayedEntries} />

			{#if hasMoreEntries}
				<div class="mt-4 text-center">
					<button
						onclick={showMore}
						class="text-blue-600 hover:text-blue-800 font-medium"
					>
						Show more ({remainingCount} remaining)
					</button>
				</div>
			{/if}
		{/if}
	</div>
</div>
