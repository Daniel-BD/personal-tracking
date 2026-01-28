<script lang="ts">
	import type { TimeRange, TimeRangeType } from '$lib/analysis';

	interface Props {
		value: TimeRange;
		onchange: (timeRange: TimeRange) => void;
	}

	let { value, onchange }: Props = $props();

	let showCustom = $state(false);
	let customStart = $state('');
	let customEnd = $state('');

	const options: { type: TimeRangeType; label: string }[] = [
		{ type: '7d', label: '7d' },
		{ type: '30d', label: '30d' },
		{ type: '90d', label: '90d' },
		{ type: 'all', label: 'All' }
	];

	function selectPreset(type: TimeRangeType) {
		showCustom = false;
		onchange({ type });
	}

	function toggleCustom() {
		showCustom = !showCustom;
		if (showCustom && value.type === 'custom') {
			customStart = value.startDate || '';
			customEnd = value.endDate || '';
		}
	}

	function applyCustomRange() {
		if (customStart && customEnd) {
			onchange({
				type: 'custom',
				startDate: customStart,
				endDate: customEnd
			});
			showCustom = false;
		}
	}
</script>

<div class="space-y-2">
	<div class="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
		{#each options as option}
			<button
				type="button"
				onclick={() => selectPreset(option.type)}
				class="flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors {value.type ===
				option.type
					? 'bg-white text-gray-900 shadow-sm'
					: 'text-gray-600 hover:text-gray-900'}"
			>
				{option.label}
			</button>
		{/each}
		<button
			type="button"
			onclick={toggleCustom}
			class="px-3 py-1.5 text-sm font-medium rounded-md transition-colors {value.type === 'custom'
				? 'bg-white text-gray-900 shadow-sm'
				: 'text-gray-600 hover:text-gray-900'}"
		>
			Custom
		</button>
	</div>

	{#if showCustom}
		<div class="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
			<input
				type="date"
				bind:value={customStart}
				class="form-input-sm flex-1"
			/>
			<span class="text-gray-400">to</span>
			<input
				type="date"
				bind:value={customEnd}
				class="form-input-sm flex-1"
			/>
			<button
				type="button"
				onclick={applyCustomRange}
				disabled={!customStart || !customEnd}
				class="btn-primary btn-sm"
			>
				Apply
			</button>
		</div>
	{/if}
</div>
