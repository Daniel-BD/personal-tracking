import { describe, expect, it, vi } from 'vitest';
import { subscribeToStoreEvents } from '../store';
import { emitStoreEvent } from '../store-events';

describe('store events', () => {
	it('notifies subscribers with typed store events', () => {
		const listener = vi.fn();
		const unsubscribe = subscribeToStoreEvents(listener);

		emitStoreEvent({ type: 'sync-completed', operation: 'push' });

		expect(listener).toHaveBeenCalledWith({ type: 'sync-completed', operation: 'push' });
		unsubscribe();
	});

	it('stops notifying listeners after unsubscribe', () => {
		const listener = vi.fn();
		const unsubscribe = subscribeToStoreEvents(listener);

		unsubscribe();
		emitStoreEvent({ type: 'sync-load-failed', code: 'fetch_failed' });

		expect(listener).not.toHaveBeenCalled();
	});
});
