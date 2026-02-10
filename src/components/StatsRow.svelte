<script lang="ts">
	import type { EntityStats } from '$lib/analysis';

	interface Props {
		stats: EntityStats;
		showAllTime?: boolean;
	}

	let { stats, showAllTime = true }: Props = $props();
</script>

<div class="card p-4">
	<div class="grid grid-cols-2 {showAllTime ? 'md:grid-cols-3' : ''} gap-4">
		<div class="text-center">
			<div class="text-2xl font-bold text-heading">{stats.total}</div>
			<div class="text-sm text-label">Total in Period</div>
		</div>
		<div class="text-center">
			<div class="text-2xl font-bold text-heading">{stats.averagePerWeek}</div>
			<div class="text-sm text-label">Avg per Week</div>
		</div>
		{#if showAllTime}
			<div class="text-center col-span-2 md:col-span-1">
				<div class="text-2xl font-bold text-heading">{stats.allTimeTotal}</div>
				<div class="text-sm text-label">All Time Total</div>
			</div>
		{/if}
	</div>
</div>
