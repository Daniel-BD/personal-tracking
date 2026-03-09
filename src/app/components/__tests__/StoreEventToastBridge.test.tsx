import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import '@/shared/lib/i18n';
import { ToastProvider } from '@/shared/ui/Toast';
import { emitStoreEvent } from '@/shared/store/store-events';
import StoreEventToastBridge from '../StoreEventToastBridge';

afterEach(cleanup);

function renderBridge() {
	return render(
		<ToastProvider>
			<StoreEventToastBridge />
		</ToastProvider>,
	);
}

describe('StoreEventToastBridge', () => {
	it('shows a localized toast for sync push failures', () => {
		renderBridge();

		act(() => {
			emitStoreEvent({ type: 'sync-push-failed', code: 'fetch_failed' });
		});

		expect(screen.getByText('Sync failed — changes saved locally')).toBeTruthy();
	});

	it('shows a localized toast for sync load failures', () => {
		renderBridge();

		act(() => {
			emitStoreEvent({ type: 'sync-load-failed', code: 'update_failed' });
		});

		expect(screen.getByText('Failed to load from Gist')).toBeTruthy();
	});

	it('ignores sync completed events', () => {
		renderBridge();

		act(() => {
			emitStoreEvent({ type: 'sync-completed', operation: 'load' });
		});

		expect(screen.queryByText('Sync failed — changes saved locally')).toBeNull();
		expect(screen.queryByText('Failed to load from Gist')).toBeNull();
	});
});
