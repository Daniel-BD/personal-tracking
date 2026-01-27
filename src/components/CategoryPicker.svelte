<script lang="ts">
	import type { Category } from '$lib/types';

	interface Props {
		selected: string[]; // Array of category IDs
		categories: Category[]; // Available categories to choose from
		onchange: (categoryIds: string[]) => void;
	}

	let { selected, categories, onchange }: Props = $props();

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

	// Categories not yet selected
	const availableCategories = $derived(
		categories.filter((c) => !selected.includes(c.id))
	);

	// Selected categories with their names for display
	const selectedCategories = $derived(
		selected.map((id) => ({
			id,
			name: getCategoryName(id)
		})).filter((c) => c.name) // Filter out any invalid IDs
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

	{#if availableCategories.length > 0}
		<div class="flex flex-wrap gap-1">
			{#each availableCategories as category}
				<button
					type="button"
					onclick={() => toggleCategory(category.id)}
					class="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs hover:bg-gray-200"
				>
					+ {category.name}
				</button>
			{/each}
		</div>
	{:else if selectedCategories.length === 0}
		<p class="text-xs text-gray-400">No categories available. Create categories in the Library.</p>
	{/if}
</div>
