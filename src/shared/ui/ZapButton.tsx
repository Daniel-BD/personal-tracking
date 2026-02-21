import { motion, useAnimation } from 'framer-motion';
import { Zap } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

const MotionZap = motion(Zap);

interface Props {
	onClick: () => void;
	className?: string;
	ariaLabel?: string;
}

export default function ZapButton({ onClick, className, ariaLabel }: Props) {
	const iconControls = useAnimation();
	const circleControls = useAnimation();
	const linesControls = useAnimation();

	const handlePress = async () => {
		// Haptic feedback
		if ('vibrate' in navigator) {
			navigator.vibrate(10);
		}

		// Reset everything first
		iconControls.set({ scale: 1, fill: 'transparent', color: 'var(--text-muted)' });
		circleControls.set({ pathLength: 0, opacity: 0 });
		linesControls.set({ opacity: 0, scale: 0, x: 0, y: 0 });

		// Run the animation sequence
		await Promise.all([
			// 1. Circle line filling around it
			circleControls.start({
				pathLength: [0, 1],
				opacity: [0, 1, 0],
				transition: { duration: 0.3, ease: 'easeInOut' },
			}),
			// 2. Icon bounce and color fill
			iconControls.start({
				scale: [1, 1.5, 1],
				fill: ['rgba(37, 99, 235, 0)', 'var(--color-activity)', 'rgba(37, 99, 235, 0)'],
				color: ['var(--text-muted)', 'var(--color-activity)', 'var(--text-muted)'],
				transition: { duration: 0.4, ease: 'easeOut' },
			}),
			// 3. Shoot out lines
			linesControls.start((i) => ({
				opacity: [0, 1, 0],
				scale: [0.5, 1.2],
				x: Math.cos((i * 45 * Math.PI) / 180) * 20,
				y: Math.sin((i * 45 * Math.PI) / 180) * 20,
				transition: { duration: 0.4, ease: 'easeOut', delay: 0.1 },
			})),
		]);
	};

	const handleClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		handlePress();
		onClick();
	};

	return (
		<button
			type="button"
			onClick={handleClick}
			className={cn(
				'relative flex-shrink-0 p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--color-activity)] hover:bg-[var(--bg-inset)] transition-colors overflow-visible group',
				className
			)}
			aria-label={ariaLabel}
		>
			<div className="relative w-4 h-4 flex items-center justify-center">
				{/* The Icon */}
				<div className="relative z-10 flex items-center justify-center">
					<MotionZap animate={iconControls} className="w-4 h-4" strokeWidth={2} initial={{ fill: 'transparent' }} />
				</div>

				{/* Circle filling animation */}
				<svg
					className="absolute inset-0 -top-2 -left-2 w-8 h-8 pointer-events-none"
					viewBox="0 0 32 32"
					style={{ transform: 'rotate(-90deg)' }}
				>
					<motion.circle
						cx="16"
						cy="16"
						r="12"
						stroke="var(--color-activity)"
						strokeWidth="1.5"
						fill="none"
						strokeLinecap="round"
						initial={{ pathLength: 0, opacity: 0 }}
						animate={circleControls}
					/>
				</svg>

				{/* Lightning lines shooting out */}
				<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
					{[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
						<motion.div
							key={angle}
							custom={i}
							initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
							animate={linesControls}
							className="absolute w-0.5 h-3 bg-[var(--color-activity)] rounded-full"
							style={{ rotate: angle + 90 }} // rotated to point outward
						/>
					))}
				</div>
			</div>
		</button>
	);
}
