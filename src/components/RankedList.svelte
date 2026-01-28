<script lang="ts">
	import type { RankedItem } from '$lib/analysis';

	interface Props {
		title: string;
		items: RankedItem[];
		accentColor?: 'blue' | 'green';
		onselect?: (item: RankedItem) => void;
	}

	let { title, items, accentColor = 'blue', onselect }: Props = $props();

	// Calculate max count for relative bar widths
	const maxCount = $derived(Math.max(...items.map((item) => item.count), 1));

	function getBarColorClass(): string {
		return accentColor === 'green' ? 'bg-green-100' : 'bg-blue-100';
	}

	function getCountColorClass(): string {
		return accentColor === 'green' ? 'text-green-600' : 'text-blue-600';
	}

	function handleSelect(item: RankedItem) {
		if (onselect) {
			onselect(item);
		}
	}
</script>

<div class="bg-white rounded-lg shadow p-4">
	<h3 class="text-sm font-medium text-gray-500 mb-3">{title}</h3>

	{#if items.length === 0}
		<p class="text-sm text-gray-400">No items logged yet</p>
	{:else}
		<ul class="space-y-2">
			{#each items as item, index}
				<li>
					{#if onselect}
						<button
							type="button"
							onclick={() => handleSelect(item)}
							class="w-full text-left group"
						>
							<div class="flex items-center gap-3">
								<span class="text-sm text-gray-400 w-4">{index + 1}.</span>
								<div class="flex-1 min-w-0">
									<div class="flex items-center justify-between mb-1">
										<span class="text-sm text-gray-700 truncate group-hover:text-blue-600 transition-colors">
											{item.label}
										</span>
										<span class="text-sm font-medium {getCountColorClass()} ml-2">
											{item.count}
										</span>
									</div>
									<div class="h-1.5 bg-gray-100 rounded-full overflow-hidden">
										<div
											class="h-full {getBarColorClass()} rounded-full transition-all"
											style="width: {(item.count / maxCount) * 100}%"
										></div>
									</div>
								</div>
							</div>
						</button>
					{:else}
						<div class="flex items-center gap-3">
							<span class="text-sm text-gray-400 w-4">{index + 1}.</span>
							<div class="flex-1 min-w-0">
								<div class="flex items-center justify-between mb-1">
									<span class="text-sm text-gray-700 truncate">
										{item.label}
									</span>
									<span class="text-sm font-medium {getCountColorClass()} ml-2">
										{item.count}
									</span>
								</div>
								<div class="h-1.5 bg-gray-100 rounded-full overflow-hidden">
									<div
										class="h-full {getBarColorClass()} rounded-full transition-all"
										style="width: {(item.count / maxCount) * 100}%"
									></div>
								</div>
							</div>
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</div>
