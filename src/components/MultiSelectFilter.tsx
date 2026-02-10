import { useState, useMemo } from 'react';

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

export default function MultiSelectFilter({
	options,
	selected,
	onchange,
	placeholder = 'Search...',
	label
}: Props) {
	const [searchQuery, setSearchQuery] = useState('');
	const [showDropdown, setShowDropdown] = useState(false);

	const filteredOptions = useMemo(
		() => options.filter((option) =>
			option.name.toLowerCase().includes(searchQuery.toLowerCase())
		),
		[options, searchQuery]
	);

	const selectedOptions = useMemo(
		() => options.filter((option) => selected.includes(option.id)),
		[options, selected]
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

	function clearAll() {
		onchange([]);
		setSearchQuery('');
	}

	return (
		<div className="space-y-2">
			{label && <label className="form-label">{label}</label>}

			{selectedOptions.length > 0 && (
				<div className="flex flex-wrap gap-1.5">
					{selectedOptions.map((option) => (
						<span
							key={option.id}
							className="inline-flex items-center gap-1 bg-[var(--color-activity-bg-strong)] text-[var(--color-activity-text)] px-2 py-0.5 rounded-full text-sm"
						>
							{option.name}
							<button
								type="button"
								onClick={() => removeOption(option.id)}
								className="hover:text-[var(--color-activity)] ml-0.5"
								aria-label={`Remove ${option.name}`}
							>
								<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						</span>
					))}
					<button
						type="button"
						onClick={clearAll}
						className="text-xs text-label hover:text-body px-1"
					>
						Clear all
					</button>
				</div>
			)}

			<div className="relative">
				<input
					type="text"
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					onFocus={() => setShowDropdown(true)}
					onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
					placeholder={placeholder}
					className="form-input text-sm"
				/>

				{showDropdown && (
					<div className="absolute z-20 w-full mt-1 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg shadow-[var(--shadow-elevated)] max-h-60 overflow-y-auto">
						{filteredOptions.length === 0 ? (
							<div className="px-3 py-2 text-sm text-label">No matches found</div>
						) : (
							filteredOptions.map((option) => (
								<button
									key={option.id}
									type="button"
									onClick={() => toggleOption(option.id)}
									className="w-full text-left px-3 py-2 hover:bg-[var(--bg-card-hover)] flex items-center gap-2 border-b border-[var(--border-subtle)] last:border-b-0"
								>
									<span
										className={`flex-shrink-0 w-4 h-4 border rounded flex items-center justify-center ${
											selected.includes(option.id)
												? 'bg-[var(--color-activity)] border-[var(--color-activity)]'
												: 'border-[var(--border-input)]'
										}`}
									>
										{selected.includes(option.id) && (
											<svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
											</svg>
										)}
									</span>
									<div className="flex-1 min-w-0">
										<div className="font-medium text-sm truncate text-heading">{option.name}</div>
										{option.subtitle && (
											<div className="text-xs text-label truncate">{option.subtitle}</div>
										)}
									</div>
								</button>
							))
						)}
					</div>
				)}
			</div>
		</div>
	);
}
