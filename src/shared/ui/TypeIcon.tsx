import { Dumbbell, Utensils } from 'lucide-react';
import type { EntryType } from '@/shared/lib/types';

interface Props {
	type: EntryType;
	className?: string;
}

export default function TypeIcon({ type, className = 'w-4 h-4' }: Props) {
	const Icon = type === 'activity' ? Dumbbell : Utensils;
	return <Icon className={className} aria-hidden="true" />;
}
