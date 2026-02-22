import { useCallback, useRef } from 'react';
import { Zap } from 'lucide-react';
import { useAnimate, useReducedMotion } from 'motion/react';
import { cn } from '@/shared/lib/cn';

interface Props {
	onClick: () => void;
	ariaLabel: string;
}

const PROGRESS_CIRCLE_CIRCUMFERENCE = 70; // Approx 2 * PI * 11 (radius)

/**
 * Animated quick-log (Zap) button.
 *
 * When pressed:
 * 1. Animates icon color to yellow by fading in a layered icon.
 * 2. Simultaneously animates a progress circle clockwise around the icon.
 */
export default function QuickLogButton({ onClick, ariaLabel }: Props) {
	const [scope, animate] = useAnimate<HTMLButtonElement>();
	const firingRef = useRef(false);
	const reducedMotion = useReducedMotion();

	const handleClick = useCallback(async () => {
		if (firingRef.current) return;
		firingRef.current = true;
		onClick();

		// Reduced motion: simple opacity pulse for the highlight
		if (reducedMotion) {
			await animate('.ql-icon-yellow', { opacity: [0, 1, 0] }, { duration: 0.5 });
			firingRef.current = false;
			return;
		}

		// Main animation
		await Promise.all([
			// Animate color to yellow via opacity overlay
			animate('.ql-icon-yellow', { opacity: 1 }, { duration: 0.15 }),
			// Animate progress circle fill
			animate('.ql-progress', { strokeDashoffset: 0, opacity: 1 }, { duration: 0.5, ease: 'linear' }),
		]);

		// Settle and reset
		await Promise.all([
			animate('.ql-icon-yellow', { opacity: 0 }, { duration: 0.2, delay: 0.1 }),
			animate('.ql-progress', { opacity: 0 }, { duration: 0.2, delay: 0.1 }),
		]);

		// Prepare for next interaction
		await animate('.ql-progress', { strokeDashoffset: PROGRESS_CIRCLE_CIRCUMFERENCE }, { duration: 0 });

		firingRef.current = false;
	}, [onClick, animate, reducedMotion]);

	return (
		<button
			ref={scope}
			type="button"
			onClick={handleClick}
			className={cn(
				'ql-btn relative flex-shrink-0 p-1.5 rounded-md text-[var(--text-muted)]',
				'hover:text-[var(--color-activity)] hover:bg-[var(--bg-inset)]',
			)}
			aria-label={ariaLabel}
		>
			{/* Progress Circle — clockwise from top */}
			<svg
				className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
				viewBox="0 0 28 28"
				aria-hidden="true"
			>
				<circle
					cx="14"
					cy="14"
					r="11"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeDasharray={PROGRESS_CIRCLE_CIRCUMFERENCE}
					strokeDashoffset={PROGRESS_CIRCLE_CIRCUMFERENCE}
					strokeLinecap="round"
					className="ql-progress opacity-0 text-[var(--color-favorite)]"
				/>
			</svg>

			{/* Lightning icon with layered yellow highlight */}
			<div className="ql-icon">
				<Zap className="w-4 h-4" strokeWidth={2} />
				<Zap
					className="ql-icon-yellow absolute inset-0 w-4 h-4 text-[var(--color-favorite)] opacity-0"
					strokeWidth={2}
				/>
			</div>
		</button>
	);
}
