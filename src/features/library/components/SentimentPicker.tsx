import type { CategorySentiment } from '@/shared/lib/types';
import { cn } from '@/shared/lib/cn';

const SENTIMENT_OPTIONS: { value: CategorySentiment; label: string }[] = [
	{ value: 'positive', label: 'Positive' },
	{ value: 'neutral', label: 'Neutral' },
	{ value: 'limit', label: 'Limit' },
];

function getActiveStyle(sentiment: CategorySentiment): string {
	if (sentiment === 'positive') return 'bg-[var(--color-success)] text-white';
	if (sentiment === 'limit') return 'bg-[var(--color-danger)] text-white';
	return 'bg-[var(--bg-inset)] text-heading ring-1 ring-[var(--border-input)]';
}

interface Props {
	value: CategorySentiment;
	onChange: (s: CategorySentiment) => void;
}

export default function SentimentPicker({ value, onChange }: Props) {
	return (
		<div className="flex gap-1">
			{SENTIMENT_OPTIONS.map((opt) => (
				<button
					key={opt.value}
					type="button"
					onClick={() => onChange(opt.value)}
					className={cn(
						'px-3 py-1 rounded-full text-xs font-medium transition-colors',
						value === opt.value
							? getActiveStyle(opt.value)
							: 'bg-[var(--bg-inset)] text-label hover:bg-[var(--bg-card-hover)]',
					)}
				>
					{opt.label}
				</button>
			))}
		</div>
	);
}
