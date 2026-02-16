import type { Entry, TrackerData } from '@/shared/lib/types';
import { getDaySentimentCounts } from '../utils/category-utils';

interface Props {
	entries: Entry[];
	data: TrackerData;
}

export default function DaySentimentSummary({ entries, data }: Props) {
	const { positive, limit } = getDaySentimentCounts(entries, data);

	if (positive === 0 && limit === 0) return null;

	return (
		<div className="flex items-center gap-1">
			{positive > 0 && (
				<span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--color-success-bg)] text-[var(--color-success-text)]">
					{positive}+
				</span>
			)}
			{limit > 0 && (
				<span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--color-danger-bg)] text-[var(--color-danger-text)]">
					{limit}&minus;
				</span>
			)}
		</div>
	);
}
