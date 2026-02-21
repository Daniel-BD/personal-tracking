import { useTranslation } from 'react-i18next';
import { useRegisterSW } from 'virtual:pwa-register/react';

export default function ReloadPrompt() {
	const { t } = useTranslation('common');
	const {
		needRefresh: [needRefresh],
		updateServiceWorker,
	} = useRegisterSW();

	if (!needRefresh) return null;

	return (
		<div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 pointer-events-auto animate-slide-up">
			<div className="bg-[var(--bg-toast)] text-[var(--text-toast)] text-sm font-medium px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-3">
				<span>{t('reload.newVersionAvailable')}</span>
				<button
					onClick={() => updateServiceWorker(true)}
					className="text-[var(--color-toast-action)] font-semibold hover:underline whitespace-nowrap"
				>
					{t('reload.reloadButton')}
				</button>
			</div>
		</div>
	);
}
