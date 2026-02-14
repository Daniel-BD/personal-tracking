import { Star } from 'lucide-react';

interface StarIconProps {
	filled: boolean;
	className?: string;
}

export default function StarIcon({ filled, className = 'w-5 h-5' }: StarIconProps) {
	return (
		<Star
			className={className}
			fill={filled ? '#FACC15' : 'none'}
			stroke="#FACC15"
			strokeWidth={1.5}
		/>
	);
}
