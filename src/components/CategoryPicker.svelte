<script lang="ts">
	import type { Category, EntryType } from '$lib/types';
	import { addCategory } from '$lib/store';

	interface Props {
		selected: string[]; // Array of category IDs
		categories: Category[]; // Available categories to choose from
		onchange: (categoryIds: string[]) => void;
		type?: EntryType; // Required for adding new categories
	}

	let { selected, categories, onchange, type }: Props = $props();

	let searchText = $state('');

	function removeCategory(categoryId: string) {
		onchange(selected.filter((id) => id !== categoryId));
	}

	function toggleCategory(categoryId: string) {
		if (selected.includes(categoryId)) {
			removeCategory(categoryId);
		} else {
			onchange([...selected, categoryId]);
		}
	}

	function getCategoryName(categoryId: string): string {
		return categories.find((c) => c.id === categoryId)?.name ?? '';
	}

	function handleAddCategory() {
		const trimmedName = searchText.trim();
		if (!trimmedName || !type) return;

		// Check if category with this name already exists (case-insensitive)
		const existing = categories.find(
			(c) => c.name.toLowerCase() === trimmedName.toLowerCase()
		);

		if (existing) {
			// Select existing category if not already selected
			if (!selected.includes(existing.id)) {
				onchange([...selected, existing.id]);
			}
		} else {
			// Create new category and select it
			const newCategory = addCategory(type, trimmedName);
			onchange([...selected, newCategory.id]);
		}

		searchText = '';
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			handleAddCategory();
		}
	}

	// Categories not yet selected
	const availableCategories = $derived(
		categories.filter((c) => !selected.includes(c.id))
	);

	// Filter available categories based on search text
	const filteredCategories = $derived(
		searchText.trim()
			? availableCategories.filter((c) =>
					c.name.toLowerCase().includes(searchText.toLowerCase())
				)
			: availableCategories
	);

	// Selected categories with their names for display
	const selectedCategories = $derived(
		selected.map((id) => ({
			id,
			name: getCategoryName(id)
		})).filter((c) => c.name) // Filter out any invalid IDs
	);

	// Check if current search text matches an existing category name exactly
	const searchMatchesExisting = $derived(
		categories.some(
			(c) => c.name.toLowerCase() === searchText.trim().toLowerCase()
		)
	);
</script>

<div class="space-y-2">
	{#if selectedCategories.length > 0}
		<div class="flex flex-wrap gap-2">
			{#each selectedCategories as category}
				<span class="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
					{category.name}
					<button
						type="button"
						onclick={() => removeCategory(category.id)}
						class="hover:text-blue-600"
					>
						×
					</button>
				</span>
			{/each}
		</div>
	{/if}

	{#if type}
		<div class="flex gap-2">
			<input
				type="text"
				bind:value={searchText}
				onkeydown={handleKeyDown}
				placeholder="Search or add category..."
				class="form-input-sm flex-1"
			/>
			<button
				type="button"
				onclick={handleAddCategory}
				disabled={!searchText.trim()}
				class="btn-secondary btn-sm"
			>
				{searchMatchesExisting ? 'Select' : 'Add'}
			</button>
		</div>
	{/if}

	{#if filteredCategories.length > 0}
		<div class="flex flex-wrap gap-1">
			{#each filteredCategories as category}
				<button
					type="button"
					onclick={() => toggleCategory(category.id)}
					class="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs hover:bg-gray-200"
				>
					+ {category.name}
				</button>
			{/each}
		</div>
	{:else if selectedCategories.length === 0 && !type}
		<p class="text-xs text-gray-400">No categories available. Create categories in the Library.</p>
	{:else if searchText.trim() && filteredCategories.length === 0}
		<p class="text-xs text-gray-400">No matching categories. Click "Add" to create "{searchText.trim()}".</p>
	{/if}
</div>
