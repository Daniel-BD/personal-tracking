import { useTranslation } from 'react-i18next';
import type { EntryType } from '@/shared/lib/types';
import { cn } from '@/shared/lib/cn';

interface TypeSegmentedPickerProps {
	value: EntryType;
	onChange: (value: EntryType) => void;
}

export default function TypeSegmentedPicker({ value, onChange }: TypeSegmentedPickerProps) {
	const { t } = useTranslation('common');

	return (
		<div className="flex rounded-lg bg-inset p-1 gap-1">
			{(['activity', 'food'] as const).map((type) => (
				<button
					key={type}
					type="button"
					onClick={() => onChange(type)}
					className={cn(
						'flex-1 text-sm py-1.5 rounded-md transition-colors',
						value === type ? 'bg-card text-heading font-medium' : 'text-label hover:text-heading',
					)}
				>
					{type === 'activity' ? t('type.activity') : t('type.food')}
				</button>
			))}
		</div>
	);
}
