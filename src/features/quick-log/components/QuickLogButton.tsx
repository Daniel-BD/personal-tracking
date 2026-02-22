import { useCallback, useRef } from 'react';
import { Zap } from 'lucide-react';
import { useAnimate, useReducedMotion } from 'motion/react';
import { cn } from '@/shared/lib/cn';

/**
 * Six spark particle endpoints.
 * Roughly evenly distributed (60° apart) with slight organic variation.
 * Values are px offsets from center.
 */
const SPARKS: ReadonlyArray<{ tx: number; ty: number }> = [
	{ tx: 18, ty: 0 },
	{ tx: 9, ty: -15 },
	{ tx: -8, ty: -16 },
	{ tx: -18, ty: 1 },
	{ tx: -7, ty: 15 },
	{ tx: 10, ty: 14 },
];

interface Props {
	onClick: () => void;
	ariaLabel: string;
}

/**
 * Animated quick-log (Zap) button with a 5-phase microinteraction:
 * press → spring snap → glow + burst ring + sparks → confirmation flash.
 *
 * Animations are driven by Motion's `useAnimate` (WAAPI-based).
 * Only `transform` and `opacity` are animated on the compositor thread.
 * Respects `prefers-reduced-motion`.
 */
export default function QuickLogButton({ onClick, ariaLabel }: Props) {
	const [scope, animate] = useAnimate<HTMLButtonElement>();
	const firingRef = useRef(false);
	const reducedMotion = useReducedMotion();

	const handlePointerDown = useCallback(() => {
		if (firingRef.current || reducedMotion) return;
		animate(scope.current!, { scale: 0.9, y: 2 }, { duration: 0.09, ease: [0.2, 0.8, 0.4, 1] });
	}, [animate, scope, reducedMotion]);

	const handlePointerUp = useCallback(() => {
		if (firingRef.current) return;
		animate(scope.current!, { scale: 1, y: 0 }, { duration: 0.09, ease: 'easeOut' });
	}, [animate, scope]);

	const handleClick = useCallback(async () => {
		if (firingRef.current) return;
		firingRef.current = true;
		onClick();

		// Reduced motion: simple opacity pulse, skip complex animation
		if (reducedMotion) {
			await animate('.ql-flash-overlay', { opacity: [0, 0.5, 0.5, 0] }, { duration: 0.3 });
			firingRef.current = false;
			return;
		}

		// Read computed icon color for the flash phase (works in light + dark mode)
		const iconEl = scope.current!.querySelector('.ql-icon')!;
		const iconColor = getComputedStyle(iconEl).color;

		await Promise.all([
			// 1. Button snap — spring pop from pressed to overshoot to rest
			animate(scope.current!, { scale: [0.9, 1.08, 1], y: [2, 0, 0] }, { duration: 0.13, ease: [0.34, 1.56, 0.64, 1] }),

			// 2. Icon snap — scale + wobble
			animate(
				'.ql-icon',
				{ scale: [1, 1.2, 1], rotate: [0, -6, 4, 0] },
				{ duration: 0.16, ease: [0.34, 1.56, 0.64, 1] },
			),

			// 3. Glow charge — radial glow behind icon
			animate('.ql-glow', { opacity: [0, 0.7, 0] }, { duration: 0.2, ease: 'easeOut' }),

			// 4. Burst ring — expanding circle stroke
			animate('.ql-burst', { scale: [1, 1.9], opacity: [0.8, 0] }, { duration: 0.18, ease: 'easeOut', delay: 0.11 }),

			// 5. Sparks — 6 particles bursting outward with stagger
			...SPARKS.map((spark, i) =>
				animate(
					`.ql-spark-${i}`,
					{ x: [0, spark.tx], y: [0, spark.ty], scale: [1, 0.6], opacity: [1, 0] },
					{ duration: 0.18, ease: 'easeOut', delay: 0.13 + i * 0.01 },
				),
			),

			// 6. Flash overlay — confirmation pulse
			animate(
				'.ql-flash-overlay',
				{ opacity: [0, 1, 1, 0] },
				{ duration: 0.16, ease: 'easeInOut', delay: 0.27, times: [0, 0.12, 0.75, 1] },
			),

			// 7. Icon turns white during flash
			animate(
				'.ql-icon',
				{ color: [iconColor, '#ffffff', '#ffffff', iconColor] },
				{ duration: 0.16, ease: 'easeInOut', delay: 0.27, times: [0, 0.15, 0.75, 1] },
			),
		]);

		firingRef.current = false;
	}, [onClick, animate, scope, reducedMotion]);

	return (
		<button
			ref={scope}
			type="button"
			onClick={handleClick}
			onPointerDown={handlePointerDown}
			onPointerUp={handlePointerUp}
			onPointerLeave={handlePointerUp}
			className={cn(
				'ql-btn relative flex-shrink-0 p-1.5 rounded-md text-[var(--text-muted)]',
				'hover:text-[var(--color-activity)] hover:bg-[var(--bg-inset)]',
			)}
			aria-label={ariaLabel}
		>
			{/* Glow — pre-blurred radial gradient, only opacity animates */}
			<div className="ql-glow" aria-hidden="true" />

			{/* Burst ring — expanding circle stroke */}
			<div className="ql-burst" aria-hidden="true" />

			{/* Sparks — 6 small circular particles */}
			{SPARKS.map((_, i) => (
				<div key={i} className={`ql-spark ql-spark-${i}`} aria-hidden="true" />
			))}

			{/* Flash overlay — fills button with accent color */}
			<div className="ql-flash-overlay" aria-hidden="true" />

			{/* Lightning icon — wrapped for transform + color animation */}
			<div className="ql-icon relative">
				<Zap className="w-4 h-4" strokeWidth={2} />
			</div>
		</button>
	);
}
