<script>
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { showSuccess, showError } from '$lib/stores/toast.js';
	import Modal from '$lib/components/Modal.svelte';

	export let data;
	export const form = undefined; // For external reference only

	let selectedMember = null;
	let isEditing = false;
	let searchTerm = '';
	let isLoading = false;
	let showModal = false;
	let formErrors = {};

	$: members = data.members || [];
	$: filteredMembers = members.filter(member => 
		member.status !== 'Deleted' && (
			member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			member.phone.toString().includes(searchTerm) ||
			(member.email && member.email.toLowerCase().includes(searchTerm.toLowerCase()))
		)
	);

	function editMember(member) {
		selectedMember = member;
		isEditing = true;
		formErrors = {};
		showModal = true;
	}

	function newMember() {
		selectedMember = null;
		isEditing = false;
		formErrors = {};
		showModal = true;
	}

	function closeModal() {
		showModal = false;
		selectedMember = null;
		isEditing = false;
		formErrors = {};
	}

	function validateForm(formData) {
		const errors = {};
		const name = formData.get('name');
		const phone = formData.get('phone');
		const email = formData.get('email');
		const joinDate = formData.get('join_date');

		// Name validation (alphanumeric and spaces only)
		if (!name || !/^[a-zA-Z0-9\s]+$/.test(name.trim())) {
			errors.name = 'Name can only contain letters, numbers, and spaces';
		}

		// Phone validation (exactly 10 digits)
		if (!phone || !/^\d{10}$/.test(phone.trim())) {
			errors.phone = 'Phone number must be exactly 10 digits';
		}

		// Email validation (if provided)
		if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
			errors.email = 'Please enter a valid email address';
		}

		// Join date validation
		if (!joinDate) {
			errors.join_date = 'Join date is required';
		}

		return errors;
	}

	const submitForm = () => {
		return async ({ formData, result }) => {
			// Client-side validation
			const errors = validateForm(formData);
			if (Object.keys(errors).length > 0) {
				formErrors = errors;
				return;
			}

			isLoading = true;
			formErrors = {};

			if (result.type === 'success') {
				showSuccess(isEditing ? 'Member updated successfully!' : 'Member created successfully!');
				closeModal();
				await invalidateAll();
			} else if (result.type === 'failure') {
				if (result.data?.error) {
					showError(result.data.error);
				} else {
					showError('Failed to save member. Please try again.');
				}
			}
			isLoading = false;
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
					<table class="members-table">
						<thead>
							<tr>
								<th>Name</th>
								<th>Phone</th>
								<th>Email</th>
								<th>Join Date</th>
								<th>Status</th>
								<th>Actions</th>
							</tr>
						</thead>
						<tbody>
							{#each filteredMembers as member}
								<tr class="member-row">
									<td class="member-name">
										{member.name}
									</td>
									<td class="member-phone">
										{member.phone}
									</td>
									<td class="member-email">
										{member.email || '-'}
									</td>
									<td class="member-join-date">
										{member.join_date}
									</td>
									<td class="member-status">
										{#if member.status === 'Active'}
											<span class="status-badge active">Active</span>
										{:else}
											<span class="status-badge inactive">Inactive</span>
										{/if}
									</td>
									<td class="member-actions">
										<button 
											class="btn btn-secondary btn-sm"
											on:click={() => editMember(member)}
										>
											✏️ Edit
										</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{/if}
			</div>
		</div>
	</div>
</div>

<!-- Member Modal -->
<Modal bind:show={showModal} title={isEditing ? 'Edit Member' : 'Add New Member'} on:close={closeModal}>
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
				class:error={formErrors.name}
				required
				pattern="[a-zA-Z0-9\s]+"
				placeholder="Enter full name (letters, numbers, spaces only)"
			/>
			{#if formErrors.name}
				<span class="error-message">{formErrors.name}</span>
			{/if}
		</div>

		<div class="form-group">
			<label for="phone" class="form-label">Phone Number *</label>
			<input
				type="tel"
				id="phone"
				name="phone"
				value={selectedMember?.phone || ''}
				class="form-control"
				class:error={formErrors.phone}
				required
				pattern="\d{10}"
				maxlength="10"
				placeholder="Enter 10-digit phone number"
			/>
			{#if formErrors.phone}
				<span class="error-message">{formErrors.phone}</span>
			{/if}
		</div>

		<div class="form-group">
			<label for="email" class="form-label">Email Address</label>
			<input
				type="email"
				id="email"
				name="email"
				value={selectedMember?.email || ''}
				class="form-control"
				class:error={formErrors.email}
				placeholder="Enter email address"
			/>
			{#if formErrors.email}
				<span class="error-message">{formErrors.email}</span>
			{/if}
		</div>

		<div class="form-group">
			<label for="join_date" class="form-label">Join Date *</label>
			<input
				type="date"
				id="join_date"
				name="join_date"
				value={selectedMember?.join_date || new Date().toISOString().split('T')[0]}
				class="form-control"
				class:error={formErrors.join_date}
				required
			/>
			{#if formErrors.join_date}
				<span class="error-message">{formErrors.join_date}</span>
			{/if}
		</div>

		<div class="form-actions">
			<button 
				type="button" 
				class="btn btn-secondary"
				on:click={closeModal}
				disabled={isLoading}
			>
				Cancel
			</button>
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
				disabled={isLoading}
			>
				<span class="btn-icon">🗑️</span>
				Delete Member
			</button>
		</form>
	{/if}
</Modal>

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

	.members-content {
		display: block;
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
		width: 100%;
		border-collapse: collapse;
		margin-top: 1rem;
	}

	.members-table th,
	.members-table td {
		padding: 1rem;
		text-align: left;
		border-bottom: 1px solid var(--border);
	}

	.members-table th {
		background: var(--gradient-glow);
		font-weight: 600;
		color: var(--text);
		position: sticky;
		top: 0;
		z-index: 10;
	}

	.member-row {
		transition: var(--transition-fast);
	}

	.member-row:hover {
		background: var(--gradient-glow);
	}

	.member-name {
		font-weight: 600;
		color: var(--text);
	}

	.member-phone {
		font-family: monospace;
		color: var(--text-muted);
	}

	.member-email {
		color: var(--text-muted);
	}

	.member-join-date {
		color: var(--text-muted);
	}

	.status-badge {
		padding: 0.25rem 0.5rem;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.status-badge.active {
		background: rgba(74, 222, 128, 0.2);
		color: var(--success);
		border: 1px solid var(--success);
	}

	.status-badge.inactive {
		background: rgba(239, 68, 68, 0.2);
		color: var(--error);
		border: 1px solid var(--error);
	}

	.member-actions {
		text-align: center;
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

	.form-control {
		padding: 0.75rem;
		border: 1px solid var(--border);
		border-radius: 8px;
		background: var(--surface);
		color: var(--text);
		font-size: 0.9rem;
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
		font-size: 0.8rem;
		margin-top: 0.25rem;
	}

	.form-actions {
		display: flex;
		gap: 1rem;
		justify-content: flex-end;
		margin-top: 1rem;
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
		.members-table-container {
			overflow-x: auto;
		}

		.members-table {
			min-width: 600px;
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

		.form-actions {
			flex-direction: column;
		}
	}
</style>