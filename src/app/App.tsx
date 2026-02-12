import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { getStoredTheme, applyTheme } from '@/shared/lib/theme';
import { initializeStore } from '@/shared/store/store';
import HomePage from '@/pages/HomePage';
import LogPage from '@/pages/LogPage';
import LibraryPage from '@/pages/LibraryPage';
import SettingsPage from '@/pages/SettingsPage';
import StatsPage from '@/pages/StatsPage';
import NavIcon from '@/shared/ui/NavIcon';
import ToastContainer from '@/shared/ui/Toast';

const navItems = [
	{ to: '/', label: 'Home', icon: 'home' },
	{ to: '/log', label: 'Log', icon: 'list' },
	{ to: '/stats', label: 'Stats', icon: 'chart' },
	{ to: '/library', label: 'Library', icon: 'book' },
	{ to: '/settings', label: 'Settings', icon: 'settings' }
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
					<Route path="/" element={<HomePage />} />
					<Route path="/log" element={<LogPage />} />
					<Route path="/stats" element={<StatsPage />} />
					<Route path="/library" element={<LibraryPage />} />
					<Route path="/settings" element={<SettingsPage />} />
				</Routes>
			</main>

			<nav
				className="fixed bottom-0 left-0 right-0 z-20 backdrop-blur-lg border-t"
				style={{
					background: 'color-mix(in srgb, var(--bg-card) 80%, transparent)',
					borderColor: 'var(--border-default)',
					paddingBottom: 'env(safe-area-inset-bottom, 0px)'
				}}
			>
				<div className="max-w-4xl mx-auto flex justify-around">
					{navItems.map((item) => {
						const isActive = item.to === '/'
							? location.pathname === '/'
							: location.pathname.startsWith(item.to);
						return (
							<NavLink
								key={item.to}
								to={item.to}
								className="flex flex-col items-center py-2 px-3 text-xs transition-colors relative"
								style={{ color: isActive ? 'var(--color-activity)' : 'var(--text-muted)' }}
							>
								<span className="mb-1">
									<NavIcon icon={item.icon} />
								</span>
								<span>{item.label}</span>
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
		</div>
	);
}
