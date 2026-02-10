import { useState, useMemo } from 'react';
import type { Item, Category } from '../lib/types';

interface Props {
	items: Item[];
	selectedId: string | null;
	onselect: (item: Item) => void;
	oncreate: (searchQuery: string) => void;
	placeholder?: string;
	categories?: Category[];
}

export default function ItemPicker({
	items,
	selectedId,
	onselect,
	oncreate,
	placeholder = 'Search items...',
	categories = []
}: Props) {
	const [searchQuery, setSearchQuery] = useState('');
	const [showDropdown, setShowDropdown] = useState(false);

	const filteredItems = useMemo(
		() => items.filter((item) =>
			item.name.toLowerCase().includes(searchQuery.toLowerCase())
		),
		[items, searchQuery]
	);

	const selectedItem = useMemo(
		() => items.find((i) => i.id === selectedId),
		[items, selectedId]
	);

	function getCategoryNames(categoryIds: string[]): string {
		if (categories.length === 0) return '';
		return categoryIds
			.map((id) => categories.find((c) => c.id === id)?.name)
			.filter(Boolean)
			.join(', ');
	}

	function handleSelect(item: Item) {
		onselect(item);
		setSearchQuery('');
		setShowDropdown(false);
	}

	return (
		<div className="relative">
			{selectedItem ? (
				<div className="flex items-center justify-between p-3 bg-[var(--color-activity-bg)] border border-[var(--color-activity-border)] rounded-md">
					<div>
						<span className="font-medium text-heading">{selectedItem.name}</span>
						{selectedItem.categories.length > 0 && (
							<div className="text-xs text-label mt-1">
								{getCategoryNames(selectedItem.categories)}
							</div>
						)}
					</div>
					<button
						type="button"
						onClick={() => onselect({ id: '', name: '', categories: [] })}
						className="text-subtle hover:text-body"
					>
						&times;
					</button>
				</div>
			) : (
				<>
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						onFocus={() => setShowDropdown(true)}
						onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
						placeholder={placeholder}
						className="form-input"
					/>

					{showDropdown && (
						<div className="absolute z-10 w-full mt-1 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-md shadow-[var(--shadow-elevated)] max-h-60 overflow-y-auto">
							{filteredItems.map((item) => (
								<button
									key={item.id}
									type="button"
									onClick={() => handleSelect(item)}
									className="w-full text-left px-3 py-2 hover:bg-[var(--bg-card-hover)] border-b border-[var(--border-subtle)] last:border-b-0"
								>
									<div className="font-medium text-heading">{item.name}</div>
									{item.categories.length > 0 && (
										<div className="text-xs text-label">
											{getCategoryNames(item.categories)}
										</div>
									)}
								</button>
							))}

							{(filteredItems.length === 0 || searchQuery) && (
								<button
									type="button"
									onClick={() => oncreate(searchQuery)}
									className="w-full text-left px-3 py-2 text-[var(--color-activity)] hover:bg-[var(--color-activity-bg)] flex items-center gap-2"
								>
									<span>+</span>
									<span>Create new item{searchQuery ? `: "${searchQuery}"` : ''}</span>
								</button>
							)}
						</div>
					)}
				</>
			)}
		</div>
	);
}
