<script lang="ts">
	import type { ActivityItem, FoodItem, Category, EntryType } from '$lib/types';
	import { getTypeIcon, getTypeColorMuted } from '$lib/types';

	interface UnifiedItem {
		item: ActivityItem | FoodItem;
		type: EntryType;
	}

	interface Props {
		activityItems: ActivityItem[];
		foodItems: FoodItem[];
		activityCategories?: Category[];
		foodCategories?: Category[];
		selectedItem: UnifiedItem | null;
		onselect: (item: UnifiedItem) => void;
		oncreate: (searchQuery: string) => void;
		placeholder?: string;
	}

	let {
		activityItems,
		foodItems,
		activityCategories = [],
		foodCategories = [],
		selectedItem,
		onselect,
		oncreate,
		placeholder = 'Search items...'
	}: Props = $props();

	let searchQuery = $state('');
	let showDropdown = $state(false);

	const allItems = $derived(() => {
		const activities: UnifiedItem[] = activityItems.map((item) => ({ item, type: 'activity' as EntryType }));
		const foods: UnifiedItem[] = foodItems.map((item) => ({ item, type: 'food' as EntryType }));
		return [...activities, ...foods];
	});

	const filteredItems = $derived(
		allItems().filter((unified) =>
			unified.item.name.toLowerCase().includes(searchQuery.toLowerCase())
		)
	);

	function getCategoryNames(categoryIds: string[], type: EntryType): string {
		const categories = type === 'activity' ? activityCategories : foodCategories;
		if (categories.length === 0) return '';
		return categoryIds
			.map((id) => categories.find((c) => c.id === id)?.name)
			.filter(Boolean)
			.join(', ');
	}

	function handleSelect(unified: UnifiedItem) {
		onselect(unified);
		searchQuery = '';
		showDropdown = false;
	}

	function handleClear() {
		onselect({ item: { id: '', name: '', categories: [] }, type: 'activity' });
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
	{#if selectedItem && selectedItem.item.id}
		<div class="flex items-center justify-between p-3 {getTypeColorMuted(selectedItem.type)} border rounded-md">
			<div class="flex items-center gap-2">
				<span>{getTypeIcon(selectedItem.type)}</span>
				<div>
					<span class="font-medium text-heading">{selectedItem.item.name}</span>
					{#if selectedItem.item.categories.length > 0}
						<div class="text-xs text-label mt-0.5">
							{getCategoryNames(selectedItem.item.categories, selectedItem.type)}
						</div>
					{/if}
				</div>
			</div>
			<button
				type="button"
				onclick={handleClear}
				class="text-subtle hover:text-body text-xl"
			>
				&times;
			</button>
		</div>
	{:else}
		<input
			type="text"
			bind:value={searchQuery}
			onfocus={handleFocus}
			onblur={handleBlur}
			{placeholder}
			class="form-input"
		/>

		{#if showDropdown}
			<div class="absolute z-10 w-full mt-1 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-md shadow-[var(--shadow-elevated)] max-h-60 overflow-y-auto">
				{#each filteredItems as unified}
					<button
						type="button"
						onclick={() => handleSelect(unified)}
						class="w-full text-left px-3 py-2 hover:bg-[var(--bg-card-hover)] border-b border-[var(--border-subtle)] last:border-b-0"
					>
						<div class="flex items-center gap-2">
							<span class="text-sm">{getTypeIcon(unified.type)}</span>
							<div class="flex-1 min-w-0">
								<div class="font-medium text-heading">{unified.item.name}</div>
								{#if unified.item.categories.length > 0}
									<div class="text-xs text-label truncate">
										{getCategoryNames(unified.item.categories, unified.type)}
									</div>
								{/if}
							</div>
						</div>
					</button>
				{/each}

				{#if filteredItems.length === 0 || searchQuery}
					<button
						type="button"
						onclick={() => oncreate(searchQuery)}
						class="w-full text-left px-3 py-2 text-[var(--color-activity)] hover:bg-[var(--color-activity-bg)] flex items-center gap-2"
					>
						<span>+</span>
						<span>Create new item{searchQuery ? `: "${searchQuery}"` : ''}</span>
					</button>
				{/if}
			</div>
		{/if}
	{/if}
</div>
