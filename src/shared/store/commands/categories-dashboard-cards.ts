import type {
	Category,
	CategorySentiment,
	DashboardCard,
	EntryType,
	TombstoneEntityType,
	TrackerData,
} from '@/shared/lib/types';
import {
	generateId,
	getCardId,
	getCategoriesKey,
	getDashboardCardEntityIds,
	getDashboardCardEntityType,
	getItemsKey,
} from '@/shared/lib/types';
import type { StoreCommandRuntime } from '../command-types';

interface CategoryDashboardSyncDeps {
	addTombstone(data: TrackerData, id: string, entityType: TombstoneEntityType): TrackerData;
	addTombstones(data: TrackerData, entries: { id: string; entityType: TombstoneEntityType }[]): TrackerData;
	clearDashboardCardRestored(cardId: string): void;
	markDashboardCardRestored(cardId: string): void;
	pendingDeletions: {
		activityCategories: Set<string>;
		foodCategories: Set<string>;
		dashboardCards: Set<string>;
	};
	persistPendingDeletions(): void;
	removeTombstone(data: TrackerData, id: string, entityType: TombstoneEntityType): TrackerData;
}

export function createCategoryDashboardCommands(runtime: StoreCommandRuntime, sync: CategoryDashboardSyncDeps) {
	function pruneDashboardCards(
		dashboardCards: DashboardCard[],
		entityType: 'category' | 'item',
		entityId: string,
		replacementId?: string,
	): DashboardCard[] {
		return dashboardCards.flatMap((card) => {
			if (getDashboardCardEntityType(card) !== entityType) {
				return [card];
			}

			if (!card.entityIds?.length) {
				if (entityType === 'category' && card.categoryId === entityId) {
					if (!replacementId) return [];
					const hasReplacementCard = dashboardCards.some(
						(other) => other !== card && !other.entityIds?.length && other.categoryId === replacementId,
					);
					if (hasReplacementCard) return [];
					return [{ ...card, categoryId: replacementId }];
				}
				if (entityType === 'item' && card.itemId === entityId) {
					if (!replacementId) return [];
					const hasReplacementCard = dashboardCards.some(
						(other) => other !== card && !other.entityIds?.length && other.itemId === replacementId,
					);
					if (hasReplacementCard) return [];
					return [{ ...card, itemId: replacementId }];
				}
				return [card];
			}

			const nextIds = card.entityIds.map((id) => (id === entityId ? (replacementId ?? '') : id)).filter(Boolean);
			if (nextIds.length === 0) {
				return [];
			}

			return [
				{
					...card,
					entityIds: Array.from(new Set(nextIds)),
				},
			];
		});
	}

	function addCategory(type: EntryType, name: string, sentiment: CategorySentiment = 'neutral'): Category {
		const category: Category = {
			id: generateId(),
			name: name.trim(),
			sentiment,
		};

		const key = getCategoriesKey(type);
		runtime.updateData((data) => ({
			...data,
			[key]: [...data[key], category],
		}));
		runtime.triggerPush();
		return category;
	}

	function updateCategory(type: EntryType, id: string, name: string, sentiment?: CategorySentiment): void {
		if (!name.trim()) {
			return;
		}

		const key = getCategoriesKey(type);
		runtime.updateData((data) => ({
			...data,
			[key]: data[key].map((category) => {
				if (category.id !== id) {
					return category;
				}

				const updated = { ...category, name: name.trim() };
				if (sentiment !== undefined) {
					updated.sentiment = sentiment;
				}
				return updated;
			}),
		}));
		runtime.triggerPush();
	}

	function deleteCategory(type: EntryType, categoryId: string): void {
		sync.pendingDeletions[getCategoriesKey(type)].add(categoryId);
		sync.persistPendingDeletions();

		const categoryKey = getCategoriesKey(type);
		const itemsKey = getItemsKey(type);
		const entityType = type === 'activity' ? 'activityCategory' : 'foodCategory';

		runtime.updateData((data) =>
			sync.addTombstone(
				{
					...data,
					[categoryKey]: data[categoryKey].filter((category) => category.id !== categoryId),
					[itemsKey]: data[itemsKey].map((item) => ({
						...item,
						categories: item.categories.filter((id) => id !== categoryId),
					})),
					entries: data.entries.map((entry) => {
						if (entry.type !== type || !entry.categoryOverrides) {
							return entry;
						}

						return {
							...entry,
							categoryOverrides: entry.categoryOverrides.filter((id) => id !== categoryId),
						};
					}),
					dashboardCards: pruneDashboardCards(data.dashboardCards || [], 'category', categoryId),
				},
				categoryId,
				entityType,
			),
		);
		runtime.triggerPush();
	}

	function mergeCategory(
		type: EntryType,
		sourceId: string,
		targetId: string,
	): { itemCount: number; entryCount: number } {
		if (sourceId === targetId) {
			return { itemCount: 0, entryCount: 0 };
		}

		const categoryKey = getCategoriesKey(type);
		const itemsKey = getItemsKey(type);
		const entityType = type === 'activity' ? 'activityCategory' : 'foodCategory';

		sync.pendingDeletions[categoryKey].add(sourceId);
		const snapshotCards = runtime.getData().dashboardCards || [];
		for (const card of snapshotCards) {
			if (getCardId(card) === sourceId || card.categoryId === sourceId) {
				sync.pendingDeletions.dashboardCards.add(getCardId(card));
				sync.clearDashboardCardRestored(getCardId(card));
			}
		}
		sync.persistPendingDeletions();

		let itemCount = 0;
		let entryCount = 0;

		runtime.updateData((data) => {
			const updatedItems = data[itemsKey].map((item) => {
				if (!item.categories.includes(sourceId)) {
					return item;
				}

				itemCount++;
				const hasTarget = item.categories.includes(targetId);
				return {
					...item,
					categories: hasTarget
						? item.categories.filter((id) => id !== sourceId)
						: item.categories.map((id) => (id === sourceId ? targetId : id)),
				};
			});

			const updatedEntries = data.entries.map((entry) => {
				if (entry.type !== type || !entry.categoryOverrides || !entry.categoryOverrides.includes(sourceId)) {
					return entry;
				}

				entryCount++;
				const hasTarget = entry.categoryOverrides.includes(targetId);
				return {
					...entry,
					categoryOverrides: hasTarget
						? entry.categoryOverrides.filter((id) => id !== sourceId)
						: entry.categoryOverrides.map((id) => (id === sourceId ? targetId : id)),
				};
			});

			const currentCards = data.dashboardCards || [];
			let updatedCards = pruneDashboardCards(currentCards, 'category', sourceId, targetId);
			const extraTombstones: { id: string; entityType: TombstoneEntityType }[] = [];
			const sourceCard = currentCards.find((card) => card.categoryId === sourceId);
			const targetCard = currentCards.find((card) => card.categoryId === targetId);

			if (sourceCard) {
				sync.clearDashboardCardRestored(sourceId);
				if (targetCard) {
					updatedCards = updatedCards.filter((card) => card.categoryId !== sourceId);
					extraTombstones.push({ id: sourceId, entityType: 'dashboardCard' });
				} else {
					updatedCards = updatedCards.map((card) =>
						card.categoryId === sourceId ? { ...card, categoryId: targetId } : card,
					);
					extraTombstones.push({ id: sourceId, entityType: 'dashboardCard' });
				}
			}

			let updated: TrackerData = {
				...data,
				[categoryKey]: data[categoryKey].filter((category) => category.id !== sourceId),
				[itemsKey]: updatedItems,
				entries: updatedEntries,
				dashboardCards: updatedCards,
			};

			updated = sync.addTombstones(updated, [{ id: sourceId, entityType }, ...extraTombstones]);
			return updated;
		});

		runtime.triggerPush();
		return { itemCount, entryCount };
	}

	function addDashboardCard(opts: {
		categoryId?: string;
		itemId?: string;
		name?: string;
		entityType?: 'category' | 'item';
		entityIds?: string[];
	}): string {
		const hasLegacy = Boolean(opts.categoryId || opts.itemId);
		const hasCombined = Boolean(opts.name && opts.entityType && opts.entityIds?.length);

		if (!hasLegacy && !hasCombined) {
			throw new Error('Either categoryId or itemId is required');
		}
		if (opts.categoryId && opts.itemId) {
			throw new Error('Only one of categoryId or itemId should be set');
		}
		if (hasLegacy && hasCombined) {
			throw new Error('Dashboard cards must use a single configuration shape');
		}

		const normalizedEntityIds = opts.entityIds ? Array.from(new Set(opts.entityIds)) : undefined;
		const cardId = hasCombined && normalizedEntityIds ? generateId() : (opts.categoryId ?? opts.itemId)!;

		if (
			(runtime.getData().dashboardCards || []).some((card) => {
				if (getCardId(card) === cardId) {
					return true;
				}

				if (!hasCombined) {
					return false;
				}

				return (
					getDashboardCardEntityType(card) === opts.entityType &&
					getDashboardCardEntityIds(card).length === normalizedEntityIds!.length &&
					getDashboardCardEntityIds(card).every((id) => normalizedEntityIds!.includes(id))
				);
			})
		) {
			return cardId;
		}

		const hadPendingDeletion = sync.pendingDeletions.dashboardCards.has(cardId);
		const hadDashboardCardTombstone = (runtime.getData().tombstones || []).some(
			(tombstone) => tombstone.entityType === 'dashboardCard' && tombstone.id === cardId,
		);

		sync.pendingDeletions.dashboardCards.delete(cardId);
		if (hadPendingDeletion || hadDashboardCardTombstone) {
			sync.markDashboardCardRestored(cardId);
		} else {
			sync.clearDashboardCardRestored(cardId);
		}
		sync.persistPendingDeletions();

		const card: DashboardCard = {
			...(hasCombined
				? {
						id: cardId,
						name: opts.name!.trim(),
						entityType: opts.entityType!,
						entityIds: normalizedEntityIds!,
					}
				: {}),
			...(opts.categoryId ? { categoryId: opts.categoryId } : {}),
			...(opts.itemId ? { itemId: opts.itemId } : {}),
			baseline: 'rolling_4_week_avg',
			comparison: 'last_week',
		};

		runtime.updateData((data) =>
			sync.removeTombstone(
				{
					...data,
					dashboardCards: [...(data.dashboardCards || []), card],
				},
				cardId,
				'dashboardCard',
			),
		);
		runtime.triggerPush();
		return cardId;
	}

	function updateDashboardCard(
		cardId: string,
		updates: { name: string; entityType: 'category' | 'item'; entityIds: string[] },
	): void {
		const nextEntityIds = Array.from(new Set(updates.entityIds));
		if (!updates.name.trim() || nextEntityIds.length === 0) {
			return;
		}

		runtime.updateData((data) => ({
			...data,
			dashboardCards: (data.dashboardCards || []).map((card) =>
				getCardId(card) === cardId
					? {
							...card,
							name: updates.name.trim(),
							entityType: updates.entityType,
							entityIds: nextEntityIds,
							id: card.id ?? cardId,
							categoryId: undefined,
							itemId: undefined,
						}
					: card,
			),
		}));
		runtime.triggerPush();
	}

	function removeDashboardCard(cardId: string): void {
		sync.pendingDeletions.dashboardCards.add(cardId);
		sync.clearDashboardCardRestored(cardId);
		sync.persistPendingDeletions();

		runtime.updateData((data) =>
			sync.addTombstone(
				{
					...data,
					dashboardCards: (data.dashboardCards || []).filter((card) => getCardId(card) !== cardId),
				},
				cardId,
				'dashboardCard',
			),
		);
		runtime.triggerPush();
	}

	return {
		addCategory,
		updateCategory,
		deleteCategory,
		mergeCategory,
		addDashboardCard,
		updateDashboardCard,
		removeDashboardCard,
	};
}
