import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import type { EntryType } from '@/shared/lib/types';

interface QuickLogButtonProps {
	onClick: () => void;
	ariaLabel: string;
	type: EntryType;
}

export default function QuickLogButton({ onClick, ariaLabel, type }: QuickLogButtonProps) {
	const [isAnimating, setIsAnimating] = useState(false);

	const accentColor = type === 'activity' ? 'var(--color-activity)' : 'var(--color-food)';

	const handleClick = () => {
		if (isAnimating) return;
		setIsAnimating(true);

		// Haptic feedback
		if (typeof navigator !== 'undefined' && navigator.vibrate) {
			navigator.vibrate(10);
		}

		// Call the original onClick
		onClick();

		// Animation duration - 800ms total
		setTimeout(() => {
			setIsAnimating(false);
		}, 800);
	};

	return (
		<motion.button
			type="button"
			onClick={handleClick}
			className="relative flex-shrink-0 p-1.5 rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-inset)] transition-colors overflow-visible"
			whileHover={{ color: accentColor }}
			animate={{
				color: isAnimating ? accentColor : undefined,
			}}
			aria-label={ariaLabel}
		>
			<div className="relative z-10">
				<motion.div
					animate={
						isAnimating
							? {
									scale: [1, 1.5, 1.2],
								}
							: { scale: 1 }
					}
					transition={{ duration: 0.4, times: [0, 0.6, 1], ease: 'easeOut' }}
				>
					<Zap className={cn('w-4 h-4', isAnimating && 'fill-current')} strokeWidth={2} />
				</motion.div>
			</div>

			{/* Circle filling animation */}
			<AnimatePresence>
				{isAnimating && (
					<svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 32 32">
						<motion.circle
							cx="16"
							cy="16"
							r="12"
							fill="none"
							stroke={accentColor}
							strokeWidth="2.5"
							strokeLinecap="round"
							initial={{ pathLength: 0, opacity: 1 }}
							animate={{ pathLength: 1 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.4, ease: 'easeInOut' }}
						/>
					</svg>
				)}
			</AnimatePresence>

			{/* "Sparks" / Lightning lines */}
			<AnimatePresence>
				{isAnimating && (
					<div className="absolute inset-0 pointer-events-none">
						{[...Array(6)].map((_, i) => (
							<motion.div
								key={i}
								className="absolute top-1/2 left-1/2 w-0.5 h-3 rounded-full"
								style={{
									backgroundColor: accentColor,
									x: '-50%',
									y: '-50%',
									rotate: i * 60,
									transformOrigin: 'bottom',
								}}
								initial={{
									scaleY: 0,
									opacity: 0,
								}}
								animate={{
									y: ['-50%', '-150%'],
									scaleY: [0, 1, 0],
									opacity: [0, 1, 0],
								}}
								transition={{
									delay: 0.35,
									duration: 0.45,
									ease: 'easeOut',
								}}
							/>
						))}
					</div>
				)}
			</AnimatePresence>
		</motion.button>
	);
}
