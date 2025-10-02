<script>
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { showSuccess, showError } from '$lib/stores/toast.js';
	
	export let form;
	
	let isLoading = false;
	let formErrors = {};
	let showPassword = false;
	
	// Form data
	let formData = {
		username: '',
		password: ''
	};
	
	// Client-side validation
	function validateForm(data) {
		const errors = {};
		
		if (!data.get('username')?.trim()) {
			errors.username = 'Username or phone number is required';
		}
		
		if (!data.get('password')?.trim()) {
			errors.password = 'Password is required';
		}
		
		return errors;
	}
	
	// Clear field error when user starts typing
	function clearFieldError(field) {
		if (formErrors[field]) {
			formErrors = { ...formErrors };
			delete formErrors[field];
		}
	}
	
	// Enhanced form submission
	const submitLogin = () => {
		return async ({ formData: data, result, update }) => {
			// Client-side validation
			const errors = validateForm(data);
			if (Object.keys(errors).length > 0) {
				formErrors = errors;
				return;
			}
			
			isLoading = true;
			formErrors = {};
			
			// Handle server response
			console.log('Login response:', result);
			console.log('Response type:', result.type);
			console.log('Response data:', result.data);
			
			if (result.type === 'redirect') {
				// Server is redirecting us after successful login
				// Cookies are already set, just let the redirect happen
				console.log('Login successful, redirecting...');
				await update();
			} else if (result.type === 'success' && result.data) {
				// This is an error response (server returns data for errors)
				showError(result.data.error || 'Invalid username or password');
				if (result.data.details) {
					console.error('Login error details:', result.data.details);
				}
				if (result.data.errors) {
					formErrors = result.data.errors;
				}
			} else {
				showError('An error occurred during login. Please try again.');
			}
			
			isLoading = false;
		};
	};
	
	// Handle server-side form result
	$: if (form?.success === false) {
		showError(form.error || 'Login failed');
		if (form.errors) {
			formErrors = form.errors;
		}
	}
	
	function togglePasswordVisibility() {
		showPassword = !showPassword;
	}
</script>

<svelte:head>
	<title>Login - Kranos Gym</title>
	<meta name="description" content="Login to Kranos Gym Management System" />
</svelte:head>

