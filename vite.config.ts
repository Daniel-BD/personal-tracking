import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		react(),
		tailwindcss(),
		VitePWA({
			registerType: 'prompt',
			manifest: false, // use existing manifest.json in static/
			workbox: {
				globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
				runtimeCaching: [
					{
						urlPattern: /^https:\/\/api\.github\.com\/.*/i,
						handler: 'NetworkOnly',
					},
				],
			},
		}),
	],
	base: process.env.BASE_PATH || '/',
	publicDir: 'static',
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
		},
	},
});
