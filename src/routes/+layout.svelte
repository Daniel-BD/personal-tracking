<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { base } from '$app/paths';
	import { page } from '$app/state';

	let { children } = $props();

	const navItems = [
		{ href: '/', label: 'Home', icon: '🏠' },
		{ href: '/activities', label: 'Activities', icon: '🏃' },
		{ href: '/food', label: 'Food', icon: '🍽️' },
		{ href: '/library', label: 'Library', icon: '📚' },
		{ href: '/stats', label: 'Stats', icon: '📊' },
		{ href: '/settings', label: 'Settings', icon: '⚙️' }
	];
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="manifest" href="{base}/manifest.json" />
	<link rel="apple-touch-icon" href="{base}/icon.svg" />
	<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
	<meta name="theme-color" content="#3b82f6" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-status-bar-style" content="default" />
	<title>Activity & Food Tracker</title>
</svelte:head>

<div class="min-h-screen flex flex-col">
	<main class="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
		{@render children()}
	</main>

	<nav class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-pb">
		<div class="max-w-4xl mx-auto flex justify-around">
			{#each navItems as item}
				{@const fullHref = base + item.href}
				{@const isActive = page.url.pathname === fullHref || (item.href !== '/' && page.url.pathname.startsWith(fullHref))}
				<a
					href={fullHref}
					class="flex flex-col items-center py-2 px-3 text-xs {isActive ? 'text-blue-600' : 'text-gray-500'}"
				>
					<span class="text-xl mb-1">{item.icon}</span>
					<span>{item.label}</span>
				</a>
			{/each}
		</div>
	</nav>

	<div class="h-16"></div>
</div>

<style>
	.safe-area-pb {
		padding-bottom: env(safe-area-inset-bottom, 0px);
	}
</style>
