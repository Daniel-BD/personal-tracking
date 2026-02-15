import { useState, useRef, useCallback } from 'react';
import type { TouchEvent as ReactTouchEvent } from 'react';

const SWIPE_THRESHOLD = 70;
const ACTION_WIDTH = 70;
const SWIPE_REVEAL = -(ACTION_WIDTH * 2);

export { ACTION_WIDTH };

export function useSwipeGesture() {
	const [swipedEntryId, setSwipedEntryId] = useState<string | null>(null);
	const [swipeOffset, setSwipeOffset] = useState(0);
	const touchStartRef = useRef<{ x: number; y: number; id: string } | null>(null);
	const didSwipeRef = useRef(false);

	const handleTouchStart = useCallback(
		(e: ReactTouchEvent, entryId: string) => {
			const touch = e.touches[0];
			touchStartRef.current = { x: touch.clientX, y: touch.clientY, id: entryId };
			didSwipeRef.current = false;

			// If a different entry was swiped, reset it
			if (swipedEntryId && swipedEntryId !== entryId) {
				setSwipedEntryId(null);
				setSwipeOffset(0);
			}
		},
		[swipedEntryId],
	);

	const handleTouchMove = useCallback((e: ReactTouchEvent) => {
		if (!touchStartRef.current) return;
		const touch = e.touches[0];
		const deltaX = touch.clientX - touchStartRef.current.x;
		const deltaY = touch.clientY - touchStartRef.current.y;

		// If vertical scroll is dominant, cancel swipe
		if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaX) < 10) {
			return;
		}

		// Mark that a swipe occurred (to prevent click from opening edit)
		if (Math.abs(deltaX) > 5) {
			didSwipeRef.current = true;
		}

		// Only allow left swipe (negative deltaX)
		if (deltaX < 0) {
			setSwipeOffset(Math.max(deltaX, SWIPE_REVEAL));
			setSwipedEntryId(touchStartRef.current.id);
		}
	}, []);

	const handleTouchEnd = useCallback(() => {
		if (!touchStartRef.current) return;

		if (Math.abs(swipeOffset) > SWIPE_THRESHOLD) {
			// Snap to reveal actions
			setSwipeOffset(SWIPE_REVEAL);
		} else {
			// Snap back
			setSwipeOffset(0);
			setSwipedEntryId(null);
		}

		touchStartRef.current = null;
	}, [swipeOffset]);

	const resetSwipe = useCallback(() => {
		setSwipedEntryId(null);
		setSwipeOffset(0);
	}, []);

	const isTouching = useCallback(() => touchStartRef.current !== null, []);

	const handleRowTap = useCallback(
		(onTap: () => void) => {
			// Ignore click events that followed a swipe gesture
			if (didSwipeRef.current) {
				didSwipeRef.current = false;
				return;
			}
			if (swipedEntryId) {
				setSwipedEntryId(null);
				setSwipeOffset(0);
				return;
			}
			onTap();
		},
		[swipedEntryId],
	);

	return {
		swipedEntryId,
		swipeOffset,
		handleTouchStart,
		handleTouchMove,
		handleTouchEnd,
		handleRowTap,
		resetSwipe,
		isTouching,
	};
}
