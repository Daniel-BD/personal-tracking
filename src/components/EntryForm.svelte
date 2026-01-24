<script lang="ts">
	import type { ActivityItem, FoodItem, EntryType } from '$lib/types';
	import { getTodayDate, getCurrentTime } from '$lib/types';
	import { activityItems, foodItems, addEntry, addActivityItem, addFoodItem, allCategories } from '$lib/store';
	import ItemPicker from './ItemPicker.svelte';
	import CategoryPicker from './CategoryPicker.svelte';

	interface Props {
		type: EntryType;
		onsave?: () => void;
	}

	let { type, onsave }: Props = $props();

	let selectedItem = $state<ActivityItem | FoodItem | null>(null);
	let date = $state(getTodayDate());
	let time = $state<string | null>(getCurrentTime());
	let notes = $state('');
	let useOverrides = $state(false);
	let categoryOverrides = $state<string[]>([]);
	let showNewItemForm = $state(false);
	let newItemName = $state('');
	let newItemCategories = $state<string[]>([]);

	const items = $derived(type === 'activity' ? $activityItems : $foodItems);

	function handleItemSelect(item: ActivityItem | FoodItem) {
		if (item.id) {
			selectedItem = item;
			categoryOverrides = [...item.categories];
		} else {
			selectedItem = null;
		}
	}

	function handleCreateNew(prefillName: string = '') {
		showNewItemForm = true;
		newItemName = prefillName;
		newItemCategories = [];
	}

	function handleSaveNewItem() {
		if (!newItemName.trim()) return;

		const newItem = type === 'activity'
			? addActivityItem(newItemName.trim(), newItemCategories)
			: addFoodItem(newItemName.trim(), newItemCategories);

		selectedItem = newItem;
		categoryOverrides = [...newItemCategories];
		showNewItemForm = false;
	}

	function handleCancelNewItem() {
		showNewItemForm = false;
	}

	function handleSubmit() {
		if (!selectedItem) return;

		addEntry(
			type,
			selectedItem.id,
			date,
			time,
			notes.trim() || null,
			useOverrides ? categoryOverrides : null
		);

		// Reset form
		selectedItem = null;
		date = getTodayDate();
		time = getCurrentTime();
		notes = '';
		useOverrides = false;
		categoryOverrides = [];

		onsave?.();
	}

	function clearTime() {
		time = null;
	}

	function handleCategoryChange(categories: string[]) {
		categoryOverrides = categories;
	}

	function handleNewItemCategoryChange(categories: string[]) {
		newItemCategories = categories;
	}
</script>

<div class="bg-white rounded-lg shadow p-4 space-y-4">
	{#if showNewItemForm}
		<div class="space-y-4">
			<h3 class="font-semibold text-gray-800">
				Create New {type === 'activity' ? 'Activity' : 'Food'} Item
			</h3>

			<div>
				<label for="newItemName" class="block text-sm font-medium text-gray-700 mb-1">Name</label>
				<input
					id="newItemName"
					type="text"
					bind:value={newItemName}
					placeholder="Enter name..."
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
			</div>

			<div>
				<label class="block text-sm font-medium text-gray-700 mb-1">Categories</label>
				<CategoryPicker
					selected={newItemCategories}
					suggestions={$allCategories}
					onchange={handleNewItemCategoryChange}
				/>
			</div>

			<div class="flex gap-2">
				<button
					type="button"
					onclick={handleSaveNewItem}
					disabled={!newItemName.trim()}
					class="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
				>
					Create & Select
				</button>
				<button
					type="button"
					onclick={handleCancelNewItem}
					class="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300"
				>
					Cancel
				</button>
			</div>
		</div>
	{:else}
		<div>
			<label class="block text-sm font-medium text-gray-700 mb-1">
				{type === 'activity' ? 'Activity' : 'Food'} Item
			</label>
			<ItemPicker
				{items}
				selectedId={selectedItem?.id || null}
				onselect={handleItemSelect}
				oncreate={handleCreateNew}
				placeholder="Search or create..."
			/>
		</div>

		{#if selectedItem}
			<div>
				<label for="date" class="block text-sm font-medium text-gray-700 mb-1">Date</label>
				<input
					id="date"
					type="date"
					bind:value={date}
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
			</div>

			<div>
				<label for="time" class="block text-sm font-medium text-gray-700 mb-1">
					Time <span class="text-gray-400 font-normal">(optional)</span>
				</label>
				<div class="relative">
					<input
						id="time"
						type="time"
						bind:value={time}
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 {time ? 'pr-8' : ''}"
					/>
					{#if time}
						<button
							type="button"
							onclick={clearTime}
							class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg"
							aria-label="Clear time"
						>
							&times;
						</button>
					{/if}
				</div>
			</div>

			<div>
				<label for="notes" class="block text-sm font-medium text-gray-700 mb-1">
					Notes <span class="text-gray-400 font-normal">(optional)</span>
				</label>
				<input
					id="notes"
					type="text"
					bind:value={notes}
					placeholder="Add a note..."
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
			</div>

			<div>
				<label class="flex items-center gap-2 text-sm text-gray-700">
					<input type="checkbox" bind:checked={useOverrides} class="rounded" />
					<span>Override categories for this entry</span>
				</label>

				{#if useOverrides}
					<div class="mt-2">
						<CategoryPicker
							selected={categoryOverrides}
							suggestions={$allCategories}
							onchange={handleCategoryChange}
						/>
					</div>
				{/if}
			</div>

			<button
				type="button"
				onclick={handleSubmit}
				class="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 font-medium"
			>
				Log {type === 'activity' ? 'Activity' : 'Food'}
			</button>
		{/if}
	{/if}
</div>
