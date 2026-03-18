import type { EntryType, Item, TombstoneEntityType, TrackerData } from '@/shared/lib/types';
import { generateId, getDashboardCardEntityType, getItemsKey } from '@/shared/lib/types';
import type { StoreCommandRuntime } from '../command-types';

interface ItemFavoriteSyncDeps {
	addTombstone(data: TrackerData, id: string, entityType: TombstoneEntityType): TrackerData;
	addTombstones(data: TrackerData, entries: { id: string; entityType: TombstoneEntityType }[]): TrackerData;
	pendingDeletions: {
		entries: Set<string>;
		activityItems: Set<string>;
		foodItems: Set<string>;
		favoriteItems: Set<string>;
	};
	persistPendingDeletions(): void;
	removeTombstone(data: TrackerData, id: string, entityType: TombstoneEntityType): TrackerData;
}

export function createItemFavoriteCommands(runtime: StoreCommandRuntime, sync: ItemFavoriteSyncDeps) {
	function pruneDashboardCards(data: TrackerData, entityId: string, replacementId?: string): TrackerData {
		return {
			...data,
			dashboardCards: (data.dashboardCards || []).flatMap((card) => {
				if (getDashboardCardEntityType(card) !== 'item') {
					return [card];
				}

				if (!card.entityIds?.length) {
					if (card.itemId !== entityId) {
						return [card];
					}
					return replacementId ? [{ ...card, itemId: replacementId }] : [];
				}

				const nextIds = card.entityIds.map((id) => (id === entityId ? (replacementId ?? '') : id)).filter(Boolean);
				if (nextIds.length === 0) {
					return [];
				}

				return [{ ...card, entityIds: Array.from(new Set(nextIds)) }];
			}),
		};
	}

	function addItem(type: EntryType, name: string, categoryIds: string[]): Item {
		const item: Item = {
			id: generateId(),
			name,
			categories: categoryIds,
		};

		const key = getItemsKey(type);
		runtime.updateData((data) => ({
			...data,
			[key]: [...data[key], item],
		}));
		runtime.triggerPush();
		return item;
	}

	function updateItem(type: EntryType, id: string, name: string, categoryIds: string[]): void {
		const key = getItemsKey(type);
		const oldItem = runtime.getData()[key].find((item) => item.id === id);
		const oldCategories = oldItem?.categories ?? [];
		const oldSet = new Set(oldCategories);
		const newSet = new Set(categoryIds);
		const added = categoryIds.filter((categoryId) => !oldSet.has(categoryId));
		const removed = oldCategories.filter((categoryId) => !newSet.has(categoryId));

		runtime.updateData((data) => {
			const updatedItems = data[key].map((item) =>
				item.id === id ? { ...item, name, categories: categoryIds } : item,
			);
			let updatedEntries = data.entries;

			if (added.length > 0 || removed.length > 0) {
				const removedSet = new Set(removed);
				updatedEntries = data.entries.map((entry) => {
					if (entry.type !== type || entry.itemId !== id || !entry.categoryOverrides) {
						return entry;
					}

					const filtered = entry.categoryOverrides.filter((categoryId) => !removedSet.has(categoryId));
					const existing = new Set(filtered);
					const newOverrides = filtered.concat(added.filter((categoryId) => !existing.has(categoryId)));
					const matchesDefaults =
						newOverrides.length === categoryIds.length && newOverrides.every((categoryId) => newSet.has(categoryId));

					return { ...entry, categoryOverrides: matchesDefaults ? null : newOverrides };
				});
			}

			return {
				...data,
				[key]: updatedItems,
				entries: updatedEntries,
			};
		});
		runtime.triggerPush();
	}

	function deleteItem(type: EntryType, id: string): void {
		const entityType = type === 'activity' ? 'activityItem' : 'foodItem';
		sync.pendingDeletions[getItemsKey(type)].add(id);

		runtime
			.getData()
			.entries.filter((entry) => entry.type === type && entry.itemId === id)
			.forEach((entry) => sync.pendingDeletions.entries.add(entry.id));

		if ((runtime.getData().favoriteItems || []).includes(id)) {
			sync.pendingDeletions.favoriteItems.add(id);
		}

		sync.persistPendingDeletions();

		const key = getItemsKey(type);
		runtime.updateData((data) => {
			const entriesToDelete = data.entries.filter((entry) => entry.type === type && entry.itemId === id);
			const wasFavorite = (data.favoriteItems || []).includes(id);
			const updated: TrackerData = {
				...data,
				[key]: data[key].filter((item) => item.id !== id),
				entries: data.entries.filter((entry) => !(entry.type === type && entry.itemId === id)),
				favoriteItems: (data.favoriteItems || []).filter((favoriteId) => favoriteId !== id),
			};
			const withPrunedCards = pruneDashboardCards(updated, id);
			const tombstoneEntries: { id: string; entityType: TombstoneEntityType }[] = [
				{ id, entityType },
				...entriesToDelete.map((entry) => ({ id: entry.id, entityType: 'entry' as const })),
			];

			if (wasFavorite) {
				tombstoneEntries.push({ id, entityType: 'favoriteItem' });
			}

			return sync.addTombstones(withPrunedCards, tombstoneEntries);
		});
		runtime.triggerPush();
	}

	function mergeItem(type: EntryType, sourceId: string, targetId: string, noteToAppend?: string): number {
		if (sourceId === targetId) return 0;

		const key = getItemsKey(type);
		const entityType = type === 'activity' ? 'activityItem' : 'foodItem';
		const note = noteToAppend?.trim() || null;

		sync.pendingDeletions[key].add(sourceId);
		if ((runtime.getData().favoriteItems || []).includes(sourceId)) {
			sync.pendingDeletions.favoriteItems.add(sourceId);
		}
		sync.persistPendingDeletions();

		let affectedCount = 0;

		runtime.updateData((data) => {
			const sourceIsFavorite = (data.favoriteItems || []).includes(sourceId);
			const updatedEntries = data.entries.map((entry) => {
				if (entry.type !== type || entry.itemId !== sourceId) {
					return entry;
				}

				affectedCount++;
				const updatedEntry = { ...entry, itemId: targetId };
				if (note) {
					updatedEntry.notes = entry.notes ? entry.notes + '\n' + note : note;
				}
				return updatedEntry;
			});

			let newFavorites = (data.favoriteItems || []).filter((itemId) => itemId !== sourceId);
			if (sourceIsFavorite && !newFavorites.includes(targetId)) {
				newFavorites = [...newFavorites, targetId];
			}

			let updated: TrackerData = {
				...data,
				[key]: data[key].filter((item) => item.id !== sourceId),
				entries: updatedEntries,
				favoriteItems: newFavorites,
			};
			updated = pruneDashboardCards(updated, sourceId, targetId);
			const tombstoneEntries: { id: string; entityType: TombstoneEntityType }[] = [{ id: sourceId, entityType }];

			if (sourceIsFavorite) {
				tombstoneEntries.push({ id: sourceId, entityType: 'favoriteItem' });
			}

			updated = sync.addTombstones(updated, tombstoneEntries);
			return updated;
		});

		runtime.triggerPush();
		return affectedCount;
	}

	function toggleFavorite(itemId: string): void {
		const favorites = runtime.getData().favoriteItems || [];
		const isFav = favorites.includes(itemId);

		if (isFav) {
			sync.pendingDeletions.favoriteItems.add(itemId);
		} else {
			sync.pendingDeletions.favoriteItems.delete(itemId);
		}
		sync.persistPendingDeletions();

		runtime.updateData((data) => {
			const favoriteItems = data.favoriteItems || [];
			const updated = {
				...data,
				favoriteItems: isFav ? favoriteItems.filter((favoriteId) => favoriteId !== itemId) : [...favoriteItems, itemId],
			};

			if (isFav) {
				return sync.addTombstone(updated, itemId, 'favoriteItem');
			}

			return sync.removeTombstone(updated, itemId, 'favoriteItem');
		});
		runtime.triggerPush();
	}

	function isFavorite(itemId: string): boolean {
		return (runtime.getData().favoriteItems || []).includes(itemId);
	}

	return {
		addItem,
		updateItem,
		deleteItem,
		mergeItem,
		toggleFavorite,
		isFavorite,
	};
}
