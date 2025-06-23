<script>
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	
	export let data;
	export let form;
	
	let selectedMember = null;
	let isEditing = false;
	let searchTerm = '';
	let isLoading = false;
	
	$: members = data.members || [];
	$: filteredMembers = members.filter(member => 
		member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
		member.phone.toString().includes(searchTerm) ||
		(member.email && member.email.toLowerCase().includes(searchTerm.toLowerCase()))
	);
	
	function selectMember(member) {
		selectedMember = member;
		isEditing = true;
	}
	
	function newMember() {
		selectedMember = null;
		isEditing = false;
	}
	
	const submitForm = () => {
		isLoading = true;
		return async ({ result }) => {
			isLoading = false;
			if (result.type === 'success') {
				newMember();
				await invalidateAll();
			}
		};
	};
</script>

<svelte:head>
	<title>Members - Kranos Gym</title>
</svelte:head>

<div class="members-page">
	<div class="page-header">
		<div class="header-content">
			<h1 class="page-title animate-slide-up">
				<span class="title-icon">👥</span>
				Members Management
			</h1>
			<p class="page-subtitle animate-slide-up">Manage gym members and their information</p>
		</div>
		<div class="header-actions animate-slide-up">
			<button class="btn btn-primary" on:click={newMember} data-testid="add-member-button">
				<span class="btn-icon">➕</span>
				Add Member
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
			Member saved successfully!
		</div>
	{/if}

	<div class="members-content">
		<div class="members-list card animate-slide-up">
			<div class="card-header">
				<h2>
					<span class="section-icon">📋</span>
					Members List
					<span class="member-count">({filteredMembers.length})</span>
				</h2>
				<div class="search-container">
					<input
						type="text"
						placeholder="Search members..."
						bind:value={searchTerm}
						class="search-input"
					/>
					<span class="search-icon">🔍</span>
				</div>
			</div>
			
			<div class="members-table-container">
				{#if filteredMembers.length === 0}
					<div class="empty-state">
						<div class="empty-icon">👤</div>
						<h3>No Members Found</h3>
						<p>Start by adding your first member</p>
					</div>
				{:else}
					<div class="members-table">
						{#each filteredMembers as member}
							<div 
								class="member-row" 
								class:selected={selectedMember?.id === member.id}
								on:click={() => selectMember(member)}
							>
								<div class="member-info">
									<div class="member-name">
										{member.name}
										{#if !member.is_active}
											<span class="status-badge inactive">Inactive</span>
										{/if}
									</div>
									<div class="member-contact">
										<span class="phone">📞 {member.phone}</span>
										{#if member.email}
											<span class="email">✉️ {member.email}</span>
										{/if}
									</div>
									<div class="member-meta">
										<span class="join-date">Joined: {member.join_date}</span>
									</div>
								</div>
								<div class="member-actions">
									<button 
										class="btn btn-secondary btn-sm"
										on:click|stopPropagation={() => selectMember(member)}
									>
										Edit
									</button>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<div class="member-form card animate-slide-up">
			<div class="card-header">
				<h2>
					<span class="section-icon">{isEditing ? '✏️' : '➕'}</span>
					{isEditing ? 'Edit Member' : 'Add New Member'}
				</h2>
				{#if isEditing}
					<button class="btn btn-secondary" on:click={newMember}>
						Add New
					</button>
				{/if}
			</div>

			<form 
				method="post" 
				action={isEditing ? '?/update' : '?/create'}
				use:enhance={submitForm}
				class="member-form-content"
			>
				{#if isEditing}
					<input type="hidden" name="id" value={selectedMember?.id} />
				{/if}

				<div class="form-group">
					<label for="name" class="form-label">Full Name *</label>
					<input
						type="text"
						id="name"
						name="name"
						value={selectedMember?.name || ''}
						class="form-control"
						required
						placeholder="Enter full name"
					/>
				</div>

				<div class="form-group">
					<label for="phone" class="form-label">Phone Number *</label>
					<input
						type="tel"
						id="phone"
						name="phone"
						value={selectedMember?.phone || ''}
						class="form-control"
						required
						placeholder="Enter phone number"
					/>
				</div>

				<div class="form-group">
					<label for="email" class="form-label">Email Address</label>
					<input
						type="email"
						id="email"
						name="email"
						value={selectedMember?.email || ''}
						class="form-control"
						placeholder="Enter email address"
					/>
				</div>

				<div class="form-group">
					<label for="join_date" class="form-label">Join Date</label>
					<input
						type="date"
						id="join_date"
						name="join_date"
						value={selectedMember?.join_date || new Date().toISOString().split('T')[0]}
						class="form-control"
					/>
				</div>

				<div class="form-group">
					<label class="checkbox-label">
						<input
							type="checkbox"
							name="is_active"
							checked={selectedMember?.is_active !== false}
							class="form-checkbox"
						/>
						<span class="checkbox-text">Active Member</span>
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
						{isEditing ? 'Update Member' : 'Save Member'}
					</button>
				</div>
			</form>
			
			{#if isEditing}
				<form method="post" action="?/delete" use:enhance={submitForm} class="delete-form">
					<input type="hidden" name="id" value={selectedMember?.id} />
					<button 
						type="submit" 
						class="btn btn-danger"
						on:click={() => confirm('Are you sure you want to delete this member?')}
					>
						<span class="btn-icon">🗑️</span>
						Delete Member
					</button>
				</form>
			{/if}
		</div>
	</div>
</div>

<style>
	.members-page {
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

	.members-content {
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

	.member-count {
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

	.members-table-container {
		max-height: 600px;
		overflow-y: auto;
	}

	.empty-state {
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

	.members-table {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.member-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem;
		border: 1px solid var(--border);
		border-radius: 8px;
		cursor: pointer;
		transition: var(--transition-fast);
		background: var(--surface);
	}

	.member-row:hover {
		border-color: var(--primary);
		background: var(--gradient-glow);
		transform: translateY(-1px);
	}

	.member-row.selected {
		border-color: var(--primary);
		background: var(--gradient-glow);
		box-shadow: 0 0 15px rgba(243, 148, 7, 0.2);
	}

	.member-info {
		flex: 1;
	}

	.member-name {
		font-weight: 600;
		font-size: 1.1rem;
		margin-bottom: 0.25rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
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

	.member-contact {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		margin-bottom: 0.25rem;
	}

	.phone, .email {
		font-size: 0.9rem;
		color: var(--text-muted);
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.member-meta {
		font-size: 0.85rem;
		color: var(--text-muted);
	}

	.member-actions {
		margin-left: 1rem;
	}

	.btn-sm {
		padding: 0.5rem 1rem;
		font-size: 0.85rem;
	}

	.member-form-content {
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

	.delete-form {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid var(--border);
	}

	@media (max-width: 768px) {
		.members-content {
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

		.member-row {
			flex-direction: column;
			align-items: flex-start;
			gap: 1rem;
		}

		.member-actions {
			margin-left: 0;
			width: 100%;
		}

		.form-actions {
			flex-direction: column;
		}
	}
</style>