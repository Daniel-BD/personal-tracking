<script lang="ts">
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { entries, trackerData } from '$lib/store';
	import type { EntryType } from '$lib/types';
	import {
		type TimeRange,
		type EntityListItem,
		getDateRangeFromTimeRange,
		getPreviousPeriodRange,
		filterEntriesByDateRange,
		filterEntriesByType,
		countEntries,
		getFrequencyChartData,
		selectInsights,
		getEntityListWithComparison
	} from '$lib/analysis';
	import TimeRangeSelector from '../../components/TimeRangeSelector.svelte';
	import Chart from '../../components/Chart.svelte';
	import SegmentedControl from '../../components/SegmentedControl.svelte';
	import InsightList from '../../components/InsightList.svelte';

	let timeRange = $state<TimeRange>({ type: '30d' });
	let typeFilter = $state<'all' | 'activity' | 'food'>('all');

	// Period summary
	const currentRange = $derived(getDateRangeFromTimeRange(timeRange));
	const previousRange = $derived(getPreviousPeriodRange(timeRange));

	const currentEntries = $derived(
		currentRange ? filterEntriesByDateRange($entries, currentRange) : $entries
	);
	const previousEntries = $derived(
		previousRange ? filterEntriesByDateRange($entries, previousRange) : []
	);

	const activityCount = $derived(countEntries(filterEntriesByType(currentEntries, 'activity')));
	const foodCount = $derived(countEntries(filterEntriesByType(currentEntries, 'food')));
	const prevActivityCount = $derived(
		countEntries(filterEntriesByType(previousEntries, 'activity'))
	);
	const prevFoodCount = $derived(countEntries(filterEntriesByType(previousEntries, 'food')));

	const hasPreviousPeriod = $derived(previousRange !== null);

	// Chart data
	const chartData = $derived(getFrequencyChartData($entries, timeRange));
	const chartSeries = $derived(() => {
		if (typeFilter === 'activity') return [chartData.activities];
		if (typeFilter === 'food') return [chartData.food];
		return [chartData.activities, chartData.food];
	});

	// Insights
	const insights = $derived(selectInsights($entries, $trackerData, timeRange));

	// Biggest movers
	const activityMovers = $derived(
		getEntityListWithComparison($entries, $trackerData, 'activity', 'item', timeRange)
	);
	const foodMovers = $derived(
		getEntityListWithComparison($entries, $trackerData, 'food', 'item', timeRange)
	);

	const movers = $derived(() => {
		let items: (EntityListItem & { type: EntryType })[] = [];

		if (typeFilter !== 'food') {
			items.push(...activityMovers.map((m) => ({ ...m, type: 'activity' as EntryType })));
		}
		if (typeFilter !== 'activity') {
			items.push(...foodMovers.map((m) => ({ ...m, type: 'food' as EntryType })));
		}

		// Only include items that have activity in either period
		return items
			.filter((m) => m.count > 0 || m.previousCount > 0)
			.sort((a, b) => {
				const absA = a.percentChange !== null ? Math.abs(a.percentChange) : -1;
				const absB = b.percentChange !== null ? Math.abs(b.percentChange) : -1;
				return absB - absA;
			})
			.slice(0, 8);
	});

	function formatChange(current: number, previous: number): string {
		const diff = current - previous;
		const sign = diff >= 0 ? '+' : '';
		if (previous === 0) return `${sign}${diff}`;
		const pct = Math.round(((current - previous) / previous) * 100);
		return `${sign}${diff}, ${sign}${pct}%`;
	}

	function navigateToEntity(type: EntryType, entityType: string, id: string) {
		goto(`${base}/stats/${type}/${entityType}/${id}`);
	}

	const typeOptions = [
		{ value: 'all' as const, label: 'All' },
		{ value: 'activity' as const, label: 'Activities', activeClass: 'type-activity' },
		{ value: 'food' as const, label: 'Food', activeClass: 'type-food' }
	];
</script>

<div class="space-y-4">
	<!-- Controls -->
	<div class="space-y-3">
		<TimeRangeSelector value={timeRange} onchange={(tr) => (timeRange = tr)} />
		<SegmentedControl
			options={typeOptions}
			value={typeFilter}
			onchange={(v) => (typeFilter = v)}
			variant="pill"
			size="sm"
		/>
	</div>

	<!-- Period Summary Cards -->
	<div class="grid grid-cols-2 gap-3">
		{#if typeFilter !== 'food'}
			<div class="card p-4">
				<p class="text-xs font-medium text-label uppercase tracking-wide">Activities</p>
				<p class="text-2xl font-bold text-[var(--color-activity)] mt-1">{activityCount}</p>
				{#if hasPreviousPeriod}
					<p class="text-xs text-label mt-1">
						{formatChange(activityCount, prevActivityCount)} vs prev
					</p>
				{/if}
			</div>
		{/if}
		{#if typeFilter !== 'activity'}
			<div class="card p-4">
				<p class="text-xs font-medium text-label uppercase tracking-wide">Food</p>
				<p class="text-2xl font-bold text-[var(--color-food)] mt-1">{foodCount}</p>
				{#if hasPreviousPeriod}
					<p class="text-xs text-label mt-1">
						{formatChange(foodCount, prevFoodCount)} vs prev
					</p>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Trend Chart -->
	<Chart data={chartSeries()} title="Weekly Activity" />

	<!-- Insights -->
	{#if timeRange.type !== 'all'}
		<InsightList
			{insights}
			onselect={(insight) => {
				if (insight.target) {
					navigateToEntity(insight.target.type, insight.target.entityType, insight.target.entityId);
				}
			}}
		/>
	{/if}

	<!-- Biggest Movers -->
	{#if timeRange.type !== 'all' && movers().length > 0}
		<div class="card p-4">
			<h3 class="text-sm font-medium text-label mb-3">Biggest Movers</h3>
			<ul class="space-y-2">
				{#each movers() as mover}
					<li>
						<button
							type="button"
							onclick={() => navigateToEntity(mover.type, 'item', mover.id)}
							class="w-full flex items-center gap-3 text-left p-2 -mx-2 rounded hover:bg-[var(--bg-card-hover)] transition-colors"
						>
							<span
								class="w-2.5 h-2.5 rounded-full shrink-0"
								style="background: var({mover.type === 'activity' ? '--color-activity' : '--color-food'});"
							></span>
							<span class="flex-1 text-sm font-medium text-heading truncate">{mover.name}</span>
							<span class="text-xs text-label tabular-nums">
								{mover.previousCount} → {mover.count}
							</span>
							{#if mover.percentChange !== null}
								<span
									class="text-xs font-medium tabular-nums"
									style="color: var({mover.percentChange >= 0 ? '--color-success' : '--color-danger'});"
								>
									{mover.percentChange >= 0 ? '+' : ''}{mover.percentChange}%
								</span>
							{:else}
								<span class="text-xs font-medium text-[var(--color-activity)]">new</span>
							{/if}
						</button>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>
