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
		return accentColor === 'green'
			? 'bg-[var(--color-food-bg-strong)]'
			: 'bg-[var(--color-activity-bg-strong)]';
	}

	function getCountColorClass(): string {
		return accentColor === 'green'
			? 'text-[var(--color-food)]'
			: 'text-[var(--color-activity)]';
	}

	function handleSelect(item: RankedItem) {
		if (onselect) {
			onselect(item);
		}
	}
</script>

<div class="card p-4">
	<h3 class="text-sm font-medium text-label mb-3">{title}</h3>

	{#if items.length === 0}
		<p class="text-sm text-subtle">No items logged yet</p>
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
								<span class="text-sm text-subtle w-4">{index + 1}.</span>
								<div class="flex-1 min-w-0">
									<div class="flex items-center justify-between mb-1">
										<span class="text-sm text-body truncate group-hover:text-[var(--color-activity)] transition-colors">
											{item.label}
										</span>
										<span class="text-sm font-medium {getCountColorClass()} ml-2">
											{item.count}
										</span>
									</div>
									<div class="h-1.5 bg-[var(--bg-inset)] rounded-full overflow-hidden">
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
							<span class="text-sm text-subtle w-4">{index + 1}.</span>
							<div class="flex-1 min-w-0">
								<div class="flex items-center justify-between mb-1">
									<span class="text-sm text-body truncate">
										{item.label}
									</span>
									<span class="text-sm font-medium {getCountColorClass()} ml-2">
										{item.count}
									</span>
								</div>
								<div class="h-1.5 bg-[var(--bg-inset)] rounded-full overflow-hidden">
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
