import { useState, useEffect, useRef } from 'react';

/*
 * Shared animation utilities.
 *
 * Two complementary approaches used throughout the app:
 *
 * 1. Value interpolation (JS)  — `useAnimatedValue` hook (RAF-based)
 *    For animating numeric values that drive React state (counters, progress).
 *    Used by `DailyBalanceScore`.
 *
 * 2. DOM animations (Motion)   — `useAnimate` from `motion/react`
 *    For multi-layered visual effects (burst, glow, particles).
 *    WAAPI-based, runs on the compositor thread. Used by `QuickLogButton`.
 *
 * Both share the same easing language. Key cubic-bezier curves:
 *   easeOutCubic  → cubic-bezier(0.33, 1, 0.68, 1) or [0.33, 1, 0.68, 1]
 *   spring        → cubic-bezier(0.34, 1.56, 0.64, 1) or [0.34, 1.56, 0.64, 1]
 *   press         → cubic-bezier(0.2, 0.8, 0.4, 1)  or [0.2, 0.8, 0.4, 1]
 *
 * Performance rule: only animate `transform` and `opacity` in DOM
 * animations. Always respect `prefers-reduced-motion` (Motion's
 * `useReducedMotion` hook).
 */

// ── Easing functions (JS) ──────────────────────────────────────────

/** Smooth deceleration — starts fast, slows down. */
export function easeOutCubic(t: number): number {
	return 1 - Math.pow(1 - t, 3);
}

// ── useAnimatedValue ────────────────────────────────────────────────

interface UseAnimatedValueOptions {
	/** Animation duration in ms (default 900). */
	duration?: number;
	/** Easing function (default easeOutCubic). Must be a stable reference. */
	easing?: (t: number) => number;
	/** Set false to skip animation and return 0 (default true). */
	enabled?: boolean;
}

/**
 * Animates a numeric value from its previous state to `target` using
 * requestAnimationFrame. Returns the current display value.
 *
 * When `target` changes, a new animation starts from wherever the
 * previous animation left off — no jumps.
 */
export function useAnimatedValue(
	target: number,
	{ duration = 900, easing = easeOutCubic, enabled = true }: UseAnimatedValueOptions = {},
): number {
	const [display, setDisplay] = useState(0);
	const displayRef = useRef(0);
	const frameRef = useRef<number | null>(null);
	const easingRef = useRef(easing);
	easingRef.current = easing;

	useEffect(() => {
		if (!enabled) return;

		if (frameRef.current !== null) {
			cancelAnimationFrame(frameRef.current);
		}

		const startValue = displayRef.current;
		const startTime = performance.now();

		const animate = (now: number) => {
			const elapsed = now - startTime;
			const progress = Math.min(elapsed / duration, 1);
			const eased = easingRef.current(progress);
			const current = startValue + (target - startValue) * eased;

			displayRef.current = current;
			setDisplay(current);

			if (progress < 1) {
				frameRef.current = requestAnimationFrame(animate);
			} else {
				frameRef.current = null;
			}
		};

		frameRef.current = requestAnimationFrame(animate);

		return () => {
			if (frameRef.current !== null) {
				cancelAnimationFrame(frameRef.current);
				frameRef.current = null;
			}
		};
	}, [target, duration, enabled]);

	return display;
}
