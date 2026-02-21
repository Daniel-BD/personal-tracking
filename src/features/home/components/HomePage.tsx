import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { isConfigured } from '@/shared/lib/github';
import { forceRefresh, addEntry } from '@/shared/store/store';
import { useActivityItems, useFoodItems, useSyncStatus } from '@/shared/store/hooks';
import { getTodayDate, getCurrentTime } from '@/shared/lib/types';
import { cn } from '@/shared/lib/cn';
import { showToast } from '@/shared/ui/Toast';
import { QuickLogForm } from '@/features/quick-log';
import DailyBalanceScore from './DailyBalanceScore';

export default function HomePage() {
	const { t } = useTranslation('home');
	const activityItems = useActivityItems();
	const foodItems = useFoodItems();
	const syncStatus = useSyncStatus();
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();

	const [configured, setConfigured] = useState(false);

	useEffect(() => {
		setConfigured(isConfigured());
	}, []);

	// URL-based quick logging (?add=itemName)
	useEffect(() => {
		const addParam = searchParams.get('add');
		if (!addParam) return;

		const searchName = addParam.toLowerCase();
		const activityMatch = activityItems.find((item) => item.name.toLowerCase() === searchName);
		const foodMatch = foodItems.find((item) => item.name.toLowerCase() === searchName);

		navigate('/', { replace: true });

		if (activityMatch && foodMatch) {
			showToast(t('toast.ambiguous', { name: addParam }));
		} else if (activityMatch) {
			addEntry('activity', activityMatch.id, getTodayDate(), getCurrentTime());
			showToast(t('toast.logged', { name: activityMatch.name }));
		} else if (foodMatch) {
			addEntry('food', foodMatch.id, getTodayDate(), getCurrentTime());
			showToast(t('toast.logged', { name: foodMatch.name }));
		} else {
			showToast(t('toast.notFound', { name: addParam }));
		}
	}, [searchParams]);

	async function handleRefresh() {
		await forceRefresh();
	}

	return (
		<div className="space-y-6">
			{!configured ? (
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
			) : (
				<>
					{/* Header */}
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

					{/* Daily balance score */}
					<DailyBalanceScore />

					{/* Quick Log form — borderless, command-palette style */}
					<QuickLogForm />
				</>
			)}
		</div>
	);
}
