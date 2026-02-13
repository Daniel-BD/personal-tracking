import { useSyncExternalStore, useCallback } from 'react';

export function useIsMobile(breakpoint = 640): boolean {
	const subscribe = useCallback((cb: () => void) => {
		const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
		mql.addEventListener('change', cb);
		return () => mql.removeEventListener('change', cb);
	}, [breakpoint]);

	const getSnapshot = useCallback(() => {
		return window.matchMedia(`(max-width: ${breakpoint - 1}px)`).matches;
	}, [breakpoint]);

	return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
