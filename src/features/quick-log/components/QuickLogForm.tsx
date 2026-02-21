import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { EntryType } from '@/shared/lib/types';
import {
	useActivityItems,
	useFoodItems,
	useFavoriteItems,
	useActivityCategories,
	useFoodCategories,
	useEntries,
} from '@/shared/store/hooks';
import BottomSheet from '@/shared/ui/BottomSheet';
import SegmentedControl from '@/shared/ui/SegmentedControl';
import { CategoryPicker } from '@/features/tracking';
import NativePickerInput from '@/shared/ui/NativePickerInput';
import { useQuickLogSearch } from '../hooks/useQuickLogSearch';
import { useQuickLogForm } from '../hooks/useQuickLogForm';
import QuickLogSearchInput from './QuickLogSearchInput';
import QuickLogItemsList from './QuickLogItemsList';

export type QuickLogSlots = {
	searchInput: ReactNode;
	itemsList: ReactNode;
};

interface Props {
	/** Render prop: receives search input and items list nodes to place in custom layouts. */
	children?: (slots: QuickLogSlots) => ReactNode;
}

export default function QuickLogForm({ children }: Props) {
	const { t } = useTranslation('quickLog');
	const activityItems = useActivityItems();
	const foodItems = useFoodItems();
	const favoriteIds = useFavoriteItems();
	const activityCategories = useActivityCategories();
	const foodCategories = useFoodCategories();
	const entries = useEntries();

	const {
		query,
		setQuery,
		setIsFocused,
		searchResults,
		showResults,
		hasExactMatch,
		favoriteItemsList,
		recentItemsList,
		resetSearch,
	} = useQuickLogSearch(activityItems, foodItems, favoriteIds, entries);

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
	}

	function handleCreateTap() {
		openForCreate(query.trim());
		resetSearch();
	}

	const searchInput = (
		<QuickLogSearchInput
			query={query}
			setQuery={setQuery}
			setIsFocused={setIsFocused}
			searchResults={searchResults}
			showResults={showResults}
			hasExactMatch={hasExactMatch}
			onSelectExisting={handleSelectExisting}
			onCreateTap={handleCreateTap}
		/>
	);

	const itemsList = !showResults ? (
		<QuickLogItemsList
			favoriteItemsList={favoriteItemsList}
			recentItemsList={recentItemsList}
			onSelectExisting={handleSelectExisting}
			onQuickLog={quickLogItem}
		/>
	) : null;

	return (
		<>
			{children ? (
				children({ searchInput, itemsList })
			) : (
				<>
					{searchInput}
					{itemsList}
				</>
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
