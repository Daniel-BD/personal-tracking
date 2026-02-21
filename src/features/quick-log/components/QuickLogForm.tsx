import { useRef } from 'react';
import { Search, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { EntryType } from '@/shared/lib/types';
import { getTypeIcon } from '@/shared/lib/types';
import {
	useActivityItems,
	useFoodItems,
	useFavoriteItems,
	useActivityCategories,
	useFoodCategories,
} from '@/shared/store/hooks';
import { getCategoryNames, toggleFavorite } from '@/shared/store/store';
import BottomSheet from '@/shared/ui/BottomSheet';
import StarIcon from '@/shared/ui/StarIcon';
import SegmentedControl from '@/shared/ui/SegmentedControl';
import { CategoryPicker } from '@/features/tracking';
import NativePickerInput from '@/shared/ui/NativePickerInput';
import { useQuickLogSearch } from '../hooks/useQuickLogSearch';
import { useQuickLogForm } from '../hooks/useQuickLogForm';

export default function QuickLogForm() {
	const { t } = useTranslation('quickLog');
	const activityItems = useActivityItems();
	const foodItems = useFoodItems();
	const favoriteIds = useFavoriteItems();
	const activityCategories = useActivityCategories();
	const foodCategories = useFoodCategories();
	const inputRef = useRef<HTMLInputElement>(null);

	const { query, setQuery, setIsFocused, searchResults, showResults, hasExactMatch, favoriteItemsList, resetSearch } =
		useQuickLogSearch(activityItems, foodItems, favoriteIds);

	const {
		sheetOpen,
		setSheetOpen,
		sheetMode,
		itemName,
		setItemName,
		itemType,
		setItemType,
		logDate,
		setLogDate,
		logTime,
		setLogTime,
		logNote,
		setLogNote,
		logCategories,
		setLogCategories,
		selectedItem,
		categoriesForType,
		isLogDisabled,
		openForExisting,
		openForCreate,
		handleLog,
		quickLogItem,
	} = useQuickLogForm(activityCategories, foodCategories);

	function handleSelectExisting(unified: Parameters<typeof openForExisting>[0]) {
		openForExisting(unified);
		resetSearch();
		inputRef.current?.blur();
	}

	function handleCreateTap() {
		openForCreate(query.trim());
		resetSearch();
		inputRef.current?.blur();
	}

	return (
		<>
			{/* Search input — borderless, full-width */}
			<div className="relative">
				<div className="flex items-center gap-3 py-2">
					<Search className="w-5 h-5 text-[var(--text-muted)] flex-shrink-0" strokeWidth={1.5} />
					<input
						ref={inputRef}
						type="text"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						onFocus={() => setIsFocused(true)}
						onBlur={() => setTimeout(() => setIsFocused(false), 200)}
						placeholder={t('searchPlaceholder')}
						className="flex-1 bg-transparent text-heading text-base placeholder:text-[var(--text-muted)] outline-none"
					/>
				</div>
				<div className="h-px bg-[var(--border-subtle)]" />

				{/* Search results */}
				{showResults && (
					<div className="absolute z-20 w-full mt-1 bg-[var(--bg-elevated)] rounded-lg shadow-[var(--shadow-elevated)] border border-[var(--border-default)] max-h-64 overflow-y-auto">
						{searchResults.map((unified) => (
							<button
								key={`${unified.type}-${unified.item.id}`}
								type="button"
								onMouseDown={(e) => e.preventDefault()}
								onClick={() => handleSelectExisting(unified)}
								className="w-full text-left px-4 py-3 hover:bg-[var(--bg-card-hover)] flex items-center gap-3 border-b border-[var(--border-subtle)] last:border-b-0"
							>
								<span className="text-sm">{getTypeIcon(unified.type)}</span>
								<div className="flex-1 min-w-0">
									<div className="font-medium text-heading">{unified.item.name}</div>
									{unified.item.categories.length > 0 && (
										<div className="text-xs text-label truncate">
											{getCategoryNames(unified.type, unified.item.categories).join(', ')}
										</div>
									)}
								</div>
							</button>
						))}

						{!hasExactMatch && query.trim() && (
							<button
								type="button"
								onMouseDown={(e) => e.preventDefault()}
								onClick={handleCreateTap}
								className="w-full text-left px-4 py-3 hover:bg-[var(--bg-card-hover)] flex items-center gap-3 text-[var(--color-activity)]"
							>
								<span className="text-sm font-bold">+</span>
								<span>{t('createButton', { name: query.trim() })}</span>
							</button>
						)}
					</div>
				)}
			</div>

			{/* Favorite items — shown when not searching */}
			{!showResults && favoriteItemsList.length > 0 && (
				<div className="mt-4">
					<div className="text-xs font-medium text-label uppercase tracking-wide mb-2">{t('favoritesLabel')}</div>
					<div className="space-y-0.5">
						{favoriteItemsList.map((unified) => (
							<div
								key={`${unified.type}-${unified.item.id}`}
								className="w-full px-1 py-2.5 hover:bg-[var(--bg-card-hover)] rounded-md flex items-center gap-3 transition-colors"
							>
								<button
									type="button"
									onClick={() => toggleFavorite(unified.item.id)}
									className="flex-shrink-0 p-1"
									aria-label={t('removeFromFavoritesAriaLabel')}
								>
									<StarIcon filled className="w-4 h-4" />
								</button>
								<button
									type="button"
									onClick={() => handleSelectExisting(unified)}
									className="flex-1 text-left flex items-center gap-3 min-w-0"
								>
									<span className="text-sm">{getTypeIcon(unified.type)}</span>
									<span className="text-body truncate">{unified.item.name}</span>
								</button>
								<button
									type="button"
									onClick={() => quickLogItem(unified)}
									className="flex-shrink-0 p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--color-activity)] hover:bg-[var(--bg-inset)] transition-colors"
									aria-label={t('quickLogAriaLabel', { name: unified.item.name })}
								>
									<Zap className="w-4 h-4" strokeWidth={2} />
								</button>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Create + Log bottom sheet */}
			<BottomSheet
				open={sheetOpen}
				onClose={() => setSheetOpen(false)}
				title={
					sheetMode === 'create' ? t('sheet.titleCreate') : t('sheet.titleLog', { name: selectedItem?.item.name ?? '' })
				}
				actionLabel={sheetMode === 'create' ? t('sheet.actionCreate') : t('sheet.actionLog')}
				onAction={handleLog}
				actionDisabled={isLogDisabled}
			>
				<div className="space-y-5">
					{/* Item name — only for create mode */}
					{sheetMode === 'create' && (
						<div>
							<label htmlFor="sheet-name" className="form-label">
								{t('form.nameLabel')}
							</label>
							<input
								id="sheet-name"
								type="text"
								value={itemName}
								onChange={(e) => setItemName(e.target.value)}
								placeholder={t('form.namePlaceholder')}
								className="form-input"
								autoFocus
							/>
						</div>
					)}

					{/* Type selector — only for create mode */}
					{sheetMode === 'create' && (
						<div>
							<label className="form-label">{t('form.typeLabel')}</label>
							<SegmentedControl
								options={[
									{ value: 'activity' as EntryType, label: t('common:type.activity'), activeClass: 'type-activity' },
									{ value: 'food' as EntryType, label: t('common:type.food'), activeClass: 'type-food' },
								]}
								value={itemType}
								onChange={setItemType}
								variant="segment"
								size="sm"
							/>
						</div>
					)}

					{/* Date */}
					<div>
						<label htmlFor="sheet-date" className="form-label">
							{t('form.dateLabel')}
						</label>
						<NativePickerInput id="sheet-date" type="date" value={logDate} onChange={setLogDate} />
					</div>

					{/* Time */}
					<div>
						<label htmlFor="sheet-time" className="form-label">
							{t('form.timeLabel')}
						</label>
						<NativePickerInput
							id="sheet-time"
							type="time"
							value={logTime ?? ''}
							onChange={(val) => setLogTime(val || null)}
							onClear={() => setLogTime(null)}
						/>
					</div>

					{/* Categories */}
					<div>
						<label className="form-label">{t('form.categoriesLabel')}</label>
						<CategoryPicker
							selected={logCategories}
							categories={categoriesForType}
							onChange={setLogCategories}
							type={sheetMode === 'create' ? itemType : (selectedItem?.type ?? itemType)}
						/>
					</div>

					{/* Note */}
					<div>
						<label htmlFor="sheet-note" className="form-label">
							{t('form.noteLabel')}
						</label>
						<input
							id="sheet-note"
							type="text"
							value={logNote}
							onChange={(e) => setLogNote(e.target.value)}
							placeholder={t('form.notePlaceholder')}
							className="form-input"
						/>
					</div>
				</div>
			</BottomSheet>
		</>
	);
}
