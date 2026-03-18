import { useMemo, useState } from 'react';
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
import { getDashboardCardEntityIds, getDashboardCardEntityType, type EntryType } from '@/shared/lib/types';
import SegmentedControl from '@/shared/ui/SegmentedControl';
import { SENTIMENT_COLORS, getItemAccentColor } from '../utils/stats-engine';
import { SentimentDot, CategorySentimentPills } from '@/shared/ui/EntityMetaBadges';
import { cn } from '@/shared/lib/cn';

interface AddCategoryModalProps {
	onClose: () => void;
}

type Tab = 'categories' | 'items';
type Step = 'select' | 'name';

export default function AddCategoryModal({ onClose }: AddCategoryModalProps) {
	const { t } = useTranslation('stats');
	const dashboardCards = useDashboardCards();
	const foodCategories = useFoodCategories();
	const activityCategories = useActivityCategories();
	const foodItems = useFoodItems();
	const activityItems = useActivityItems();
	const [search, setSearch] = useState('');
	const [tab, setTab] = useState<Tab>('categories');
	const [combineMultiple, setCombineMultiple] = useState(false);
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [step, setStep] = useState<Step>('select');
	const [customName, setCustomName] = useState('');

	const existingSingles = useMemo(() => {
		return new Set(
			dashboardCards
				.filter((card) => getDashboardCardEntityIds(card).length === 1)
				.map((card) => getDashboardCardEntityIds(card)[0])
				.filter(Boolean),
		);
	}, [dashboardCards]);

	const existingCombinations = useMemo(() => {
		return dashboardCards
			.filter((card) => card.entityIds?.length)
			.map((card) => ({
				entityType: getDashboardCardEntityType(card),
				entityIds: getDashboardCardEntityIds(card),
			}));
	}, [dashboardCards]);

	const categories = useMemo(() => {
		const all = [
			...foodCategories.map((c) => ({ ...c, type: 'food' as EntryType })),
			...activityCategories.map((c) => ({ ...c, type: 'activity' as EntryType })),
		];

		return all.sort((a, b) => a.name.localeCompare(b.name));
	}, [foodCategories, activityCategories]);

	const sortedItems = useMemo(() => {
		const all = [
			...foodItems.map((i) => ({ ...i, type: 'food' as EntryType })),
			...activityItems.map((i) => ({ ...i, type: 'activity' as EntryType })),
		];
		return all.sort((a, b) => a.name.localeCompare(b.name));
	}, [foodItems, activityItems]);

	const filteredCategories = useMemo(() => {
		const term = search.toLowerCase().trim();
		return categories.filter((c) => c.name.toLowerCase().includes(term));
	}, [categories, search]);

	const filteredItems = useMemo(() => {
		const term = search.toLowerCase().trim();
		return sortedItems.filter((item) => item.name.toLowerCase().includes(term));
	}, [sortedItems, search]);

	const dialogTitleId = 'add-dashboard-dialog-title';
	const tabOptions = [
		{ value: 'categories' as Tab, label: t('addCategoryModal.tabCategories') },
		{ value: 'items' as Tab, label: t('addCategoryModal.tabItems') },
	];

	const resolveItemCategories = (item: { categories: string[]; type: EntryType }) => {
		const typeCategories = item.type === 'food' ? foodCategories : activityCategories;
		return item.categories
			.map((id) => typeCategories.find((category) => category.id === id))
			.filter((category): category is (typeof typeCategories)[number] => category !== undefined);
	};

	const isExistingCombination = (entityType: 'category' | 'item', entityIds: string[]) => {
		return existingCombinations.some(
			(combo) =>
				combo.entityType === entityType &&
				combo.entityIds.length === entityIds.length &&
				combo.entityIds.every((id) => entityIds.includes(id)),
		);
	};

	const handleToggleSelection = (id: string) => {
		if (!combineMultiple) {
			setSelectedIds([id]);
			return;
		}

		setSelectedIds((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));
	};

	const handleCreate = () => {
		if (selectedIds.length === 0) {
			return;
		}

		if (combineMultiple) {
			setStep('name');
			return;
		}

		if (tab === 'categories') {
			addDashboardCard({ categoryId: selectedIds[0] });
		} else {
			addDashboardCard({ itemId: selectedIds[0] });
		}
		onClose();
	};

	const handleSaveCustomCard = () => {
		if (selectedIds.length === 0) {
			return;
		}

		addDashboardCard({
			name: customName.trim(),
			entityType: tab === 'categories' ? 'category' : 'item',
			entityIds: selectedIds,
		});
		onClose();
	};

	const createDisabled =
		selectedIds.length === 0 ||
		(combineMultiple && selectedIds.length < 2) ||
		isExistingCombination(tab === 'categories' ? 'category' : 'item', selectedIds);

	const saveNameDisabled = customName.trim().length === 0;

	return (
		// eslint-disable-next-line jsx-a11y/no-static-element-interactions
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
			onMouseDown={(event) => {
				if (event.target === event.currentTarget) {
					onClose();
				}
			}}
		>
			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby={dialogTitleId}
				className="card w-full max-w-md bg-elevated shadow-elevated flex flex-col max-h-[80vh]"
			>
				<div className="p-4 border-b flex items-center justify-between">
					<h3 id={dialogTitleId} className="text-lg font-bold">
						{step === 'select' ? t('addCategoryModal.title') : t('addCategoryModal.nameTitle')}
					</h3>
					<button
						onClick={onClose}
						aria-label={t('addCategoryModal.close')}
						className="p-1 hover:bg-inset rounded-full transition-colors"
					>
						<X className="w-5 h-5" strokeWidth={2} />
					</button>
				</div>

				{step === 'select' ? (
					<>
						<div className="px-4 pt-4 pb-2 space-y-3">
							<SegmentedControl
								options={tabOptions}
								value={tab}
								onChange={(value) => {
									setTab(value);
									setSelectedIds([]);
								}}
								variant="segment"
								size="sm"
							/>
							<div className="flex items-center gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-inset)] px-3 py-2 text-sm text-heading">
								<input
									id="dashboard-combine-multiple"
									type="checkbox"
									checked={combineMultiple}
									onChange={(event) => {
										setCombineMultiple(event.target.checked);
										setSelectedIds([]);
									}}
									className="h-4 w-4 rounded border-[var(--border-input)]"
								/>
								<label htmlFor="dashboard-combine-multiple" className="flex flex-col cursor-pointer">
									<span className="font-medium">{t('addCategoryModal.combineMultiple')}</span>
									<span className="text-xs text-label">{t('addCategoryModal.combineMultipleHint')}</span>
								</label>
							</div>
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
							{tab === 'categories' &&
								filteredCategories.map((category) => {
									const isSelected = selectedIds.includes(category.id);
									const isAdded = !combineMultiple && existingSingles.has(category.id);
									return (
										<button
											key={category.id}
											type="button"
											onClick={() => handleToggleSelection(category.id)}
											disabled={isAdded}
											className={cn(
												'w-full text-left px-3 py-2 rounded-md flex items-center justify-between transition-colors border',
												isAdded
													? 'opacity-50 cursor-not-allowed bg-inset border-transparent'
													: isSelected
														? 'bg-[var(--color-accent-bg)] border-[var(--color-accent-border)]'
														: 'hover:bg-inset border-transparent',
											)}
										>
											<div className="min-w-0">
												<div className="flex items-center gap-2">
													<SentimentDot color={SENTIMENT_COLORS[category.sentiment]} />
													<span className="font-medium truncate">{category.name}</span>
												</div>
											</div>
											{isAdded ? (
												<span className="text-xs font-medium text-label">{t('addCategoryModal.added')}</span>
											) : isSelected ? (
												<span className="text-xs font-semibold text-[var(--color-accent)]">
													{t('addCategoryModal.selected')}
												</span>
											) : null}
										</button>
									);
								})}

							{tab === 'items' &&
								filteredItems.map((item) => {
									const isSelected = selectedIds.includes(item.id);
									const isAdded = !combineMultiple && existingSingles.has(item.id);
									return (
										<button
											key={item.id}
											type="button"
											onClick={() => handleToggleSelection(item.id)}
											disabled={isAdded}
											className={cn(
												'w-full text-left px-3 py-2 rounded-md flex items-center justify-between transition-colors border',
												isAdded
													? 'opacity-50 cursor-not-allowed bg-inset border-transparent'
													: isSelected
														? 'bg-[var(--color-accent-bg)] border-[var(--color-accent-border)]'
														: 'hover:bg-inset border-transparent',
											)}
										>
											<div className="min-w-0">
												<div className="flex items-center gap-2">
													<SentimentDot
														color={getItemAccentColor(
															item.categories,
															item.type === 'food' ? foodCategories : activityCategories,
														)}
													/>
													<span className="font-medium truncate">{item.name}</span>
												</div>
												<CategorySentimentPills categories={resolveItemCategories(item)} />
											</div>
											{isAdded ? (
												<span className="text-xs font-medium text-label">{t('addCategoryModal.added')}</span>
											) : isSelected ? (
												<span className="text-xs font-semibold text-[var(--color-accent)]">
													{t('addCategoryModal.selected')}
												</span>
											) : null}
										</button>
									);
								})}

							{tab === 'categories' && filteredCategories.length === 0 && (
								<div className="py-8 text-center text-label">{t('addCategoryModal.noResults', { search })}</div>
							)}

							{tab === 'items' && filteredItems.length === 0 && (
								<div className="py-8 text-center text-label">{t('addCategoryModal.noItemResults', { search })}</div>
							)}
						</div>

						<div className="border-t px-4 py-3 space-y-2">
							{combineMultiple && isExistingCombination(tab === 'categories' ? 'category' : 'item', selectedIds) && (
								<p className="text-xs text-label">{t('addCategoryModal.combinationExists')}</p>
							)}
							<button type="button" className="btn btn-primary w-full" disabled={createDisabled} onClick={handleCreate}>
								{t('addCategoryModal.create')}
							</button>
						</div>
					</>
				) : (
					<div className="p-4 space-y-4">
						<div>
							<label className="form-label" htmlFor="dashboard-card-name">
								{t('addCategoryModal.nameLabel')}
							</label>
							<input
								id="dashboard-card-name"
								type="text"
								className="form-input"
								value={customName}
								onChange={(event) => setCustomName(event.target.value)}
								placeholder={t('addCategoryModal.namePlaceholder')}
								autoFocus
							/>
						</div>
						<div>
							<p className="text-xs font-semibold uppercase tracking-wide text-label mb-2">
								{t('addCategoryModal.selectedEntities')}
							</p>
							<div className="flex flex-wrap gap-2">
								{selectedIds.map((id) => {
									const source =
										tab === 'categories'
											? categories.find((entity) => entity.id === id)
											: sortedItems.find((entity) => entity.id === id);
									if (!source) return null;
									return (
										<span key={id} className="rounded-full bg-[var(--bg-inset)] px-3 py-1 text-sm text-heading">
											{source.name}
										</span>
									);
								})}
							</div>
						</div>
						<div className="flex gap-2">
							<button type="button" className="btn btn-secondary flex-1" onClick={() => setStep('select')}>
								{t('addCategoryModal.back')}
							</button>
							<button
								type="button"
								className="btn btn-primary flex-1"
								disabled={saveNameDisabled}
								onClick={handleSaveCustomCard}
							>
								{t('addCategoryModal.saveName')}
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
