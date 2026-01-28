<script lang="ts">
	import type { ChartSeries, Grouping } from '$lib/analysis';
	import { formatDateLabel } from '$lib/analysis';

	interface Props {
		data: ChartSeries[];
		chartType?: 'bar' | 'line';
		grouping?: Grouping;
		title?: string;
		onseriesclick?: (seriesId: string) => void;
	}

	let { data, chartType = 'bar', grouping = 'weekly', title = 'Weekly Activity', onseriesclick }: Props = $props();

	// Chart dimensions
	const chartHeight = 200;
	const barGap = 4;
	const groupGap = 12;
	const padding = { left: 5, right: 5, top: 10, bottom: 0 };

	// Predefined colors for series (up to 6 different series)
	const seriesColors = [
		'#3b82f6', // blue-500
		'#22c55e', // green-500
		'#f59e0b', // amber-500
		'#ef4444', // red-500
		'#8b5cf6', // violet-500
		'#06b6d4'  // cyan-500
	];

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
	function getSeriesColor(seriesId: string, index: number): string {
		// Special cases for the overview page
		if (seriesId === 'activities') return '#3b82f6'; // blue-500
		if (seriesId === 'food') return '#22c55e'; // green-500
		// Use color palette for individual page comparisons
		return seriesColors[index % seriesColors.length];
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

	// Generate line path for a series
	function getLinePath(series: ChartSeries, seriesIndex: number): string {
		const dates = allDates();
		if (dates.length === 0) return '';

		const points = dates.map((date, i) => {
			const x = padding.left + ((i + 0.5) / dates.length) * (100 - padding.left - padding.right);
			const value = getValue(series, date);
			const y = chartHeight - (value / maxValue()) * chartHeight;
			return { x, y };
		});

		if (points.length === 0) return '';

		return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
	}

	// Get dynamic chart title based on grouping
	const chartTitle = $derived(() => {
		if (title !== 'Weekly Activity') return title;
		switch (grouping) {
			case 'daily':
				return 'Daily Activity';
			case 'monthly':
				return 'Monthly Activity';
			default:
				return 'Weekly Activity';
		}
	});

	// Format label for x-axis
	function formatLabel(date: string): string {
		return formatDateLabel(date, grouping);
	}

	// Calculate how many labels to skip to avoid crowding
	const labelSkip = $derived(() => {
		const dates = allDates();
		if (dates.length <= 6) return 1;
		if (dates.length <= 12) return 2;
		if (dates.length <= 24) return 4;
		return Math.ceil(dates.length / 6);
	});
</script>

<div class="bg-white rounded-lg shadow p-4">
	<h3 class="text-sm font-medium text-gray-500 mb-3">{chartTitle()}</h3>

	{#if allDates().length === 0}
		<div class="flex items-center justify-center h-48 text-gray-400 text-sm">
			No data to display
		</div>
	{:else}
		<!-- Legend -->
		<div class="flex flex-wrap gap-4 mb-4">
			{#each data as series, index}
				<button
					type="button"
					onclick={() => handleSeriesClick(series.id)}
					class="flex items-center gap-2 text-sm hover:opacity-80 transition-opacity"
				>
					<span
						class="w-3 h-3 rounded"
						style="background-color: {getSeriesColor(series.id, index)}"
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

				{#if chartType === 'bar'}
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
								fill={getSeriesColor(series.id, seriesIndex)}
								rx="1"
								role="button"
								tabindex="0"
								aria-label="{series.label}: {value} entries for {formatLabel(date)}"
								class="cursor-pointer transition-colors hover:opacity-80 focus:outline-none focus:opacity-70"
								onclick={() => handleSeriesClick(series.id)}
								onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSeriesClick(series.id); }}
							>
								<title>{series.label}: {value} ({formatLabel(date)})</title>
							</rect>
						{/each}
					{/each}
				{:else}
					<!-- Lines -->
					{#each data as series, seriesIndex}
						<path
							d={getLinePath(series, seriesIndex)}
							fill="none"
							stroke={getSeriesColor(series.id, seriesIndex)}
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							class="cursor-pointer hover:opacity-80"
							role="button"
							tabindex="0"
							aria-label="{series.label} trend line"
							onclick={() => handleSeriesClick(series.id)}
							onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSeriesClick(series.id); }}
						/>
						<!-- Data points on the line -->
						{#each allDates() as date, dateIndex}
							{@const x = padding.left + ((dateIndex + 0.5) / allDates().length) * (100 - padding.left - padding.right)}
							{@const value = getValue(series, date)}
							{@const y = chartHeight - (value / maxValue()) * chartHeight}
							<circle
								cx={x}
								cy={y}
								r="2"
								fill={getSeriesColor(series.id, seriesIndex)}
								class="cursor-pointer hover:opacity-80"
							>
								<title>{series.label}: {value} ({formatLabel(date)})</title>
							</circle>
						{/each}
					{/each}
				{/if}

				<!-- X-axis labels -->
				{#each allDates() as date, dateIndex}
					{#if dateIndex % labelSkip() === 0}
						{@const x = (dateIndex / allDates().length) * 100 + 50 / allDates().length}
						<text
							x={x}
							y={chartHeight + 15}
							text-anchor="middle"
							class="text-[8px] fill-gray-500"
						>
							{formatLabel(date)}
						</text>
					{/if}
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
