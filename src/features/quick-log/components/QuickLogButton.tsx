import { useCallback, useRef, useState } from 'react';
import { Zap } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

/**
 * Total animation duration from click to idle (ms).
 * Matches the sum: snap (130) + gap + flash end (~270 + 160 = 430).
 */
const ANIMATION_MS = 450;

/**
 * Six spark particle endpoints.
 * Roughly evenly distributed (60° apart) with slight organic variation.
 * Values are px offsets from center; stagger is ms delay between particles.
 */
const SPARKS: ReadonlyArray<{ tx: number; ty: number; stagger: number }> = [
	{ tx: 18, ty: 0, stagger: 0 },
	{ tx: 9, ty: -15, stagger: 10 },
	{ tx: -8, ty: -16, stagger: 20 },
	{ tx: -18, ty: 1, stagger: 30 },
	{ tx: -7, ty: 15, stagger: 40 },
	{ tx: 10, ty: 14, stagger: 50 },
];

interface Props {
	onClick: () => void;
	ariaLabel: string;
}

/**
 * Animated quick-log (Zap) button with a multi-phase microinteraction:
 * press → spring snap → glow + burst ring + sparks → confirmation flash.
 *
 * All visual effects use CSS keyframes (app.css) and only animate
 * `transform` and `opacity` for compositor-thread performance.
 */
export default function QuickLogButton({ onClick, ariaLabel }: Props) {
	const [pressed, setPressed] = useState(false);
	const [firing, setFiring] = useState(false);
	const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

	const handlePointerDown = useCallback(() => {
		if (!firing) setPressed(true);
	}, [firing]);

	const handlePointerUp = useCallback(() => {
		setPressed(false);
	}, []);

	const handleClick = useCallback(() => {
		if (firing) return;
		setPressed(false);
		setFiring(true);
		onClick();

		if (timeoutRef.current) clearTimeout(timeoutRef.current);
		timeoutRef.current = setTimeout(() => setFiring(false), ANIMATION_MS);
	}, [firing, onClick]);

	return (
		<button
			type="button"
			onClick={handleClick}
			onPointerDown={handlePointerDown}
			onPointerUp={handlePointerUp}
			onPointerLeave={handlePointerUp}
			className={cn(
				'ql-btn relative flex-shrink-0 p-1.5 rounded-md text-[var(--text-muted)]',
				'hover:text-[var(--color-activity)] hover:bg-[var(--bg-inset)]',
				pressed && !firing && 'ql-btn--pressed',
				firing && 'ql-btn--firing',
			)}
			aria-label={ariaLabel}
		>
			{/* Glow — pre-blurred radial gradient, only opacity animates */}
			<div className="ql-glow" aria-hidden="true" />

			{/* Burst ring — expanding circle stroke */}
			<div className="ql-burst" aria-hidden="true" />

			{/* Sparks — 6 small circular particles */}
			{SPARKS.map((spark, i) => (
				<div
					key={i}
					className="ql-spark"
					style={
						{
							'--spark-tx': `${spark.tx}px`,
							'--spark-ty': `${spark.ty}px`,
							'--spark-stagger': `${spark.stagger}ms`,
						} as React.CSSProperties
					}
					aria-hidden="true"
				/>
			))}

			{/* Flash overlay — fills button with accent color */}
			<div className="ql-flash-overlay" aria-hidden="true" />

			{/* Lightning icon */}
			<Zap className="ql-icon relative w-4 h-4" strokeWidth={2} />
		</button>
	);
}
