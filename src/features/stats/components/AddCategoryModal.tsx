import { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
	useDashboardCards,
	useFoodCategories,
	useActivityCategories,
	useFoodItems,
	useActivityItems,
} from '@/shared/store/hooks';
import { addDashboardCard } from '@/shared/store/store';

interface AddCategoryModalProps {
	onClose: () => void;
}

export default function AddCategoryModal({ onClose }: AddCategoryModalProps) {
	const { t } = useTranslation('stats');
	const dashboardCards = useDashboardCards();
	const foodCategories = useFoodCategories();
	const activityCategories = useActivityCategories();
	const foodItems = useFoodItems();
	const activityItems = useActivityItems();
	const [search, setSearch] = useState('');

	const addedEntityIds = useMemo(() => {
		return new Set(dashboardCards.map((c) => c.itemId || c.categoryId));
	}, [dashboardCards]);

	const entities = useMemo(() => {
		const all = [
			...foodCategories.map((c) => ({ ...c, type: 'food', entityType: 'category' })),
			...activityCategories.map((c) => ({ ...c, type: 'activity', entityType: 'category' })),
			...foodItems.map((c) => ({ ...c, type: 'food', entityType: 'item' })),
			...activityItems.map((c) => ({ ...c, type: 'activity', entityType: 'item' })),
		];

		return all.sort((a, b) => a.name.localeCompare(b.name));
	}, [foodCategories, activityCategories, foodItems, activityItems]);

	const filteredEntities = useMemo(() => {
		const term = search.toLowerCase().trim();
		return entities.filter((c) => c.name.toLowerCase().includes(term));
	}, [entities, search]);

	const handleSelect = (entityId: string, isItem: boolean) => {
		if (addedEntityIds.has(entityId)) return;

		if (isItem) {
			// For items, we just use the entityId as both for backwards compatibility,
			// or we can pass it to the new itemId field. Let's pass it to both just in case,
			// or pass a dummy categoryId. We pass entityId to both so they don't break old charts
			// that blindly read categoryId, though we will fix those.
			addDashboardCard(entityId, entityId);
		} else {
			addDashboardCard(entityId);
		}

		onClose();
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
			<div
				className="card w-full max-w-md bg-elevated shadow-elevated flex flex-col max-h-[80vh]"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="p-4 border-b flex items-center justify-between">
					<h3 className="text-lg font-bold">{t('addCategoryModal.title')}</h3>
					<button onClick={onClose} className="p-1 hover:bg-inset rounded-full transition-colors">
						<X className="w-5 h-5" strokeWidth={2} />
					</button>
				</div>

				<div className="p-4">
					<input
						type="text"
						placeholder={t('addCategoryModal.searchPlaceholder')}
						className="form-input"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						autoFocus
					/>
				</div>

				<div className="flex-1 overflow-y-auto p-2 space-y-1">
					{filteredEntities.map((entity) => {
						const isAdded = addedEntityIds.has(entity.id);
						return (
							<button
								key={entity.id}
								onClick={() => handleSelect(entity.id, entity.entityType === 'item')}
								disabled={isAdded}
								className={`w-full text-left px-3 py-2 rounded-md flex items-center justify-between transition-colors ${
									isAdded ? 'opacity-50 cursor-not-allowed bg-inset' : 'hover:bg-inset'
								}`}
							>
								<div className="flex items-center gap-2">
									<div
										className="w-2 h-2 rounded-full"
										style={{
											backgroundColor:
												entity.entityType === 'item'
													? 'var(--color-activity)'
													: entity.type === 'food'
														? 'var(--color-food)'
														: 'var(--color-activity)',
										}}
									/>
									<span className="font-medium">{entity.name}</span>
									<span className="text-xs text-label px-1.5 py-0.5 rounded-full bg-inset capitalize">
										{entity.entityType === 'item' ? 'item' : entity.type}
									</span>
								</div>
								{isAdded && <span className="text-xs font-medium text-label">{t('addCategoryModal.added')}</span>}
							</button>
						);
					})}

					{filteredEntities.length === 0 && (
						<div className="py-8 text-center text-label">{t('addCategoryModal.noResults', { search })}</div>
					)}
				</div>
			</div>

			<div className="fixed inset-0 -z-10" onClick={onClose} />
		</div>
	);
}
