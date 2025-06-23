<script>
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	
	export let data;
	export let form;
	
	let selectedPlan = null;
	let isEditing = false;
	let isLoading = false;
	let searchTerm = '';
	
	$: plans = data.groupPlans || [];
	$: filteredPlans = plans.filter(plan => 
		plan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
		(plan.display_name && plan.display_name.toLowerCase().includes(searchTerm.toLowerCase()))
	);
	
	function selectPlan(plan) {
		selectedPlan = plan;
		isEditing = true;
	}
	
	function newPlan() {
		selectedPlan = null;
		isEditing = false;
	}
	
	const submitForm = () => {
		isLoading = true;
		return async ({ result }) => {
			isLoading = false;
			if (result.type === 'success') {
				newPlan();
				await invalidateAll();
			}
		};
	};
	
	function generateDisplayName(name, duration) {
		return name && duration ? `${name} - ${duration} days` : '';
	}
</script>

<svelte:head>
	<title>Plans - Kranos Gym</title>
</svelte:head>

<div class="plans-page">
	<div class="page-header">
		<div class="header-content">
			<h1 class="page-title animate-slide-up">
				<span class="title-icon">💪</span>
				Group Plans Management
			</h1>
			<p class="page-subtitle animate-slide-up">Create and manage gym membership plans</p>
		</div>
		<div class="header-actions animate-slide-up">
			<button class="btn btn-primary" on:click={newPlan}>
				<span class="btn-icon">➕</span>
				Add New Plan
			</button>
		</div>
	</div>

	{#if form?.error}
		<div class="alert alert-error animate-slide-up">
			<span class="alert-icon">❌</span>
			{form.error}
		</div>
	{/if}

	{#if form?.success}
		<div class="alert alert-success animate-slide-up">
			<span class="alert-icon">✅</span>
			Plan saved successfully!
		</div>
	{/if}

	<div class="plans-content">
		<div class="plans-list card animate-slide-up">
			<div class="card-header">
				<h2>
					<span class="section-icon">📋</span>
					Plans List
					<span class="plan-count">({filteredPlans.length})</span>
				</h2>
				<div class="search-container">
					<input
						type="text"
						placeholder="Search plans..."
						bind:value={searchTerm}
						class="search-input"
					/>
					<span class="search-icon">🔍</span>
				</div>
			</div>
			
			<div class="plans-grid">
				{#if filteredPlans.length === 0}
					<div class="empty-state">
						<div class="empty-icon">💪</div>
						<h3>No Plans Found</h3>
						<p>Start by creating your first plan</p>
					</div>
				{:else}
					{#each filteredPlans as plan}
						<div 
							class="plan-card" 
							class:selected={selectedPlan?.id === plan.id}
							on:click={() => selectPlan(plan)}
						>
							<div class="plan-header">
								<h3 class="plan-name">{plan.name}</h3>
								{#if !plan.is_active}
									<span class="status-badge inactive">Inactive</span>
								{/if}
							</div>
							<div class="plan-details">
								<div class="plan-duration">
									<span class="detail-icon">⏱️</span>
									<span>{plan.duration_days} days</span>
								</div>
								<div class="plan-amount">
									<span class="detail-icon">💰</span>
									<span>${plan.default_amount}</span>
								</div>
							</div>
							<div class="plan-display-name">
								{plan.display_name}
							</div>
							<div class="plan-actions">
								<button 
									class="btn btn-secondary btn-sm"
									on:click|stopPropagation={() => selectPlan(plan)}
								>
									Edit
								</button>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</div>

		<div class="plan-form card animate-slide-up">
			<div class="card-header">
				<h2>
					<span class="section-icon">{isEditing ? '✏️' : '➕'}</span>
					{isEditing ? 'Edit Plan' : 'Add New Plan'}
				</h2>
				{#if isEditing}
					<button class="btn btn-secondary" on:click={newPlan}>
						Add New
					</button>
				{/if}
			</div>

			<form 
				method="post" 
				action={isEditing ? '?/update' : '?/create'}
				use:enhance={submitForm}
				class="plan-form-content"
			>
				{#if isEditing}
					<input type="hidden" name="id" value={selectedPlan?.id} />
				{/if}

				<div class="form-group">
					<label for="name" class="form-label">Plan Name *</label>
					<input
						type="text"
						id="name"
						name="name"
						value={selectedPlan?.name || ''}
						class="form-control"
						required
						placeholder="e.g., MMA Focus, Boxing Basics"
					/>
				</div>

				<div class="form-group">
					<label for="duration_days" class="form-label">Duration (Days) *</label>
					<input
						type="number"
						id="duration_days"
						name="duration_days"
						value={selectedPlan?.duration_days || ''}
						class="form-control"
						required
						min="1"
						placeholder="e.g., 30, 90, 180"
					/>
				</div>

				<div class="form-group">
					<label for="default_amount" class="form-label">Default Amount ($)</label>
					<input
						type="number"
						id="default_amount"
						name="default_amount"
						value={selectedPlan?.default_amount || ''}
						class="form-control"
						min="0"
						step="0.01"
						placeholder="e.g., 149.99"
					/>
				</div>

				<div class="form-group">
					<label for="display_name" class="form-label">Display Name</label>
					<input
						type="text"
						id="display_name"
						name="display_name"
						value={selectedPlan?.display_name || generateDisplayName(selectedPlan?.name, selectedPlan?.duration_days)}
						class="form-control"
						placeholder="Auto-generated if empty"
					/>
					<small class="form-hint">Leave empty to auto-generate: "Plan Name - X days"</small>
				</div>

				<div class="form-group">
					<label class="checkbox-label">
						<input
							type="checkbox"
							name="is_active"
							checked={selectedPlan?.is_active !== false}
							class="form-checkbox"
						/>
						<span class="checkbox-text">Active Plan</span>
					</label>
				</div>

				<div class="form-actions">
					<button 
						type="submit" 
						class="btn btn-primary"
						disabled={isLoading}
					>
						{#if isLoading}
							<span class="loading-spinner"></span>
						{/if}
						<span class="btn-icon">{isEditing ? '💾' : '➕'}</span>
						{isEditing ? 'Update Plan' : 'Create Plan'}
					</button>
					
					{#if isEditing}
						<form method="post" action="?/delete" use:enhance={submitForm} style="display: inline;">
							<input type="hidden" name="id" value={selectedPlan?.id} />
							<button 
								type="submit" 
								class="btn btn-danger"
								on:click={() => confirm('Are you sure you want to delete this plan?')}
							>
								<span class="btn-icon">🗑️</span>
								Delete
							</button>
						</form>
					{/if}
				</div>
			</form>
		</div>
	</div>
</div>

<style>
	.plans-page {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem 1rem;
	}

	.page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 3rem;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.header-content h1 {
		font-size: 2.5rem;
		font-weight: 700;
		margin-bottom: 0.5rem;
		background: var(--gradient-primary);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.title-icon {
		font-size: 3rem;
		filter: drop-shadow(0 0 20px var(--primary));
	}

	.page-subtitle {
		color: var(--text-muted);
		font-size: 1.1rem;
		animation-delay: 0.2s;
	}

	.header-actions {
		animation-delay: 0.3s;
	}

	.alert {
		padding: 1rem;
		border-radius: 8px;
		margin-bottom: 1.5rem;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-weight: 500;
		animation-delay: 0.4s;
	}

	.alert-success {
		background: rgba(74, 222, 128, 0.2);
		border: 1px solid var(--success);
		color: var(--success);
	}

	.alert-error {
		background: rgba(239, 68, 68, 0.2);
		border: 1px solid var(--error);
		color: var(--error);
	}

	.alert-icon {
		font-size: 1.2rem;
	}

	.plans-content {
		display: grid;
		grid-template-columns: 1fr 400px;
		gap: 2rem;
		animation-delay: 0.5s;
	}

	.card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1.5rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--border);
		flex-wrap: wrap;
		gap: 1rem;
	}

	.card-header h2 {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 1.5rem;
		font-weight: 600;
		margin: 0;
	}

	.section-icon {
		font-size: 1.5rem;
		filter: drop-shadow(0 0 10px var(--primary));
	}

	.plan-count {
		color: var(--text-muted);
		font-size: 1rem;
		font-weight: 400;
	}

	.search-container {
		position: relative;
		min-width: 200px;
	}

	.search-input {
		width: 100%;
		padding: 0.75rem 2.5rem 0.75rem 1rem;
		border: 1px solid var(--border);
		border-radius: 8px;
		background: var(--surface);
		color: var(--text);
		font-size: 0.9rem;
		transition: var(--transition-fast);
	}

	.search-input:focus {
		outline: none;
		border-color: var(--primary);
		box-shadow: 0 0 0 3px rgba(243, 148, 7, 0.2);
	}

	.search-icon {
		position: absolute;
		right: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		color: var(--text-muted);
		font-size: 1rem;
	}

	.plans-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1rem;
	}

	.empty-state {
		grid-column: 1 / -1;
		text-align: center;
		padding: 3rem 1rem;
		color: var(--text-muted);
	}

	.empty-icon {
		font-size: 4rem;
		margin-bottom: 1rem;
		opacity: 0.5;
	}

	.empty-state h3 {
		margin-bottom: 0.5rem;
		color: var(--text);
	}

	.plan-card {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 1.5rem;
		cursor: pointer;
		transition: var(--transition-fast);
		position: relative;
		overflow: hidden;
	}

	.plan-card::before {
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

	.plan-card:hover::before,
	.plan-card.selected::before {
		opacity: 1;
	}

	.plan-card:hover,
	.plan-card.selected {
		border-color: var(--primary);
		transform: translateY(-2px);
		box-shadow: var(--shadow-glow);
	}

	.plan-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1rem;
	}

	.plan-name {
		font-size: 1.2rem;
		font-weight: 600;
		margin: 0;
		color: var(--text);
	}

	.status-badge {
		padding: 0.25rem 0.5rem;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.status-badge.inactive {
		background: rgba(239, 68, 68, 0.2);
		color: var(--error);
		border: 1px solid var(--error);
	}

	.plan-details {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.plan-duration,
	.plan-amount {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.95rem;
		color: var(--text-muted);
	}

	.detail-icon {
		font-size: 1rem;
	}

	.plan-display-name {
		font-size: 0.9rem;
		color: var(--text-muted);
		font-style: italic;
		margin-bottom: 1rem;
		padding: 0.5rem;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 6px;
		border-left: 3px solid var(--primary);
	}

	.plan-actions {
		display: flex;
		justify-content: flex-end;
	}

	.btn-sm {
		padding: 0.5rem 1rem;
		font-size: 0.85rem;
	}

	.plan-form-content {
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
		font-weight: 600;
		color: var(--text);
		font-size: 0.9rem;
	}

	.form-hint {
		font-size: 0.8rem;
		color: var(--text-muted);
		font-style: italic;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		cursor: pointer;
		font-weight: 500;
	}

	.form-checkbox {
		width: 18px;
		height: 18px;
		accent-color: var(--primary);
	}

	.checkbox-text {
		color: var(--text);
	}

	.form-actions {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.btn-icon {
		font-size: 1rem;
	}

	.loading-spinner {
		width: 16px;
		height: 16px;
		border: 2px solid transparent;
		border-top: 2px solid currentColor;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	@media (max-width: 768px) {
		.plans-content {
			grid-template-columns: 1fr;
		}

		.page-header {
			flex-direction: column;
			align-items: flex-start;
		}

		.card-header {
			flex-direction: column;
			align-items: flex-start;
		}

		.search-container {
			width: 100%;
		}

		.plans-grid {
			grid-template-columns: 1fr;
		}

		.form-actions {
			flex-direction: column;
		}
	}
</style>