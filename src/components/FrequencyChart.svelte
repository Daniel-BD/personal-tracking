<script lang="ts">
	import type { ChartSeries } from '$lib/analysis';
	import { formatWeekLabel } from '$lib/analysis';

	interface Props {
		data: ChartSeries[];
		onseriesclick?: (seriesId: string) => void;
	}

	let { data, onseriesclick }: Props = $props();

	// Chart dimensions
	const chartHeight = 200;
	const barGap = 4;
	const groupGap = 12;

	// Merge all dates from all series
	const allDates = $derived(() => {
		const dateSet = new Set<string>();
		data.forEach((series) => {
			series.points.forEach((point) => dateSet.add(point.date));
		});
		return Array.from(dateSet).sort();
	});

	// Calculate max value across all series
	const maxValue = $derived(() => {
		let max = 0;
		data.forEach((series) => {
			series.points.forEach((point) => {
				if (point.value > max) max = point.value;
			});
		});
		return max || 1; // Avoid division by zero
	});

	// Get value for a series at a specific date
	function getValue(series: ChartSeries, date: string): number {
		return series.points.find((p) => p.date === date)?.value || 0;
	}

	// Colors for series
	function getSeriesColor(seriesId: string): string {
		if (seriesId === 'activities') return '#3b82f6'; // blue-500
		if (seriesId === 'food') return '#22c55e'; // green-500
		return '#6b7280'; // gray-500
	}

	function getSeriesHoverColor(seriesId: string): string {
		if (seriesId === 'activities') return '#2563eb'; // blue-600
		if (seriesId === 'food') return '#16a34a'; // green-600
		return '#4b5563'; // gray-600
	}

	function handleSeriesClick(seriesId: string) {
		if (onseriesclick) {
			onseriesclick(seriesId);
		}
	}

	// Calculate bar positions
	const barWidth = $derived(() => {
		const dates = allDates();
		if (dates.length === 0) return 20;
		const numBars = data.length;
		const totalGroupWidth = 100 / dates.length;
		const usableWidth = totalGroupWidth - (groupGap / 3); // percentage
		return Math.max(8, (usableWidth - barGap * (numBars - 1)) / numBars);
	});
</script>

<div class="bg-white rounded-lg shadow p-4">
	<h3 class="text-sm font-medium text-gray-500 mb-3">Weekly Activity</h3>

	{#if allDates().length === 0}
		<div class="flex items-center justify-center h-48 text-gray-400 text-sm">
			No data to display
		</div>
	{:else}
		<!-- Legend -->
		<div class="flex gap-4 mb-4">
			{#each data as series}
				<button
					type="button"
					onclick={() => handleSeriesClick(series.id)}
					class="flex items-center gap-2 text-sm hover:opacity-80 transition-opacity"
				>
					<span
						class="w-3 h-3 rounded"
						style="background-color: {getSeriesColor(series.id)}"
					></span>
					<span class="text-gray-600">{series.label}</span>
				</button>
			{/each}
		</div>

		<!-- Chart -->
		<div class="relative">
			<svg
				viewBox="0 0 100 {chartHeight + 30}"
				class="w-full"
				preserveAspectRatio="none"
				style="height: {chartHeight + 30}px"
			>
				<!-- Y-axis grid lines -->
				{#each [0, 0.25, 0.5, 0.75, 1] as ratio}
					<line
						x1="0"
						y1={chartHeight - chartHeight * ratio}
						x2="100"
						y2={chartHeight - chartHeight * ratio}
						stroke="#e5e7eb"
						stroke-width="0.5"
					/>
				{/each}

				<!-- Bars -->
				{#each allDates() as date, dateIndex}
					{@const groupX = (dateIndex / allDates().length) * 100 + groupGap / 6}
					{#each data as series, seriesIndex}
						{@const value = getValue(series, date)}
						{@const barHeight = (value / maxValue()) * chartHeight}
						{@const barX = groupX + seriesIndex * (barWidth() + barGap / 3)}
						<rect
							x={barX}
							y={chartHeight - barHeight}
							width={barWidth()}
							height={Math.max(barHeight, 0)}
							fill={getSeriesColor(series.id)}
							rx="1"
							role="button"
							tabindex="0"
							aria-label="{series.label}: {value} entries for week of {formatWeekLabel(date)}"
							class="cursor-pointer transition-colors hover:opacity-80 focus:outline-none focus:opacity-70"
							onclick={() => handleSeriesClick(series.id)}
							onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSeriesClick(series.id); }}
						>
							<title>{series.label}: {value} ({formatWeekLabel(date)})</title>
						</rect>
					{/each}
				{/each}

				<!-- X-axis labels -->
				{#each allDates() as date, dateIndex}
					{@const x = (dateIndex / allDates().length) * 100 + 50 / allDates().length}
					<text
						x={x}
						y={chartHeight + 15}
						text-anchor="middle"
						class="text-[8px] fill-gray-500"
					>
						{formatWeekLabel(date)}
					</text>
				{/each}
			</svg>

			<!-- Y-axis labels -->
			<div class="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-400 -ml-1 pointer-events-none" style="height: {chartHeight}px">
				<span>{maxValue()}</span>
				<span>{Math.round(maxValue() / 2)}</span>
				<span>0</span>
			</div>
		</div>
	{/if}
</div>
