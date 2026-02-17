import { useState } from 'react';
import { getStoredTheme, storeTheme, applyTheme, type ThemePreference } from '@/shared/lib/theme';
import SegmentedControl from '@/shared/ui/SegmentedControl';

export default function ThemeSection() {
	const [themePreference, setThemePreference] = useState<ThemePreference>(getStoredTheme());

	function handleThemeChange(value: ThemePreference) {
		setThemePreference(value);
		storeTheme(value);
		applyTheme(value);
	}

	return (
		<div className="card p-6 space-y-4">
			<h3 className="text-lg font-semibold text-heading">Appearance</h3>
			<p className="text-sm text-body">Choose your preferred color scheme.</p>
			<SegmentedControl
				options={[
					{ value: 'light' as const, label: 'Light' },
					{ value: 'dark' as const, label: 'Dark' },
					{ value: 'system' as const, label: 'System' },
				]}
				value={themePreference}
				onChange={handleThemeChange}
				variant="segment"
			/>
		</div>
	);
}
