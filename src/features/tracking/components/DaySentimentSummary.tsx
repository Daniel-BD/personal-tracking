import type { Entry, TrackerData } from '@/shared/lib/types';
import SentimentPills from '@/shared/ui/SentimentPills';
import { getDaySentimentCounts } from '../utils/category-utils';

interface Props {
	entries: Entry[];
	data: TrackerData;
}

export default function DaySentimentSummary({ entries, data }: Props) {
	const { positive, limit } = getDaySentimentCounts(entries, data);

	return <SentimentPills positive={positive} limit={limit} />;
}
