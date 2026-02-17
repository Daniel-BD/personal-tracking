interface SentimentPillsProps {
	positive: number;
	limit: number;
}

export default function SentimentPills({ positive, limit }: SentimentPillsProps) {
	if (positive === 0 && limit === 0) return null;

	return (
		<span className="inline-flex items-center gap-1" aria-label={`${positive} positive, ${limit} limit`}>
			{positive > 0 && (
				<span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--color-success-bg)] text-[var(--color-success-text)]">
					{positive}+
				</span>
			)}
			{limit > 0 && (
				<span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--color-danger-bg)] text-[var(--color-danger-text)]">
					{limit}
					{'\u2212'}
				</span>
			)}
		</span>
	);
}
