<script lang="ts">
	import type { ActivityItem, FoodItem, EntryType } from '$lib/types';
	import { getTodayDate, getCurrentTime } from '$lib/types';
	import { activityItems, foodItems, activityCategories, foodCategories, addEntry, addActivityItem, addFoodItem } from '$lib/store';
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
	let categoryOverrides = $state<string[]>([]); // Array of category IDs
	let showNewItemForm = $state(false);
	let newItemName = $state('');
	let newItemCategories = $state<string[]>([]); // Array of category IDs

	const items = $derived(type === 'activity' ? $activityItems : $foodItems);
	const categories = $derived(type === 'activity' ? $activityCategories : $foodCategories);

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

	function handleCategoryChange(categoryIds: string[]) {
		categoryOverrides = categoryIds;
	}

	function handleNewItemCategoryChange(categoryIds: string[]) {
		newItemCategories = categoryIds;
	}
</script>

<div class="bg-white rounded-lg shadow p-4 space-y-4">
	{#if showNewItemForm}
		<div class="space-y-4">
			<h3 class="font-semibold text-gray-800">
				Create New {type === 'activity' ? 'Activity' : 'Food'} Item
			</h3>

			<div>
				<label for="newItemName" class="form-label">Name</label>
				<input
					id="newItemName"
					type="text"
					bind:value={newItemName}
					placeholder="Enter name..."
					class="form-input"
				/>
			</div>

			<div>
				<label class="form-label">Categories</label>
				<CategoryPicker
					selected={newItemCategories}
					categories={categories}
					onchange={handleNewItemCategoryChange}
					{type}
				/>
			</div>

			<div class="flex gap-2">
				<button
					type="button"
					onclick={handleSaveNewItem}
					disabled={!newItemName.trim()}
					class="flex-1 btn-primary"
				>
					Create & Select
				</button>
				<button
					type="button"
					onclick={handleCancelNewItem}
					class="flex-1 btn-secondary"
				>
					Cancel
				</button>
			</div>
		</div>
	{:else}
		<div>
			<label class="form-label">
				{type === 'activity' ? 'Activity' : 'Food'} Item
			</label>
			<ItemPicker
				{items}
				{categories}
				selectedId={selectedItem?.id || null}
				onselect={handleItemSelect}
				oncreate={handleCreateNew}
				placeholder="Search or create..."
			/>
		</div>

		{#if selectedItem}
			<div>
				<label for="date" class="form-label">Date</label>
				<input
					id="date"
					type="date"
					bind:value={date}
					class="form-input"
				/>
			</div>

			<div>
				<label for="time" class="form-label">
					Time <span class="text-gray-400 font-normal">(optional)</span>
				</label>
				<div class="relative">
					<input
						id="time"
						type="time"
						bind:value={time}
						class="form-input {time ? 'pr-8' : ''}"
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
				<label for="notes" class="form-label">
					Notes <span class="text-gray-400 font-normal">(optional)</span>
				</label>
				<input
					id="notes"
					type="text"
					bind:value={notes}
					placeholder="Add a note..."
					class="form-input"
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
							categories={categories}
							onchange={handleCategoryChange}
							{type}
						/>
					</div>
				{/if}
			</div>

			<button
				type="button"
				onclick={handleSubmit}
				class="w-full btn-success btn-lg"
			>
				Log {type === 'activity' ? 'Activity' : 'Food'}
			</button>
		{/if}
	{/if}
</div>
