import { useAnimatedValue } from '@/shared/lib/animation';
import SentimentPills from './SentimentPills';

interface BalanceScoreMeterProps {
	title: string;
	description: string;
	score: number;
	positive: number;
	limit: number;
	animate?: boolean;
}

export default function BalanceScoreMeter({
	title,
	description,
	score,
	positive,
	limit,
	animate = true,
}: BalanceScoreMeterProps) {
	const displayScore = useAnimatedValue(score, { duration: 900, enabled: animate });

	return (
		<div>
			<div className="flex items-baseline justify-between">
				<span className="text-xs font-medium text-label uppercase tracking-wide">{title}</span>
				<div className="flex items-center gap-2">
					<span className="text-lg font-bold" style={{ color: 'var(--color-accent)' }}>
						{Math.round(displayScore)}%
					</span>
					<SentimentPills positive={positive} limit={limit} />
				</div>
			</div>
			<div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[var(--bg-inset)]">
				<div
					className="h-full rounded-full"
					style={{
						width: `${displayScore}%`,
						background: 'linear-gradient(to right, var(--color-danger), var(--color-warning), var(--color-success))',
					}}
				/>
			</div>
			<p className="mt-1.5 text-xs text-[var(--text-muted)]">{description}</p>
		</div>
	);
}
