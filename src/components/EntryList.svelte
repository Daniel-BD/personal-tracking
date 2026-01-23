<script lang="ts">
	import type { Entry, EntryType } from '$lib/types';
	import { getItemById, deleteEntry, trackerData } from '$lib/store';
	import { getEntriesGroupedByDate, formatDate, getEntryCategories } from '$lib/analysis';

	interface Props {
		entries: Entry[];
		showType?: boolean;
	}

	let { entries, showType = false }: Props = $props();

	const groupedEntries = $derived(getEntriesGroupedByDate(entries));

	function getItemName(type: EntryType, itemId: string): string {
		const item = getItemById(type, itemId);
		return item?.name ?? 'Unknown';
	}

	function handleDelete(id: string) {
		if (confirm('Delete this entry?')) {
			deleteEntry(id);
		}
	}
</script>

<div class="space-y-4">
	{#each [...groupedEntries.entries()] as [dateStr, dateEntries]}
		<div>
			<h3 class="text-sm font-semibold text-gray-500 mb-2">{formatDate(dateStr)}</h3>
			<div class="space-y-2">
				{#each dateEntries as entry}
					{@const categories = getEntryCategories(entry, $trackerData)}
					<div class="bg-white rounded-lg shadow-sm p-3 flex items-start justify-between">
						<div class="flex-1">
							<div class="flex items-center gap-2">
								{#if showType}
									<span class="text-sm {entry.type === 'activity' ? 'text-blue-600' : 'text-green-600'}">
										{entry.type === 'activity' ? '🏃' : '🍽️'}
									</span>
								{/if}
								<span class="font-medium">{getItemName(entry.type, entry.itemId)}</span>
							</div>
							{#if entry.notes}
								<p class="text-sm text-gray-600 mt-1">{entry.notes}</p>
							{/if}
							{#if categories.length > 0}
								<div class="flex flex-wrap gap-1 mt-1">
									{#each categories as category}
										<span class="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
											{category}
										</span>
									{/each}
								</div>
							{/if}
						</div>
						<button
							onclick={() => handleDelete(entry.id)}
							class="text-gray-400 hover:text-red-500 p-1"
							aria-label="Delete entry"
						>
							🗑️
						</button>
					</div>
				{/each}
			</div>
		</div>
	{:else}
		<p class="text-center text-gray-500 py-8">No entries yet</p>
	{/each}
</div>
