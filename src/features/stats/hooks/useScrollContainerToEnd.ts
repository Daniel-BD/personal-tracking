import { useEffect, useRef } from 'react';

/**
 * Keeps horizontally scrollable chart containers pinned to the most recent data on first render/update.
 */
export function useScrollContainerToEnd(itemCount: number) {
	const containerRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (!containerRef.current) return;
		containerRef.current.scrollLeft = containerRef.current.scrollWidth;
	}, [itemCount]);

	return containerRef;
}
