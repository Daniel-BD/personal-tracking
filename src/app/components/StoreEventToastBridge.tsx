import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { subscribeToStoreEvents, type StoreEvent } from '@/shared/store/store';
import { useToast } from '@/shared/ui/useToast';

function getToastMessage(event: StoreEvent): string | null {
	switch (event.type) {
		case 'sync-push-failed':
			return 'sync.syncFailed';
		case 'sync-load-failed':
			return 'sync.loadFailed';
		case 'sync-completed':
			return null;
	}
}

export default function StoreEventToastBridge() {
	const { t } = useTranslation('common');
	const { showToast } = useToast();

	useEffect(() => {
		return subscribeToStoreEvents((event) => {
			const messageKey = getToastMessage(event);
			if (messageKey) {
				showToast(t(messageKey));
			}
		});
	}, [showToast, t]);

	return null;
}
