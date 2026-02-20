import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { useEffect, type ComponentType } from 'react';
import { getStoredTheme, applyTheme } from '@/shared/lib/theme';
import { initializeStore } from '@/shared/store/store';
import { HomePage } from '@/features/home';
import { LogPage } from '@/features/log';
import { LibraryPage } from '@/features/library';
import { SettingsPage } from '@/features/settings';
import { StatsPage } from '@/features/stats';
import NavIcon from '@/shared/ui/NavIcon';
import ToastContainer from '@/shared/ui/Toast';
import ReloadPrompt from '@/shared/ui/ReloadPrompt';
import ErrorBoundary from '@/shared/ui/ErrorBoundary';

const routeConfig: { path: string; label: string; icon: string; Component: ComponentType }[] = [
	{ path: '/', label: 'Home', icon: 'home', Component: HomePage },
	{ path: '/log', label: 'Log', icon: 'list', Component: LogPage },
	{ path: '/stats', label: 'Stats', icon: 'chart', Component: StatsPage },
	{ path: '/library', label: 'Library', icon: 'book', Component: LibraryPage },
	{ path: '/settings', label: 'Settings', icon: 'settings', Component: SettingsPage },
];

export default function App() {
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
		<div className="min-h-screen flex flex-col">
			<main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
				<Routes>
					{routeConfig.map(({ path, label, Component }) => (
						<Route
							key={path}
							path={path}
							element={
								<ErrorBoundary label={label}>
									<Component />
								</ErrorBoundary>
							}
						/>
					))}
				</Routes>
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
					{routeConfig.map(({ path, label, icon }) => {
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
								<span>{label}</span>
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
			<ReloadPrompt />
		</div>
	);
}
