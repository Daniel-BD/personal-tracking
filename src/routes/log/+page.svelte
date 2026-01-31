<script lang="ts">
	import { base } from '$app/paths';
	import {
		entries,
		activityItems,
		foodItems,
		activityCategories,
		foodCategories,
		trackerData
	} from '$lib/store';
	import {
		filterEntriesByType,
		filterEntriesByItems,
		filterEntriesByCategories
	} from '$lib/analysis';
	import EntryList from '../../components/EntryList.svelte';
	import SegmentedControl from '../../components/SegmentedControl.svelte';
	import MultiSelectFilter from '../../components/MultiSelectFilter.svelte';

	let typeFilter = $state<'all' | 'activity' | 'food'>('all');
	let selectedCategories = $state<string[]>([]);
	let selectedItems = $state<string[]>([]);
	let showFilters = $state(false);

	// Get available categories based on type filter
	const availableCategories = $derived(() => {
		if (typeFilter === 'activity') return $activityCategories;
		if (typeFilter === 'food') return $foodCategories;
		return [...$activityCategories, ...$foodCategories];
	});

	// Get available items based on type filter
	const availableItems = $derived(() => {
		if (typeFilter === 'activity') return $activityItems;
		if (typeFilter === 'food') return $foodItems;
		return [...$activityItems, ...$foodItems];
	});

	// Format options for MultiSelectFilter
	const categoryOptions = $derived(
		availableCategories().map((cat) => ({
			id: cat.id,
			name: cat.name,
			subtitle:
				typeFilter === 'all'
					? $activityCategories.find((c) => c.id === cat.id)
						? 'Activity'
						: 'Food'
					: undefined
		}))
	);

	const itemOptions = $derived(
		availableItems().map((item) => {
			const categories =
				typeFilter === 'all'
					? $activityItems.find((i) => i.id === item.id)
						? $activityCategories
						: $foodCategories
					: typeFilter === 'activity'
						? $activityCategories
						: $foodCategories;

			const categoryNames = item.categories
				.map((catId) => categories.find((c) => c.id === catId)?.name)
				.filter(Boolean)
				.join(', ');

			return {
				id: item.id,
				name: item.name,
				subtitle: categoryNames || undefined
			};
		})
	);

	// Count active filters (excluding type)
	const activeFilterCount = $derived(selectedCategories.length + selectedItems.length);

	// Filter entries based on all criteria
	const filteredEntries = $derived(() => {
		let result = $entries;

		// Filter by type
		if (typeFilter !== 'all') {
			result = filterEntriesByType(result, typeFilter);
		}

		// Filter by categories
		if (selectedCategories.length > 0) {
			result = filterEntriesByCategories(result, selectedCategories, $trackerData);
		}

		// Filter by items
		if (selectedItems.length > 0) {
			result = filterEntriesByItems(result, selectedItems);
		}

		return result;
	});

	// Clear selections when type changes to avoid invalid filters
	function handleTypeChange(newType: 'all' | 'activity' | 'food') {
		if (newType !== typeFilter) {
			// Clear selections that are no longer valid
			if (newType === 'activity') {
				selectedCategories = selectedCategories.filter((id) =>
					$activityCategories.some((c) => c.id === id)
				);
				selectedItems = selectedItems.filter((id) => $activityItems.some((i) => i.id === id));
			} else if (newType === 'food') {
				selectedCategories = selectedCategories.filter((id) =>
					$foodCategories.some((c) => c.id === id)
				);
				selectedItems = selectedItems.filter((id) => $foodItems.some((i) => i.id === id));
			}
			typeFilter = newType;
		}
	}

	function clearAllFilters() {
		selectedCategories = [];
		selectedItems = [];
	}

	const hasItems = $derived($activityItems.length > 0 || $foodItems.length > 0);

	const entryLabel = $derived(
		filteredEntries().length === 1 ? 'entry' : 'entries'
	);
</script>

<div class="space-y-4">
	<h2 class="text-2xl font-bold text-gray-900">Log</h2>

	<!-- Filters Section -->
	<div class="bg-white rounded-lg shadow">
		<!-- Type Filter & Filter Toggle -->
		<div class="p-3 border-b border-gray-100">
			<div class="flex items-center gap-3">
				<div class="flex-1">
					<SegmentedControl
						options={[
							{ value: 'all', label: 'All', activeClass: 'bg-gray-700 text-white' },
							{ value: 'activity', label: 'Activities', activeClass: 'bg-blue-600 text-white' },
							{ value: 'food', label: 'Food', activeClass: 'bg-green-600 text-white' }
						]}
						value={typeFilter}
						onchange={(v) => handleTypeChange(v)}
					/>
				</div>
				<button
					type="button"
					onclick={() => (showFilters = !showFilters)}
					class="relative flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-colors {showFilters || activeFilterCount > 0 ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
					</svg>
					<span class="text-sm font-medium">Filters</span>
					{#if activeFilterCount > 0}
						<span class="flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-600 rounded-full">
							{activeFilterCount}
						</span>
					{/if}
				</button>
			</div>
		</div>

		<!-- Expandable Filter Panel -->
		{#if showFilters}
			<div class="p-3 space-y-4 border-b border-gray-100 bg-gray-50">
				{#if activeFilterCount > 0}
					<div class="flex justify-end">
						<button
							type="button"
							onclick={clearAllFilters}
							class="text-sm text-blue-600 hover:text-blue-800"
						>
							Clear all filters
						</button>
					</div>
				{/if}

				<!-- Category Filter -->
				{#if categoryOptions.length > 0}
					<MultiSelectFilter
						label="Categories"
						options={categoryOptions}
						selected={selectedCategories}
						onchange={(ids) => (selectedCategories = ids)}
						placeholder="Search categories..."
					/>
				{/if}

				<!-- Item Filter -->
				{#if itemOptions.length > 0}
					<MultiSelectFilter
						label="Items"
						options={itemOptions}
						selected={selectedItems}
						onchange={(ids) => (selectedItems = ids)}
						placeholder="Search items..."
					/>
				{/if}

				{#if categoryOptions.length === 0 && itemOptions.length === 0}
					<p class="text-sm text-gray-500 text-center py-2">
						No categories or items to filter by. <a href="{base}/library" class="text-blue-600 hover:underline">Add some in the Library</a>
					</p>
				{/if}
			</div>
		{/if}

		<!-- Results Count -->
		<div class="px-3 py-2 flex items-center justify-between text-sm text-gray-500">
			<span>{filteredEntries().length} {entryLabel}</span>
			{#if activeFilterCount > 0 && !showFilters}
				<button
					type="button"
					onclick={clearAllFilters}
					class="text-blue-600 hover:text-blue-800"
				>
					Clear filters
				</button>
			{/if}
		</div>
	</div>

	<!-- Entries List -->
	{#if !hasItems}
		<div class="text-center py-8">
			<p class="text-gray-500 mb-4">No items yet</p>
			<a href="{base}/library" class="text-blue-600 hover:underline">
				Add some in the Library
			</a>
		</div>
	{:else if filteredEntries().length === 0}
		<div class="text-center py-8">
			<p class="text-gray-500 mb-2">No entries match your filters</p>
			{#if activeFilterCount > 0}
				<button
					type="button"
					onclick={clearAllFilters}
					class="text-blue-600 hover:underline"
				>
					Clear all filters
				</button>
			{:else}
				<p class="text-gray-400 text-sm">Log entries from the Home page</p>
			{/if}
		</div>
	{:else}
		<EntryList entries={filteredEntries()} showType={typeFilter === 'all'} />
	{/if}
</div>
