import type { Entry, EntryType, TrackerData } from '@/shared/lib/types';
import { generateId } from '@/shared/lib/types';
import type { StoreCommandRuntime } from '../command-types';

interface EntrySyncDeps {
	addTombstone(data: TrackerData, id: string, entityType: 'entry'): TrackerData;
	pendingDeletions: {
		entries: Set<string>;
	};
	persistPendingDeletions(): void;
}

export function createEntryCommands(runtime: StoreCommandRuntime, sync: EntrySyncDeps) {
	function addEntry(
		type: EntryType,
		itemId: string,
		date: string,
		time: string | null = null,
		notes: string | null = null,
		categoryOverrides: string[] | null = null,
	): Entry {
		const entry: Entry = {
			id: generateId(),
			type,
			itemId,
			date,
			time,
			notes,
			categoryOverrides,
		};

		runtime.updateData((data) => ({
			...data,
			entries: [...data.entries, entry],
		}));
		runtime.triggerPush();
		return entry;
	}

	function updateEntry(id: string, updates: Partial<Omit<Entry, 'id' | 'type' | 'itemId'>>): void {
		runtime.updateData((data) => ({
			...data,
			entries: data.entries.map((entry) => (entry.id === id ? { ...entry, ...updates } : entry)),
		}));
		runtime.triggerPush();
	}

	function deleteEntry(id: string): void {
		sync.pendingDeletions.entries.add(id);
		sync.persistPendingDeletions();

		runtime.updateData((data) =>
			sync.addTombstone(
				{
					...data,
					entries: data.entries.filter((entry) => entry.id !== id),
				},
				id,
				'entry',
			),
		);
		runtime.triggerPush();
	}

	return {
		addEntry,
		updateEntry,
		deleteEntry,
	};
}
