import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';
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
		// Bundle size visualizer — generates stats.html after `npm run build`
		visualizer({ open: false, filename: 'stats.html' }),
	],
	base: process.env.BASE_PATH || '/',
	publicDir: 'static',
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
		},
	},
	build: {
		// Hidden source maps: useful for error monitoring without exposing source to users
		sourcemap: 'hidden',
		rollupOptions: {
			output: {
				manualChunks: {
					// Split recharts (and its deps) into a separate chunk so it's
					// only loaded when the Stats route is first visited.
					recharts: ['recharts'],
				},
			},
		},
	},
});
