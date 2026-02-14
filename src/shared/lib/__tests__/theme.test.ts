import { describe, it, expect, beforeEach } from 'vitest';
import { getStoredTheme, storeTheme, getEffectiveTheme, applyTheme } from '../theme';

describe('theme', () => {
	beforeEach(() => {
		localStorage.clear();
		document.documentElement.classList.remove('dark');
	});

	describe('getStoredTheme', () => {
		it('returns "system" when nothing stored', () => {
			expect(getStoredTheme()).toBe('system');
		});

		it('returns stored light theme', () => {
			localStorage.setItem('theme-preference', 'light');
			expect(getStoredTheme()).toBe('light');
		});

		it('returns stored dark theme', () => {
			localStorage.setItem('theme-preference', 'dark');
			expect(getStoredTheme()).toBe('dark');
		});

		it('returns "system" for invalid stored value', () => {
			localStorage.setItem('theme-preference', 'invalid');
			expect(getStoredTheme()).toBe('system');
		});
	});

	describe('storeTheme', () => {
		it('persists theme to localStorage', () => {
			storeTheme('dark');
			expect(localStorage.getItem('theme-preference')).toBe('dark');
		});
	});

	describe('getEffectiveTheme', () => {
		it('returns "light" for light preference', () => {
			expect(getEffectiveTheme('light')).toBe('light');
		});

		it('returns "dark" for dark preference', () => {
			expect(getEffectiveTheme('dark')).toBe('dark');
		});

		it('returns a valid theme for system preference', () => {
			const result = getEffectiveTheme('system');
			expect(['light', 'dark']).toContain(result);
		});
	});

	describe('applyTheme', () => {
		it('adds dark class for dark theme', () => {
			applyTheme('dark');
			expect(document.documentElement.classList.contains('dark')).toBe(true);
		});

		it('removes dark class for light theme', () => {
			document.documentElement.classList.add('dark');
			applyTheme('light');
			expect(document.documentElement.classList.contains('dark')).toBe(false);
		});
	});
});
