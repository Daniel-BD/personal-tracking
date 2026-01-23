<script lang="ts">
	import { entries, activityItems } from '$lib/store';
	import { filterEntriesByType, getMonthRange, filterEntriesByDateRange } from '$lib/analysis';
	import EntryForm from '../../components/EntryForm.svelte';
	import EntryList from '../../components/EntryList.svelte';

	let showForm = $state(false);
	let showSuccess = $state(false);

	function handleSave() {
		showSuccess = true;
		showForm = false;
		setTimeout(() => (showSuccess = false), 2000);
	}

	const activityEntries = $derived(filterEntriesByType($entries, 'activity'));
	const thisMonthRange = $derived(getMonthRange());
	const thisMonthEntries = $derived(filterEntriesByDateRange(activityEntries, thisMonthRange));
</script>

<div class="space-y-4">
	<div class="flex justify-between items-center">
		<h2 class="text-2xl font-bold text-gray-900">Activities</h2>
		<button
			onclick={() => (showForm = !showForm)}
			class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
		>
			{showForm ? 'Cancel' : '+ Log Activity'}
		</button>
	</div>

	{#if showSuccess}
		<div class="bg-green-50 border border-green-200 rounded-lg p-3 text-green-800 text-sm">
			Activity logged successfully!
		</div>
	{/if}

	{#if showForm}
		<EntryForm type="activity" onsave={handleSave} />
	{/if}

	<div class="bg-white rounded-lg shadow p-4">
		<div class="flex justify-between items-center mb-4">
			<h3 class="font-semibold text-gray-800">This Month</h3>
			<span class="text-sm text-gray-500">{thisMonthEntries.length} activities</span>
		</div>

		{#if $activityItems.length === 0}
			<div class="text-center py-8">
				<p class="text-gray-500 mb-4">No activity items yet</p>
				<a href="/library" class="text-blue-600 hover:underline">
					Add some in the Library
				</a>
			</div>
		{:else}
			<EntryList entries={thisMonthEntries} />
		{/if}
	</div>

	{#if activityEntries.length > thisMonthEntries.length}
		<details class="bg-white rounded-lg shadow">
			<summary class="p-4 cursor-pointer font-semibold text-gray-800">
				Older entries ({activityEntries.length - thisMonthEntries.length})
			</summary>
			<div class="px-4 pb-4">
				<EntryList
					entries={activityEntries.filter(
						(e) => e.date < thisMonthRange.start || e.date > thisMonthRange.end
					)}
				/>
			</div>
		</details>
	{/if}
</div>
