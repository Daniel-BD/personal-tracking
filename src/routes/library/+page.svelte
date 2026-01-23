<script lang="ts">
	import type { ActivityItem, FoodItem } from '$lib/types';
	import {
		activityItems,
		foodItems,
		allCategories,
		addActivityItem,
		addFoodItem,
		updateActivityItem,
		updateFoodItem,
		deleteActivityItem,
		deleteFoodItem
	} from '$lib/store';
	import CategoryPicker from '../../components/CategoryPicker.svelte';

	let activeTab = $state<'activity' | 'food'>('activity');
	let editingItem = $state<(ActivityItem | FoodItem) | null>(null);
	let showAddForm = $state(false);
	let newItemName = $state('');
	let newItemCategories = $state<string[]>([]);

	function handleAddItem() {
		if (!newItemName.trim()) return;

		if (activeTab === 'activity') {
			addActivityItem(newItemName.trim(), newItemCategories);
		} else {
			addFoodItem(newItemName.trim(), newItemCategories);
		}

		newItemName = '';
		newItemCategories = [];
		showAddForm = false;
	}

	function handleEditItem(item: ActivityItem | FoodItem) {
		editingItem = { ...item };
	}

	function handleSaveEdit() {
		if (!editingItem || !editingItem.name.trim()) return;

		if (activeTab === 'activity') {
			updateActivityItem(editingItem.id, editingItem.name.trim(), editingItem.categories);
		} else {
			updateFoodItem(editingItem.id, editingItem.name.trim(), editingItem.categories);
		}

		editingItem = null;
	}

	function handleCancelEdit() {
		editingItem = null;
	}

	function handleDeleteItem(id: string) {
		if (!confirm('Delete this item and all its entries?')) return;

		if (activeTab === 'activity') {
			deleteActivityItem(id);
		} else {
			deleteFoodItem(id);
		}
	}

	function handleCategoryChange(categories: string[]) {
		newItemCategories = categories;
	}

	function handleEditCategoryChange(categories: string[]) {
		if (editingItem) {
			editingItem = { ...editingItem, categories };
		}
	}

	const currentItems = $derived(activeTab === 'activity' ? $activityItems : $foodItems);
</script>

<div class="space-y-4">
	<h2 class="text-2xl font-bold text-gray-900">Item Library</h2>

	<div class="flex gap-2">
		<button
			onclick={() => (activeTab = 'activity')}
			class="flex-1 py-2 px-4 rounded-md font-medium {activeTab === 'activity'
				? 'bg-blue-600 text-white'
				: 'bg-gray-200 text-gray-700'}"
		>
			Activities ({$activityItems.length})
		</button>
		<button
			onclick={() => (activeTab = 'food')}
			class="flex-1 py-2 px-4 rounded-md font-medium {activeTab === 'food'
				? 'bg-green-600 text-white'
				: 'bg-gray-200 text-gray-700'}"
		>
			Food ({$foodItems.length})
		</button>
	</div>

	{#if showAddForm}
		<div class="bg-white rounded-lg shadow p-4 space-y-4">
			<h3 class="font-semibold text-gray-800">
				Add New {activeTab === 'activity' ? 'Activity' : 'Food'} Item
			</h3>

			<div>
				<label for="newName" class="block text-sm font-medium text-gray-700 mb-1">Name</label>
				<input
					id="newName"
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
					onchange={handleCategoryChange}
				/>
			</div>

			<div class="flex gap-2">
				<button
					onclick={handleAddItem}
					disabled={!newItemName.trim()}
					class="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
				>
					Add Item
				</button>
				<button
					onclick={() => (showAddForm = false)}
					class="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300"
				>
					Cancel
				</button>
			</div>
		</div>
	{:else}
		<button
			onclick={() => (showAddForm = true)}
			class="w-full bg-white border-2 border-dashed border-gray-300 rounded-lg py-4 text-gray-500 hover:border-blue-400 hover:text-blue-600"
		>
			+ Add New {activeTab === 'activity' ? 'Activity' : 'Food'} Item
		</button>
	{/if}

	<div class="space-y-2">
		{#each currentItems as item}
			{#if editingItem?.id === item.id}
				<div class="bg-white rounded-lg shadow p-4 space-y-3">
					<input
						type="text"
						bind:value={editingItem.name}
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
					<CategoryPicker
						selected={editingItem.categories}
						suggestions={$allCategories}
						onchange={handleEditCategoryChange}
					/>
					<div class="flex gap-2">
						<button
							onclick={handleSaveEdit}
							class="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700"
						>
							Save
						</button>
						<button
							onclick={handleCancelEdit}
							class="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300"
						>
							Cancel
						</button>
					</div>
				</div>
			{:else}
				<div class="bg-white rounded-lg shadow p-4 flex items-start justify-between">
					<div class="flex-1">
						<div class="font-medium">{item.name}</div>
						{#if item.categories.length > 0}
							<div class="flex flex-wrap gap-1 mt-1">
								{#each item.categories as category}
									<span class="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
										{category}
									</span>
								{/each}
							</div>
						{:else}
							<div class="text-xs text-gray-400 mt-1">No categories</div>
						{/if}
					</div>
					<div class="flex gap-2">
						<button
							onclick={() => handleEditItem(item)}
							class="text-gray-400 hover:text-blue-600 p-1"
							aria-label="Edit item"
						>
							✏️
						</button>
						<button
							onclick={() => handleDeleteItem(item.id)}
							class="text-gray-400 hover:text-red-500 p-1"
							aria-label="Delete item"
						>
							🗑️
						</button>
					</div>
				</div>
			{/if}
		{:else}
			<p class="text-center text-gray-500 py-8">
				No {activeTab === 'activity' ? 'activities' : 'food items'} yet. Add one above!
			</p>
		{/each}
	</div>
</div>
