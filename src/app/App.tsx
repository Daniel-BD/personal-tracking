import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getStoredTheme, applyTheme } from '@/shared/lib/theme';
import { initializeStore } from '@/shared/store/store';
import { HomePage } from '@/features/home';
import { LogPage } from '@/features/log';
import { LibraryPage } from '@/features/library';
import NavIcon from '@/shared/ui/NavIcon';
import ToastContainer from '@/shared/ui/Toast';
import SyncToast from '@/shared/ui/SyncToast';
import ReloadPrompt from '@/shared/ui/ReloadPrompt';
import ErrorBoundary from '@/shared/ui/ErrorBoundary';

// Heavy routes are lazy-loaded so their chunks (including recharts) are only
// fetched when the user first navigates to that tab.
const StatsPage = lazy(() => import('@/features/stats').then((m) => ({ default: m.StatsPage })));
const CategoryDetailPage = lazy(() => import('@/features/stats').then((m) => ({ default: m.CategoryDetailPage })));
const SettingsPage = lazy(() => import('@/features/settings').then((m) => ({ default: m.SettingsPage })));

const routeConfig = [
	{ path: '/', labelKey: 'nav.home', icon: 'home', Component: HomePage },
	{ path: '/log', labelKey: 'nav.log', icon: 'list', Component: LogPage },
	{ path: '/stats', labelKey: 'nav.stats', icon: 'chart', Component: StatsPage },
	{ path: '/library', labelKey: 'nav.library', icon: 'book', Component: LibraryPage },
	{ path: '/settings', labelKey: 'nav.settings', icon: 'settings', Component: SettingsPage },
];

function PageLoader() {
	return (
		<div className="flex items-center justify-center py-24" style={{ color: 'var(--text-muted)' }} aria-label="Loading">
			<div className="w-6 h-6 rounded-full border-2 border-current border-t-transparent animate-spin" />
		</div>
	);
}

export default function App() {
	const { t } = useTranslation('common');
	const location = useLocation();

	useEffect(() => {
		const pref = getStoredTheme();
		applyTheme(pref);
		initializeStore();

		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		const handler = () => {
			const current = getStoredTheme();
			if (current === 'system') applyTheme('system');
		};
		mq.addEventListener('change', handler);
		return () => mq.removeEventListener('change', handler);
	}, []);

	return (
		<div className="h-dvh flex flex-col">
			<main className="flex-1 min-h-0 overflow-y-auto max-w-4xl mx-auto w-full px-4 py-6">
				<Suspense fallback={<PageLoader />}>
					<Routes>
						{routeConfig.map(({ path, labelKey, Component }) => (
							<Route
								key={path}
								path={path}
								element={
									<ErrorBoundary label={t(labelKey)}>
										<Component />
									</ErrorBoundary>
								}
							/>
						))}
						<Route
							path="/stats/category/:categoryId"
							element={
								<ErrorBoundary label="Category Detail">
									<CategoryDetailPage />
								</ErrorBoundary>
							}
						/>
					</Routes>
				</Suspense>
			</main>

			<nav
				className="fixed bottom-0 left-0 right-0 z-20 backdrop-blur-lg border-t"
				style={{
					background: 'color-mix(in srgb, var(--bg-card) 80%, transparent)',
					borderColor: 'var(--border-default)',
					paddingBottom: 'env(safe-area-inset-bottom, 0px)',
				}}
			>
				<div className="max-w-4xl mx-auto flex justify-around">
					{routeConfig.map(({ path, labelKey, icon }) => {
						const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
						return (
							<NavLink
								key={path}
								to={path}
								className="flex flex-col items-center py-2 px-3 text-xs transition-colors relative"
								style={{ color: isActive ? 'var(--color-activity)' : 'var(--text-muted)' }}
							>
								<span className="mb-1">
									<NavIcon icon={icon} />
								</span>
								<span>{t(labelKey)}</span>
								{isActive && (
									<span
										className="absolute bottom-1 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full"
										style={{ background: 'var(--color-activity)' }}
									/>
								)}
							</NavLink>
						);
					})}
				</div>
			</nav>

			<div className="h-16" />

			<ToastContainer />
			<SyncToast />
			<ReloadPrompt />
		</div>
	);
}
