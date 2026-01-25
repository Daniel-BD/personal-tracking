<script lang="ts">
	interface Props {
		selected: string[];
		suggestions?: string[];
		onchange: (categories: string[]) => void;
	}

	let { selected, suggestions = [], onchange }: Props = $props();

	let newCategory = $state('');

	function addCategory() {
		const trimmed = newCategory.trim();
		if (trimmed && !selected.includes(trimmed)) {
			onchange([...selected, trimmed]);
			newCategory = '';
		}
	}

	function removeCategory(category: string) {
		onchange(selected.filter((c) => c !== category));
	}

	function toggleSuggestion(category: string) {
		if (selected.includes(category)) {
			removeCategory(category);
		} else {
			onchange([...selected, category]);
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			addCategory();
		}
	}

	const filteredSuggestions = $derived(
		suggestions.filter((s) => !selected.includes(s) && s.toLowerCase().includes(newCategory.toLowerCase()))
	);
</script>

<div class="space-y-2">
	<div class="flex flex-wrap gap-2">
		{#each selected as category}
			<span class="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
				{category}
				<button
					type="button"
					onclick={() => removeCategory(category)}
					class="hover:text-blue-600"
				>
					×
				</button>
			</span>
		{/each}
	</div>

	<div class="flex gap-2">
		<input
			type="text"
			bind:value={newCategory}
			onkeydown={handleKeydown}
			placeholder="Add category..."
			class="flex-1 form-input-sm"
		/>
		<button
			type="button"
			onclick={addCategory}
			class="btn-primary btn-sm"
		>
			Add
		</button>
	</div>

	{#if filteredSuggestions.length > 0}
		<div class="flex flex-wrap gap-1">
			{#each filteredSuggestions.slice(0, 10) as suggestion}
				<button
					type="button"
					onclick={() => toggleSuggestion(suggestion)}
					class="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs hover:bg-gray-200"
				>
					+ {suggestion}
				</button>
			{/each}
		</div>
	{/if}
</div>
