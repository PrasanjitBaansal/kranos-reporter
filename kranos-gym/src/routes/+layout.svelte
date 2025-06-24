<script>
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import Toast from '$lib/components/Toast.svelte';
	
	export let data;
	
	let isMenuOpen = false;
	$: appSettings = data.appSettings || {};
	
	onMount(async () => {
		// Add smooth scrolling behavior
		document.documentElement.style.scrollBehavior = 'smooth';
		
		// Apply theme and color settings
		applyAppSettings();
	});
	
	// Apply settings when they change
	$: if (appSettings) {
		applyAppSettings();
	}
	
	function applyAppSettings() {
		if (typeof window === 'undefined') return;
		
		// Apply theme
		const theme = appSettings.theme_mode || 'dark';
		document.documentElement.setAttribute('data-theme', theme);
		
		if (theme === 'light') {
			document.documentElement.style.setProperty('--background', '#ffffff');
			document.documentElement.style.setProperty('--surface', '#f8f9fa');
			document.documentElement.style.setProperty('--surface-light', '#e9ecef');
			document.documentElement.style.setProperty('--text', '#212529');
			document.documentElement.style.setProperty('--text-muted', '#6c757d');
			document.documentElement.style.setProperty('--border', '#dee2e6');
		} else {
			document.documentElement.style.setProperty('--background', '#0a0a0a');
			document.documentElement.style.setProperty('--surface', '#1a1a1a');
			document.documentElement.style.setProperty('--surface-light', '#2a2a2a');
			document.documentElement.style.setProperty('--text', '#ffffff');
			document.documentElement.style.setProperty('--text-muted', '#b0b0b0');
			document.documentElement.style.setProperty('--border', '#333333');
		}
		
		// Apply accent color
		const color = appSettings.accent_color || '#f39407';
		document.documentElement.style.setProperty('--primary', color);
		
		// Generate darker variant
		const darkColor = adjustBrightness(color, -20);
		document.documentElement.style.setProperty('--primary-dark', darkColor);
		
		// Generate lighter variant
		const lightColor = adjustBrightness(color, 40);
		document.documentElement.style.setProperty('--primary-light', lightColor);
		
		// Update gradients
		document.documentElement.style.setProperty('--gradient-primary', `linear-gradient(135deg, ${color} 0%, ${darkColor} 100%)`);
		document.documentElement.style.setProperty('--gradient-glow', `linear-gradient(135deg, ${hexToRgba(color, 0.2)} 0%, ${hexToRgba(color, 0.05)} 100%)`);
		
		// Update favicon
		const faviconPath = appSettings.favicon_path || '/favicon.png';
		updateFavicon(faviconPath);
	}
	
	function adjustBrightness(hex, percent) {
		const num = parseInt(hex.replace('#', ''), 16);
		const amt = Math.round(2.55 * percent);
		const R = (num >> 16) + amt;
		const G = (num >> 8 & 0x00FF) + amt;
		const B = (num & 0x0000FF) + amt;
		return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
			(G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
			(B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
	}
	
	function hexToRgba(hex, alpha) {
		const r = parseInt(hex.slice(1, 3), 16);
		const g = parseInt(hex.slice(3, 5), 16);
		const b = parseInt(hex.slice(5, 7), 16);
		return `rgba(${r}, ${g}, ${b}, ${alpha})`;
	}
	
	function updateFavicon(href) {
		const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
		link.type = 'image/png';
		link.rel = 'icon';
		link.href = href;
		document.getElementsByTagName('head')[0].appendChild(link);
	}
	
	const navItems = [
		{ path: '/', label: 'Dashboard', icon: '📊' },
		{ path: '/members', label: 'Members', icon: '👥' },
		{ path: '/plans', label: 'Plans', icon: '💪' },
		{ path: '/memberships', label: 'Memberships', icon: '🎯' },
		{ path: '/reporting', label: 'Reports', icon: '📈' }
	];
	
	function toggleMenu() {
		isMenuOpen = !isMenuOpen;
	}
</script>

<div class="app">
	<nav class="navbar">
		<div class="nav-container">
			<div class="nav-brand">
				<div class="logo">
					{#if appSettings.logo_type === 'emoji'}
						<span class="logo-icon">{appSettings.logo_value || '🏋️'}</span>
					{:else}
						<img src={appSettings.logo_value || '/favicon.png'} alt="Kranos Gym" class="logo-image" />
					{/if}
					<span class="logo-text">Kranos Gym</span>
				</div>
				<button class="menu-toggle" on:click={toggleMenu} aria-label="Toggle navigation menu">
					<span></span>
					<span></span>
					<span></span>
				</button>
			</div>
			
			<div class="nav-menu" class:active={isMenuOpen}>
				{#each navItems as item}
					<a 
						href={item.path} 
						class="nav-link" 
						class:active={$page.url.pathname === item.path}
						on:click={() => isMenuOpen = false}
						aria-label="Navigate to {item.label}"
					>
						<span class="nav-icon">{item.icon}</span>
						<span class="nav-label">{item.label}</span>
					</a>
				{/each}
			</div>
		</div>
	</nav>
	
	<main class="main-content">
		<slot />
	</main>
	
	<Toast />
</div>

<style>
	:global(:root) {
		--primary: #f39407;
		--primary-dark: #e08906;
		--primary-light: #ffb347;
		--background: #0a0a0a;
		--surface: #1a1a1a;
		--surface-light: #2a2a2a;
		--text: #ffffff;
		--text-muted: #b0b0b0;
		--border: #333333;
		--success: #4ade80;
		--error: #ef4444;
		--warning: #f59e0b;
		--info: #3b82f6;
		
		--gradient-primary: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
		--gradient-dark: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
		--gradient-glow: linear-gradient(135deg, rgba(243, 148, 7, 0.2) 0%, rgba(243, 148, 7, 0.05) 100%);
		
		--shadow-glow: 0 0 20px rgba(243, 148, 7, 0.3);
		--shadow-soft: 0 4px 20px rgba(0, 0, 0, 0.3);
		--shadow-hard: 0 8px 30px rgba(0, 0, 0, 0.5);
		
		--transition-fast: 0.2s ease;
		--transition-medium: 0.3s ease;
		--transition-slow: 0.5s ease;
	}
	
	:global(*) {
		margin: 0;
		padding: 0;
		box-sizing: border-box;
	}
	
	:global(body) {
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		background: var(--background);
		color: var(--text);
		line-height: 1.6;
		overflow-x: hidden;
	}
	
	:global(.btn) {
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 8px;
		font-weight: 600;
		cursor: pointer;
		transition: var(--transition-fast);
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.9rem;
	}
	
	:global(.btn-primary) {
		background: var(--gradient-primary);
		color: white;
		box-shadow: var(--shadow-glow);
		border: 1px solid var(--primary);
	}
	
	:global(.btn-primary:hover) {
		transform: translateY(-2px);
		box-shadow: 0 0 25px rgba(243, 148, 7, 0.5);
	}
	
	:global(.btn-secondary) {
		background: var(--gradient-dark);
		color: var(--text);
		border: 1px solid var(--border);
	}
	
	:global(.btn-secondary:hover) {
		background: var(--surface-light);
		border-color: var(--primary);
		box-shadow: 0 0 15px rgba(243, 148, 7, 0.2);
	}
	
	:global(.btn-danger) {
		background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
		color: white;
		border: 1px solid #ef4444;
	}
	
	:global(.btn-danger:hover) {
		transform: translateY(-2px);
		box-shadow: 0 0 20px rgba(239, 68, 68, 0.4);
	}
	
	:global(.card) {
		background: var(--gradient-dark);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 1.5rem;
		box-shadow: var(--shadow-soft);
		transition: var(--transition-medium);
		backdrop-filter: blur(10px);
	}
	
	:global(.card:hover) {
		border-color: var(--primary);
		box-shadow: var(--shadow-glow);
		transform: translateY(-2px);
	}
	
	:global(.form-control) {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid var(--border);
		border-radius: 6px;
		background: var(--surface);
		color: var(--text);
		font-size: 1rem;
		transition: var(--transition-fast);
	}
	
	:global(.form-control:focus) {
		outline: none;
		border-color: var(--primary);
		box-shadow: 0 0 0 3px rgba(243, 148, 7, 0.2);
	}
	
	.app {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}
	
	.navbar {
		background: var(--gradient-dark);
		border-bottom: 1px solid var(--border);
		box-shadow: var(--shadow-soft);
		position: sticky;
		top: 0;
		z-index: 1000;
		backdrop-filter: blur(20px);
	}
	
	.nav-container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 1rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 70px;
	}
	
	.nav-brand {
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	
	.logo {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--text);
		text-decoration: none;
	}
	
	.logo-icon {
		font-size: 2rem;
		filter: drop-shadow(0 0 10px var(--primary));
	}
	
	.logo-image {
		width: 2rem;
		height: 2rem;
		object-fit: contain;
		filter: drop-shadow(0 0 10px var(--primary));
	}
	
	.logo-text {
		background: var(--gradient-primary);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}
	
	.menu-toggle {
		display: none;
		flex-direction: column;
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.5rem;
		gap: 4px;
	}
	
	.menu-toggle span {
		width: 25px;
		height: 3px;
		background: var(--primary);
		border-radius: 2px;
		transition: var(--transition-fast);
		box-shadow: 0 0 5px rgba(243, 148, 7, 0.3);
	}
	
	.nav-menu {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	
	.nav-link {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		color: var(--text-muted);
		text-decoration: none;
		border-radius: 8px;
		transition: var(--transition-fast);
		font-weight: 500;
		position: relative;
		overflow: hidden;
	}
	
	.nav-link::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: var(--gradient-glow);
		opacity: 0;
		transition: var(--transition-fast);
		z-index: -1;
	}
	
	.nav-link:hover::before,
	.nav-link.active::before {
		opacity: 1;
	}
	
	.nav-link:hover,
	.nav-link.active {
		color: var(--primary);
		box-shadow: 0 0 15px rgba(243, 148, 7, 0.2);
	}
	
	.nav-icon {
		font-size: 1.2rem;
		filter: drop-shadow(0 0 5px currentColor);
	}
	
	.nav-label {
		font-size: 0.9rem;
	}
	
	
	.main-content {
		flex: 1;
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem 1rem;
		width: 100%;
	}
	
	@media (max-width: 768px) {
		.menu-toggle {
			display: flex;
		}
		
		.nav-menu {
			position: fixed;
			top: 70px;
			left: 0;
			right: 0;
			background: var(--gradient-dark);
			flex-direction: column;
			padding: 1rem;
			border-top: 1px solid var(--border);
			transform: translateX(-100%);
			transition: var(--transition-medium);
			backdrop-filter: blur(20px);
		}
		
		.nav-menu.active {
			transform: translateX(0);
		}
		
		.nav-link {
			width: 100%;
			justify-content: flex-start;
			padding: 1rem;
		}
		
		.main-content {
			padding: 1rem;
		}
	}
	
	@keyframes glow {
		0%, 100% { box-shadow: 0 0 20px rgba(243, 148, 7, 0.3); }
		50% { box-shadow: 0 0 30px rgba(243, 148, 7, 0.6); }
	}
	
	:global(.animate-glow) {
		animation: glow 2s ease-in-out infinite;
	}
	
	@keyframes slideInUp {
		from {
			opacity: 0;
			transform: translateY(30px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	
	:global(.animate-slide-up) {
		animation: slideInUp 0.6s ease-out;
	}
	
	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.8; }
	}
	
	:global(.animate-pulse) {
		animation: pulse 2s ease-in-out infinite;
	}
</style>