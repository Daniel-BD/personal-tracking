import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { isConfigured } from '@/shared/lib/github';
import { forceRefresh } from '@/shared/store/store';
import { useSyncStatus } from '@/shared/store/hooks';
import { cn } from '@/shared/lib/cn';
import { QuickLogForm } from '@/features/quick-log';
import DailyBalanceScore from './DailyBalanceScore';

export default function HomePage() {
	const { t } = useTranslation('home');
	const syncStatus = useSyncStatus();

	const [configured, setConfigured] = useState(false);

	useEffect(() => {
		setConfigured(isConfigured());
	}, []);

	async function handleRefresh() {
		await forceRefresh();
	}

	if (!configured) {
		return (
			<div
				className="card p-4"
				style={{ background: 'var(--color-warning-bg)', borderColor: 'var(--color-warning-border)' }}
			>
				<h2 className="font-semibold" style={{ color: 'var(--color-warning-text)' }}>
					{t('setupRequired.title')}
				</h2>
				<p className="text-sm mt-1" style={{ color: 'var(--color-warning-text)', opacity: 0.85 }}>
					{t('setupRequired.message')}
				</p>
				<a
					href="/settings"
					className="inline-block mt-2 px-4 py-2 rounded-md text-sm font-medium text-white transition-colors"
					style={{ background: 'var(--color-warning)' }}
				>
					{t('setupRequired.cta')}
				</a>
			</div>
		);
	}

	return (
		<div className="flex flex-col h-full">
			<QuickLogForm>
				{({ searchInput, itemsList }) => (
					<>
						{/* Non-scrolling header: title + search input + balance score */}
						<div className="flex-shrink-0 space-y-4">
							<div className="flex justify-between items-center">
								<h2 className="text-2xl font-bold text-heading">{t('title')}</h2>
								<button
									onClick={handleRefresh}
									disabled={syncStatus === 'syncing'}
									className="p-2 rounded-md text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-inset)] disabled:opacity-50 transition-colors"
									aria-label={t('refreshAriaLabel')}
								>
									<RefreshCw className={cn('w-5 h-5', syncStatus === 'syncing' && 'animate-spin')} strokeWidth={1.5} />
								</button>
							</div>

							{searchInput}

							<DailyBalanceScore />
						</div>

						{/* Favorites / recent list — overflow-y-auto lives inside QuickLogItemsList */}
						<div className="flex flex-col flex-1 min-h-0 mt-2">{itemsList}</div>
					</>
				)}
			</QuickLogForm>
		</div>
	);
}
