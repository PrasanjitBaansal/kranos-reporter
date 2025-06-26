<script>
	import { createEventDispatcher } from 'svelte';
	import Modal from './Modal.svelte';
	
	export let show = false;
	
	const dispatch = createEventDispatcher();
	const ADMIN_PASSWORD = 'theadmin';
	
	let password = '';
	let errorMessage = '';
	let isLoading = false;
	
	function handleSubmit() {
		if (!password.trim()) {
			errorMessage = 'Please enter a password';
			return;
		}
		
		isLoading = true;
		errorMessage = '';
		
		// Simulate processing delay for better UX
		setTimeout(() => {
			if (password === ADMIN_PASSWORD) {
				dispatch('success');
				resetForm();
			} else {
				errorMessage = 'Incorrect password. Please try again.';
				password = '';
			}
			isLoading = false;
		}, 500);
	}
	
	function handleClose() {
		resetForm();
		dispatch('close');
	}
	
	function resetForm() {
		password = '';
		errorMessage = '';
		isLoading = false;
	}
	
	function handleKeydown(event) {
		if (event.key === 'Enter' && !isLoading) {
			handleSubmit();
		}
	}
</script>

<Modal {show} title="Admin Access Required" size="small" on:close={handleClose}>
	<div class="password-form">
		<p class="instruction">Please enter the admin password to access settings:</p>
		
		<div class="form-group">
			<label for="password" class="sr-only">Password</label>
			<input
				id="password"
				type="password"
				bind:value={password}
				placeholder="Enter admin password"
				class="form-control"
				class:error={errorMessage}
				disabled={isLoading}
				on:keydown={handleKeydown}
			/>
			{#if errorMessage}
				<span class="error-message">{errorMessage}</span>
			{/if}
		</div>
		
		<div class="form-actions">
			<button
				type="button"
				class="btn btn-secondary"
				on:click={handleClose}
				disabled={isLoading}
			>
				Cancel
			</button>
			<button
				type="button"
				class="btn btn-primary"
				on:click={handleSubmit}
				disabled={isLoading || !password.trim()}
			>
				{#if isLoading}
					<span class="loading-spinner"></span>
					Verifying...
				{:else}
					Access Settings
				{/if}
			</button>
		</div>
	</div>
</Modal>

<style>
	.password-form {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}
	
	.instruction {
		color: var(--text-muted);
		margin: 0;
		font-size: 0.95rem;
		line-height: 1.5;
	}
	
	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
	
	.form-control {
		padding: 0.875rem;
		font-size: 1rem;
		border-radius: var(--radius-md);
		transition: var(--transition-fast);
	}
	
	.form-control:focus {
		outline: none;
		border-color: var(--primary);
		box-shadow: 0 0 0 3px rgba(243, 148, 7, 0.2);
	}
	
	.form-control.error {
		border-color: var(--error);
		box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2);
	}
	
	.error-message {
		color: var(--error);
		font-size: 0.875rem;
		font-weight: 500;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	
	.error-message::before {
		content: '⚠️';
		font-size: 0.875rem;
	}
	
	.form-actions {
		display: flex;
		gap: 1rem;
		justify-content: flex-end;
		margin-top: 0.5rem;
	}
	
	.btn {
		min-width: 120px;
		justify-content: center;
	}
	
	.btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
	
	.loading-spinner {
		width: 16px;
		height: 16px;
		border: 2px solid transparent;
		border-top: 2px solid currentColor;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-right: 0.5rem;
	}
	
	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}
	
	@media (max-width: 480px) {
		.form-actions {
			flex-direction: column-reverse;
			gap: 0.75rem;
		}
		
		.btn {
			width: 100%;
		}
	}
</style>