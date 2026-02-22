import { useCallback, useRef } from 'react';
import { Zap } from 'lucide-react';
import { useAnimate, useReducedMotion } from 'motion/react';
import { cn } from '@/shared/lib/cn';

interface Props {
	onClick: () => void;
	ariaLabel: string;
}

/**
 * Animated quick-log (Zap) button — "Energy Ripple" microinteraction.
 *
 * 5 phases: press compression → tight pop → clean ripple →
 * icon highlight sweep → micro confirmation settle.
 *
 * Total duration ~420ms. Feeling: controlled pulse of energy.
 * Animations driven by Motion's useAnimate (WAAPI-based).
 * Respects prefers-reduced-motion.
 */
export default function QuickLogButton({ onClick, ariaLabel }: Props) {
	const [scope, animate] = useAnimate<HTMLButtonElement>();
	const firingRef = useRef(false);
	const reducedMotion = useReducedMotion();

	// 1. Press compression — tactile scale-down on pointer contact
	const handlePointerDown = useCallback(() => {
		if (firingRef.current || reducedMotion) return;
		animate(scope.current!, { scale: 0.94, y: 1 }, { duration: 0.08, ease: [0.2, 0.8, 0.4, 1] });
	}, [animate, scope, reducedMotion]);

	const handlePointerUp = useCallback(() => {
		if (firingRef.current) return;
		animate(scope.current!, { scale: 1, y: 0 }, { duration: 0.08, ease: 'easeOut' });
	}, [animate, scope]);

	const handleClick = useCallback(async () => {
		if (firingRef.current) return;
		firingRef.current = true;
		onClick();

		// Reduced motion: simple settle pulse only
		if (reducedMotion) {
			await animate('.ql-settle', { opacity: [0, 0.1, 0] }, { duration: 0.3 });
			firingRef.current = false;
			return;
		}

		await Promise.all([
			// 2. Tight pop release — subtle spring, peak ≤1.06
			animate(
				scope.current!,
				{ scale: [0.94, 1.06, 1], y: [1, 0, 0] },
				{ duration: 0.12, ease: [0.34, 1.56, 0.64, 1] },
			),

			// 3. Clean ripple — single thin ring expanding from icon center
			animate('.ql-ripple', { scale: [1, 2.2], opacity: [0.4, 0] }, { duration: 0.26, ease: 'easeOut', delay: 0.04 }),

			// 4. Icon highlight sweep — diagonal light across the bolt
			animate('.ql-sweep', { x: ['-130%', '130%'] }, { duration: 0.15, ease: 'easeOut', delay: 0.07 }),

			// 5. Micro confirmation settle — brief background brighten
			animate('.ql-settle', { opacity: [0, 0.08, 0] }, { duration: 0.12, ease: 'easeInOut', delay: 0.22 }),
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
			{/* Ripple — single expanding ring */}
			<div className="ql-ripple" aria-hidden="true" />

			{/* Settle — subtle background brighten overlay */}
			<div className="ql-settle" aria-hidden="true" />

			{/* Lightning icon with sweep highlight */}
			<div className="ql-icon">
				<Zap className="w-4 h-4" strokeWidth={2} />
				<div className="ql-sweep" aria-hidden="true" />
			</div>
		</button>
	);
}
