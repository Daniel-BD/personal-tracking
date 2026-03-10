import { defineConfig } from '@playwright/test';

const isCI = Boolean(process.env.CI);

export default defineConfig({
	testDir: './e2e',
	fullyParallel: false,
	reporter: isCI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
	use: {
		baseURL: 'http://127.0.0.1:4173',
		browserName: 'chromium',
		headless: true,
		serviceWorkers: 'block',
		trace: 'on-first-retry',
		viewport: { width: 390, height: 844 },
	},
	webServer: {
		command: 'npm run preview -- --host 127.0.0.1 --port 4173',
		port: 4173,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
	},
});
