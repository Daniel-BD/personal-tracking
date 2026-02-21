/**
 * i18n configuration — all translations are bundled as static JSON imports
 * so initialisation is synchronous (no async loading required).
 *
 * Usage in React components:
 *   const { t } = useTranslation('stats');
 *   t('goalDashboard.title')  // → "Goals & Trends"
 *
 * Usage in non-React code (store, sync.ts, etc.):
 *   import i18n from '@/shared/lib/i18n';
 *   i18n.t('common:sync.syncFailed')
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import common from './locales/en/common.json';
import home from './locales/en/home.json';
import quickLog from './locales/en/quickLog.json';
import log from './locales/en/log.json';
import stats from './locales/en/stats.json';
import library from './locales/en/library.json';
import settings from './locales/en/settings.json';

i18n.use(initReactI18next).init({
	resources: {
		en: { common, home, quickLog, log, stats, library, settings },
	},
	lng: 'en',
	fallbackLng: 'en',
	defaultNS: 'common',
	interpolation: {
		// React already escapes values — no double-escaping needed
		escapeValue: false,
	},
});

export default i18n;
