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

<div class="bg-white rounded-lg shadow p-4">
	<h3 class="text-sm font-medium text-gray-500 mb-3">Highlights</h3>

	{#if insights.length === 0}
		<p class="text-sm text-gray-400">No significant changes in this period</p>
	{:else}
		<ul class="space-y-2">
			{#each insights as insight}
				{#if insight.target && onselect}
					<li>
						<button
							type="button"
							onclick={() => handleClick(insight)}
							class="w-full text-left text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 p-2 -m-2 rounded transition-colors"
						>
							{insight.text}
						</button>
					</li>
				{:else}
					<li class="text-sm text-gray-700 p-2 -m-2">
						{insight.text}
					</li>
				{/if}
			{/each}
		</ul>
	{/if}
</div>
