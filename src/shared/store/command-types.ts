import type { TrackerData } from '@/shared/lib/types';

export interface StoreCommandRuntime {
	getData(): TrackerData;
	setData(data: TrackerData): void;
	triggerPush(): void;
	updateData(updater: (data: TrackerData) => TrackerData): void;
}
