import { cn } from '@/shared/lib/cn';

interface Props {
	text: string;
	className?: string;
}

export default function EntityTitle({ text, className }: Props) {
	return (
		<p
			className={cn(
				'text-sm leading-5 font-medium text-heading overflow-hidden [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]',
				className,
			)}
		>
			{text}
		</p>
	);
}
