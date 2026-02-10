import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { getStoredTheme, applyTheme } from './lib/theme';
import HomePage from './pages/HomePage';
import LogPage from './pages/LogPage';
import LibraryPage from './pages/LibraryPage';
import SettingsPage from './pages/SettingsPage';
import StatsPage from './pages/StatsPage';

function NavIcon({ icon }: { icon: string }) {
	if (icon === 'home') {
		return (
			<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
				<path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
			</svg>
		);
	}
	if (icon === 'list') {
		return (
			<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
				<path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
			</svg>
		);
	}
	if (icon === 'book') {
		return (
			<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
				<path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
			</svg>
		);
	}
	if (icon === 'chart') {
		return (
			<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
				<path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 12c-.621 0-1.125.504-1.125 1.125v6.75c0 .621.504 1.125 1.125 1.125h2.25c.621 0 1.125-.504 1.125-1.125v-6.75c0-.621-.504-1.125-1.125-1.125h-2.25zm7.5-1.875c-.621 0-1.125.504-1.125 1.125v8.625c0 .621.504 1.125 1.125 1.125h2.25c.621 0 1.125-.504 1.125-1.125V10.875c0-.621-.504-1.125-1.125-1.125h-2.25z" />
			</svg>
		);
	}
	if (icon === 'settings') {
		return (
			<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
				<path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
				<path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
			</svg>
		);
	}
	return null;
}

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
				className="fixed bottom-0 left-0 right-0 backdrop-blur-lg border-t"
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
		</div>
	);
}
