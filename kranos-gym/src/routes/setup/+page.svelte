<script>
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { showSuccess, showError } from '$lib/stores/toast.js';

	/** @type {import('./$types').PageData} */
	export let data;

	/** @type {import('./$types').ActionData} */
	export let form;

	let isLoading = false;
	let formErrors = {};
	let formData = {
		username: '',
		email: '',
		password: '',
		confirmPassword: '',
		fullName: ''
	};

	// Pre-populate form with any previous data
	if (form?.data) {
		formData = { ...formData, ...form.data };
	}

	// Handle form errors
	if (form?.errors) {
		formErrors = form.errors;
	}

	// Show server messages
	if (form?.error) {
		showError(form.error);
	}

	// Client-side validation
	function validateForm() {
		const errors = {};

		if (!formData.username || formData.username.length < 3) {
			errors.username = 'Username must be at least 3 characters long';
		}

		if (!formData.email || !formData.email.includes('@')) {
			errors.email = 'Valid email address is required';
		}

		if (!formData.password || formData.password.length < 8) {
			errors.password = 'Password must be at least 8 characters long';
		}

		if (formData.password !== formData.confirmPassword) {
			errors.confirmPassword = 'Passwords do not match';
		}

		if (!formData.fullName || formData.fullName.length < 2) {
			errors.fullName = 'Full name must be at least 2 characters long';
		}

		return errors;
	}

	// Clear error when user starts typing
	function clearError(field) {
		if (formErrors[field]) {
			delete formErrors[field];
			formErrors = { ...formErrors };
		}
	}

	const submitForm = () => {
		return async ({ formData, result }) => {
			// Client-side validation
			const errors = validateForm();
			if (Object.keys(errors).length > 0) {
				formErrors = errors;
				return;
			}

			isLoading = true;
			formErrors = {};

			// Handle server response
			if (result.type === 'success') {
				if (result.data?.success === false) {
					// Server validation failed
					if (result.data.errors) {
						formErrors = result.data.errors;
					}
					showError(result.data.error || 'Setup failed');
				} else if (result.data?.success === true) {
					// Success
					showSuccess(result.data.message || 'Admin account created successfully!');
					// Redirect to login
					setTimeout(() => {
						goto('/login');
					}, 1000);
				}
			} else {
				showError('An error occurred. Please try again.');
			}

			isLoading = false;
		};
	};
</script>

<svelte:head>
	<title>First Time Setup - Kranos Gym</title>
</svelte:head>

