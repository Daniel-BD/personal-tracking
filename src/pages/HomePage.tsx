import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { isConfigured } from '../lib/github';
import {
	initializeStore,
	forceRefresh,
	addEntry
} from '../lib/store';
import { useTrackerData, useSyncStatus } from '../lib/hooks';
import {
	compareMonths,
	filterEntriesByType
} from '../lib/analysis';
import { getTodayDate, getCurrentTime } from '../lib/types';
import { showToast } from '../components/Toast';
import QuickLogForm from '../components/QuickLogForm';

export default function HomePage() {
	const data = useTrackerData();
	const syncStatus = useSyncStatus();
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();

	const [configured, setConfigured] = useState(false);

	useEffect(() => {
		const isConf = isConfigured();
		setConfigured(isConf);
		if (isConf) {
			initializeStore();
		}
	}, []);

	// URL-based quick logging (?add=itemName)
	useEffect(() => {
		const addParam = searchParams.get('add');
		if (!addParam) return;

		const searchName = addParam.toLowerCase();
		const activityMatch = data.activityItems.find(
			(item) => item.name.toLowerCase() === searchName
		);
		const foodMatch = data.foodItems.find(
			(item) => item.name.toLowerCase() === searchName
		);

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

	const activityComparison = useMemo(
		() => compareMonths(filterEntriesByType(data.entries, 'activity')),
		[data.entries]
	);
	const foodComparison = useMemo(
		() => compareMonths(filterEntriesByType(data.entries, 'food')),
		[data.entries]
	);

	return (
		<div className="space-y-6">
			{!configured ? (
				<div className="card p-4 bg-[var(--color-warning-bg)] border-[var(--color-warning-border)]">
					<h2 className="font-semibold text-[var(--color-warning-text)]">Setup Required</h2>
					<p className="text-sm mt-1 text-[var(--color-warning-text)] opacity-85">
						Configure your GitHub token to start tracking.
					</p>
					<a
						href="/settings"
						className="inline-block mt-2 px-4 py-2 rounded-md text-sm font-medium text-white transition-colors bg-[var(--color-warning)]"
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
							<svg className={`w-5 h-5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
								<path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M2.985 19.644l3.181-3.182" />
							</svg>
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
