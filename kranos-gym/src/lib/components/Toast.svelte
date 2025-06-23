<script>
	import { createEventDispatcher, onMount } from 'svelte';
	import { toastStore } from '../stores/toast.js';
	
	const dispatch = createEventDispatcher();
	
	$: toasts = $toastStore;
	
	function removeToast(id) {
		toastStore.remove(id);
	}
	
	function getToastClass(type) {
		switch (type) {
			case 'success': return 'toast-success';
			case 'error': return 'toast-error';
			case 'warning': return 'toast-warning';
			case 'info': return 'toast-info';
			default: return 'toast-info';
		}
	}
	
	function getToastIcon(type) {
		switch (type) {
			case 'success': return '✅';
			case 'error': return '❌';
			case 'warning': return '⚠️';
			case 'info': return 'ℹ️';
			default: return 'ℹ️';
		}
	}
</script>

<div class="toast-container">
	{#each toasts as toast (toast.id)}
		<div 
			class="toast {getToastClass(toast.type)}"
			class:toast-entering={toast.entering}
			class:toast-exiting={toast.exiting}
		>
			<div class="toast-content">
				<span class="toast-icon">{getToastIcon(toast.type)}</span>
				<span class="toast-message">{toast.message}</span>
			</div>
			<button 
				class="toast-close" 
				on:click={() => removeToast(toast.id)}
				aria-label="Close notification"
			>
				×
			</button>
		</div>
	{/each}
</div>

<style>
	.toast-container {
		position: fixed;
		top: 2rem;
		right: 2rem;
		z-index: 1000;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		max-width: 400px;
		pointer-events: none;
	}
	
	.toast {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.25rem;
		border-radius: 8px;
		border: 1px solid;
		font-weight: 500;
		font-size: 0.9rem;
		box-shadow: var(--shadow-soft);
		backdrop-filter: blur(10px);
		pointer-events: auto;
		transform: translateX(100%);
		opacity: 0;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
	}
	
	.toast.toast-entering {
		animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
	}
	
	.toast.toast-exiting {
		animation: slideOut 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
	}
	
	.toast-success {
		background: rgba(74, 222, 128, 0.15);
		border-color: var(--success);
		color: var(--success);
	}
	
	.toast-error {
		background: rgba(239, 68, 68, 0.15);
		border-color: var(--error);
		color: var(--error);
	}
	
	.toast-warning {
		background: rgba(245, 158, 11, 0.15);
		border-color: var(--warning);
		color: var(--warning);
	}
	
	.toast-info {
		background: rgba(59, 130, 246, 0.15);
		border-color: var(--info);
		color: var(--info);
	}
	
	.toast-content {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex: 1;
	}
	
	.toast-icon {
		font-size: 1.1rem;
		flex-shrink: 0;
	}
	
	.toast-message {
		flex: 1;
		line-height: 1.4;
	}
	
	.toast-close {
		background: none;
		border: none;
		color: currentColor;
		font-size: 1.5rem;
		font-weight: 300;
		cursor: pointer;
		padding: 0.25rem;
		margin-left: 0.75rem;
		border-radius: 4px;
		transition: var(--transition-fast);
		opacity: 0.7;
		line-height: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
	}
	
	.toast-close:hover {
		opacity: 1;
		background: rgba(255, 255, 255, 0.1);
	}
	
	@keyframes slideIn {
		from {
			transform: translateX(100%);
			opacity: 0;
		}
		to {
			transform: translateX(0);
			opacity: 1;
		}
	}
	
	@keyframes slideOut {
		from {
			transform: translateX(0);
			opacity: 1;
		}
		to {
			transform: translateX(100%);
			opacity: 0;
		}
	}
	
	@media (max-width: 768px) {
		.toast-container {
			top: 1rem;
			right: 1rem;
			left: 1rem;
			max-width: none;
		}
		
		.toast {
			padding: 0.875rem 1rem;
		}
		
		.toast-message {
			font-size: 0.85rem;
		}
	}
</style>