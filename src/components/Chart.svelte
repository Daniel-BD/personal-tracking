<script lang="ts">
	import { BarChart, LineChart } from 'layerchart';
	import { scaleBand, scaleTime, scaleLinear } from 'd3-scale';
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

	// Predefined colors for series — use CSS variables via getComputedStyle
	function getSeriesColor(seriesId: string, index: number): string {
		const style = typeof document !== 'undefined' ? getComputedStyle(document.documentElement) : null;
		if (seriesId === 'activities') {
			return style?.getPropertyValue('--color-activity').trim() || 'hsl(217, 91%, 60%)';
		}
		if (seriesId === 'food') {
			return style?.getPropertyValue('--color-food').trim() || 'hsl(142, 71%, 45%)';
		}
		const fallbackColors = [
			'hsl(217, 91%, 60%)',
			'hsl(142, 71%, 45%)',
			'hsl(38, 92%, 50%)',
			'hsl(0, 84%, 60%)',
			'hsl(263, 70%, 50%)',
			'hsl(187, 85%, 43%)'
		];
		return fallbackColors[index % fallbackColors.length];
	}

	// Merge all dates from all series to create unified data points
	const allDates = $derived(() => {
		const dateSet = new Set<string>();
		data.forEach((series) => {
			series.points.forEach((point) => dateSet.add(point.date));
		});
		return Array.from(dateSet).sort();
	});

	// Transform data for bar chart: unified data array with each series as a property
	const barChartData = $derived(() => {
		const dates = allDates();
		return dates.map(date => {
			const point: Record<string, string | number> = { date };
			data.forEach((series) => {
				const seriesPoint = series.points.find(p => p.date === date);
				point[series.id] = seriesPoint?.value ?? 0;
			});
			return point;
		});
	});

	// Transform data for line chart: unified data with Date objects for time scale
	const lineChartData = $derived(() => {
		const dates = allDates();
		return dates.map(date => {
			const point: Record<string, string | number | Date> = {
				date,
				dateObj: new Date(date + 'T00:00:00')
			};
			data.forEach((series) => {
				const seriesPoint = series.points.find(p => p.date === date);
				point[series.id] = seriesPoint?.value ?? 0;
			});
			return point;
		});
	});

	// Calculate max value for explicit y-domain
	const maxValue = $derived(() => {
		let max = 0;
		barChartData().forEach(point => {
			data.forEach(series => {
				const val = point[series.id] as number;
				if (val > max) max = val;
			});
		});
		return Math.max(max, 1); // Minimum of 1 to avoid empty chart
	});

	// Create series configuration for BarChart
	const barChartSeries = $derived(() => {
		return data.map((series, index) => ({
			key: series.id,
			label: series.label,
			color: getSeriesColor(series.id, index)
		}));
	});

	// Create series configuration for LineChart
	const lineChartSeries = $derived(() => {
		return data.map((series, index) => ({
			key: series.id,
			label: series.label,
			color: getSeriesColor(series.id, index)
		}));
	});

	// Format x-axis tick labels
	function formatTick(value: unknown): string {
		if (value instanceof Date) {
			const dateStr = value.toISOString().split('T')[0];
			return formatDateLabel(dateStr, grouping);
		}
		if (typeof value === 'string') {
			return formatDateLabel(value, grouping);
		}
		return String(value);
	}

	// Calculate tick count based on data length
	const tickCount = $derived(() => {
		const dates = allDates();
		if (dates.length <= 7) return dates.length;
		if (dates.length <= 14) return 7;
		if (dates.length <= 30) return 6;
		return 5;
	});

	// Chart title based on grouping
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

	// Check if we have data
	const hasData = $derived(data.length > 0 && allDates().length > 0);
</script>

<div class="card p-4">
	<h3 class="text-sm font-medium text-label mb-3">{chartTitle()}</h3>

	{#if !hasData}
		<div class="flex items-center justify-center h-48 text-subtle text-sm">
			No data to display
		</div>
	{:else}
		<div class="h-64">
			{#if chartType === 'bar'}
				<BarChart
					data={barChartData()}
					x="date"
					xScale={scaleBand().padding(0.3)}
					yScale={scaleLinear()}
					yDomain={[0, maxValue()]}
					yNice
					series={barChartSeries()}
					seriesLayout="group"
					props={{
						xAxis: {
							ticks: tickCount(),
							format: formatTick
						},
						yAxis: {
							ticks: 5
						}
					}}
					legend
					tooltip={{ mode: 'band' }}
				/>
			{:else}
				<LineChart
					data={lineChartData()}
					x="dateObj"
					xScale={scaleTime()}
					series={lineChartSeries()}
					props={{
						xAxis: {
							ticks: tickCount(),
							format: formatTick
						},
						yAxis: {
							ticks: 5
						}
					}}
					legend
					tooltip={{ mode: 'bisect-x' }}
				/>
			{/if}
		</div>
	{/if}
</div>
