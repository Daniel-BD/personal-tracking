<script lang="ts">
	interface FilterOption {
		id: string;
		name: string;
		subtitle?: string;
	}

	interface Props {
		options: FilterOption[];
		selected: string[];
		onchange: (selectedIds: string[]) => void;
		placeholder?: string;
		label?: string;
	}

	let { options, selected, onchange, placeholder = 'Search...', label }: Props = $props();

	let searchQuery = $state('');
	let showDropdown = $state(false);
	let inputElement: HTMLInputElement | null = $state(null);

	const filteredOptions = $derived(
		options.filter((option) =>
			option.name.toLowerCase().includes(searchQuery.toLowerCase())
		)
	);

	const selectedOptions = $derived(
		options.filter((option) => selected.includes(option.id))
	);

	function toggleOption(optionId: string) {
		if (selected.includes(optionId)) {
			onchange(selected.filter((id) => id !== optionId));
		} else {
			onchange([...selected, optionId]);
		}
	}

	function removeOption(optionId: string) {
		onchange(selected.filter((id) => id !== optionId));
	}

	function handleFocus() {
		showDropdown = true;
	}

	function handleBlur() {
		setTimeout(() => {
			showDropdown = false;
		}, 200);
	}

	function clearAll() {
		onchange([]);
		searchQuery = '';
	}
</script>

<div class="space-y-2">
	{#if label}
		<label class="form-label">{label}</label>
	{/if}

	<!-- Selected pills -->
	{#if selectedOptions.length > 0}
		<div class="flex flex-wrap gap-1.5">
			{#each selectedOptions as option}
				<span class="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-sm">
					{option.name}
					<button
						type="button"
						onclick={() => removeOption(option.id)}
						class="hover:text-blue-600 ml-0.5"
						aria-label="Remove {option.name}"
					>
						<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</span>
			{/each}
			<button
				type="button"
				onclick={clearAll}
				class="text-xs text-gray-500 hover:text-gray-700 px-1"
			>
				Clear all
			</button>
		</div>
	{/if}

	<!-- Search input with dropdown -->
	<div class="relative">
		<input
			bind:this={inputElement}
			type="text"
			bind:value={searchQuery}
			onfocus={handleFocus}
			onblur={handleBlur}
			{placeholder}
			class="form-input text-sm"
		/>

		{#if showDropdown}
			<div class="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
				{#if filteredOptions.length === 0}
					<div class="px-3 py-2 text-sm text-gray-500">
						No matches found
					</div>
				{:else}
					{#each filteredOptions as option}
						<button
							type="button"
							onclick={() => toggleOption(option.id)}
							class="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100 last:border-b-0"
						>
							<span class="flex-shrink-0 w-4 h-4 border rounded flex items-center justify-center {selected.includes(option.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}">
								{#if selected.includes(option.id)}
									<svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
									</svg>
								{/if}
							</span>
							<div class="flex-1 min-w-0">
								<div class="font-medium text-sm truncate">{option.name}</div>
								{#if option.subtitle}
									<div class="text-xs text-gray-500 truncate">{option.subtitle}</div>
								{/if}
							</div>
						</button>
					{/each}
				{/if}
			</div>
		{/if}
	</div>
</div>
