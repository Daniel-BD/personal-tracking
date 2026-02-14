import { useState, useMemo } from 'react';
import type { EntryType, Category } from '@/shared/lib/types';
import { getTodayDate, getCurrentTime } from '@/shared/lib/types';
import { addEntry, addItem, deleteEntry } from '@/shared/store/store';
import { showToast } from '@/shared/ui/Toast';
import type { UnifiedItem } from './useQuickLogSearch';

export function useQuickLogForm(
	activityCategories: Category[],
	foodCategories: Category[]
) {
	const [sheetOpen, setSheetOpen] = useState(false);
	const [sheetMode, setSheetMode] = useState<'create' | 'log'>('create');
	const [itemName, setItemName] = useState('');
	const [itemType, setItemType] = useState<EntryType>('food');
	const [logDate, setLogDate] = useState(getTodayDate());
	const [logTime, setLogTime] = useState<string | null>(getCurrentTime());
	const [logNote, setLogNote] = useState('');
	const [logCategories, setLogCategories] = useState<string[]>([]);
	const [selectedItem, setSelectedItem] = useState<UnifiedItem | null>(null);

	const categoriesForType = useMemo(
		() => itemType === 'activity' ? activityCategories : foodCategories,
		[itemType, activityCategories, foodCategories]
	);

	const isLogDisabled = sheetMode === 'create' && !itemName.trim();

	function openForExisting(unified: UnifiedItem) {
		setSelectedItem(unified);
		setSheetMode('log');
		setItemName(unified.item.name);
		setItemType(unified.type);
		setLogDate(getTodayDate());
		setLogTime(getCurrentTime());
		setLogNote('');
		setLogCategories([...unified.item.categories]);
		setSheetOpen(true);
	}

	function openForCreate(name: string) {
		setSelectedItem(null);
		setSheetMode('create');
		setItemName(name);
		setItemType('food');
		setLogDate(getTodayDate());
		setLogTime(getCurrentTime());
		setLogNote('');
		setLogCategories([]);
		setSheetOpen(true);
	}

	function handleLog() {
		let entryItemId: string;
		let entryType: EntryType;

		if (sheetMode === 'create') {
			if (!itemName.trim()) return;
			const newItem = addItem(itemType, itemName.trim(), logCategories);
			entryItemId = newItem.id;
			entryType = itemType;
		} else {
			if (!selectedItem) return;
			entryItemId = selectedItem.item.id;
			entryType = selectedItem.type;
		}

		const entry = addEntry(
			entryType,
			entryItemId,
			logDate,
			logTime,
			logNote.trim() || null,
			logCategories.length > 0 ? logCategories : null
		);

		setSheetOpen(false);
		resetForm();

		const displayName = itemName.trim() || selectedItem?.item.name || 'item';
		showToast(`Logged "${displayName}"`, {
			label: 'Undo',
			onClick: () => {
				deleteEntry(entry.id);
				showToast('Entry undone');
			}
		});
	}

	function quickLogItem(unified: UnifiedItem) {
		const entry = addEntry(
			unified.type,
			unified.item.id,
			getTodayDate(),
			getCurrentTime(),
			null,
			null
		);

		showToast(`Logged "${unified.item.name}"`, {
			label: 'Undo',
			onClick: () => {
				deleteEntry(entry.id);
				showToast('Entry undone');
			}
		});
	}

	function resetForm() {
		setSelectedItem(null);
		setItemName('');
		setItemType('food');
		setLogDate(getTodayDate());
		setLogTime(getCurrentTime());
		setLogNote('');
		setLogCategories([]);
	}

	return {
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
	};
}