<div class="login-container">
	<div class="login-card">
		<div class="login-header">
			<div class="login-logo">
				<span class="logo-icon">🏋️</span>
				<h1 class="logo-text">Kranos Gym</h1>
			</div>
			<p class="login-subtitle">Sign in to your account</p>
		</div>
		
		<form method="POST" action="?/login" use:enhance={submitLogin} novalidate class="login-form">
			<!-- Username Field -->
			<div class="form-group">
				<label for="username" class="form-label">
					<span class="label-icon">👤</span>
					Username / Phone
				</label>
				<input
					type="text"
					id="username"
					name="username"
					bind:value={formData.username}
					on:input={() => clearFieldError('username')}
					class="form-control"
					class:error={formErrors.username}
					placeholder="Enter username or phone number"
					autocomplete="username"
					disabled={isLoading}
					required
				/>
				{#if formErrors.username}
					<div class="error-message">
						<span class="error-icon">⚠️</span>
						{formErrors.username}
					</div>
				{/if}
			</div>
			
			<!-- Password Field -->
			<div class="form-group">
				<label for="password" class="form-label">
					<span class="label-icon">🔒</span>
					Password
				</label>
				<div class="password-field">
					<input
						type={showPassword ? 'text' : 'password'}
						id="password"
						name="password"
						bind:value={formData.password}
						on:input={() => clearFieldError('password')}
						class="form-control"
						class:error={formErrors.password}
						placeholder="Enter your password"
						autocomplete="current-password"
						disabled={isLoading}
						required
					/>
					<button
						type="button"
						class="password-toggle"
						on:click={togglePasswordVisibility}
						disabled={isLoading}
						aria-label={showPassword ? 'Hide password' : 'Show password'}
					>
						{showPassword ? '👁️' : '👁️‍🗨️'}
					</button>
				</div>
				{#if formErrors.password}
					<div class="error-message">
						<span class="error-icon">⚠️</span>
						{formErrors.password}
					</div>
				{/if}
			</div>
			
			<!-- Submit Button -->
			<button
				type="submit"
				class="btn btn-primary login-btn"
				disabled={isLoading}
				aria-label="Sign in to your account"
			>
				{#if isLoading}
					<span class="loading-spinner"></span>
					Signing in...
				{:else}
					<span class="btn-icon">🔑</span>
					Sign In
				{/if}
			</button>
		</form>
		
		<!-- Additional Info -->
		<div class="login-footer">
			<p class="help-text">
				Need help? Contact your system administrator.
			</p>
		</div>
	</div>
</div>

<style>
	.login-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, var(--background) 0%, var(--surface) 100%);
		padding: 1rem;
	}
	
	.login-card {
		background: var(--gradient-dark);
		border: 1px solid var(--border);
		border-radius: 16px;
		padding: 2.5rem;
		box-shadow: var(--shadow-hard);
		backdrop-filter: blur(20px);
		max-width: 400px;
		width: 100%;
		position: relative;
		overflow: hidden;
	}
	
	.login-card::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 4px;
		background: var(--gradient-primary);
		border-radius: 16px 16px 0 0;
	}
	
	.login-header {
		text-align: center;
		margin-bottom: 2rem;
	}
	
	.login-logo {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}
	
	.logo-icon {
		font-size: 2.5rem;
		filter: drop-shadow(0 0 15px var(--primary));
		animation: glow 3s ease-in-out infinite;
	}
	
	.logo-text {
		font-size: 1.8rem;
		font-weight: 700;
		background: var(--gradient-primary);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		margin: 0;
	}
	
	.login-subtitle {
		color: var(--text-muted);
		font-size: 1rem;
		margin: 0;
	}
	
	.login-form {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}
	
	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	
	.form-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 600;
		color: var(--text);
		font-size: 0.9rem;
	}
	
	.label-icon {
		font-size: 1rem;
		opacity: 0.8;
	}
	
	.form-control {
		padding: 0.875rem 1rem;
		border: 2px solid var(--border);
		border-radius: 8px;
		background: var(--surface);
		color: var(--text);
		font-size: 1rem;
		transition: var(--transition-fast);
	}
	
	.form-control:focus {
		outline: none;
		border-color: var(--primary);
		box-shadow: 0 0 0 3px rgba(243, 148, 7, 0.2);
		background: var(--surface-light);
	}
	
	.form-control.error {
		border-color: var(--error);
		box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2);
	}
	
	.password-field {
		position: relative;
		display: flex;
		align-items: center;
	}
	
	.password-toggle {
		position: absolute;
		right: 0.75rem;
		background: none;
		border: none;
		cursor: pointer;
		font-size: 1.2rem;
		color: var(--text-muted);
		padding: 0.25rem;
		border-radius: 4px;
		transition: var(--transition-fast);
	}
	
	.password-toggle:hover {
		color: var(--primary);
		background: rgba(243, 148, 7, 0.1);
	}
	
	.password-toggle:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	
	.error-message {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--error);
		font-size: 0.875rem;
		margin-top: 0.25rem;
	}
	
	.error-icon {
		font-size: 1rem;
	}
	
	.login-btn {
		margin-top: 0.5rem;
		padding: 1rem;
		font-size: 1rem;
		font-weight: 600;
		border-radius: 8px;
		position: relative;
		overflow: hidden;
	}
	
	.login-btn:disabled {
		opacity: 0.8;
		cursor: not-allowed;
		transform: none;
	}
	
	.btn-icon {
		font-size: 1.1rem;
	}
	
	.loading-spinner {
		width: 16px;
		height: 16px;
		border: 2px solid transparent;
		border-top: 2px solid currentColor;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		display: inline-block;
	}
	
	.login-footer {
		margin-top: 2rem;
		text-align: center;
	}
	
	.help-text {
		color: var(--text-muted);
		font-size: 0.875rem;
		margin: 0;
	}
	
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	
	@keyframes glow {
		0%, 100% {
			filter: drop-shadow(0 0 15px var(--primary));
		}
		50% {
			filter: drop-shadow(0 0 25px var(--primary));
		}
	}
	
	/* Mobile responsiveness */
	@media (max-width: 480px) {
		.login-container {
			padding: 0.5rem;
		}
		
		.login-card {
			padding: 2rem 1.5rem;
			max-width: 100%;
		}
		
		.logo-text {
			font-size: 1.5rem;
		}
		
		.logo-icon {
			font-size: 2rem;
		}
		
		.form-control {
			padding: 0.75rem;
			font-size: 16px; /* Prevents zoom on iOS */
		}
		
		.login-btn {
			padding: 0.875rem;
		}
	}
</style>