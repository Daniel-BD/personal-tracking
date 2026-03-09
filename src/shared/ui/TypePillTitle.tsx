import type { ReactNode } from 'react';
import type { EntryType } from '@/shared/lib/types';
import { cn } from '@/shared/lib/cn';
import { EntryTypePill } from './EntityMetaBadges';

interface Props {
	type: EntryType;
	title: string;
	showType?: boolean;
	leading?: ReactNode;
	className?: string;
	titleClassName?: string;
}

export default function TypePillTitle({ type, title, showType = true, leading, className, titleClassName }: Props) {
	return (
		<div className={cn('flex flex-col items-start gap-1 min-w-0', className)}>
			{showType && <EntryTypePill type={type} className="shrink-0" />}
			<div className="flex items-center gap-2 min-w-0 w-full">
				{leading}
				<span className={cn('font-medium text-heading truncate', titleClassName)}>{title}</span>
			</div>
		</div>
	);
}
