<script lang="ts">
	import type { Entry, EntryType } from '$lib/types';
	import { getItemById, deleteEntry, updateEntry, trackerData, activityCategories, foodCategories } from '$lib/store';
	import { getEntriesGroupedByDate, formatDate, getEntryCategoryNames, getEntryCategoryIds } from '$lib/analysis';
	import CategoryPicker from './CategoryPicker.svelte';

	interface Props {
		entries: Entry[];
		showType?: boolean;
	}

	let { entries, showType = false }: Props = $props();

	const groupedEntries = $derived(getEntriesGroupedByDate(entries));

	// Edit state
	let editingEntryId = $state<string | null>(null);
	let editDate = $state('');
	let editTime = $state('');
	let editNotes = $state('');
	let editCategories = $state<string[]>([]);

	function getItemName(type: EntryType, itemId: string): string {
		const item = getItemById(type, itemId);
		return item?.name ?? 'Unknown';
	}

	function formatTime(time: string | null): string {
		if (!time) return '';
		// Convert HH:MM to 12-hour format
		const [hours, minutes] = time.split(':').map(Number);
		const period = hours >= 12 ? 'PM' : 'AM';
		const displayHours = hours % 12 || 12;
		return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
	}

	function handleDelete(id: string) {
		if (confirm('Delete this entry?')) {
			deleteEntry(id);
		}
	}

	function startEdit(entry: Entry) {
		editingEntryId = entry.id;
		editDate = entry.date;
		editTime = entry.time ?? '';
		editNotes = entry.notes ?? '';
		editCategories = getEntryCategoryIds(entry, $trackerData);
	}

	function cancelEdit() {
		editingEntryId = null;
		editDate = '';
		editTime = '';
		editNotes = '';
		editCategories = [];
	}

	function saveEdit(entry: Entry) {
		// Get item's default categories
		const item = getItemById(entry.type, entry.itemId);
		const defaultCategories = item?.categories ?? [];

		// Check if categories differ from default
		const categoriesChanged =
			editCategories.length !== defaultCategories.length ||
			!editCategories.every(id => defaultCategories.includes(id)) ||
			!defaultCategories.every(id => editCategories.includes(id));

		updateEntry(entry.id, {
			date: editDate,
			time: editTime || null,
			notes: editNotes || null,
			categoryOverrides: categoriesChanged ? editCategories : null
		});
		cancelEdit();
	}

	function getCategoriesForType(type: EntryType) {
		return type === 'activity' ? $activityCategories : $foodCategories;
	}
</script>

<div class="space-y-4">
	{#each [...groupedEntries.entries()] as [dateStr, dateEntries]}
		<div>
			<h3 class="text-sm font-semibold text-gray-500 mb-2">{formatDate(dateStr)}</h3>
			<div class="space-y-2">
				{#each dateEntries as entry}
					{@const categories = getEntryCategoryNames(entry, $trackerData)}
					<div class="bg-white rounded-lg shadow-sm p-3">
						{#if editingEntryId === entry.id}
							<!-- Edit mode -->
							<div class="space-y-3">
								<div class="flex items-center gap-2">
									{#if showType}
										<span class="text-sm {entry.type === 'activity' ? 'text-blue-600' : 'text-green-600'}">
											{entry.type === 'activity' ? '🏃' : '🍽️'}
										</span>
									{/if}
									<span class="font-medium">{getItemName(entry.type, entry.itemId)}</span>
								</div>

								<div class="grid grid-cols-2 gap-2">
									<div>
										<label class="form-label">Date</label>
										<input
											type="date"
											bind:value={editDate}
											class="form-input"
										/>
									</div>
									<div>
										<label class="form-label">Time</label>
										<input
											type="time"
											bind:value={editTime}
											class="form-input"
										/>
									</div>
								</div>

								<div>
									<label class="form-label">Notes</label>
									<input
										type="text"
										bind:value={editNotes}
										placeholder="Optional notes..."
										class="form-input"
									/>
								</div>

								<div>
									<label class="form-label">Categories</label>
									<CategoryPicker
										selected={editCategories}
										categories={getCategoriesForType(entry.type)}
										onchange={(ids) => editCategories = ids}
										type={entry.type}
									/>
								</div>

								<div class="flex gap-2 pt-2">
									<button
										onclick={() => saveEdit(entry)}
										class="btn btn-primary btn-sm flex-1"
									>
										Save
									</button>
									<button
										onclick={cancelEdit}
										class="btn btn-secondary btn-sm flex-1"
									>
										Cancel
									</button>
								</div>
							</div>
						{:else}
							<!-- View mode -->
							<div class="flex items-start justify-between">
								<div class="flex-1">
									<div class="flex items-center gap-2">
										{#if showType}
											<span class="text-sm {entry.type === 'activity' ? 'text-blue-600' : 'text-green-600'}">
												{entry.type === 'activity' ? '🏃' : '🍽️'}
											</span>
										{/if}
										<span class="font-medium">{getItemName(entry.type, entry.itemId)}</span>
										{#if entry.time}
											<span class="text-xs text-gray-400">{formatTime(entry.time)}</span>
										{/if}
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
								<div class="flex gap-1">
									<button
										onclick={() => startEdit(entry)}
										class="text-gray-400 hover:text-blue-500 p-1"
										aria-label="Edit entry"
									>
										✏️
									</button>
									<button
										onclick={() => handleDelete(entry.id)}
										class="text-gray-400 hover:text-red-500 p-1"
										aria-label="Delete entry"
									>
										🗑️
									</button>
								</div>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{:else}
		<p class="text-center text-gray-500 py-8">No entries yet</p>
	{/each}
</div>
