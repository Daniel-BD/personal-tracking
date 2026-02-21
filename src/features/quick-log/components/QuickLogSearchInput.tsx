import { useRef } from 'react';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getTypeIcon } from '@/shared/lib/types';
import { getCategoryNames } from '@/shared/store/store';
import type { UnifiedItem } from '../hooks/useQuickLogSearch';

/** Delay (ms) before closing dropdown on blur, so click events on dropdown options can fire first */
const BLUR_CLICK_DELAY_MS = 200;

interface Props {
	query: string;
	setQuery: (q: string) => void;
	setIsFocused: (focused: boolean) => void;
	searchResults: UnifiedItem[];
	showResults: boolean;
	hasExactMatch: boolean;
	onSelectExisting: (unified: UnifiedItem) => void;
	onCreateTap: () => void;
}

export default function QuickLogSearchInput({
	query,
	setQuery,
	setIsFocused,
	searchResults,
	showResults,
	hasExactMatch,
	onSelectExisting,
	onCreateTap,
}: Props) {
	const { t } = useTranslation('quickLog');
	const inputRef = useRef<HTMLInputElement>(null);

	function handleSelectExisting(unified: UnifiedItem) {
		onSelectExisting(unified);
		inputRef.current?.blur();
	}

	function handleCreateTap() {
		onCreateTap();
		inputRef.current?.blur();
	}

	return (
		<div className="relative">
			<div className="flex items-center gap-3 py-2">
				<Search className="w-5 h-5 text-[var(--text-muted)] flex-shrink-0" strokeWidth={1.5} />
				<input
					ref={inputRef}
					type="text"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					onFocus={() => setIsFocused(true)}
					onBlur={() => setTimeout(() => setIsFocused(false), BLUR_CLICK_DELAY_MS)}
					placeholder={t('searchPlaceholder')}
					className="flex-1 bg-transparent text-heading text-base placeholder:text-[var(--text-muted)] outline-none"
				/>
			</div>
			<div className="h-px bg-[var(--border-subtle)]" />

			{/* Search results dropdown */}
			{showResults && (
				<div className="absolute z-20 w-full mt-1 bg-[var(--bg-elevated)] rounded-lg shadow-[var(--shadow-elevated)] border border-[var(--border-default)] max-h-64 overflow-y-auto">
					{searchResults.map((unified) => (
						<button
							key={`${unified.type}-${unified.item.id}`}
							type="button"
							onMouseDown={(e) => e.preventDefault()}
							onClick={() => handleSelectExisting(unified)}
							className="w-full text-left px-4 py-3 hover:bg-[var(--bg-card-hover)] flex items-center gap-3 border-b border-[var(--border-subtle)] last:border-b-0"
						>
							<span className="text-sm">{getTypeIcon(unified.type)}</span>
							<div className="flex-1 min-w-0">
								<div className="font-medium text-heading">{unified.item.name}</div>
								{unified.item.categories.length > 0 && (
									<div className="text-xs text-label truncate">
										{getCategoryNames(unified.type, unified.item.categories).join(', ')}
									</div>
								)}
							</div>
						</button>
					))}

					{!hasExactMatch && query.trim() && (
						<button
							type="button"
							onMouseDown={(e) => e.preventDefault()}
							onClick={handleCreateTap}
							className="w-full text-left px-4 py-3 hover:bg-[var(--bg-card-hover)] flex items-center gap-3 text-[var(--color-activity)]"
						>
							<span className="text-sm font-bold">+</span>
							<span>{t('createButton', { name: query.trim() })}</span>
						</button>
					)}
				</div>
			)}
		</div>
	);
}
