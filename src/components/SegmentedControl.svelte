<script lang="ts" generics="T extends string">
	interface Option {
		value: T;
		label: string;
		activeClass?: string; // Optional per-option active class (e.g., 'bg-blue-600 text-white')
	}

	interface Props {
		options: Option[];
		value: T;
		onchange: (value: T) => void;
		variant?: 'pill' | 'segment'; // pill = solid colored tabs, segment = subtle white/gray
		size?: 'default' | 'sm' | 'xs';
	}

	let { options, value, onchange, variant = 'pill', size = 'default' }: Props = $props();

	const sizeClasses = {
		default: 'py-2 px-4 font-medium',
		sm: 'py-1.5 px-3 text-sm font-medium',
		xs: 'py-1 px-2 text-xs font-medium'
	};

	function getButtonClass(option: Option, isActive: boolean): string {
		const baseClass = `flex-1 rounded-md transition-colors ${sizeClasses[size]}`;

		if (variant === 'pill') {
			if (isActive) {
				return `${baseClass} ${option.activeClass || 'bg-gray-700 text-white'}`;
			}
			return `${baseClass} bg-gray-200 text-gray-700`;
		}

		// segment variant
		if (isActive) {
			return `${baseClass} bg-white text-gray-900 shadow-sm`;
		}
		return `${baseClass} text-gray-600 hover:text-gray-900`;
	}
</script>

{#if variant === 'segment'}
	<div class="flex gap-1 bg-gray-100 rounded-lg p-1">
		{#each options as option}
			<button
				type="button"
				onclick={() => onchange(option.value)}
				class={getButtonClass(option, value === option.value)}
			>
				{option.label}
			</button>
		{/each}
	</div>
{:else}
	<div class="flex gap-2">
		{#each options as option}
			<button
				type="button"
				onclick={() => onchange(option.value)}
				class={getButtonClass(option, value === option.value)}
			>
				{option.label}
			</button>
		{/each}
	</div>
{/if}
