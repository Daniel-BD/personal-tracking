import { useState, useMemo } from 'react';
import type { ActivityItem, FoodItem, Category, EntryType } from '../lib/types';
import { getTypeIcon, getTypeColorMuted } from '../lib/types';

export interface UnifiedItem {
	item: ActivityItem | FoodItem;
	type: EntryType;
}

interface Props {
	activityItems: ActivityItem[];
	foodItems: FoodItem[];
	activityCategories?: Category[];
	foodCategories?: Category[];
	selectedItem: UnifiedItem | null;
	onselect: (item: UnifiedItem) => void;
	oncreate: (searchQuery: string) => void;
	placeholder?: string;
}

export default function UnifiedItemPicker({
	activityItems,
	foodItems,
	activityCategories = [],
	foodCategories = [],
	selectedItem,
	onselect,
	oncreate,
	placeholder = 'Search items...'
}: Props) {
	const [searchQuery, setSearchQuery] = useState('');
	const [showDropdown, setShowDropdown] = useState(false);

	const allItems = useMemo(() => {
		const activities: UnifiedItem[] = activityItems.map((item) => ({ item, type: 'activity' as EntryType }));
		const foods: UnifiedItem[] = foodItems.map((item) => ({ item, type: 'food' as EntryType }));
		return [...activities, ...foods];
	}, [activityItems, foodItems]);

	const filteredItems = useMemo(
		() => allItems.filter((unified) =>
			unified.item.name.toLowerCase().includes(searchQuery.toLowerCase())
		),
		[allItems, searchQuery]
	);

	function getCategoryNames(categoryIds: string[], type: EntryType): string {
		const categories = type === 'activity' ? activityCategories : foodCategories;
		if (categories.length === 0) return '';
		return categoryIds
			.map((id) => categories.find((c) => c.id === id)?.name)
			.filter(Boolean)
			.join(', ');
	}

	function handleSelect(unified: UnifiedItem) {
		onselect(unified);
		setSearchQuery('');
		setShowDropdown(false);
	}

	function handleClear() {
		onselect({ item: { id: '', name: '', categories: [] }, type: 'activity' });
	}

	return (
		<div className="relative">
			{selectedItem && selectedItem.item.id ? (
				<div className={`flex items-center justify-between p-3 ${getTypeColorMuted(selectedItem.type)} border rounded-md`}>
					<div className="flex items-center gap-2">
						<span>{getTypeIcon(selectedItem.type)}</span>
						<div>
							<span className="font-medium text-heading">{selectedItem.item.name}</span>
							{selectedItem.item.categories.length > 0 && (
								<div className="text-xs text-label mt-0.5">
									{getCategoryNames(selectedItem.item.categories, selectedItem.type)}
								</div>
							)}
						</div>
					</div>
					<button
						type="button"
						onClick={handleClear}
						className="text-subtle hover:text-body text-xl"
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
							{filteredItems.map((unified) => (
								<button
									key={`${unified.type}-${unified.item.id}`}
									type="button"
									onClick={() => handleSelect(unified)}
									className="w-full text-left px-3 py-2 hover:bg-[var(--bg-card-hover)] border-b border-[var(--border-subtle)] last:border-b-0"
								>
									<div className="flex items-center gap-2">
										<span className="text-sm">{getTypeIcon(unified.type)}</span>
										<div className="flex-1 min-w-0">
											<div className="font-medium text-heading">{unified.item.name}</div>
											{unified.item.categories.length > 0 && (
												<div className="text-xs text-label truncate">
													{getCategoryNames(unified.item.categories, unified.type)}
												</div>
											)}
										</div>
									</div>
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
