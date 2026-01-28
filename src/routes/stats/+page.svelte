<script lang="ts">
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { entries, activityItems, foodItems, trackerData } from '$lib/store';
	import {
		type TimeRange,
		type Insight,
		getFrequencyChartData,
		selectTopEntities,
		selectInsights
	} from '$lib/analysis';
	import TimeRangeSelector from '../../components/TimeRangeSelector.svelte';
	import InsightList from '../../components/InsightList.svelte';
	import FrequencyChart from '../../components/FrequencyChart.svelte';
	import RankedList from '../../components/RankedList.svelte';

	// Page state
	let timeRange = $state<TimeRange>({ type: '30d' });

	// Derived data
	const chartData = $derived(getFrequencyChartData($entries, timeRange));
	const chartSeries = $derived([chartData.activities, chartData.food]);

	// Top items are always all-time (per spec)
	const topActivities = $derived(selectTopEntities($entries, $activityItems, 'activity', 5));
	const topFood = $derived(selectTopEntities($entries, $foodItems, 'food', 5));

	// Insights based on current time range
	const insights = $derived(selectInsights($entries, $trackerData, timeRange));

	function handleTimeRangeChange(newRange: TimeRange) {
		timeRange = newRange;
	}

	function handleSeriesClick(seriesId: string) {
		// Series clicks on overview chart don't navigate to individual pages
		// They represent aggregate data (all activities or all food)
	}

	function handleInsightClick(insight: Insight) {
		if (insight.target) {
			const { type, entityType, entityId } = insight.target;
			goto(`${base}/stats/${type}/${entityType}/${entityId}`);
		}
	}

	function handleActivitySelect(item: { id: string }) {
		goto(`${base}/stats/activity/item/${item.id}`);
	}

	function handleFoodSelect(item: { id: string }) {
		goto(`${base}/stats/food/item/${item.id}`);
	}
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<h2 class="text-2xl font-bold text-gray-900">Statistics</h2>
	</div>

	<!-- Time Range Selector -->
	<TimeRangeSelector value={timeRange} onchange={handleTimeRangeChange} />

	<!-- Change Summary / Insights -->
	<InsightList insights={insights} onselect={handleInsightClick} />

	<!-- Primary Trend Graph -->
	<FrequencyChart data={chartSeries} onseriesclick={handleSeriesClick} />

	<!-- Top Logged Items -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
		<RankedList
			title="Top Activities (All Time)"
			items={topActivities}
			accentColor="blue"
			onselect={handleActivitySelect}
		/>
		<RankedList
			title="Top Food Items (All Time)"
			items={topFood}
			accentColor="green"
			onselect={handleFoodSelect}
		/>
	</div>
</div>
