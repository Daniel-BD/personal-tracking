import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getStoredTheme, storeTheme, applyTheme, type ThemePreference } from '@/shared/lib/theme';
import SegmentedControl from '@/shared/ui/SegmentedControl';

export default function ThemeSection() {
	const { t } = useTranslation('settings');
	const [themePreference, setThemePreference] = useState<ThemePreference>(getStoredTheme());

	function handleThemeChange(value: ThemePreference) {
		setThemePreference(value);
		storeTheme(value);
		applyTheme(value);
	}

	return (
		<div className="card p-6 space-y-4">
			<h3 className="text-lg font-semibold text-heading">{t('appearance.title')}</h3>
			<p className="text-sm text-body">{t('appearance.description')}</p>
			<SegmentedControl
				options={[
					{ value: 'light' as const, label: t('appearance.theme.light') },
					{ value: 'dark' as const, label: t('appearance.theme.dark') },
					{ value: 'system' as const, label: t('appearance.theme.system') },
				]}
				value={themePreference}
				onChange={handleThemeChange}
				variant="segment"
			/>
		</div>
	);
}
