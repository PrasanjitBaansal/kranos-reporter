<script>
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	
	let loginData = {
		username: '',
		password: ''
	};
	let isLoading = false;
	let errorMessage = '';
	let showPassword = false;
	
	onMount(() => {
		// Check if already logged in
		checkAuthStatus();
		
		// Add floating particles animation
		createFloatingParticles();
	});
	
	async function checkAuthStatus() {
		try {
			const sessionToken = localStorage.getItem('sessionToken');
			if (sessionToken) {
				const response = await fetch('/api/auth/validate', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': sessionToken
					}
				});
				
				if (response.ok) {
					const result = await response.json();
					if (result.valid) {
						goto('/');
					} else {
						localStorage.removeItem('sessionToken');
					}
				}
			}
		} catch (error) {
			// User not authenticated, stay on login page
			localStorage.removeItem('sessionToken');
		}
	}
	
	async function handleLogin() {
		if (!loginData.username || !loginData.password) {
			errorMessage = 'Please enter both username and password';
			return;
		}
		
		isLoading = true;
		errorMessage = '';
		
		try {
			const response = await fetch('/api/auth/login', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(loginData)
			});
			
			const result = await response.json();
			
			if (response.ok && result.success) {
				// Store session token
				localStorage.setItem('sessionToken', result.sessionToken);
				goto('/');
			} else {
				errorMessage = result.message || 'Invalid credentials';
			}
		} catch (error) {
			console.error('Login failed:', error);
			errorMessage = 'Login failed. Please try again.';
		} finally {
			isLoading = false;
		}
	}
	
	function togglePasswordVisibility() {
		showPassword = !showPassword;
	}
	
	function createFloatingParticles() {
		const container = document.querySelector('.login-background');
		if (!container) return;
		
		for (let i = 0; i < 20; i++) {
			const particle = document.createElement('div');
			particle.className = 'floating-particle';
			particle.style.left = Math.random() * 100 + '%';
			particle.style.animationDelay = Math.random() * 10 + 's';
			particle.style.animationDuration = (Math.random() * 10 + 10) + 's';
			container.appendChild(particle);
		}
	}
	
	function handleKeyPress(event) {
		if (event.key === 'Enter') {
			handleLogin();
		}
	}
</script>

<svelte:head>
	<title>Login - Kranos Gym</title>
</svelte:head>

