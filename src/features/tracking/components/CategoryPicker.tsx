import { useState, useMemo } from 'react';
import type { Category, EntryType } from '@/shared/lib/types';
import { addCategory } from '@/shared/store/store';

interface Props {
	selected: string[];
	categories: Category[];
	onchange: (categoryIds: string[]) => void;
	type?: EntryType;
}

export default function CategoryPicker({ selected, categories, onchange, type }: Props) {
	const [searchText, setSearchText] = useState('');

	function removeCategory(categoryId: string) {
		onchange(selected.filter((id) => id !== categoryId));
	}

	function toggleCategory(categoryId: string) {
		if (selected.includes(categoryId)) {
			removeCategory(categoryId);
		} else {
			onchange([...selected, categoryId]);
			setSearchText('');
		}
	}

	function getCategoryName(categoryId: string): string {
		return categories.find((c) => c.id === categoryId)?.name ?? '';
	}

	function handleAddCategory() {
		const trimmedName = searchText.trim();
		if (!trimmedName || !type) return;

		const existing = categories.find(
			(c) => c.name.toLowerCase() === trimmedName.toLowerCase()
		);

		if (existing) {
			if (!selected.includes(existing.id)) {
				onchange([...selected, existing.id]);
			}
		} else {
			const newCategory = addCategory(type, trimmedName);
			onchange([...selected, newCategory.id]);
		}

		setSearchText('');
	}

	function handleKeyDown(event: React.KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			handleAddCategory();
		}
	}

	const availableCategories = useMemo(
		() => categories.filter((c) => !selected.includes(c.id)),
		[categories, selected]
	);

	const filteredCategories = useMemo(
		() => searchText.trim()
			? availableCategories.filter((c) =>
				c.name.toLowerCase().includes(searchText.toLowerCase())
			)
			: availableCategories,
		[availableCategories, searchText]
	);

	const selectedCategories = useMemo(
		() => selected
			.map((id) => ({ id, name: getCategoryName(id) }))
			.filter((c) => c.name),
		[selected, categories]
	);

	const searchMatchesExisting = useMemo(
		() => categories.some(
			(c) => c.name.toLowerCase() === searchText.trim().toLowerCase()
		),
		[categories, searchText]
	);

	return (
		<div className="space-y-2">
			{selectedCategories.length > 0 && (
				<div className="flex flex-wrap gap-2">
					{selectedCategories.map((category) => (
						<span
							key={category.id}
							className="inline-flex items-center gap-1 bg-[var(--color-activity-bg-strong)] text-[var(--color-activity-text)] px-2 py-1 rounded-full text-sm"
						>
							{category.name}
							<button
								type="button"
								onClick={() => removeCategory(category.id)}
								className="hover:text-[var(--color-activity)]"
							>
								&times;
							</button>
						</span>
					))}
				</div>
			)}

			{type && (
				<div className="flex gap-2">
					<input
						type="text"
						value={searchText}
						onChange={(e) => setSearchText(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="Search or add category..."
						className="form-input-sm flex-1"
					/>
					<button
						type="button"
						onClick={handleAddCategory}
						disabled={!searchText.trim()}
						className="btn-secondary btn-sm"
					>
						{searchMatchesExisting ? 'Select' : 'Add'}
					</button>
				</div>
			)}

			{filteredCategories.length > 0 ? (
				<div className="flex flex-wrap gap-1">
					{filteredCategories.map((category) => (
						<button
							key={category.id}
							type="button"
							onClick={() => toggleCategory(category.id)}
							className="px-2 py-1 bg-[var(--bg-inset)] text-label rounded text-xs hover:bg-[var(--bg-card-hover)]"
						>
							+ {category.name}
						</button>
					))}
				</div>
			) : selectedCategories.length === 0 && !type ? (
				<p className="text-xs text-subtle">No categories available. Create categories in the Library.</p>
			) : searchText.trim() && filteredCategories.length === 0 ? (
				<p className="text-xs text-subtle">No matching categories. Click &quot;Add&quot; to create &quot;{searchText.trim()}&quot;.</p>
			) : null}
		</div>
	);
}
