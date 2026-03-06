import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PeriodNavigatorProps {
	/** Accent color for the logged count */
	color: string;
	/** Total number of logged entries in the period */
	totalCount: number;
	/** Display label for the current period (e.g. "March 2026" or "2026") */
	periodLabel: string;
	/** Min width for the period label */
	labelMinWidth: string;
	onPrev: () => void;
	onNext: () => void;
	nextDisabled: boolean;
}

export default function PeriodNavigator({
	color,
	totalCount,
	periodLabel,
	labelMinWidth,
	onPrev,
	onNext,
	nextDisabled,
}: PeriodNavigatorProps) {
	const { t } = useTranslation('stats');

	return (
		<div className="flex items-center justify-between">
			<h3 className="text-sm font-semibold" style={{ color }}>
				{t('categoryDetail.logged', { count: totalCount })}
			</h3>
			<div className="flex items-center gap-0.5 rounded-full bg-[var(--bg-inset)] border border-[var(--border-default)] px-1">
				<button onClick={onPrev} className="p-1.5 text-label hover:text-heading transition-colors">
					<ChevronLeft className="w-4 h-4" />
				</button>
				<span className="text-sm font-semibold text-heading text-center" style={{ minWidth: labelMinWidth }}>
					{periodLabel}
				</span>
				<button
					onClick={onNext}
					disabled={nextDisabled}
					className="p-1.5 text-label hover:text-heading transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
				>
					<ChevronRight className="w-4 h-4" />
				</button>
			</div>
		</div>
	);
}
