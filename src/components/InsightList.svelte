<script lang="ts">
	import type { Insight } from '$lib/analysis';

	interface Props {
		insights: Insight[];
		onselect?: (insight: Insight) => void;
	}

	let { insights, onselect }: Props = $props();

	function handleClick(insight: Insight) {
		if (insight.target && onselect) {
			onselect(insight);
		}
	}
</script>

<div class="card p-4">
	<h3 class="text-sm font-medium text-label mb-3">Highlights</h3>

	{#if insights.length === 0}
		<p class="text-sm text-subtle">No significant changes in this period</p>
	{:else}
		<ul class="space-y-2">
			{#each insights as insight}
				{#if insight.target && onselect}
					<li>
						<button
							type="button"
							onclick={() => handleClick(insight)}
							class="w-full text-left text-sm text-body hover:text-[var(--color-activity)] hover:bg-[var(--color-activity-bg)] p-2 -m-2 rounded transition-colors"
						>
							{insight.text}
						</button>
					</li>
				{:else}
					<li class="text-sm text-body p-2 -m-2">
						{insight.text}
					</li>
				{/if}
			{/each}
		</ul>
	{/if}
</div>
