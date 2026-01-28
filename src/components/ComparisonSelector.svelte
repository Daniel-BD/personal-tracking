<script lang="ts">
	import type { EntityRef } from '$lib/analysis';

	interface AvailableEntity {
		ref: EntityRef;
		name: string;
	}

	interface Props {
		availableEntities: AvailableEntity[];
		selectedEntities: EntityRef[];
		maxSelections?: number;
		onchange: (entities: EntityRef[]) => void;
	}

	let { availableEntities, selectedEntities, maxSelections = 2, onchange }: Props = $props();

	let isOpen = $state(false);
	let searchQuery = $state('');

	// Filter available entities based on search
	const filteredEntities = $derived(() => {
		if (!searchQuery) return availableEntities;
		const query = searchQuery.toLowerCase();
		return availableEntities.filter((e) => e.name.toLowerCase().includes(query));
	});

	// Check if an entity is already selected
	function isSelected(entity: EntityRef): boolean {
		return selectedEntities.some(
			(e) => e.type === entity.type && e.entityType === entity.entityType && e.id === entity.id
		);
	}

	// Toggle entity selection
	function toggleEntity(entity: AvailableEntity) {
		if (isSelected(entity.ref)) {
			// Remove
			const newEntities = selectedEntities.filter(
				(e) =>
					!(
						e.type === entity.ref.type &&
						e.entityType === entity.ref.entityType &&
						e.id === entity.ref.id
					)
			);
			onchange(newEntities);
		} else if (selectedEntities.length < maxSelections) {
			// Add
			onchange([...selectedEntities, entity.ref]);
		}
	}

	// Clear all comparisons
	function clearComparisons() {
		onchange([]);
		isOpen = false;
	}

	// Close panel
	function closePanel() {
		isOpen = false;
		searchQuery = '';
	}
</script>

<div class="relative">
	{#if selectedEntities.length > 0}
		<!-- Selected comparisons display -->
		<div class="flex flex-wrap gap-2 mb-2">
			{#each selectedEntities as entity}
				{@const entityInfo = availableEntities.find(
					(e) =>
						e.ref.type === entity.type &&
						e.ref.entityType === entity.entityType &&
						e.ref.id === entity.id
				)}
				{#if entityInfo}
					<span class="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
						{entityInfo.name}
						<button
							type="button"
							onclick={() => toggleEntity(entityInfo)}
							class="hover:text-blue-600"
							aria-label="Remove {entityInfo.name} from comparison"
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					</span>
				{/if}
			{/each}
		</div>
	{/if}

	<button
		type="button"
		onclick={() => (isOpen = !isOpen)}
		class="btn-secondary btn-sm"
	>
		{#if isOpen}
			Close
		{:else if selectedEntities.length > 0}
			Edit Comparisons
		{:else}
			Compare
		{/if}
	</button>

	{#if isOpen}
		<div class="absolute z-10 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 p-3">
			<div class="flex items-center justify-between mb-2">
				<span class="text-sm font-medium text-gray-700">
					Compare with ({selectedEntities.length}/{maxSelections})
				</span>
				{#if selectedEntities.length > 0}
					<button
						type="button"
						onclick={clearComparisons}
						class="text-xs text-gray-500 hover:text-gray-700"
					>
						Clear all
					</button>
				{/if}
			</div>

			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search items or categories..."
				class="form-input-sm w-full mb-2"
			/>

			<div class="max-h-48 overflow-y-auto">
				{#if filteredEntities().length === 0}
					<p class="text-sm text-gray-400 py-2">No matching items</p>
				{:else}
					<ul class="space-y-1">
						{#each filteredEntities() as entity}
							{@const selected = isSelected(entity.ref)}
							{@const disabled = !selected && selectedEntities.length >= maxSelections}
							<li>
								<button
									type="button"
									onclick={() => !disabled && toggleEntity(entity)}
									disabled={disabled}
									class="w-full text-left px-2 py-1.5 rounded text-sm transition-colors
										{selected
											? 'bg-blue-50 text-blue-700 border border-blue-200'
											: disabled
												? 'text-gray-400 cursor-not-allowed'
												: 'hover:bg-gray-50 text-gray-700'}"
								>
									<span class="flex items-center gap-2">
										{#if selected}
											<svg class="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
												<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
											</svg>
										{:else}
											<span class="w-4 h-4"></span>
										{/if}
										{entity.name}
									</span>
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			<div class="mt-2 pt-2 border-t border-gray-100">
				<button
					type="button"
					onclick={closePanel}
					class="w-full btn-primary btn-sm"
				>
					Done
				</button>
			</div>
		</div>
	{/if}
</div>
