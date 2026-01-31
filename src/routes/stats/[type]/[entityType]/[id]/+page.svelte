<script lang="ts">
	import { page } from '$app/stores';
	import { base } from '$app/paths';
	import { entries, trackerData } from '$lib/store';
	import {
		type TimeRange,
		type Grouping,
		type ChartType,
		type RollingAverageWindow,
		type EntityRef,
		type ChartSeries,
		selectTimeSeries,
		selectStats,
		selectCumulativeSeries,
		selectRollingAverage,
		getEntityName,
		getAvailableEntities
	} from '$lib/analysis';
	import TimeRangeSelector from '../../../../../components/TimeRangeSelector.svelte';
	import Chart from '../../../../../components/Chart.svelte';
	import StatsRow from '../../../../../components/StatsRow.svelte';
	import ComparisonSelector from '../../../../../components/ComparisonSelector.svelte';
	import SegmentedControl from '../../../../../components/SegmentedControl.svelte';

	// Extract route params
	const entityType = $derived(($page.params.type ?? 'activity') as 'activity' | 'food');
	const entityKind = $derived(($page.params.entityType ?? 'item') as 'item' | 'category');
	const entityId = $derived($page.params.id ?? '');

	// Build entity reference
	const entity = $derived<EntityRef>({
		type: entityType,
		entityType: entityKind,
		id: entityId
	});

	// Page state with defaults as per spec
	let timeRange = $state<TimeRange>({ type: '30d' });
	let grouping = $state<Grouping>('weekly');
	let chartType = $state<ChartType>('bar');
	let isCumulative = $state(false);
	let rollingAverage = $state<RollingAverageWindow>('off');
	let comparisonEntities = $state<EntityRef[]>([]);

	// Derived data
	const entityName = $derived(getEntityName(entity, $trackerData));

	// Stats for the primary entity
	const stats = $derived(selectStats($entries, entity, $trackerData, timeRange));

	// Get primary time series
	const primarySeries = $derived(() => {
		let series = selectTimeSeries($entries, entity, $trackerData, timeRange, grouping);

		// Apply rolling average if enabled (only for line charts)
		if (rollingAverage !== 'off' && chartType === 'line') {
			series = selectRollingAverage(series, rollingAverage);
		}

		// Apply cumulative transformation if enabled
		if (isCumulative) {
			series = selectCumulativeSeries(series);
		}

		return series;
	});

	// Get comparison series
	const comparisonSeries = $derived(() => {
		return comparisonEntities.map((compEntity) => {
			let series = selectTimeSeries($entries, compEntity, $trackerData, timeRange, grouping);

			if (rollingAverage !== 'off' && chartType === 'line') {
				series = selectRollingAverage(series, rollingAverage);
			}

			if (isCumulative) {
				series = selectCumulativeSeries(series);
			}

			return series;
		});
	});

	// Combined chart data
	const chartData = $derived<ChartSeries[]>([primarySeries(), ...comparisonSeries()]);

	// Available entities for comparison (same type as primary)
	const availableForComparison = $derived(
		getAvailableEntities($trackerData, entityType, entityId)
	);

	// Handlers
	function handleTimeRangeChange(newRange: TimeRange) {
		timeRange = newRange;
	}

	function handleComparisonChange(newEntities: EntityRef[]) {
		comparisonEntities = newEntities;
	}

	// When cumulative is enabled, switch to line chart
	function handleCumulativeToggle() {
		isCumulative = !isCumulative;
		if (isCumulative) {
			chartType = 'line';
		}
	}

	// Dynamic chart type based on cumulative state
	const effectiveChartType = $derived<ChartType>(isCumulative ? 'line' : chartType);

	// Chart title
	const chartTitle = $derived(() => {
		let title = entityName;
		if (isCumulative) {
			title += ' (Cumulative)';
		}
		if (rollingAverage !== 'off') {
			title += ` - ${rollingAverage === '7d' ? '7' : '30'}-day avg`;
		}
		return title;
	});

	// Subtitle for header
	const subtitle = $derived(() => {
		const typeLabel = entityType === 'activity' ? 'Activity' : 'Food';
		const kindLabel = entityKind === 'item' ? 'Item' : 'Category';
		return `${typeLabel} · ${kindLabel}`;
	});
</script>

<div class="space-y-6">
	<!-- Header -->
	<div>
		<a href="{base}/stats" class="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-flex items-center gap-1">
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			</svg>
			Back to Overview
		</a>
		<h2 class="text-2xl font-bold text-gray-900">{entityName}</h2>
		<p class="text-sm text-gray-500">{subtitle()}</p>
	</div>

	<!-- Time Range Selector -->
	<TimeRangeSelector value={timeRange} onchange={handleTimeRangeChange} />

	<!-- Summary Stats -->
	<StatsRow {stats} />

	<!-- Chart Controls -->
	<div class="bg-white rounded-lg shadow p-4 space-y-4">
		<div class="flex flex-wrap gap-4 items-center justify-between">
			<!-- Grouping selector -->
			<div class="flex items-center gap-2">
				<span class="text-sm text-gray-500">Group by:</span>
				<SegmentedControl
					options={[
						{ value: 'daily', label: 'Daily' },
						{ value: 'weekly', label: 'Weekly' },
						{ value: 'monthly', label: 'Monthly' }
					]}
					value={grouping}
					onchange={(v) => (grouping = v)}
					variant="segment"
					size="xs"
				/>
			</div>

			<!-- Chart type toggle (only when not cumulative) -->
			{#if !isCumulative}
				<div class="flex items-center gap-2">
					<span class="text-sm text-gray-500">Chart:</span>
					<SegmentedControl
						options={[
							{ value: 'bar', label: 'Bar' },
							{ value: 'line', label: 'Line' }
						]}
						value={chartType}
						onchange={(v) => (chartType = v)}
						variant="segment"
						size="xs"
					/>
				</div>
			{/if}
		</div>

		<!-- Toggle options -->
		<div class="flex flex-wrap gap-4">
			<!-- Cumulative toggle -->
			<label class="flex items-center gap-2 cursor-pointer">
				<input
					type="checkbox"
					checked={isCumulative}
					onchange={handleCumulativeToggle}
					class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
				/>
				<span class="text-sm text-gray-700">Show cumulative</span>
			</label>

			<!-- Rolling average toggle (only for line charts) -->
			{#if effectiveChartType === 'line'}
				<div class="flex items-center gap-2">
					<span class="text-sm text-gray-500">Smooth trend:</span>
					<select
						bind:value={rollingAverage}
						class="form-input-sm py-1"
					>
						<option value="off">Off</option>
						<option value="7d">7-day</option>
						<option value="30d">30-day</option>
					</select>
				</div>
			{/if}
		</div>
	</div>

	<!-- Primary Chart -->
	<Chart
		data={chartData}
		chartType={effectiveChartType}
		{grouping}
		title={chartTitle()}
	/>

	<!-- Comparison Section -->
	<div class="bg-white rounded-lg shadow p-4">
		<h3 class="text-sm font-medium text-gray-500 mb-3">Compare</h3>
		<ComparisonSelector
			availableEntities={availableForComparison}
			selectedEntities={comparisonEntities}
			maxSelections={2}
			onchange={handleComparisonChange}
		/>
		{#if comparisonEntities.length === 0}
			<p class="text-sm text-gray-400 mt-2">
				Select other items or categories to compare with {entityName}
			</p>
		{/if}
	</div>
</div>
