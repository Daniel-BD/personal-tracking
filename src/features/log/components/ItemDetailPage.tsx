import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Construction, ArrowLeft } from 'lucide-react';
import { getItemById } from '@/shared/store/store';
import type { EntryType } from '@/shared/lib/types';

const VALID_TYPES: ReadonlySet<string> = new Set<EntryType>(['activity', 'food']);

export default function ItemDetailPage() {
	const { itemId } = useParams<{ itemId: string }>();
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const rawType = searchParams.get('type');
	const type: EntryType = rawType && VALID_TYPES.has(rawType) ? (rawType as EntryType) : 'activity';
	const item = itemId ? getItemById(type, itemId) : undefined;

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-3">
				<button
					type="button"
					onClick={() => navigate(-1)}
					className="p-1.5 -ml-1.5 rounded-lg text-label hover:text-heading hover:bg-[var(--bg-inset)] transition-colors"
					aria-label="Go back"
				>
					<ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
				</button>
				<h2 className="text-2xl font-bold text-heading truncate">{item?.name ?? 'Unknown item'}</h2>
			</div>

			<div className="card flex flex-col items-center justify-center py-16 px-6 text-center">
				<Construction className="w-10 h-10 text-subtle mb-3" strokeWidth={1.5} />
				<p className="text-heading font-medium mb-1">Under construction</p>
				<p className="text-sm text-label">Item stats and details will appear here soon.</p>
			</div>
		</div>
	);
}
