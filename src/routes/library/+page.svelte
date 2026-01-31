<script lang="ts">
	import type { ActivityItem, FoodItem, Category } from '$lib/types';
	import {
		activityItems,
		foodItems,
		activityCategories,
		foodCategories,
		addActivityItem,
		addFoodItem,
		updateActivityItem,
		updateFoodItem,
		deleteActivityItem,
		deleteFoodItem,
		addCategory,
		updateCategory,
		deleteCategory,
		getCategoryNames
	} from '$lib/store';
	import CategoryPicker from '../../components/CategoryPicker.svelte';
	import SegmentedControl from '../../components/SegmentedControl.svelte';

	let activeTab = $state<'activity' | 'food'>('activity');
	let activeSubTab = $state<'items' | 'categories'>('items');
	let editingItem = $state<(ActivityItem | FoodItem) | null>(null);
	let showAddForm = $state(false);
	let newItemName = $state('');
	let newItemCategories = $state<string[]>([]); // Array of category IDs

	// Category editing state
	let editingCategoryId = $state<string | null>(null);
	let editingCategoryName = $state('');
	let showAddCategoryForm = $state(false);
	let newCategoryName = $state('');

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

	function handleCategoryChange(categoryIds: string[]) {
		newItemCategories = categoryIds;
	}

	function handleEditCategoryChange(categoryIds: string[]) {
		if (editingItem) {
			editingItem = { ...editingItem, categories: categoryIds };
		}
	}

	// Category management functions
	function handleAddCategory() {
		if (!newCategoryName.trim()) return;

		addCategory(activeTab, newCategoryName.trim());
		newCategoryName = '';
		showAddCategoryForm = false;
	}

	function handleEditCategory(category: Category) {
		editingCategoryId = category.id;
		editingCategoryName = category.name;
	}

	function handleSaveCategoryEdit() {
		if (!editingCategoryId || !editingCategoryName.trim()) return;

		updateCategory(activeTab, editingCategoryId, editingCategoryName.trim());
		editingCategoryId = null;
		editingCategoryName = '';
	}

	function handleCancelCategoryEdit() {
		editingCategoryId = null;
		editingCategoryName = '';
	}

	function handleDeleteCategory(categoryId: string) {
		const itemCount = getItemCountForCategory(categoryId);
		const category = currentCategories.find((c) => c.id === categoryId);
		if (
			!confirm(
				`Delete category "${category?.name}"? It will be removed from ${itemCount} item${itemCount !== 1 ? 's' : ''}.`
			)
		)
			return;

		deleteCategory(activeTab, categoryId);
	}

	function getItemCountForCategory(categoryId: string): number {
		return currentItems.filter((item) => item.categories.includes(categoryId)).length;
	}

	function getCategoryNamesForItem(item: ActivityItem | FoodItem): string[] {
		return getCategoryNames(activeTab, item.categories);
	}

	const currentItems = $derived(
		(activeTab === 'activity' ? $activityItems : $foodItems)
			.slice()
			.sort((a, b) => a.name.localeCompare(b.name))
	);
	const currentCategories = $derived(
		(activeTab === 'activity' ? $activityCategories : $foodCategories)
			.slice()
			.sort((a, b) => a.name.localeCompare(b.name))
	);
</script>

<div class="space-y-4">
	<h2 class="text-2xl font-bold text-gray-900">Item Library</h2>

	<!-- Primary tabs: Activity / Food -->
	<SegmentedControl
		options={[
			{ value: 'activity', label: 'Activities', activeClass: 'bg-blue-600 text-white' },
			{ value: 'food', label: 'Food', activeClass: 'bg-green-600 text-white' }
		]}
		value={activeTab}
		onchange={(v) => (activeTab = v)}
	/>

	<!-- Secondary tabs: Items / Categories -->
	<SegmentedControl
		options={[
			{ value: 'items', label: `Items (${currentItems.length})` },
			{ value: 'categories', label: `Categories (${currentCategories.length})` }
		]}
		value={activeSubTab}
		onchange={(v) => (activeSubTab = v)}
		size="sm"
	/>

	{#if activeSubTab === 'items'}
		<!-- Items view -->
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
						categories={currentCategories}
						onchange={handleCategoryChange}
						type={activeTab}
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
							categories={currentCategories}
							onchange={handleEditCategoryChange}
							type={activeTab}
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
									{#each getCategoryNamesForItem(item) as categoryName}
										<span class="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
											{categoryName}
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
	{:else}
		<!-- Categories view -->
		{#if showAddCategoryForm}
			<div class="bg-white rounded-lg shadow p-4 space-y-4">
				<h3 class="font-semibold text-gray-800">Add New Category</h3>

				<div>
					<label for="newCategoryName" class="block text-sm font-medium text-gray-700 mb-1"
						>Name</label
					>
					<input
						id="newCategoryName"
						type="text"
						bind:value={newCategoryName}
						placeholder="Enter category name..."
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>

				<div class="flex gap-2">
					<button
						onclick={handleAddCategory}
						disabled={!newCategoryName.trim()}
						class="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
					>
						Add Category
					</button>
					<button
						onclick={() => (showAddCategoryForm = false)}
						class="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300"
					>
						Cancel
					</button>
				</div>
			</div>
		{:else}
			<button
				onclick={() => (showAddCategoryForm = true)}
				class="w-full bg-white border-2 border-dashed border-gray-300 rounded-lg py-4 text-gray-500 hover:border-blue-400 hover:text-blue-600"
			>
				+ Add New Category
			</button>
		{/if}

		<div class="space-y-2">
			{#each currentCategories as category}
				{#if editingCategoryId === category.id}
					<div class="bg-white rounded-lg shadow p-4 space-y-3">
						<input
							type="text"
							bind:value={editingCategoryName}
							class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
						<div class="flex gap-2">
							<button
								onclick={handleSaveCategoryEdit}
								disabled={!editingCategoryName.trim()}
								class="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
							>
								Save
							</button>
							<button
								onclick={handleCancelCategoryEdit}
								class="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300"
							>
								Cancel
							</button>
						</div>
					</div>
				{:else}
					<div class="bg-white rounded-lg shadow p-4 flex items-start justify-between">
						<div class="flex-1">
							<div class="font-medium">{category.name}</div>
							<div class="text-xs text-gray-400 mt-1">
								Used by {getItemCountForCategory(category.id)} item{getItemCountForCategory(category.id) !== 1 ? 's' : ''}
							</div>
						</div>
						<div class="flex gap-2">
							<button
								onclick={() => handleEditCategory(category)}
								class="text-gray-400 hover:text-blue-600 p-1"
								aria-label="Edit category"
							>
								✏️
							</button>
							<button
								onclick={() => handleDeleteCategory(category.id)}
								class="text-gray-400 hover:text-red-500 p-1"
								aria-label="Delete category"
							>
								🗑️
							</button>
						</div>
					</div>
				{/if}
			{:else}
				<p class="text-center text-gray-500 py-8">
					No categories for {activeTab === 'activity' ? 'activities' : 'food'} yet. Add one above!
				</p>
			{/each}
		</div>
	{/if}
</div>
