import type { CategorySentiment } from '@/shared/lib/types';

const SENTIMENT_OPTIONS: { value: CategorySentiment; label: string }[] = [
	{ value: 'positive', label: 'Positive' },
	{ value: 'neutral', label: 'Neutral' },
	{ value: 'limit', label: 'Limit' },
];

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
					className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
						value === opt.value
							? opt.value === 'positive'
								? 'bg-[var(--color-success)] text-white'
								: opt.value === 'limit'
									? 'bg-[var(--color-danger)] text-white'
									: 'bg-[var(--bg-inset)] text-heading ring-1 ring-[var(--border-input)]'
							: 'bg-[var(--bg-inset)] text-label hover:bg-[var(--bg-card-hover)]'
					}`}
				>
					{opt.label}
				</button>
			))}
		</div>
	);
}
