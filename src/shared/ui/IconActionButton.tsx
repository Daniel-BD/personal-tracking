import type { ComponentType, MouseEvent } from 'react';
import { cn } from '@/shared/lib/cn';

type IconActionTone = 'add' | 'edit' | 'delete';

interface Props {
	icon: ComponentType<{ className?: string; strokeWidth?: number }>;
	tone: IconActionTone;
	onClick: (event: MouseEvent<HTMLButtonElement>) => void;
	ariaLabel: string;
	className?: string;
}

const TONE_CLASSES: Record<IconActionTone, string> = {
	add: 'text-[var(--color-accent)] bg-[var(--color-accent-bg)] hover:bg-[var(--color-accent-bg-strong)]',
	edit: 'text-[var(--color-warning)] bg-[var(--color-warning-bg)] hover:bg-[var(--color-warning-bg-strong)]',
	delete: 'text-[var(--color-danger)] bg-[var(--color-danger-bg)] hover:bg-[var(--color-danger-bg-strong)]',
};

export default function IconActionButton({ icon: Icon, tone, onClick, ariaLabel, className }: Props) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn('rounded-full p-1.5 transition-colors', TONE_CLASSES[tone], className)}
			aria-label={ariaLabel}
		>
			<Icon className="h-4 w-4" strokeWidth={2} />
		</button>
	);
}
