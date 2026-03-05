import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import BottomSheet from '@/shared/ui/BottomSheet';

interface Candidate {
	id: string;
	name: string;
}

interface Props {
	open: boolean;
	onClose: () => void;
	onSelect: (target: Candidate) => void;
	title: string;
	candidates: Candidate[];
	searchPlaceholder?: string;
}

export default function MergeTargetSheet({ open, onClose, onSelect, title, candidates, searchPlaceholder }: Props) {
	const { t } = useTranslation('library');
	const [searchQuery, setSearchQuery] = useState('');

	const filtered = candidates.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

	function handleClose() {
		setSearchQuery('');
		onClose();
	}

	function handleSelect(candidate: Candidate) {
		setSearchQuery('');
		onSelect(candidate);
	}

	return (
		<BottomSheet open={open} onClose={handleClose} title={title}>
			<div className="space-y-3">
				<input
					type="text"
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					placeholder={searchPlaceholder ?? t('searchPlaceholder.items')}
					className="form-input"
					autoFocus
				/>

				{filtered.length === 0 ? (
					<p className="text-center text-label py-6">{t('mergeNoResults', { query: searchQuery })}</p>
				) : (
					<div className="card overflow-hidden">
						{filtered.map((candidate, idx) => (
							<button
								key={candidate.id}
								type="button"
								onClick={() => handleSelect(candidate)}
								className={`w-full text-left px-4 py-3 bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] transition-colors ${
									idx < filtered.length - 1 ? 'border-b border-[var(--border-subtle)]' : ''
								}`}
							>
								<span className="font-medium text-heading">{candidate.name}</span>
							</button>
						))}
					</div>
				)}
			</div>
		</BottomSheet>
	);
}
