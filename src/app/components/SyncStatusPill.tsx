import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, CloudAlert, Loader2 } from 'lucide-react';
import { isConfigured } from '@/shared/lib/github';
import { useSyncStatus } from '@/shared/store/hooks';
import { subscribeToStoreEvents } from '@/shared/store/store';

type Phase = 'hidden' | 'syncing' | 'synced' | 'error';

export default function SyncStatusPill() {
	const { t } = useTranslation('common');
	const syncStatus = useSyncStatus();
	const [phase, setPhase] = useState<Phase>('hidden');
	const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	const clearHideTimer = useCallback(() => {
		if (hideTimer.current) {
			clearTimeout(hideTimer.current);
			hideTimer.current = null;
		}
	}, []);

	const scheduleHide = useCallback(
		(delayMs: number) => {
			clearHideTimer();
			hideTimer.current = setTimeout(() => {
				hideTimer.current = null;
				setPhase('hidden');
			}, delayMs);
		},
		[clearHideTimer],
	);

	useEffect(() => {
		if (!isConfigured()) {
			clearHideTimer();
			setPhase('hidden');
			return;
		}

		if (syncStatus === 'syncing') {
			clearHideTimer();
			setPhase('syncing');
		}
	}, [clearHideTimer, syncStatus]);

	useEffect(() => {
		if (!isConfigured()) return;

		return subscribeToStoreEvents((event) => {
			if (event.type === 'sync-completed') {
				setPhase('synced');
				scheduleHide(1500);
				return;
			}

			if (event.type === 'sync-push-failed' || event.type === 'sync-load-failed') {
				setPhase('error');
				scheduleHide(2500);
			}
		});
	}, [scheduleHide]);

	useEffect(() => {
		return () => {
			clearHideTimer();
		};
	}, [clearHideTimer]);

	if (phase === 'hidden') return null;

	return (
		<div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 animate-fade-in" aria-live="polite">
			<div
				className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shadow-lg backdrop-blur-sm transition-colors duration-200"
				style={{
					background:
						phase === 'error'
							? 'color-mix(in srgb, var(--color-danger) 15%, var(--bg-elevated))'
							: 'color-mix(in srgb, var(--bg-elevated) 90%, transparent)',
					color: phase === 'error' ? 'var(--color-danger)' : 'var(--text-secondary)',
					border: '1px solid var(--border-default)',
				}}
			>
				{phase === 'syncing' && <Loader2 size={12} className="animate-spin" />}
				{phase === 'synced' && <Check size={12} style={{ color: 'var(--color-success)' }} />}
				{phase === 'error' && <CloudAlert size={12} />}
				<span>
					{phase === 'syncing' && t('sync.syncingStatus')}
					{phase === 'synced' && t('sync.syncedStatus')}
					{phase === 'error' && t('sync.syncFailedStatus')}
				</span>
			</div>
		</div>
	);
}
