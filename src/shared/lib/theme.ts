export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'theme-preference';

export function getStoredTheme(): ThemePreference {
	if (typeof localStorage === 'undefined') return 'system';
	const stored = localStorage.getItem(STORAGE_KEY);
	if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
	return 'system';
}

export function storeTheme(theme: ThemePreference): void {
	localStorage.setItem(STORAGE_KEY, theme);
}

export function getEffectiveTheme(pref: ThemePreference): 'light' | 'dark' {
	if (pref === 'system') {
		return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
	}
	return pref;
}

export function applyTheme(pref: ThemePreference): void {
	const effective = getEffectiveTheme(pref);
	const html = document.documentElement;

	if (effective === 'dark') {
		html.classList.add('dark');
	} else {
		html.classList.remove('dark');
	}

	// Update theme-color meta tag using CSS variable
	const meta = document.querySelector('meta[name="theme-color"]');
	if (meta) {
		const bgPageColor = getComputedStyle(html).getPropertyValue('--bg-page').trim();
		meta.setAttribute('content', bgPageColor);
	}
}
