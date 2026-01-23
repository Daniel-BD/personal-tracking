<script lang="ts">
	import { entries, activityItems, foodItems, trackerData } from '$lib/store';
	import {
		filterEntriesByType,
		filterEntriesByCategory,
		filterEntriesByItem,
		filterEntriesByDateRange,
		getMonthRange,
		getPreviousMonthRange,
		getItemTotals,
		getCategoryTotals,
		compareMonthsForItem,
		formatMonthYear
	} from '$lib/analysis';
	import type { EntryType } from '$lib/types';

	let activeTab = $state<'totals' | 'compare' | 'filter'>('totals');
	let typeFilter = $state<EntryType | 'all'>('all');
	let selectedItemId = $state<string | null>(null);
	let selectedCategory = $state<string | null>(null);

	const currentDate = new Date();
	const thisMonthRange = $derived(getMonthRange(currentDate));
	const lastMonthRange = $derived(getPreviousMonthRange(currentDate));

	const filteredEntries = $derived(() => {
		let result = $entries;
		if (typeFilter !== 'all') {
			result = filterEntriesByType(result, typeFilter);
		}
		return result;
	});

	const thisMonthFiltered = $derived(filterEntriesByDateRange(filteredEntries(), thisMonthRange));
	const lastMonthFiltered = $derived(filterEntriesByDateRange(filteredEntries(), lastMonthRange));

	const activityTotals = $derived(
		getItemTotals(
			filterEntriesByDateRange(filterEntriesByType($entries, 'activity'), thisMonthRange),
			$activityItems,
			thisMonthRange
		)
	);

	const foodTotals = $derived(
		getItemTotals(
			filterEntriesByDateRange(filterEntriesByType($entries, 'food'), thisMonthRange),
			$foodItems,
			thisMonthRange
		)
	);

	const categoryTotals = $derived(getCategoryTotals(thisMonthFiltered, $trackerData, thisMonthRange));

	const allItems = $derived([
		...$activityItems.map((i) => ({ ...i, type: 'activity' as const })),
		...$foodItems.map((i) => ({ ...i, type: 'food' as const }))
	]);

	const allCategories = $derived(() => {
		const cats = new Set<string>();
		$activityItems.forEach((i) => i.categories.forEach((c) => cats.add(c)));
		$foodItems.forEach((i) => i.categories.forEach((c) => cats.add(c)));
		return Array.from(cats).sort();
	});

	const selectedItemComparison = $derived(
		selectedItemId ? compareMonthsForItem($entries, selectedItemId, currentDate) : null
	);

	const filteredByCategory = $derived(
		selectedCategory ? filterEntriesByCategory($entries, selectedCategory, $trackerData) : []
	);

	const filteredByItem = $derived(
		selectedItemId ? filterEntriesByItem($entries, selectedItemId) : []
	);
</script>

