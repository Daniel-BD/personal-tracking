import { useTranslation } from 'react-i18next';
import type { EntryType } from '@/shared/lib/types';
import SegmentedControl from '@/shared/ui/SegmentedControl';

interface TypeSegmentedPickerProps {
	value: EntryType;
	onChange: (value: EntryType) => void;
}

export default function TypeSegmentedPicker({ value, onChange }: TypeSegmentedPickerProps) {
	const { t } = useTranslation('common');

	return (
		<SegmentedControl
			options={[
				{ value: 'activity' as const, label: t('type.activity') },
				{ value: 'food' as const, label: t('type.food') },
			]}
			value={value}
			onChange={onChange}
			variant="segment"
			size="sm"
		/>
	);
}
