<script>
	import { createEventDispatcher } from 'svelte';
	
	export let show = false;
	export let title = '';
	export let size = 'medium'; // small, medium, large
	
	const dispatch = createEventDispatcher();
	
	function closeModal() {
		show = false;
		dispatch('close');
	}
	
	function handleKeydown(event) {
		if (event.key === 'Escape') {
			closeModal();
		}
	}
	
	function handleBackdropClick(event) {
		if (event.target === event.currentTarget) {
			closeModal();
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if show}
	<div class="modal-backdrop" on:click={handleBackdropClick} on:keydown role="dialog" aria-modal="true" tabindex="-1">
		<div class="modal modal-{size}" class:modal-show={show}>
			<div class="modal-header">
				<h2 class="modal-title">{title}</h2>
				<button class="modal-close" on:click={closeModal}>×</button>
			</div>
			<div class="modal-body">
				<slot />
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.6);
		backdrop-filter: blur(4px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		animation: fadeIn 0.2s ease-out;
	}

	.modal {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 12px;
		box-shadow: var(--shadow-large);
		max-height: 90vh;
		overflow: hidden;
		animation: slideUp 0.3s ease-out;
	}

	.modal-small {
		width: 90%;
		max-width: 400px;
	}

	.modal-medium {
		width: 90%;
		max-width: 600px;
	}

	.modal-large {
		width: 90%;
		max-width: 800px;
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.5rem 2rem;
		border-bottom: 1px solid var(--border);
		background: var(--gradient-glow);
	}

	.modal-title {
		font-size: 1.5rem;
		font-weight: 600;
		margin: 0;
		color: var(--text);
	}

	.modal-close {
		background: none;
		border: none;
		font-size: 2rem;
		font-weight: 300;
		color: var(--text-muted);
		cursor: pointer;
		padding: 0.25rem;
		border-radius: 4px;
		transition: var(--transition-fast);
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		line-height: 1;
	}

	.modal-close:hover {
		background: rgba(239, 68, 68, 0.1);
		color: var(--error);
	}

	.modal-body {
		padding: 2rem;
		overflow-y: auto;
		max-height: calc(90vh - 100px);
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes slideUp {
		from {
			opacity: 0;
			transform: translateY(50px) scale(0.95);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	@media (max-width: 768px) {
		.modal-backdrop {
			padding: 1rem;
			align-items: flex-start;
			padding-top: 2rem;
		}
		
		.modal {
			max-height: calc(100vh - 4rem);
			border-radius: var(--radius-lg);
		}
		
		.modal-small,
		.modal-medium,
		.modal-large {
			width: 100%;
			max-width: none;
		}

		.modal-header {
			padding: 1rem 1.5rem;
		}

		.modal-title {
			font-size: 1.25rem;
		}
		
		.modal-close {
			width: 36px;
			height: 36px;
			font-size: 1.75rem;
		}

		.modal-body {
			padding: 1.5rem;
			max-height: calc(100vh - 8rem);
		}
	}
	
	@media (max-width: 480px) {
		.modal-backdrop {
			padding: 0.5rem;
			padding-top: 1rem;
			align-items: flex-start;
		}
		
		.modal {
			max-height: calc(100vh - 2rem);
			border-radius: var(--radius-md);
		}
		
		.modal-small,
		.modal-medium,
		.modal-large {
			width: 100%;
		}

		.modal-header {
			padding: 1rem;
			flex-wrap: wrap;
			gap: 0.5rem;
		}

		.modal-title {
			font-size: 1.1rem;
			flex: 1;
			min-width: 0;
			word-break: break-word;
		}
		
		.modal-close {
			width: 40px;
			height: 40px;
			font-size: 1.5rem;
			flex-shrink: 0;
		}

		.modal-body {
			padding: 1rem;
			max-height: calc(100vh - 6rem);
		}
	}
	
	@media (max-height: 600px) {
		.modal-backdrop {
			align-items: flex-start;
			padding-top: 1rem;
		}
		
		.modal {
			max-height: calc(100vh - 2rem);
		}
		
		.modal-body {
			max-height: calc(100vh - 4rem);
		}
	}
</style>