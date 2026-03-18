import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { getStoredTheme, applyTheme } from '@/shared/lib/theme';
import { initializeStore } from '@/shared/store/store';
import { HomePage } from '@/features/home';
import { LogPage, ItemDetailPage } from '@/features/log';
import { LibraryPage } from '@/features/library';
import NavIcon from '@/shared/ui/NavIcon';
import { ToastProvider } from '@/shared/ui/Toast';
import ReloadPrompt from '@/shared/ui/ReloadPrompt';
import ErrorBoundary from '@/shared/ui/ErrorBoundary';
import StoreEventToastBridge from './components/StoreEventToastBridge';
import SyncStatusPill from './components/SyncStatusPill';

// Heavy routes are lazy-loaded so their chunks (including recharts) are only
// fetched when the user first navigates to that tab.
const StatsPage = lazy(() => import('@/features/stats').then((m) => ({ default: m.StatsPage })));
const CategoryDetailPage = lazy(() => import('@/features/stats').then((m) => ({ default: m.CategoryDetailPage })));
const StatsItemDetailPage = lazy(() => import('@/features/stats').then((m) => ({ default: m.ItemDetailPage })));
const DashboardCardDetailPage = lazy(() =>
	import('@/features/stats').then((m) => ({ default: m.DashboardCardDetailPage })),
);
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
		<ToastProvider>
			<div className="min-h-dvh flex flex-col">
				<main className="flex w-full flex-1 flex-col">
					<div
						className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 pt-6"
						style={{ paddingBottom: 'calc(1.5rem + var(--app-bottom-nav-offset))' }}
					>
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
									path="/log/item/:itemId"
									element={
										<ErrorBoundary label="Item Detail">
											<ItemDetailPage />
										</ErrorBoundary>
									}
								/>
								<Route
									path="/stats/category/:categoryId"
									element={
										<ErrorBoundary label="Category Detail">
											<CategoryDetailPage />
										</ErrorBoundary>
									}
								/>
								<Route
									path="/stats/item/:itemId"
									element={
										<ErrorBoundary label="Item Detail">
											<StatsItemDetailPage />
										</ErrorBoundary>
									}
								/>
								<Route
									path="/stats/dashboard-card/:cardId"
									element={
										<ErrorBoundary label="Dashboard Card Detail">
											<DashboardCardDetailPage />
										</ErrorBoundary>
									}
								/>
							</Routes>
						</Suspense>
					</div>
				</main>

				<nav
					className="fixed bottom-0 left-0 right-0 z-20 backdrop-blur-lg"
					style={{
						background: 'color-mix(in srgb, var(--bg-card) 80%, transparent)',
						paddingBottom: 'env(safe-area-inset-bottom, 0px)',
					}}
				>
					<div className="max-w-4xl mx-auto flex justify-around relative w-full">
						{routeConfig.map(({ path, labelKey, icon }) => {
							const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
							return (
								<NavLink
									key={path}
									to={path}
									className="flex flex-col items-center pt-2 pb-2 px-3 text-xs transition-colors relative flex-1"
									style={{ color: isActive ? 'var(--color-accent)' : 'var(--text-muted)' }}
								>
									{isActive && (
										<motion.span
											layoutId="nav-indicator"
											className="absolute top-0 left-0 right-0 h-0.5 rounded-full"
											style={{ background: 'var(--color-accent)' }}
											transition={{ type: 'spring', stiffness: 500, damping: 35 }}
										/>
									)}
									<span className="mb-1">
										<NavIcon icon={icon} />
									</span>
									<span>{t(labelKey)}</span>
								</NavLink>
							);
						})}
					</div>
				</nav>

				<StoreEventToastBridge />
				<SyncStatusPill />
				<ReloadPrompt />
			</div>
		</ToastProvider>
	);
}
