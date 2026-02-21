import { useEffect, useRef, useState } from 'react';
import { Loader2, Check, CloudAlert } from 'lucide-react';
import { useSyncStatus } from '@/shared/store/hooks';
import { isConfigured } from '@/shared/lib/github';

type Phase = 'hidden' | 'syncing' | 'synced' | 'error';

export default function SyncToast() {
	const syncStatus = useSyncStatus();
	const [phase, setPhase] = useState<Phase>('hidden');
	const hideTimer = useRef<ReturnType<typeof setTimeout>>(null);
	const wasSyncing = useRef(false);

	useEffect(() => {
		if (!isConfigured()) return;

		if (syncStatus === 'syncing') {
			wasSyncing.current = true;
			if (hideTimer.current) clearTimeout(hideTimer.current);
			setPhase('syncing');
		} else if (syncStatus === 'idle' && wasSyncing.current) {
			wasSyncing.current = false;
			setPhase('synced');
			hideTimer.current = setTimeout(() => setPhase('hidden'), 1500);
		} else if (syncStatus === 'error' && wasSyncing.current) {
			wasSyncing.current = false;
			setPhase('error');
			hideTimer.current = setTimeout(() => setPhase('hidden'), 2500);
		}

		return () => {
			if (hideTimer.current) clearTimeout(hideTimer.current);
		};
	}, [syncStatus]);

	if (phase === 'hidden') return null;

	return (
		<div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
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
					{phase === 'syncing' && 'Syncing…'}
					{phase === 'synced' && 'Synced'}
					{phase === 'error' && 'Sync failed'}
				</span>
			</div>
		</div>
	);
}
