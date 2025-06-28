<script>
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import Toast from '$lib/components/Toast.svelte';
	import { toastStore } from '$lib/stores/toast.js';
	
	export let data;
	export let form;
	
	let settings = data.settings || {};
	let isSubmitting = false;
	let previewColor = settings.accent_color || '#f39407';
	let faviconPreview = settings.favicon_path || '/favicon.png';
	let logoPreview = settings.logo_type === 'emoji' ? settings.logo_value : settings.logo_value;
	let logoType = settings.logo_type || 'emoji';
	
	// File input references
	let faviconInput;
	let logoInput;
	
	onMount(() => {
		// Apply current theme and color
		applyTheme();
		applyAccentColor();
		
		// Handle form responses
		if (form?.success) {
			toastStore.show(form.message, 'success');
			
			// Update local settings with any returned values
			if (form.favicon_path) {
				settings.favicon_path = form.favicon_path;
				faviconPreview = form.favicon_path;
			}
			if (form.logo_type && form.logo_value) {
				settings.logo_type = form.logo_type;
				settings.logo_value = form.logo_value;
				logoType = form.logo_type;
				logoPreview = form.logo_value;
			}
		} else if (form?.error) {
			toastStore.show(form.error, 'error');
		}
	});
	
	function applyTheme() {
		const theme = settings.theme_mode || 'dark';
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
	}
	
	function applyAccentColor() {
		const color = previewColor || '#f39407';
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
	
	function handleColorChange() {
		applyAccentColor();
	}
	
	function handleThemeChange(newTheme) {
		settings.theme_mode = newTheme;
		applyTheme();
	}
	
	function handleFaviconChange(event) {
		const file = event.target.files[0];
		if (file) {
			if (file.size > 100 * 1024) {
				toastStore.show('Favicon must be smaller than 100KB', 'error');
				event.target.value = '';
				return;
			}
			
			if (!file.type.startsWith('image/png')) {
				toastStore.show('Favicon must be a PNG image', 'error');
				event.target.value = '';
				return;
			}
			
			// Create preview
			const reader = new FileReader();
			reader.onload = (e) => {
				faviconPreview = e.target.result;
			};
			reader.readAsDataURL(file);
		}
	}
	
	function handleLogoChange(event) {
		const file = event.target.files[0];
		if (file) {
			if (file.size > 1 * 1024 * 1024) {
				toastStore.show('Logo must be smaller than 1MB', 'error');
				event.target.value = '';
				return;
			}
			
			if (!file.type.startsWith('image/png')) {
				toastStore.show('Logo must be a PNG image', 'error');
				event.target.value = '';
				return;
			}
			
			// Create preview
			const reader = new FileReader();
			reader.onload = (e) => {
				logoPreview = e.target.result;
				logoType = 'image';
			};
			reader.readAsDataURL(file);
		}
	}
	
	const submitForm = (actionUrl) => {
		return async ({ formData, result }) => {
			isSubmitting = true;
			
			if (result.type === 'success') {
				// Settings updated, refresh data
				settings = { ...settings, ...result.data };
			}
			
			isSubmitting = false;
		};
	};
</script>

<svelte:head>
	<title>Settings - Kranos Gym</title>
	<link rel="icon" type="image/png" href={faviconPreview} />
</svelte:head>

<div class="settings-page">
	<div class="settings-header">
		<h1 class="settings-title animate-slide-up">
			<span class="title-icon">⚙️</span>
			App Settings
		</h1>
		<p class="settings-subtitle animate-slide-up">Customize your gym management system</p>
	</div>
	
	<div class="settings-container">
		<!-- Accent Color Setting -->
		<div class="setting-card animate-slide-up">
			<div class="setting-header">
				<h2>
					<span class="setting-icon">🎨</span>
					Accent Color
				</h2>
				<p>Choose your brand's primary color</p>
			</div>
			
			<form method="POST" action="?/updateAccentColor" use:enhance={submitForm('updateAccentColor')}>
				<div class="color-setting">
					<div class="color-preview" style="background-color: {previewColor}"></div>
					<input
						type="color"
						name="color"
						bind:value={previewColor}
						on:input={handleColorChange}
						class="color-input"
						title="Select accent color"
					/>
					<div class="color-info">
						<span class="color-value">{previewColor.toUpperCase()}</span>
						<button type="submit" class="btn btn-primary btn-sm" disabled={isSubmitting}>
							{isSubmitting ? 'Saving...' : 'Save Color'}
						</button>
					</div>
				</div>
			</form>
		</div>
		
		<!-- Theme Setting -->
		<div class="setting-card animate-slide-up">
			<div class="setting-header">
				<h2>
					<span class="setting-icon">🌙</span>
					Theme Mode
				</h2>
				<p>Switch between dark and light themes</p>
			</div>
			
			<form method="POST" action="?/updateTheme" use:enhance={submitForm('updateTheme')}>
				<div class="theme-setting">
					<div class="theme-options">
						<label class="theme-option" class:active={settings.theme_mode === 'dark'}>
							<input
								type="radio"
								name="theme"
								value="dark"
								checked={settings.theme_mode === 'dark'}
								on:change={() => handleThemeChange('dark')}
							/>
							<span class="theme-preview theme-dark">
								<span class="theme-name">Dark</span>
							</span>
						</label>
						
						<label class="theme-option" class:active={settings.theme_mode === 'light'}>
							<input
								type="radio"
								name="theme"
								value="light"
								checked={settings.theme_mode === 'light'}
								on:change={() => handleThemeChange('light')}
							/>
							<span class="theme-preview theme-light">
								<span class="theme-name">Light</span>
							</span>
						</label>
					</div>
					
					<button type="submit" class="btn btn-primary btn-sm" disabled={isSubmitting}>
						{isSubmitting ? 'Saving...' : 'Save Theme'}
					</button>
				</div>
			</form>
		</div>
		
		<!-- Favicon Setting -->
		<div class="setting-card animate-slide-up">
			<div class="setting-header">
				<h2>
					<span class="setting-icon">🌟</span>
					Favicon
				</h2>
				<p>Upload a custom favicon (PNG only, max 100KB)</p>
			</div>
			
			<form method="POST" action="?/uploadFavicon" enctype="multipart/form-data" use:enhance={submitForm('uploadFavicon')}>
				<div class="file-setting">
					<div class="file-preview">
						<img src={faviconPreview} alt="Favicon preview" class="favicon-preview" />
					</div>
					
					<div class="file-upload">
						<input
							type="file"
							name="favicon"
							accept="image/png"
							bind:this={faviconInput}
							on:change={handleFaviconChange}
							class="file-input"
							id="favicon-input"
						/>
						<label for="favicon-input" class="file-label">
							<span class="file-icon">📁</span>
							Choose PNG File
						</label>
						<button type="submit" class="btn btn-primary btn-sm" disabled={isSubmitting}>
							{isSubmitting ? 'Uploading...' : 'Upload Favicon'}
						</button>
					</div>
				</div>
			</form>
		</div>
		
		<!-- Logo Setting -->
		<div class="setting-card animate-slide-up">
			<div class="setting-header">
				<h2>
					<span class="setting-icon">🏋️</span>
					Website Logo
				</h2>
				<p>Upload a custom logo (PNG only, max 1MB)</p>
			</div>
			
			<form method="POST" action="?/uploadLogo" enctype="multipart/form-data" use:enhance={submitForm('uploadLogo')}>
				<div class="file-setting">
					<div class="file-preview">
						{#if logoType === 'emoji'}
							<span class="logo-emoji-preview">{logoPreview}</span>
						{:else}
							<img src={logoPreview} alt="Logo preview" class="logo-image-preview" />
						{/if}
					</div>
					
					<div class="file-upload">
						<input
							type="file"
							name="logo"
							accept="image/png"
							bind:this={logoInput}
							on:change={handleLogoChange}
							class="file-input"
							id="logo-input"
						/>
						<label for="logo-input" class="file-label">
							<span class="file-icon">📁</span>
							Choose PNG File
						</label>
						<button type="submit" class="btn btn-primary btn-sm" disabled={isSubmitting}>
							{isSubmitting ? 'Uploading...' : 'Upload Logo'}
						</button>
					</div>
				</div>
			</form>
		</div>
		
		<!-- Reset Settings -->
		<div class="setting-card setting-danger animate-slide-up">
			<div class="setting-header">
				<h2>
					<span class="setting-icon">🔄</span>
					Reset Settings
				</h2>
				<p>Restore all settings to their default values</p>
			</div>
			
			<form method="POST" action="?/resetToDefaults" use:enhance={submitForm('resetToDefaults')}>
				<div class="reset-setting">
					<button type="submit" class="btn btn-danger" disabled={isSubmitting}>
						{isSubmitting ? 'Resetting...' : 'Reset to Defaults'}
					</button>
				</div>
			</form>
		</div>
	</div>
	
	<!-- Back to Dashboard -->
	<div class="settings-footer animate-slide-up">
		<a href="/" class="btn btn-secondary">
			<span>←</span>
			Back to Dashboard
		</a>
	</div>
</div>

<style>
	.settings-page {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem 1rem;
	}
	
	.settings-header {
		text-align: center;
		margin-bottom: 3rem;
	}
	
	.settings-title {
		font-size: 2.5rem;
		font-weight: 700;
		margin-bottom: 1rem;
		background: var(--gradient-primary);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1rem;
	}
	
	.title-icon {
		font-size: 3rem;
		filter: drop-shadow(0 0 20px var(--primary));
	}
	
	.settings-subtitle {
		font-size: 1.1rem;
		color: var(--text-muted);
		animation-delay: 0.2s;
	}
	
	.settings-container {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}
	
	.setting-card {
		background: var(--gradient-dark);
		border: 1px solid var(--border);
		border-radius: 16px;
		padding: 2rem;
		transition: var(--transition-medium);
		position: relative;
		overflow: hidden;
	}
	
	.setting-card::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: var(--gradient-glow);
		opacity: 0;
		transition: var(--transition-medium);
		z-index: -1;
	}
	
	.setting-card:hover::before {
		opacity: 0.3;
	}
	
	.setting-card:hover {
		border-color: var(--primary);
		transform: translateY(-2px);
	}
	
	.setting-danger {
		border-color: var(--error);
	}
	
	.setting-danger:hover {
		border-color: var(--error);
		box-shadow: 0 0 20px rgba(239, 68, 68, 0.2);
	}
	
	.setting-header {
		margin-bottom: 1.5rem;
	}
	
	.setting-header h2 {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 1.4rem;
		font-weight: 600;
		margin: 0 0 0.5rem 0;
		color: var(--text);
	}
	
	.setting-icon {
		font-size: 1.5rem;
		filter: drop-shadow(0 0 10px currentColor);
	}
	
	.setting-header p {
		color: var(--text-muted);
		margin: 0;
		font-size: 0.9rem;
	}
	
	/* Color Setting */
	.color-setting {
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	
	.color-preview {
		width: 60px;
		height: 60px;
		border-radius: 12px;
		border: 3px solid var(--border);
		box-shadow: var(--shadow-soft);
		transition: var(--transition-fast);
	}
	
	.color-input {
		width: 80px;
		height: 60px;
		border: none;
		border-radius: 12px;
		cursor: pointer;
		background: none;
	}
	
	.color-info {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		flex: 1;
	}
	
	.color-value {
		font-family: var(--font-mono);
		font-weight: 600;
		color: var(--text);
		font-size: 0.9rem;
	}
	
	/* Theme Setting */
	.theme-setting {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}
	
	.theme-options {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}
	
	.theme-option {
		cursor: pointer;
	}
	
	.theme-option input {
		display: none;
	}
	
	.theme-preview {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 80px;
		border-radius: 12px;
		border: 2px solid var(--border);
		transition: var(--transition-fast);
		position: relative;
		overflow: hidden;
	}
	
	.theme-dark {
		background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
		color: #ffffff;
	}
	
	.theme-light {
		background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
		color: #212529;
		border-color: #dee2e6;
	}
	
	.theme-option.active .theme-preview {
		border-color: var(--primary);
		box-shadow: 0 0 20px rgba(243, 148, 7, 0.3);
	}
	
	.theme-name {
		font-weight: 600;
		font-size: 1rem;
	}
	
	/* File Setting */
	.file-setting {
		display: flex;
		align-items: center;
		gap: 1.5rem;
	}
	
	.file-preview {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 80px;
		height: 80px;
		border: 2px solid var(--border);
		border-radius: 12px;
		background: var(--surface);
		overflow: hidden;
	}
	
	.favicon-preview {
		width: 32px;
		height: 32px;
		object-fit: contain;
	}
	
	.logo-emoji-preview {
		font-size: 2.5rem;
		filter: drop-shadow(0 0 10px var(--primary));
	}
	
	.logo-image-preview {
		width: 60px;
		height: 60px;
		object-fit: contain;
	}
	
	.file-upload {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		flex: 1;
	}
	
	.file-input {
		display: none;
	}
	
	.file-label {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 8px;
		cursor: pointer;
		transition: var(--transition-fast);
		font-weight: 500;
		font-size: 0.9rem;
		width: fit-content;
	}
	
	.file-label:hover {
		background: var(--surface-light);
		border-color: var(--primary);
	}
	
	.file-icon {
		font-size: 1rem;
	}
	
	/* Reset Setting */
	.reset-setting {
		display: flex;
		justify-content: flex-start;
	}
	
	/* Footer */
	.settings-footer {
		display: flex;
		justify-content: center;
		margin-top: 3rem;
		padding-top: 2rem;
		border-top: 1px solid var(--border);
		animation-delay: 0.8s;
	}
	
	/* Responsive */
	@media (max-width: 768px) {
		.settings-page {
			padding: 1rem 0.5rem;
		}
		
		.settings-header {
			margin-bottom: 2rem;
		}
		
		.settings-title {
			font-size: 2rem;
			flex-direction: column;
			gap: 0.5rem;
		}
		
		.title-icon {
			font-size: 2.5rem;
		}
		
		.settings-subtitle {
			font-size: 1rem;
		}
		
		.settings-container {
			gap: 1.5rem;
		}
		
		.setting-card {
			padding: 1.5rem;
		}
		
		.setting-header h2 {
			font-size: 1.2rem;
		}
		
		.setting-header p {
			font-size: 0.85rem;
		}
		
		.color-setting {
			flex-direction: column;
			align-items: flex-start;
			gap: 1rem;
		}
		
		.color-preview,
		.color-input {
			width: 50px;
			height: 50px;
		}
		
		.file-setting {
			flex-direction: column;
			align-items: flex-start;
			gap: 1rem;
		}
		
		.file-preview {
			width: 70px;
			height: 70px;
		}
		
		.favicon-preview {
			width: 28px;
			height: 28px;
		}
		
		.logo-emoji-preview {
			font-size: 2rem;
		}
		
		.logo-image-preview {
			width: 50px;
			height: 50px;
		}
		
		.file-upload {
			width: 100%;
		}
		
		.file-label {
			padding: 0.75rem 1rem;
			font-size: 0.9rem;
		}
		
		.theme-options {
			grid-template-columns: 1fr;
			gap: 0.75rem;
		}
		
		.theme-preview {
			height: 70px;
		}
		
		.theme-name {
			font-size: 0.9rem;
		}
		
		.settings-footer {
			margin-top: 2rem;
			padding-top: 1.5rem;
		}
	}
	
	@media (max-width: 480px) {
		.settings-page {
			padding: 0.5rem 0.25rem;
		}
		
		.settings-header {
			margin-bottom: 1.5rem;
		}
		
		.settings-title {
			font-size: 1.75rem;
		}
		
		.title-icon {
			font-size: 2rem;
		}
		
		.settings-subtitle {
			font-size: 0.9rem;
		}
		
		.settings-container {
			gap: 1.25rem;
		}
		
		.setting-card {
			padding: 1.25rem;
		}
		
		.setting-header {
			margin-bottom: 1.25rem;
		}
		
		.setting-header h2 {
			font-size: 1.1rem;
			gap: 0.5rem;
		}
		
		.setting-icon {
			font-size: 1.25rem;
		}
		
		.setting-header p {
			font-size: 0.8rem;
		}
		
		.color-setting {
			gap: 0.75rem;
		}
		
		.color-preview,
		.color-input {
			width: 45px;
			height: 45px;
		}
		
		.color-value {
			font-size: 0.85rem;
		}
		
		.file-setting {
			gap: 0.75rem;
		}
		
		.file-preview {
			width: 60px;
			height: 60px;
		}
		
		.favicon-preview {
			width: 24px;
			height: 24px;
		}
		
		.logo-emoji-preview {
			font-size: 1.75rem;
		}
		
		.logo-image-preview {
			width: 45px;
			height: 45px;
		}
		
		.file-label {
			padding: 0.75rem;
			font-size: 0.85rem;
			width: 100%;
			justify-content: center;
		}
		
		.btn {
			width: 100%;
			justify-content: center;
			padding: 0.75rem;
		}
		
		.theme-options {
			gap: 0.5rem;
		}
		
		.theme-preview {
			height: 60px;
		}
		
		.theme-name {
			font-size: 0.85rem;
		}
		
		.settings-footer {
			margin-top: 1.5rem;
			padding-top: 1rem;
		}
	}
</style>