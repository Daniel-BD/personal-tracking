import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSwipeGesture, ACTION_WIDTH } from '../hooks/useSwipeGesture';
import type { TouchEvent as ReactTouchEvent } from 'react';

function makeTouchEvent(clientX: number, clientY: number = 0): ReactTouchEvent {
	return { touches: [{ clientX, clientY }] } as unknown as ReactTouchEvent;
}

describe('useSwipeGesture', () => {
	it('defaults to 2 actions', () => {
		const { result } = renderHook(() => useSwipeGesture());
		const expectedReveal = -(ACTION_WIDTH * 2);

		// Simulate a full left swipe past threshold
		act(() => result.current.handleTouchStart(makeTouchEvent(300), 'entry-1'));
		act(() => result.current.handleTouchMove(makeTouchEvent(300 + expectedReveal - 10)));
		act(() => result.current.handleTouchEnd());

		expect(result.current.swipeOffset).toBe(expectedReveal);
	});

	it('respects custom action count of 3', () => {
		const { result } = renderHook(() => useSwipeGesture(3));
		const expectedReveal = -(ACTION_WIDTH * 3);

		act(() => result.current.handleTouchStart(makeTouchEvent(400), 'entry-1'));
		act(() => result.current.handleTouchMove(makeTouchEvent(400 + expectedReveal - 10)));
		act(() => result.current.handleTouchEnd());

		expect(result.current.swipeOffset).toBe(expectedReveal);
	});

	it('clamps swipe offset to reveal width', () => {
		const { result } = renderHook(() => useSwipeGesture(2));
		const maxReveal = -(ACTION_WIDTH * 2);

		// Try to swipe further than the max reveal
		act(() => result.current.handleTouchStart(makeTouchEvent(500), 'entry-1'));
		act(() => result.current.handleTouchMove(makeTouchEvent(0)));

		// Offset should be clamped to maxReveal, not go beyond
		expect(result.current.swipeOffset).toBe(maxReveal);
	});

	it('snaps back when swipe is below threshold', () => {
		const { result } = renderHook(() => useSwipeGesture());

		act(() => result.current.handleTouchStart(makeTouchEvent(300), 'entry-1'));
		act(() => result.current.handleTouchMove(makeTouchEvent(280))); // only -20px
		act(() => result.current.handleTouchEnd());

		expect(result.current.swipeOffset).toBe(0);
		expect(result.current.swipedEntryId).toBeNull();
	});

	it('resetSwipe clears state', () => {
		const { result } = renderHook(() => useSwipeGesture());

		act(() => result.current.handleTouchStart(makeTouchEvent(300), 'entry-1'));
		act(() => result.current.handleTouchMove(makeTouchEvent(100)));
		act(() => result.current.handleTouchEnd());

		expect(result.current.swipedEntryId).toBe('entry-1');

		act(() => result.current.resetSwipe());

		expect(result.current.swipedEntryId).toBeNull();
		expect(result.current.swipeOffset).toBe(0);
	});
});
