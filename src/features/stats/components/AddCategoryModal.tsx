import { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import { useDashboardCards, useFoodCategories, useActivityCategories } from '@/shared/store/hooks';
import { addDashboardCard } from '@/shared/store/store';

interface AddCategoryModalProps {
	onClose: () => void;
}

export default function AddCategoryModal({ onClose }: AddCategoryModalProps) {
	const dashboardCards = useDashboardCards();
	const foodCategories = useFoodCategories();
	const activityCategories = useActivityCategories();
	const [search, setSearch] = useState('');

	const addedCategoryIds = useMemo(() => {
		return new Set(dashboardCards.map((c) => c.categoryId));
	}, [dashboardCards]);

	const categories = useMemo(() => {
		const all = [
			...foodCategories.map((c) => ({ ...c, type: 'food' })),
			...activityCategories.map((c) => ({ ...c, type: 'activity' })),
		];

		return all.sort((a, b) => a.name.localeCompare(b.name));
	}, [foodCategories, activityCategories]);

	const filteredCategories = useMemo(() => {
		const term = search.toLowerCase().trim();
		return categories.filter((c) => c.name.toLowerCase().includes(term));
	}, [categories, search]);

	const handleSelect = (categoryId: string) => {
		if (addedCategoryIds.has(categoryId)) return;
		addDashboardCard(categoryId);
		onClose();
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
			<div
				className="card w-full max-w-md bg-elevated shadow-elevated flex flex-col max-h-[80vh]"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="p-4 border-b flex items-center justify-between">
					<h3 className="text-lg font-bold">Add to Dashboard</h3>
					<button onClick={onClose} className="p-1 hover:bg-inset rounded-full transition-colors">
						<X className="w-5 h-5" strokeWidth={2} />
					</button>
				</div>

				<div className="p-4">
					<input
						type="text"
						placeholder="Search categories..."
						className="form-input"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						autoFocus
					/>
				</div>

				<div className="flex-1 overflow-y-auto p-2 space-y-1">
					{filteredCategories.map((category) => {
						const isAdded = addedCategoryIds.has(category.id);
						return (
							<button
								key={category.id}
								onClick={() => handleSelect(category.id)}
								disabled={isAdded}
								className={`w-full text-left px-3 py-2 rounded-md flex items-center justify-between transition-colors ${
									isAdded ? 'opacity-50 cursor-not-allowed bg-inset' : 'hover:bg-inset'
								}`}
							>
								<div className="flex items-center gap-2">
									<div
										className="w-2 h-2 rounded-full"
										style={{
											backgroundColor: category.type === 'food' ? 'var(--color-food)' : 'var(--color-activity)',
										}}
									/>
									<span className="font-medium">{category.name}</span>
									<span className="text-xs text-label px-1.5 py-0.5 rounded-full bg-inset capitalize">
										{category.type}
									</span>
								</div>
								{isAdded && <span className="text-xs font-medium text-label">Added</span>}
							</button>
						);
					})}

					{filteredCategories.length === 0 && (
						<div className="py-8 text-center text-label">No categories found matching &quot;{search}&quot;</div>
					)}
				</div>
			</div>

			<div className="fixed inset-0 -z-10" onClick={onClose} />
		</div>
	);
}
