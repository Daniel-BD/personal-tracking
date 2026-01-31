<script lang="ts">
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { entries, trackerData } from '$lib/store';
	import type { EntryType } from '$lib/types';
	import {
		type TimeRange,
		type EntityListItem,
		getEntityListWithComparison
	} from '$lib/analysis';
	import TimeRangeSelector from '../../components/TimeRangeSelector.svelte';
	import SegmentedControl from '../../components/SegmentedControl.svelte';

	// Page state
	let timeRange = $state<TimeRange>({ type: '30d' });
	let selectedType = $state<EntryType>('activity');
	let selectedEntityType = $state<'item' | 'category'>('item');
	let sortBy = $state<'alphabetical' | 'most' | 'least'>('most');

	// Derived data
	const entityList = $derived(
		getEntityListWithComparison($entries, $trackerData, selectedType, selectedEntityType, timeRange)
	);

	const sortedEntityList = $derived.by(() => {
		const list = [...entityList];
		switch (sortBy) {
			case 'alphabetical':
				return list.sort((a, b) => a.name.localeCompare(b.name));
			case 'most':
				return list.sort((a, b) => b.count - a.count);
			case 'least':
				return list.sort((a, b) => a.count - b.count);
			default:
				return list;
		}
	});

	function handleTimeRangeChange(newRange: TimeRange) {
		timeRange = newRange;
	}

	function handleEntityClick(entity: EntityListItem) {
		goto(`${base}/stats/${selectedType}/${entity.entityType}/${entity.id}`);
	}

	function formatPercentChange(percentChange: number | null): string {
		if (percentChange === null) return '';
		if (percentChange === 0) return 'No change from last period';
		const sign = percentChange > 0 ? '+' : '';
		return `${sign}${percentChange}% compared to last period`;
	}

	function getPercentChangeColor(percentChange: number | null): string {
		if (percentChange === null || percentChange === 0) return 'text-gray-500';
		return percentChange > 0 ? 'text-green-600' : 'text-red-600';
	}
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<h2 class="text-2xl font-bold text-gray-900">Statistics</h2>
	</div>

	<!-- Time Range Selector -->
	<TimeRangeSelector value={timeRange} onchange={handleTimeRangeChange} />

	<!-- Type Switcher (Activity / Food) -->
	<SegmentedControl
		options={[
			{ value: 'activity', label: 'Activity' },
			{ value: 'food', label: 'Food' }
		]}
		value={selectedType}
		onchange={(v) => (selectedType = v)}
		variant="segment"
		size="sm"
	/>

	<!-- Entity Type Switcher (Items / Categories) -->
	<SegmentedControl
		options={[
			{ value: 'item', label: 'Items' },
			{ value: 'category', label: 'Categories' }
		]}
		value={selectedEntityType}
		onchange={(v) => (selectedEntityType = v)}
		variant="segment"
		size="sm"
	/>

	<!-- Sort Options -->
	<div class="flex items-center gap-2">
		<span class="text-sm text-gray-600">Sort by:</span>
		<select
			bind:value={sortBy}
			class="form-input-sm py-1 text-sm"
		>
			<option value="most">Most logged</option>
			<option value="least">Least logged</option>
			<option value="alphabetical">Alphabetical</option>
		</select>
	</div>

	<!-- Entity List -->
	<div class="space-y-2">
		{#if sortedEntityList.length === 0}
			<div class="bg-white rounded-lg shadow p-6 text-center text-gray-500">
				No {selectedEntityType === 'item' ? 'items' : 'categories'} found for {selectedType}.
			</div>
		{:else}
			{#each sortedEntityList as entity (entity.id)}
				<button
					type="button"
					onclick={() => handleEntityClick(entity)}
					class="w-full text-left bg-white rounded-lg shadow p-4 hover:bg-gray-50 transition-colors"
				>
					<div class="font-medium text-gray-900">{entity.name}</div>
					<div class="text-sm text-gray-600 mt-1">
						Logged {entity.count} {entity.count === 1 ? 'time' : 'times'}
					</div>
					{#if timeRange.type !== 'all' && (entity.percentChange !== null || entity.previousCount > 0)}
						<div class="text-sm mt-1 {getPercentChangeColor(entity.percentChange)}">
							{formatPercentChange(entity.percentChange)}
						</div>
					{/if}
				</button>
			{/each}
		{/if}
	</div>
</div>
