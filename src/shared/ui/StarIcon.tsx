import { Star } from 'lucide-react';

interface StarIconProps {
	filled: boolean;
	className?: string;
}

export default function StarIcon({ filled, className = 'w-5 h-5' }: StarIconProps) {
	const favoriteColor = getComputedStyle(document.documentElement)
		.getPropertyValue('--color-favorite').trim();

	return (
		<Star
			className={className}
			fill={filled ? favoriteColor : 'none'}
			stroke={favoriteColor}
			strokeWidth={1.5}
		/>
	);
}
