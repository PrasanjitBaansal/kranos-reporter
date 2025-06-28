<script>
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { showSuccess, showError } from '$lib/stores/toast.js';
	import Modal from '$lib/components/Modal.svelte';
	import MemberDetailsModal from '$lib/components/MemberDetailsModal.svelte';

	export let data;
	export const form = undefined; // For external reference only

	let selectedMember = null;
	let isEditing = false;
	let searchTerm = '';
	let isLoading = false;
	let showModal = false;
	let showDetailsModal = false;
	let detailsMember = null;
	let formErrors = {};
	let joinDateFrom = '';
	let joinDateTo = '';
	let statusFilter = 'all'; // 'all', 'active', 'inactive'
	let sortField = 'join_date';
	let sortDirection = 'desc'; // 'asc' or 'desc'

	$: members = data.members || [];
	$: filteredMembers = members.filter(member => {
		if (member.status === 'Deleted') return false;
		
		// Search filter
		const matchesSearch = searchTerm === '' || (
			member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			member.phone.toString().includes(searchTerm) ||
			(member.email && member.email.toLowerCase().includes(searchTerm.toLowerCase()))
		);
		
		// Date range filter
		const matchesDateRange = (!joinDateFrom && !joinDateTo) || (
			(!joinDateFrom || member.join_date >= joinDateFrom) &&
			(!joinDateTo || member.join_date <= joinDateTo)
		);
		
		// Status filter
		const matchesStatus = statusFilter === 'all' || 
			(statusFilter === 'active' && member.status === 'Active') ||
			(statusFilter === 'inactive' && member.status === 'Inactive') ||
			(statusFilter === 'new' && member.status === 'New');
		
		return matchesSearch && matchesDateRange && matchesStatus;
	}).sort((a, b) => {
		if (sortField === 'join_date') {
			// Convert to proper Date objects for sorting
			const dateA = parseDateForSorting(a.join_date);
			const dateB = parseDateForSorting(b.join_date);
			return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
		}
		return 0;
	});

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

	function showMemberDetails(member) {
		detailsMember = member;
		showDetailsModal = true;
	}

	function closeDetailsModal() {
		showDetailsModal = false;
		detailsMember = null;
	}

	function handleRowClick(event, member) {
		// Don't open modal if clicking on a button
		if (event.target.closest('button')) {
			return;
		}
		showMemberDetails(member);
	}

	function clearFilters() {
		joinDateFrom = '';
		joinDateTo = '';
		statusFilter = 'all';
		searchTerm = '';
	}

	function handleSort(field) {
		if (sortField === field) {
			// Toggle direction if same field
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			// New field, default to descending for dates
			sortField = field;
			sortDirection = 'desc';
		}
	}

	function formatDateForDisplay(dateString) {
		if (!dateString) return '';
		// Handle both YYYY-MM-DD and DD/MM/YYYY formats
		let date;
		if (dateString.includes('/')) {
			// Already in DD/MM/YYYY format
			const [day, month, year] = dateString.split('/');
			date = new Date(year, month - 1, day);
		} else {
			// YYYY-MM-DD format
			date = new Date(dateString);
		}
		
		if (isNaN(date.getTime())) return dateString; // Return original if invalid
		
		const day = date.getDate().toString().padStart(2, '0');
		const month = (date.getMonth() + 1).toString().padStart(2, '0');
		const year = date.getFullYear();
		return `${day}/${month}/${year}`;
	}

	function parseDateForSorting(dateString) {
		if (!dateString) return new Date(0); // Return epoch for empty dates
		
		// Handle both YYYY-MM-DD and DD/MM/YYYY formats
		if (dateString.includes('/')) {
			// DD/MM/YYYY or DD-MM-YYYY format
			const parts = dateString.split(/[-\/]/);
			if (parts.length === 3) {
				const day = parseInt(parts[0]);
				const month = parseInt(parts[1]);
				const year = parseInt(parts[2]);
				return new Date(year, month - 1, day);
			}
		} else {
			// YYYY-MM-DD format
			return new Date(dateString);
		}
		
		// Fallback - try native parsing
		const date = new Date(dateString);
		return isNaN(date.getTime()) ? new Date(0) : date;
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

		// Phone validation (exactly 10 digits) - skip when editing
		if (!isEditing) {
			if (!phone || !/^\d{10}$/.test(phone)) {
				errors.phone = 'Phone number must be exactly 10 digits';
			}
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
				// Check if server-side validation passed
				if (result.data?.success === false) {
					// Server-side validation failed - show as form error
					if (result.data.error?.includes('Phone number')) {
						formErrors = { ...formErrors, phone: result.data.error };
					} else {
						formErrors = { ...formErrors, general: result.data.error };
					}
				} else {
					// Success - show success message, close modal and refresh data
					showSuccess(isEditing ? 'Member updated successfully!' : 'Member created successfully!');
					closeModal();
					await invalidateAll();
				}
			} else if (result.type === 'failure') {
				// System/network errors
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
				Member Management
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
				<div class="filters-container">
					<div class="filters-left">
						<!-- Date Range Filter -->
						<div class="filter-group">
							<label class="filter-label" for="joinDateFrom">📅 Join Date:</label>
							<div class="date-range">
								<input
									id="joinDateFrom"
									type="date"
									bind:value={joinDateFrom}
									class="date-input"
									placeholder="From"
									aria-label="From date"
								/>
								<span class="date-separator">to</span>
								<input
									id="joinDateTo"
									type="date"
									bind:value={joinDateTo}
									class="date-input"
									placeholder="To"
									aria-label="To date"
								/>
							</div>
						</div>

						<!-- Status Filter -->
						<div class="filter-group">
							<label class="filter-label" for="statusFilter">🎯 Status:</label>
							<select id="statusFilter" bind:value={statusFilter} class="status-select">
								<option value="all">All Members</option>
								<option value="active">Active Only</option>
								<option value="inactive">Inactive Only</option>
								<option value="new">New Only</option>
							</select>
						</div>

						<!-- Clear Filters -->
						<button class="btn btn-secondary btn-sm" on:click={clearFilters}>
							🔄 Clear
						</button>
					</div>

					<!-- Search -->
					<div class="search-container">
						<label for="searchTerm" class="sr-only">Search members</label>
						<input
							id="searchTerm"
							type="text"
							placeholder="Search members..."
							bind:value={searchTerm}
							class="search-input"
						/>
						<span class="search-icon">🔍</span>
					</div>
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
								<th class="sortable" on:click={() => handleSort('join_date')}>
									Join Date
									{#if sortField === 'join_date'}
										<span class="sort-indicator">
											{sortDirection === 'asc' ? '▲' : '▼'}
										</span>
									{/if}
								</th>
								<th>Status</th>
								<th>Actions</th>
							</tr>
						</thead>
						<tbody>
							{#each filteredMembers as member}
								<tr class="member-row clickable" on:click={(e) => handleRowClick(e, member)}>
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
										{formatDateForDisplay(member.join_date)}
									</td>
									<td class="member-status">
										{#if member.status === 'Active'}
											<span class="status-badge active">Active</span>
										{:else if member.status === 'New'}
											<span class="status-badge new">New</span>
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
		novalidate
	>
		{#if isEditing}
			<input type="hidden" name="id" value={selectedMember?.id} />
		{/if}

		{#if formErrors.general}
			<div class="general-error">
				<span class="error-message">{formErrors.general}</span>
			</div>
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
				class:disabled={isEditing}
				disabled={isEditing}
				inputmode="numeric"
				placeholder={isEditing ? 'Phone number cannot be changed' : '1234567890'}
				on:input={(e) => {
					if (!isEditing) {
						// Clear phone validation error when user types valid input
						if (formErrors.phone && /^\d{10}$/.test(e.target.value)) {
							formErrors = { ...formErrors, phone: '' };
						}
					}
				}}
			/>
			{#if formErrors.phone && !isEditing}
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
				on:input={() => {
					if (formErrors.join_date) {
						formErrors = { ...formErrors, join_date: '' };
					}
				}}
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
		<div class="delete-section">
			<form method="post" action="?/delete" use:enhance={submitForm} class="delete-form">
				<input type="hidden" name="id" value={selectedMember?.id} />
				<button 
					type="submit" 
					class="btn btn-danger"
					on:click={(e) => {
						e.preventDefault();
						if (confirm('Are you sure you want to delete this member? This action cannot be undone.')) {
							formErrors = {}; // Clear any validation errors
							e.target.form.submit();
						}
					}}
					disabled={isLoading}
				>
					<span class="btn-icon">🗑️</span>
					Delete Member
				</button>
			</form>
		</div>
	{/if}
</Modal>

<!-- Member Details Modal -->
<MemberDetailsModal bind:show={showDetailsModal} member={detailsMember} on:close={closeDetailsModal} />

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
		width: 100%;
		overflow: visible;
	}

	.header-content h1 {
		font-size: 2.5rem;
		font-weight: 700;
		margin-bottom: 0.5rem;
		background: var(--gradient-primary);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		white-space: nowrap;
		overflow: visible;
		flex-shrink: 0;
	}


	.header-content {
		flex: 1;
		min-width: 0;
		overflow: visible;
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
		background: var(--surface-light);
		font-weight: 600;
		color: var(--text);
		position: sticky;
		top: 0;
		z-index: 10;
		border-bottom: 2px solid var(--primary);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.member-row {
		transition: var(--transition-fast);
	}

	.member-row:hover {
		background: var(--gradient-glow);
	}

	.member-row.clickable {
		cursor: pointer;
		transition: var(--transition-fast);
	}

	.member-row.clickable:hover {
		transform: translateY(-1px);
		box-shadow: 0 2px 8px rgba(243, 148, 7, 0.2);
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

	.status-badge.new {
		background: rgba(59, 130, 246, 0.2);
		color: #3b82f6;
		border: 1px solid #3b82f6;
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

	.form-control.disabled {
		background: var(--bg-secondary);
		color: var(--text-muted);
		cursor: not-allowed;
		opacity: 0.7;
	}

	.error-message {
		color: var(--error);
		font-size: 0.8rem;
		margin-top: 0.25rem;
	}

	.general-error {
		padding: 0.75rem;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid var(--error);
		border-radius: 8px;
		margin-bottom: 1rem;
	}

	.general-error .error-message {
		margin-top: 0;
		font-size: 0.9rem;
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

	.delete-section {
		margin-top: 1.5rem;
		padding-top: 1rem;
		border-top: 1px solid var(--border);
	}

	.delete-form {
		margin: 0;
	}

	/* Filters */
	.filters-container {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
		min-width: 0;
	}

	.filters-left {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
		min-width: 0;
	}

	.filter-group {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-width: 0;
	}

	.filter-label {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--text-muted);
		white-space: nowrap;
	}

	.date-range {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.date-input {
		padding: 0.5rem;
		border: 1px solid var(--border);
		border-radius: 6px;
		background: var(--surface);
		color: var(--text);
		font-size: 0.85rem;
		min-width: 120px;
		transition: var(--transition-fast);
	}

	.date-input:focus {
		outline: none;
		border-color: var(--primary);
		box-shadow: 0 0 0 2px rgba(243, 148, 7, 0.2);
	}

	.date-separator {
		font-size: 0.8rem;
		color: var(--text-muted);
		white-space: nowrap;
	}

	.status-select {
		padding: 0.5rem;
		border: 1px solid var(--border);
		border-radius: 6px;
		background: var(--surface);
		color: var(--text);
		font-size: 0.85rem;
		min-width: 120px;
		transition: var(--transition-fast);
	}

	.status-select:focus {
		outline: none;
		border-color: var(--primary);
		box-shadow: 0 0 0 2px rgba(243, 148, 7, 0.2);
	}

	.search-container {
		min-width: 200px;
	}

	.sortable {
		cursor: pointer;
		user-select: none;
		transition: color 0.2s ease;
	}

	.sortable:hover {
		color: var(--primary);
	}

	.sort-indicator {
		margin-left: 0.5rem;
		font-size: 0.8rem;
		color: var(--primary);
	}

	@media (max-width: 768px) {
		.members-page {
			padding: 1rem 0.5rem;
		}
		
		.page-header {
			flex-direction: column;
			align-items: flex-start;
			margin-bottom: 2rem;
			gap: 1.5rem;
		}
		
		.header-content h1 {
			font-size: 2rem;
		}
		
		.page-subtitle {
			font-size: 1rem;
		}

		.card-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 1.5rem;
		}
		
		.card-header h2 {
			font-size: 1.25rem;
		}

		.filters-container {
			flex-direction: column;
			align-items: stretch;
			width: 100%;
			gap: 1rem;
			justify-content: flex-start;
		}

		.filters-left {
			flex-direction: column;
			align-items: stretch;
			width: 100%;
			gap: 1rem;
		}

		.filter-group {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}

		.date-range {
			flex-direction: column;
			gap: 0.5rem;
			width: 100%;
		}

		.date-input,
		.status-select {
			width: 100%;
			min-width: auto;
			padding: 0.75rem;
			font-size: 1rem;
		}

		.search-container {
			width: 100%;
		}
		
		.search-input {
			padding: 0.75rem 2.5rem 0.75rem 1rem;
			font-size: 1rem;
		}

		.members-table-container {
			overflow-x: auto;
			-webkit-overflow-scrolling: touch;
			border-radius: var(--radius-md);
		}

		.members-table {
			min-width: 700px;
			font-size: 0.9rem;
		}
		
		.members-table th,
		.members-table td {
			padding: 0.75rem 0.5rem;
		}
		
		.members-table th {
			font-size: 0.85rem;
		}
		
		.status-badge {
			padding: 0.2rem 0.4rem;
			font-size: 0.7rem;
		}
		
		.btn-sm {
			padding: 0.4rem 0.8rem;
			font-size: 0.8rem;
		}

		.form-actions {
			flex-direction: column;
			gap: 0.75rem;
		}
		
		.form-control {
			padding: 0.875rem;
			font-size: 1rem;
		}
		
		.member-form-content {
			gap: 1.25rem;
		}
	}
	
	@media (max-width: 480px) {
		.members-page {
			padding: 0.5rem 0.25rem;
		}
		
		.page-header {
			margin-bottom: 1.5rem;
			gap: 1rem;
		}
		
		.header-content h1 {
			font-size: 1.75rem;
		}
		
		.page-subtitle {
			font-size: 0.9rem;
		}
		
		.card-header h2 {
			font-size: 1.1rem;
		}
		
		.members-table {
			min-width: 600px;
			font-size: 0.85rem;
		}
		
		.members-table th,
		.members-table td {
			padding: 0.6rem 0.4rem;
		}
		
		.status-badge {
			padding: 0.15rem 0.3rem;
			font-size: 0.65rem;
		}
		
		.btn-sm {
			padding: 0.35rem 0.6rem;
			font-size: 0.75rem;
		}
		
		.empty-state {
			padding: 2rem 0.5rem;
		}
		
		.empty-icon {
			font-size: 3rem;
		}
		
		.date-input,
		.status-select {
			padding: 0.75rem;
			font-size: 1rem;
		}
		
		.search-input {
			padding: 0.75rem 2.5rem 0.75rem 1rem;
			font-size: 1rem;
		}
		
		.form-control {
			padding: 0.875rem;
			font-size: 1rem;
		}
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
</style>