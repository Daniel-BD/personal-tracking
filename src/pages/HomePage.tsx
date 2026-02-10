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
	filterEntriesByDateRange,
	getMonthRange,
	compareMonths,
	filterEntriesByType
} from '../lib/analysis';
import { getTodayDate, getCurrentTime } from '../lib/types';
import QuickLogForm from '../components/QuickLogForm';

export default function HomePage() {
	const data = useTrackerData();
	const syncStatus = useSyncStatus();
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();

	const [configured, setConfigured] = useState(false);
	const [showSuccess, setShowSuccess] = useState(false);
	const [successMessage, setSuccessMessage] = useState('Entry logged successfully!');
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	useEffect(() => {
		const isConf = isConfigured();
		setConfigured(isConf);
		if (isConf) {
			initializeStore();
		}
	}, []);

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
			setErrorMessage(`"${addParam}" exists in both Activities and Food. Please log manually.`);
			setTimeout(() => setErrorMessage(null), 4000);
		} else if (activityMatch) {
			addEntry('activity', activityMatch.id, getTodayDate(), getCurrentTime());
			setSuccessMessage(`Logged "${activityMatch.name}" as activity!`);
			setShowSuccess(true);
			setTimeout(() => setShowSuccess(false), 2000);
		} else if (foodMatch) {
			addEntry('food', foodMatch.id, getTodayDate(), getCurrentTime());
			setSuccessMessage(`Logged "${foodMatch.name}" as food!`);
			setShowSuccess(true);
			setTimeout(() => setShowSuccess(false), 2000);
		} else {
			setErrorMessage(`No item named "${addParam}" found in your library.`);
			setTimeout(() => setErrorMessage(null), 4000);
		}
	}, [searchParams]);

	function handleSave() {
		setSuccessMessage('Entry logged successfully!');
		setShowSuccess(true);
		setTimeout(() => setShowSuccess(false), 2000);
	}

	async function handleRefresh() {
		await forceRefresh();
	}

	const thisMonthRange = useMemo(() => getMonthRange(), []);
	const thisMonthEntries = useMemo(
		() => filterEntriesByDateRange(data.entries, thisMonthRange),
		[data.entries, thisMonthRange]
	);
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
				<div className="card p-4" style={{ background: 'var(--color-warning-bg)', borderColor: 'var(--color-warning-border)' }}>
					<h2 className="font-semibold" style={{ color: 'var(--color-warning-text)' }}>Setup Required</h2>
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
					<div className="flex justify-between items-center">
						<h2 className="text-2xl font-bold text-heading">Quick Log</h2>
						<button
							onClick={handleRefresh}
							disabled={syncStatus === 'syncing'}
							className="text-sm text-[var(--color-activity)] hover:text-[var(--color-activity-hover)] disabled:opacity-50"
						>
							{syncStatus === 'syncing' ? 'Syncing...' : 'Refresh'}
						</button>
					</div>

					{showSuccess && (
						<div className="card p-3 text-sm" style={{ background: 'var(--color-success-bg)', borderColor: 'var(--color-success-border)', color: 'var(--color-success-text)' }}>
							{successMessage}
						</div>
					)}

					{errorMessage && (
						<div className="card p-3 text-sm" style={{ background: 'var(--color-danger-bg)', borderColor: 'var(--color-danger-border)', color: 'var(--color-danger-text)' }}>
							{errorMessage}
						</div>
					)}

					<QuickLogForm onsave={handleSave} />

					<div className="grid grid-cols-2 gap-4">
						<div className="card p-4">
							<div className="text-sm text-label">Activities this month</div>
							<div className="text-2xl font-bold text-[var(--color-activity)]">{activityComparison.current}</div>
							{activityComparison.difference !== 0 && (
								<div className="text-xs" style={{ color: `var(${activityComparison.difference > 0 ? '--color-success' : '--color-danger'})` }}>
									{activityComparison.difference > 0 ? '+' : ''}{activityComparison.difference} vs last month
								</div>
							)}
						</div>
						<div className="card p-4">
							<div className="text-sm text-label">Food logged this month</div>
							<div className="text-2xl font-bold text-[var(--color-food)]">{foodComparison.current}</div>
							{foodComparison.difference !== 0 && (
								<div className="text-xs" style={{ color: `var(${foodComparison.difference > 0 ? '--color-success' : '--color-danger'})` }}>
									{foodComparison.difference > 0 ? '+' : ''}{foodComparison.difference} vs last month
								</div>
							)}
						</div>
					</div>

					<div className="text-center text-sm text-label">
						{thisMonthEntries.length} total entries this month
					</div>
				</>
			)}
		</div>
	);
}
