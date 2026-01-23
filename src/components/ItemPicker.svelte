<script lang="ts">
	import type { ActivityItem, FoodItem } from '$lib/types';

	interface Props {
		items: (ActivityItem | FoodItem)[];
		selectedId: string | null;
		onselect: (item: ActivityItem | FoodItem) => void;
		oncreate: () => void;
		placeholder?: string;
	}

	let { items, selectedId, onselect, oncreate, placeholder = 'Search items...' }: Props = $props();

	let searchQuery = $state('');
	let showDropdown = $state(false);

	const filteredItems = $derived(
		items.filter((item) =>
			item.name.toLowerCase().includes(searchQuery.toLowerCase())
		)
	);

	const selectedItem = $derived(items.find((i) => i.id === selectedId));

	function handleSelect(item: ActivityItem | FoodItem) {
		onselect(item);
		searchQuery = '';
		showDropdown = false;
	}

	function handleFocus() {
		showDropdown = true;
	}

	function handleBlur() {
		setTimeout(() => {
			showDropdown = false;
		}, 200);
	}
</script>

<div class="relative">
	{#if selectedItem}
		<div class="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-md">
			<div>
				<span class="font-medium">{selectedItem.name}</span>
				{#if selectedItem.categories.length > 0}
					<div class="text-xs text-gray-500 mt-1">
						{selectedItem.categories.join(', ')}
					</div>
				{/if}
			</div>
			<button
				type="button"
				onclick={() => onselect({ id: '', name: '', categories: [] } as ActivityItem)}
				class="text-gray-400 hover:text-gray-600"
			>
				×
			</button>
		</div>
	{:else}
		<input
			type="text"
			bind:value={searchQuery}
			onfocus={handleFocus}
			onblur={handleBlur}
			{placeholder}
			class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
		/>

		{#if showDropdown}
			<div class="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
				{#each filteredItems as item}
					<button
						type="button"
						onclick={() => handleSelect(item)}
						class="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
					>
						<div class="font-medium">{item.name}</div>
						{#if item.categories.length > 0}
							<div class="text-xs text-gray-500">
								{item.categories.join(', ')}
							</div>
						{/if}
					</button>
				{/each}

				{#if filteredItems.length === 0 || searchQuery}
					<button
						type="button"
						onclick={oncreate}
						class="w-full text-left px-3 py-2 text-blue-600 hover:bg-blue-50 flex items-center gap-2"
					>
						<span>+</span>
						<span>Create new item{searchQuery ? `: "${searchQuery}"` : ''}</span>
					</button>
				{/if}
			</div>
		{/if}
	{/if}
</div>
