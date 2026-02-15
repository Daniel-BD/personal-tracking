import { useState, useEffect, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { isConfigured } from '@/shared/lib/github';
import { forceRefresh, addEntry } from '@/shared/store/store';
import { useEntries, useActivityItems, useFoodItems, useSyncStatus } from '@/shared/store/hooks';
import { compareMonths, filterEntriesByType } from '@/features/tracking';
import { getTodayDate, getCurrentTime } from '@/shared/lib/types';
import { showToast } from '@/shared/ui/Toast';
import { QuickLogForm } from '@/features/quick-log';

export default function HomePage() {
	const entries = useEntries();
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
			showToast(`"${addParam}" exists in both types. Log manually.`);
		} else if (activityMatch) {
			addEntry('activity', activityMatch.id, getTodayDate(), getCurrentTime());
			showToast(`Logged "${activityMatch.name}"`);
		} else if (foodMatch) {
			addEntry('food', foodMatch.id, getTodayDate(), getCurrentTime());
			showToast(`Logged "${foodMatch.name}"`);
		} else {
			showToast(`No item named "${addParam}" found`);
		}
	}, [searchParams]);

	async function handleRefresh() {
		await forceRefresh();
	}

	const activityComparison = useMemo(() => compareMonths(filterEntriesByType(entries, 'activity')), [entries]);
	const foodComparison = useMemo(() => compareMonths(filterEntriesByType(entries, 'food')), [entries]);

	return (
		<div className="space-y-6">
			{!configured ? (
				<div
					className="card p-4"
					style={{ background: 'var(--color-warning-bg)', borderColor: 'var(--color-warning-border)' }}
				>
					<h2 className="font-semibold" style={{ color: 'var(--color-warning-text)' }}>
						Setup Required
					</h2>
					<p className="text-sm mt-1" style={{ color: 'var(--color-warning-text)', opacity: 0.85 }}>
						Configure your GitHub token to start tracking.
					</p>
					<a
						href="/settings"
						className="inline-block mt-2 px-4 py-2 rounded-md text-sm font-medium text-white transition-colors"
						style={{ background: 'var(--color-warning)' }}
					>
						Go to Settings
					</a>
				</div>
			) : (
				<>
					{/* Header */}
					<div className="flex justify-between items-center">
						<h2 className="text-2xl font-bold text-heading">Quick Log</h2>
						<button
							onClick={handleRefresh}
							disabled={syncStatus === 'syncing'}
							className="p-2 rounded-md text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-inset)] disabled:opacity-50 transition-colors"
							aria-label="Refresh"
						>
							<RefreshCw className={`w-5 h-5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} strokeWidth={1.5} />
						</button>
					</div>

					{/* Quick Log form — borderless, command-palette style */}
					<QuickLogForm />

					{/* Monthly stats — visually secondary */}
					<div className="pt-4 border-t border-[var(--border-subtle)]">
						<div className="text-xs font-medium text-label uppercase tracking-wide">This month</div>
						<div className="flex gap-6 mt-1.5">
							<div className="flex items-baseline gap-1.5">
								<span className="text-lg font-semibold text-[var(--color-activity)]">{activityComparison.current}</span>
								<span className="text-xs text-label">activities</span>
							</div>
							<div className="flex items-baseline gap-1.5">
								<span className="text-lg font-semibold text-[var(--color-food)]">{foodComparison.current}</span>
								<span className="text-xs text-label">food</span>
							</div>
						</div>
					</div>
				</>
			)}
		</div>
	);
}
