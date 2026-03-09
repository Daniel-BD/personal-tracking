export type SyncOperation = 'push' | 'load';
export type SyncFailureCode = 'fetch_failed' | 'update_failed' | 'unknown';

export type StoreEvent =
	| {
			type: 'sync-completed';
			operation: SyncOperation;
	  }
	| {
			type: 'sync-push-failed';
			code: SyncFailureCode;
	  }
	| {
			type: 'sync-load-failed';
			code: SyncFailureCode;
	  };

export type StoreEventListener = (event: StoreEvent) => void;

const listeners = new Set<StoreEventListener>();

export function subscribeToStoreEvents(listener: StoreEventListener): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

export function emitStoreEvent(event: StoreEvent): void {
	listeners.forEach((listener) => listener(event));
}