<div class="setup-container">
	<div class="setup-wizard">
		<!-- Header -->
		<div class="setup-header">
			<div class="logo">
				<h1>🏋️ Kranos Gym</h1>
			</div>
			<h2>Welcome to Kranos Gym Management System</h2>
			<p class="setup-subtitle">
				Let's get started by creating your administrator account
			</p>
		</div>

		<!-- Setup Form -->
		<div class="setup-form">
			<form method="POST" action="?/create_admin" use:enhance={submitForm} novalidate>
				<div class="form-step">
					<h3>👤 Administrator Account</h3>
					<p class="step-description">
						Create the main administrator account that will have full access to the gym management system.
					</p>

					<!-- Full Name -->
					<div class="form-group">
						<label for="fullName">Full Name</label>
						<input
							type="text"
							id="fullName"
							name="fullName"
							bind:value={formData.fullName}
							on:input={() => clearError('fullName')}
							placeholder="Enter your full name"
							class:error={formErrors.fullName}
							disabled={isLoading}
							required
						/>
						{#if formErrors.fullName}
							<span class="error-message">{formErrors.fullName}</span>
						{/if}
					</div>

					<!-- Username -->
					<div class="form-group">
						<label for="username">Username</label>
						<input
							type="text"
							id="username"
							name="username"
							bind:value={formData.username}
							on:input={() => clearError('username')}
							placeholder="Choose a username (3+ characters)"
							class:error={formErrors.username}
							disabled={isLoading}
							required
						/>
						{#if formErrors.username}
							<span class="error-message">{formErrors.username}</span>
						{/if}
					</div>

					<!-- Email -->
					<div class="form-group">
						<label for="email">Email Address</label>
						<input
							type="email"
							id="email"
							name="email"
							bind:value={formData.email}
							on:input={() => clearError('email')}
							placeholder="Enter your email address"
							class:error={formErrors.email}
							disabled={isLoading}
							required
						/>
						{#if formErrors.email}
							<span class="error-message">{formErrors.email}</span>
						{/if}
					</div>

					<!-- Password -->
					<div class="form-group">
						<label for="password">Password</label>
						<input
							type="password"
							id="password"
							name="password"
							bind:value={formData.password}
							on:input={() => clearError('password')}
							placeholder="Choose a secure password (8+ characters)"
							class:error={formErrors.password}
							disabled={isLoading}
							required
						/>
						{#if formErrors.password}
							<span class="error-message">{formErrors.password}</span>
						{/if}
					</div>

					<!-- Confirm Password -->
					<div class="form-group">
						<label for="confirmPassword">Confirm Password</label>
						<input
							type="password"
							id="confirmPassword"
							name="confirmPassword"
							bind:value={formData.confirmPassword}
							on:input={() => clearError('confirmPassword')}
							placeholder="Confirm your password"
							class:error={formErrors.confirmPassword}
							disabled={isLoading}
							required
						/>
						{#if formErrors.confirmPassword}
							<span class="error-message">{formErrors.confirmPassword}</span>
						{/if}
					</div>
				</div>

				<!-- Submit Button -->
				<div class="form-actions">
					<button type="submit" class="setup-button" disabled={isLoading}>
						{#if isLoading}
							<span class="loading-spinner"></span>
							Creating Admin Account...
						{:else}
							🚀 Complete Setup
						{/if}
					</button>
				</div>
			</form>
		</div>

		<!-- Footer -->
		<div class="setup-footer">
			<p>
				<strong>Note:</strong> This account will have full administrative privileges including user management, 
				settings configuration, and complete access to all gym management features.
			</p>
		</div>
	</div>
</div>

<style>
	.setup-container {
		min-height: 100vh;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 20px;
		box-sizing: border-box;
	}

	.setup-wizard {
		background: white;
		border-radius: 16px;
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
		max-width: 600px;
		width: 100%;
		overflow: hidden;
	}

	.setup-header {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		text-align: center;
		padding: 40px 30px;
	}

	.logo h1 {
		margin: 0 0 20px 0;
		font-size: 2.5rem;
		font-weight: bold;
	}

	.setup-header h2 {
		margin: 0 0 10px 0;
		font-size: 1.8rem;
		font-weight: 600;
	}

	.setup-subtitle {
		margin: 0;
		font-size: 1.1rem;
		opacity: 0.9;
	}

	.setup-form {
		padding: 40px;
	}

	.form-step h3 {
		margin: 0 0 10px 0;
		color: #333;
		font-size: 1.3rem;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.step-description {
		margin: 0 0 30px 0;
		color: #666;
		line-height: 1.5;
	}

	.form-group {
		margin-bottom: 20px;
	}

	.form-group label {
		display: block;
		margin-bottom: 8px;
		font-weight: 600;
		color: #333;
	}

	.form-group input {
		width: 100%;
		padding: 12px 16px;
		border: 2px solid #e1e5e9;
		border-radius: 8px;
		font-size: 1rem;
		transition: border-color 0.2s;
		box-sizing: border-box;
	}

	.form-group input:focus {
		outline: none;
		border-color: #667eea;
		box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
	}

	.form-group input.error {
		border-color: #e74c3c;
	}

	.error-message {
		display: block;
		color: #e74c3c;
		font-size: 0.875rem;
		margin-top: 4px;
	}

	.form-actions {
		margin-top: 30px;
		text-align: center;
	}

	.setup-button {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		border: none;
		padding: 16px 32px;
		border-radius: 8px;
		font-size: 1.1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		display: inline-flex;
		align-items: center;
		gap: 8px;
		min-width: 200px;
		justify-content: center;
	}

	.setup-button:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
	}

	.setup-button:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.loading-spinner {
		width: 16px;
		height: 16px;
		border: 2px solid transparent;
		border-top: 2px solid white;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.setup-footer {
		background: #f8f9fa;
		padding: 20px 40px;
		border-top: 1px solid #e1e5e9;
	}

	.setup-footer p {
		margin: 0;
		font-size: 0.9rem;
		color: #666;
		line-height: 1.5;
	}

	/* Mobile responsiveness */
	@media (max-width: 768px) {
		.setup-container {
			padding: 10px;
		}

		.setup-header {
			padding: 30px 20px;
		}

		.logo h1 {
			font-size: 2rem;
		}

		.setup-header h2 {
			font-size: 1.5rem;
		}

		.setup-form {
			padding: 30px 20px;
		}

		.setup-footer {
			padding: 20px;
		}
	}
</style>