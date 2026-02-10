<script lang="ts">
	import type { Item, EntryType } from '$lib/types';
	import { getTodayDate, getCurrentTime, getTypeColor, getTypeLabel } from '$lib/types';
	import {
		activityItems,
		foodItems,
		activityCategories,
		foodCategories,
		addEntry,
		addItem
	} from '$lib/store';
	import UnifiedItemPicker from './UnifiedItemPicker.svelte';
	import CategoryPicker from './CategoryPicker.svelte';

	interface UnifiedItem {
		item: Item;
		type: EntryType;
	}

	interface Props {
		onsave?: () => void;
	}

	let { onsave }: Props = $props();

	// Form state
	let selectedUnified = $state<UnifiedItem | null>(null);
	let date = $state(getTodayDate());
	let time = $state<string | null>(getCurrentTime());
	let notes = $state('');
	let useOverrides = $state(false);
	let categoryOverrides = $state<string[]>([]);

	// New item creation state
	let showNewItemForm = $state(false);
	let newItemType = $state<EntryType | null>(null);
	let newItemName = $state('');
	let newItemCategories = $state<string[]>([]);

	const categories = $derived(
		selectedUnified
			? selectedUnified.type === 'activity'
				? $activityCategories
				: $foodCategories
			: []
	);

	const newItemCategoriesOptions = $derived(
		newItemType === 'activity' ? $activityCategories : $foodCategories
	);

	function handleItemSelect(unified: UnifiedItem) {
		if (unified.item.id) {
			selectedUnified = unified;
			categoryOverrides = [...unified.item.categories];
		} else {
			selectedUnified = null;
		}
	}

	function handleCreateNew(prefillName: string = '') {
		showNewItemForm = true;
		newItemType = null;
		newItemName = prefillName;
		newItemCategories = [];
	}

	function handleSelectNewItemType(type: EntryType) {
		newItemType = type;
	}

	function handleSaveNewItem() {
		if (!newItemName.trim() || !newItemType) return;

		const newItem = addItem(newItemType, newItemName.trim(), newItemCategories);

		selectedUnified = { item: newItem, type: newItemType };
		categoryOverrides = [...newItemCategories];
		showNewItemForm = false;
		newItemType = null;
	}

	function handleCancelNewItem() {
		showNewItemForm = false;
		newItemType = null;
	}

	function handleSubmit() {
		if (!selectedUnified?.item.id) return;

		addEntry(
			selectedUnified.type,
			selectedUnified.item.id,
			date,
			time,
			notes.trim() || null,
			useOverrides ? categoryOverrides : null
		);

		// Reset form
		selectedUnified = null;
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

<div class="card p-4 space-y-4">
	{#if showNewItemForm}
		<div class="space-y-4">
			{#if !newItemType}
				<h3 class="font-semibold text-heading">What type of item?</h3>
				<div class="flex gap-2">
					<button
						type="button"
						onclick={() => handleSelectNewItemType('activity')}
						class="flex-1 py-3 px-4 rounded-lg font-medium text-lg type-activity hover:opacity-90"
					>
						🏃 Activity
					</button>
					<button
						type="button"
						onclick={() => handleSelectNewItemType('food')}
						class="flex-1 py-3 px-4 rounded-lg font-medium text-lg type-food hover:opacity-90"
					>
						🍽️ Food
					</button>
				</div>
				<button type="button" onclick={handleCancelNewItem} class="w-full btn-secondary">
					Cancel
				</button>
			{:else}
				<h3 class="font-semibold text-heading">
					Create New {newItemType === 'activity' ? 'Activity' : 'Food'} Item
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
						categories={newItemCategoriesOptions}
						onchange={handleNewItemCategoryChange}
						type={newItemType}
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
					<button type="button" onclick={handleCancelNewItem} class="flex-1 btn-secondary">
						Cancel
					</button>
				</div>
			{/if}
		</div>
	{:else}
		<div>
			<label class="form-label">Item</label>
			<UnifiedItemPicker
				activityItems={$activityItems}
				foodItems={$foodItems}
				activityCategories={$activityCategories}
				foodCategories={$foodCategories}
				selectedItem={selectedUnified}
				onselect={handleItemSelect}
				oncreate={handleCreateNew}
				placeholder="Search or create..."
			/>
		</div>

		{#if selectedUnified?.item.id}
			<div>
				<label for="date" class="form-label">Date</label>
				<input id="date" type="date" bind:value={date} class="form-input" />
			</div>

			<div>
				<label for="time" class="form-label">
					Time <span class="text-subtle font-normal">(optional)</span>
				</label>
				<div class="relative">
					<input id="time" type="time" bind:value={time} class="form-input {time ? 'pr-8' : ''}" />
					{#if time}
						<button
							type="button"
							onclick={clearTime}
							class="absolute right-2 top-1/2 -translate-y-1/2 text-subtle hover:text-body text-lg"
							aria-label="Clear time"
						>
							&times;
						</button>
					{/if}
				</div>
			</div>

			<div>
				<label for="notes" class="form-label">
					Notes <span class="text-subtle font-normal">(optional)</span>
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
				<label class="flex items-center gap-2 text-sm text-body">
					<input type="checkbox" bind:checked={useOverrides} class="rounded" />
					<span>Override categories for this entry</span>
				</label>

				{#if useOverrides}
					<div class="mt-2">
						<CategoryPicker
							selected={categoryOverrides}
							{categories}
							onchange={handleCategoryChange}
							type={selectedUnified.type}
						/>
					</div>
				{/if}
			</div>

			<button type="button" onclick={handleSubmit} class="w-full btn-lg rounded-md font-medium transition-colors {getTypeColor(selectedUnified.type)}">
				Log {getTypeLabel(selectedUnified.type)}
			</button>
		{/if}
	{/if}
</div>