<div class="space-y-4">
	<h2 class="text-2xl font-bold text-gray-900">Statistics</h2>

	<div class="flex gap-1 bg-gray-100 p-1 rounded-lg">
		<button
			onclick={() => (activeTab = 'totals')}
			class="flex-1 py-2 px-3 rounded-md text-sm font-medium {activeTab === 'totals'
				? 'bg-white shadow'
				: 'text-gray-600'}"
		>
			Totals
		</button>
		<button
			onclick={() => (activeTab = 'compare')}
			class="flex-1 py-2 px-3 rounded-md text-sm font-medium {activeTab === 'compare'
				? 'bg-white shadow'
				: 'text-gray-600'}"
		>
			Compare
		</button>
		<button
			onclick={() => (activeTab = 'filter')}
			class="flex-1 py-2 px-3 rounded-md text-sm font-medium {activeTab === 'filter'
				? 'bg-white shadow'
				: 'text-gray-600'}"
		>
			Filter
		</button>
	</div>

	{#if activeTab === 'totals'}
		<div class="space-y-4">
			<div class="bg-white rounded-lg shadow p-4">
				<h3 class="font-semibold text-gray-800 mb-3">{formatMonthYear(currentDate)}</h3>

				<div class="grid grid-cols-3 gap-4 text-center mb-4">
					<div>
						<div class="text-2xl font-bold text-gray-900">{thisMonthFiltered.length}</div>
						<div class="text-xs text-gray-500">Total</div>
					</div>
					<div>
						<div class="text-2xl font-bold text-blue-600">
							{filterEntriesByType(thisMonthFiltered, 'activity').length}
						</div>
						<div class="text-xs text-gray-500">Activities</div>
					</div>
					<div>
						<div class="text-2xl font-bold text-green-600">
							{filterEntriesByType(thisMonthFiltered, 'food').length}
						</div>
						<div class="text-xs text-gray-500">Food</div>
					</div>
				</div>
			</div>

			{#if activityTotals.length > 0}
				<div class="bg-white rounded-lg shadow p-4">
					<h3 class="font-semibold text-gray-800 mb-3">Top Activities</h3>
					<div class="space-y-2">
						{#each activityTotals.slice(0, 5) as { item, count }}
							<div class="flex justify-between items-center">
								<span>{item.name}</span>
								<span class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
									{count}×
								</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			{#if foodTotals.length > 0}
				<div class="bg-white rounded-lg shadow p-4">
					<h3 class="font-semibold text-gray-800 mb-3">Top Food Items</h3>
					<div class="space-y-2">
						{#each foodTotals.slice(0, 5) as { item, count }}
							<div class="flex justify-between items-center">
								<span>{item.name}</span>
								<span class="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
									{count}×
								</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			{#if categoryTotals.length > 0}
				<div class="bg-white rounded-lg shadow p-4">
					<h3 class="font-semibold text-gray-800 mb-3">By Category</h3>
					<div class="space-y-2">
						{#each categoryTotals.slice(0, 10) as { category, count }}
							<div class="flex justify-between items-center">
								<span>{category}</span>
								<span class="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm">
									{count}×
								</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{:else if activeTab === 'compare'}
		<div class="space-y-4">
			<div class="bg-white rounded-lg shadow p-4">
				<h3 class="font-semibold text-gray-800 mb-3">Month-over-Month</h3>

				<div class="space-y-4">
					<div class="flex justify-between items-center p-3 bg-gray-50 rounded">
						<div>
							<div class="font-medium">All Entries</div>
							<div class="text-sm text-gray-500">
								{formatMonthYear(currentDate)} vs {formatMonthYear(
									new Date(currentDate.getFullYear(), currentDate.getMonth() - 1)
								)}
							</div>
						</div>
						<div class="text-right">
							<div class="font-bold">{thisMonthFiltered.length}</div>
							<div
								class="text-sm {thisMonthFiltered.length - lastMonthFiltered.length >= 0
									? 'text-green-600'
									: 'text-red-600'}"
							>
								{thisMonthFiltered.length - lastMonthFiltered.length >= 0 ? '+' : ''}
								{thisMonthFiltered.length - lastMonthFiltered.length}
							</div>
						</div>
					</div>
				</div>
			</div>

			<div class="bg-white rounded-lg shadow p-4">
				<h3 class="font-semibold text-gray-800 mb-3">Compare Specific Item</h3>

				<select
					bind:value={selectedItemId}
					class="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"
				>
					<option value={null}>Select an item...</option>
					<optgroup label="Activities">
						{#each $activityItems as item}
							<option value={item.id}>{item.name}</option>
						{/each}
					</optgroup>
					<optgroup label="Food">
						{#each $foodItems as item}
							<option value={item.id}>{item.name}</option>
						{/each}
					</optgroup>
				</select>

				{#if selectedItemComparison}
					<div class="p-4 bg-gray-50 rounded">
						<div class="grid grid-cols-3 gap-4 text-center">
							<div>
								<div class="text-xl font-bold">{selectedItemComparison.current}</div>
								<div class="text-xs text-gray-500">This month</div>
							</div>
							<div>
								<div class="text-xl font-bold">{selectedItemComparison.previous}</div>
								<div class="text-xs text-gray-500">Last month</div>
							</div>
							<div>
								<div
									class="text-xl font-bold {selectedItemComparison.difference >= 0
										? 'text-green-600'
										: 'text-red-600'}"
								>
									{selectedItemComparison.difference >= 0 ? '+' : ''}{selectedItemComparison.difference}
								</div>
								<div class="text-xs text-gray-500">Difference</div>
							</div>
						</div>
					</div>
				{/if}
			</div>
		</div>
	{:else if activeTab === 'filter'}
		<div class="space-y-4">
			<div class="bg-white rounded-lg shadow p-4">
				<h3 class="font-semibold text-gray-800 mb-3">Filter by Category</h3>

				<select
					bind:value={selectedCategory}
					class="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"
				>
					<option value={null}>Select a category...</option>
					{#each allCategories() as category}
						<option value={category}>{category}</option>
					{/each}
				</select>

				{#if selectedCategory && filteredByCategory.length > 0}
					<div class="text-sm text-gray-600 mb-2">
						{filteredByCategory.length} entries with "{selectedCategory}"
					</div>
					<div class="max-h-60 overflow-y-auto space-y-2">
						{#each filteredByCategory.slice(0, 20) as entry}
							{@const item = allItems.find((i) => i.id === entry.itemId)}
							<div class="p-2 bg-gray-50 rounded text-sm">
								<div class="flex justify-between">
									<span class="font-medium">{item?.name ?? 'Unknown'}</span>
									<span class="text-gray-500">{entry.date}</span>
								</div>
								{#if entry.notes}
									<div class="text-gray-600 text-xs mt-1">{entry.notes}</div>
								{/if}
							</div>
						{/each}
					</div>
				{:else if selectedCategory}
					<p class="text-gray-500 text-sm">No entries with this category</p>
				{/if}
			</div>

			<div class="bg-white rounded-lg shadow p-4">
				<h3 class="font-semibold text-gray-800 mb-3">Filter by Item</h3>

				<select
					bind:value={selectedItemId}
					class="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"
				>
					<option value={null}>Select an item...</option>
					<optgroup label="Activities">
						{#each $activityItems as item}
							<option value={item.id}>{item.name}</option>
						{/each}
					</optgroup>
					<optgroup label="Food">
						{#each $foodItems as item}
							<option value={item.id}>{item.name}</option>
						{/each}
					</optgroup>
				</select>

				{#if selectedItemId && filteredByItem.length > 0}
					<div class="text-sm text-gray-600 mb-2">
						{filteredByItem.length} entries total
					</div>
					<div class="max-h-60 overflow-y-auto space-y-2">
						{#each filteredByItem.slice(0, 20) as entry}
							<div class="p-2 bg-gray-50 rounded text-sm">
								<div class="flex justify-between">
									<span class="text-gray-500">{entry.date}</span>
								</div>
								{#if entry.notes}
									<div class="text-gray-600 text-xs mt-1">{entry.notes}</div>
								{/if}
							</div>
						{/each}
					</div>
				{:else if selectedItemId}
					<p class="text-gray-500 text-sm">No entries for this item</p>
				{/if}
			</div>
		</div>
	{/if}
</div>