<div class="login-container">
	<div class="login-background">
		<!-- Floating particles will be added here by JavaScript -->
	</div>
	
	<div class="login-content animate-slide-up">
		<div class="login-card">
			<div class="login-header">
				<div class="logo">
					<span class="logo-icon">🏋️</span>
					<h1 class="logo-text">Kranos Gym</h1>
				</div>
				<p class="login-subtitle">Welcome back! Please sign in to your account.</p>
			</div>
			
			<form on:submit|preventDefault={handleLogin} class="login-form">
				{#if errorMessage}
					<div class="error-message">
						<span class="error-icon">⚠️</span>
						{errorMessage}
					</div>
				{/if}
				
				<div class="form-group">
					<label for="username">Username</label>
					<div class="input-wrapper">
						<span class="input-icon">👤</span>
						<input
							type="text"
							id="username"
							class="form-control"
							bind:value={loginData.username}
							placeholder="Enter your username"
							required
							disabled={isLoading}
							on:keypress={handleKeyPress}
						/>
					</div>
				</div>
				
				<div class="form-group">
					<label for="password">Password</label>
					<div class="input-wrapper">
						<span class="input-icon">🔒</span>
						<input
							type={showPassword ? 'text' : 'password'}
							id="password"
							class="form-control password-input"
							bind:value={loginData.password}
							placeholder="Enter your password"
							required
							disabled={isLoading}
							on:keypress={handleKeyPress}
						/>
						<button
							type="button"
							class="password-toggle"
							on:click={togglePasswordVisibility}
							disabled={isLoading}
						>
							{showPassword ? '🙈' : '👁️'}
						</button>
					</div>
				</div>
				
				<button
					type="submit"
					class="btn btn-primary login-btn"
					disabled={isLoading}
				>
					{#if isLoading}
						<span class="loading-spinner"></span>
						Signing In...
					{:else}
						<span class="login-icon">🚀</span>
						Sign In
					{/if}
				</button>
			</form>
			
			<div class="login-footer">
				<div class="help-links">
					<button class="link-btn" disabled={isLoading}>
						<span>❓</span>
						Forgot Password?
					</button>
					<button class="link-btn" disabled={isLoading}>
						<span>📞</span>
						Contact Support
					</button>
				</div>
			</div>
		</div>
		
		<div class="login-features">
			<h3>
				<span class="features-icon">✨</span>
				Gym Management Features
			</h3>
			<div class="features-list">
				<div class="feature-item">
					<span class="feature-icon">👥</span>
					<div class="feature-content">
						<h4>Member Management</h4>
						<p>Track members, contact info, and status</p>
					</div>
				</div>
				<div class="feature-item">
					<span class="feature-icon">💪</span>
					<div class="feature-content">
						<h4>Flexible Plans</h4>
						<p>Create custom gym and PT plans</p>
					</div>
				</div>
				<div class="feature-item">
					<span class="feature-icon">🎯</span>
					<div class="feature-content">
						<h4>Membership Tracking</h4>
						<p>Monitor memberships and renewals</p>
					</div>
				</div>
				<div class="feature-item">
					<span class="feature-icon">📈</span>
					<div class="feature-content">
						<h4>Financial Reports</h4>
						<p>Comprehensive revenue analytics</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.login-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		background: radial-gradient(ellipse at top, rgba(243, 148, 7, 0.1) 0%, var(--background) 50%);
		overflow: hidden;
	}
	
	.login-background {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: 
			radial-gradient(circle at 20% 80%, rgba(243, 148, 7, 0.15) 0%, transparent 50%),
			radial-gradient(circle at 80% 20%, rgba(243, 148, 7, 0.1) 0%, transparent 50%),
			radial-gradient(circle at 40% 40%, rgba(243, 148, 7, 0.05) 0%, transparent 50%);
		z-index: -1;
	}
	
	:global(.floating-particle) {
		position: absolute;
		width: 4px;
		height: 4px;
		background: var(--primary);
		border-radius: 50%;
		opacity: 0.6;
		animation: float linear infinite;
		box-shadow: 0 0 10px rgba(243, 148, 7, 0.5);
	}
	
	@keyframes float {
		0% {
			transform: translateY(100vh) rotate(0deg);
			opacity: 0;
		}
		10% {
			opacity: 0.6;
		}
		90% {
			opacity: 0.6;
		}
		100% {
			transform: translateY(-100px) rotate(360deg);
			opacity: 0;
		}
	}
	
	.login-content {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 4rem;
		max-width: 1000px;
		width: 100%;
		padding: 2rem;
		z-index: 1;
	}
	
	.login-card {
		background: var(--gradient-dark);
		border: 1px solid var(--border);
		border-radius: 20px;
		padding: 3rem;
		backdrop-filter: blur(20px);
		box-shadow: var(--shadow-hard);
		position: relative;
		overflow: hidden;
	}
	
	.login-card::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: var(--gradient-glow);
		opacity: 0.1;
		z-index: -1;
	}
	
	.login-header {
		text-align: center;
		margin-bottom: 2rem;
	}
	
	.logo {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}
	
	.logo-icon {
		font-size: 4rem;
		filter: drop-shadow(0 0 20px var(--primary));
		animation: glow 2s ease-in-out infinite;
	}
	
	.logo-text {
		font-size: 2.5rem;
		font-weight: 700;
		margin: 0;
		background: var(--gradient-primary);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		text-shadow: 0 0 30px rgba(243, 148, 7, 0.3);
	}
	
	.login-subtitle {
		color: var(--text-muted);
		font-size: 1.1rem;
		margin: 0;
	}
	
	.login-form {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}
	
	.error-message {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 1rem;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid var(--error);
		border-radius: 8px;
		color: var(--error);
		font-weight: 500;
		animation: shake 0.5s ease-in-out;
	}
	
	@keyframes shake {
		0%, 100% { transform: translateX(0); }
		25% { transform: translateX(-5px); }
		75% { transform: translateX(5px); }
	}
	
	.error-icon {
		font-size: 1.2rem;
	}
	
	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	
	.form-group label {
		font-weight: 600;
		color: var(--text);
		font-size: 0.9rem;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}
	
	.input-wrapper {
		position: relative;
		display: flex;
		align-items: center;
	}
	
	.input-icon {
		position: absolute;
		left: 1rem;
		font-size: 1.2rem;
		color: var(--text-muted);
		z-index: 1;
	}
	
	.form-control {
		padding: 1rem 1rem 1rem 3rem;
		border: 2px solid var(--border);
		border-radius: 10px;
		background: var(--surface);
		color: var(--text);
		font-size: 1rem;
		transition: var(--transition-fast);
		width: 100%;
	}
	
	.form-control:focus {
		outline: none;
		border-color: var(--primary);
		box-shadow: 0 0 0 4px rgba(243, 148, 7, 0.2);
		background: var(--surface-light);
	}
	
	.form-control:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
	
	.password-input {
		padding-right: 3.5rem;
	}
	
	.password-toggle {
		position: absolute;
		right: 1rem;
		background: none;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		font-size: 1.2rem;
		padding: 0.25rem;
		border-radius: 4px;
		transition: var(--transition-fast);
		z-index: 1;
	}
	
	.password-toggle:hover {
		color: var(--primary);
		background: rgba(243, 148, 7, 0.1);
	}
	
	.password-toggle:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	
	.login-btn {
		padding: 1rem 2rem;
		font-size: 1.1rem;
		font-weight: 600;
		margin-top: 1rem;
		position: relative;
		overflow: hidden;
	}
	
	.login-btn::before {
		content: '';
		position: absolute;
		top: 0;
		left: -100%;
		width: 100%;
		height: 100%;
		background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
		transition: left 0.5s ease;
	}
	
	.login-btn:hover::before {
		left: 100%;
	}
	
	.loading-spinner {
		width: 20px;
		height: 20px;
		border: 2px solid transparent;
		border-top: 2px solid currentColor;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		display: inline-block;
		margin-right: 0.5rem;
	}
	
	.login-icon {
		margin-right: 0.5rem;
	}
	
	.login-footer {
		margin-top: 2rem;
		text-align: center;
	}
	
	.help-links {
		display: flex;
		justify-content: center;
		gap: 2rem;
	}
	
	.link-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: none;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		font-size: 0.9rem;
		padding: 0.5rem;
		border-radius: 6px;
		transition: var(--transition-fast);
	}
	
	.link-btn:hover {
		color: var(--primary);
		background: rgba(243, 148, 7, 0.1);
	}
	
	.link-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	
	.login-features {
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 2rem;
	}
	
	.login-features h3 {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--text);
		margin: 0;
	}
	
	.features-icon {
		font-size: 1.8rem;
		filter: drop-shadow(0 0 10px var(--primary));
	}
	
	.features-list {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}
	
	.feature-item {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		padding: 1.5rem;
		background: var(--gradient-dark);
		border: 1px solid var(--border);
		border-radius: 12px;
		transition: var(--transition-medium);
		position: relative;
		overflow: hidden;
	}
	
	.feature-item::before {
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
	
	.feature-item:hover::before {
		opacity: 1;
	}
	
	.feature-item:hover {
		transform: translateX(5px);
		border-color: var(--primary);
		box-shadow: 0 0 20px rgba(243, 148, 7, 0.2);
	}
	
	.feature-icon {
		font-size: 2rem;
		flex-shrink: 0;
		filter: drop-shadow(0 0 10px currentColor);
	}
	
	.feature-content h4 {
		margin: 0 0 0.5rem 0;
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--text);
	}
	
	.feature-content p {
		margin: 0;
		color: var(--text-muted);
		font-size: 0.9rem;
		line-height: 1.4;
	}
	
	@keyframes glow {
		0%, 100% { 
			filter: drop-shadow(0 0 20px var(--primary));
		}
		50% { 
			filter: drop-shadow(0 0 30px var(--primary)) drop-shadow(0 0 40px var(--primary));
		}
	}
	
	@media (max-width: 1024px) {
		.login-content {
			grid-template-columns: 1fr;
			gap: 2rem;
			max-width: 500px;
		}
		
		.login-features {
			order: -1;
		}
		
		.features-list {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
			gap: 1rem;
		}
	}
	
	@media (max-width: 640px) {
		.login-content {
			padding: 1rem;
		}
		
		.login-card {
			padding: 2rem;
		}
		
		.logo-text {
			font-size: 2rem;
		}
		
		.help-links {
			flex-direction: column;
			gap: 1rem;
		}
		
		.features-list {
			grid-template-columns: 1fr;
		}
		
		.feature-item {
			padding: 1rem;
		}
	}
	
	@media (max-width: 480px) {
		.login-card {
			padding: 1.5rem;
		}
		
		.logo-icon {
			font-size: 3rem;
		}
		
		.logo-text {
			font-size: 1.8rem;
		}
	}
</style>