<script>
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { showSuccess, showError } from '$lib/stores/toast.js';
	import Modal from '$lib/components/Modal.svelte';
	
	export let data;
	export let form;
	
	let membershipType = 'group_class'; // 'group_class' or 'personal_training'
	let selectedMember = null;
	let selectedPlan = null;
	let isLoading = false;
	let searchTerm = '';
	let planNameFilter = '';
	let formErrors = {};
	let showModal = false;
	let isEditing = false;
	let editingMembership = null;
	let selectedMemberText = '';
	let selectedPlanName = '';
	let selectedPlanDuration = '';
	let showHistoryModal = false;
	let selectedMemberHistory = [];
	let selectedMemberForHistory = null;
	let historyLoading = false;
	
	// Boolean for toggle switch binding
	$: isPersonalTraining = membershipType === 'personal_training';
	
	// Reactive variables for form binding
	$: currentAmountPaid = membershipType === 'group_class' ? gcFormData.amount_paid : ptFormData.amount_paid;
	
	$: members = data.members || [];
	$: plans = data.groupPlans || [];
	$: groupMemberships = data.groupClassMemberships || [];
	$: ptMemberships = data.ptMemberships || [];
	
	// Filter members for search dropdown
	$: filteredMembers = members.filter(member => 
		member.status === 'Active' && 
		selectedMemberText &&
		(member.name.toLowerCase().includes(selectedMemberText.toLowerCase()) ||
		 member.phone.includes(selectedMemberText))
	).slice(0, 5); // Show max 5 suggestions
	
	// Auto-select plan based on name and duration
	$: selectedPlan = plans.find(p => 
		p.name === selectedPlanName && 
		p.duration_days === parseInt(selectedPlanDuration)
	);
	
	// Auto-calculate membership type based on member history
	$: if (selectedMember && membershipType === 'group_class') {
		const memberHistory = groupMemberships.filter(m => m.member_id === selectedMember.id);
		gcFormData.membership_type = memberHistory.length > 0 ? 'Renewal' : 'New';
	}
	
	let gcFormData = {
		member_id: '',
		plan_id: '',
		start_date: new Date().toISOString().split('T')[0],
		amount_paid: '',
		membership_type: 'New'
	};
	
	let ptFormData = {
		member_id: '',
		sessions_total: '',
		amount_paid: ''
	};
	
	$: currentMemberships = membershipType === 'group_class' ? groupMemberships : ptMemberships;
	
	// Calculate dynamic membership status based on current date vs start/end dates
	$: membershipStatusMap = new Map(
		groupMemberships.map(m => [
			m.id, 
			(new Date() >= new Date(m.start_date) && new Date() <= new Date(m.end_date)) ? 'Active' : 'Inactive'
		])
	);

	// Calculate total amount paid by member in history
	$: totalAmountPaid = selectedMemberHistory.reduce((sum, membership) => sum + (membership.amount_paid || 0), 0);
	$: filteredMemberships = currentMemberships
		.filter(membership => {
			const memberName = membership.member_name?.toLowerCase() || '';
			const planName = membership.plan_name?.toLowerCase() || '';
			const searchLower = searchTerm.toLowerCase();
			
			// Search filter
			const matchesSearch = memberName.includes(searchLower) || planName.includes(searchLower);
			
			// Plan name filter (only for group class memberships)
			const matchesPlanFilter = membershipType !== 'group_class' || 
				planNameFilter === '' || 
				planName.includes(planNameFilter.toLowerCase());
			
			return matchesSearch && matchesPlanFilter;
		})
		.sort((a, b) => {
			// Sort by start date (descending) for group class, purchase date for PT
			const dateA = membershipType === 'group_class' ? a.start_date : a.purchase_date;
			const dateB = membershipType === 'group_class' ? b.start_date : b.purchase_date;
			return new Date(dateB) - new Date(dateA);
		});
	
	// Handle form results
	$: if (form?.success) {
		showSuccess(`${membershipType === 'group_class' ? 'Group class' : 'Personal training'} membership created successfully!`);
		resetForm();
	} else if (form?.error) {
		showError(`Error creating membership: ${form.error}`);
	}
	
	function switchMembershipType(type) {
		membershipType = type;
		resetForm();
	}
	
	function resetForm() {
		selectedMember = null;
		selectedPlan = null;
		selectedMemberText = '';
		selectedPlanName = '';
		selectedPlanDuration = '';
		formErrors = {};
		gcFormData = {
			member_id: '',
			plan_id: '',
			start_date: new Date().toISOString().split('T')[0],
			amount_paid: '',
			membership_type: 'New'
		};
		ptFormData = {
			member_id: '',
			sessions_total: '',
			amount_paid: ''
		};
	}
	
	function selectMember(member) {
		selectedMember = member;
		selectedMemberText = member.name;
		if (membershipType === 'group_class') {
			gcFormData.member_id = member.id;
		} else {
			ptFormData.member_id = member.id;
		}
	}
	
	function selectPlan(plan) {
		selectedPlan = plan;
		gcFormData.plan_id = plan.id;
		gcFormData.amount_paid = plan.default_amount;
	}
	
	function openModal() {
		showModal = true;
		resetForm();
	}
	
	function closeModal() {
		showModal = false;
		isEditing = false;
		editingMembership = null;
		resetForm();
	}
	
	function editMembership(membership) {
		isEditing = true;
		editingMembership = membership;
		showModal = true;
		
		// Find and set the member
		selectedMember = members.find(m => m.id === membership.member_id);
		selectedMemberText = selectedMember?.name || '';
		
		if (membershipType === 'group_class') {
			// Find and set the plan
			selectedPlan = plans.find(p => p.id === membership.plan_id);
			selectedPlanName = selectedPlan?.name || '';
			selectedPlanDuration = selectedPlan?.duration_days?.toString() || '';
			
			gcFormData = {
				member_id: membership.member_id,
				plan_id: membership.plan_id,
				start_date: membership.start_date,
				amount_paid: membership.amount_paid,
				membership_type: membership.membership_type
			};
		} else {
			ptFormData = {
				member_id: membership.member_id,
				sessions_total: membership.sessions_total,
				amount_paid: membership.amount_paid
			};
		}
	}
	
	function handleAmountChange(e) {
		const value = e.target.value;
		if (membershipType === 'group_class') {
			gcFormData.amount_paid = value;
		} else {
			ptFormData.amount_paid = value;
		}
	}
	
	function validateForm(formData) {
		const errors = {};
		const member_id = formData.get('member_id');

		// Member selection validation
		if (!selectedMember) {
			errors.member = 'Please select a member';
		}

		if (membershipType === 'group_class') {
			const plan_id = formData.get('plan_id');
			const start_date = formData.get('start_date');
			const amount_paid = formData.get('amount_paid');

			// Plan selection validation
			if (!selectedPlan) {
				errors.plan = 'Please select a plan';
			}

			// Start date validation
			if (!start_date) {
				errors.start_date = 'Start date is required';
			}

			// Amount validation
			if (!amount_paid || amount_paid <= 0 || isNaN(Number(amount_paid))) {
				errors.amount_paid = 'Amount paid must be a positive number';
			}
		} else {
			const sessions_total = formData.get('sessions_total');
			const amount_paid = formData.get('amount_paid');

			// Sessions validation
			if (!sessions_total || sessions_total <= 0 || !Number.isInteger(Number(sessions_total))) {
				errors.sessions_total = 'Total sessions must be a positive whole number';
			}

			// Amount validation
			if (!amount_paid || amount_paid <= 0 || isNaN(Number(amount_paid))) {
				errors.amount_paid = 'Amount paid must be a positive number';
			}
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
				showSuccess(`${membershipType === 'group_class' ? 'Group class' : 'Personal training'} membership created successfully!`);
				closeModal();
				await invalidateAll();
			} else if (result.type === 'failure') {
				showError(form?.error || 'Failed to create membership. Please try again.');
			}
			isLoading = false;
		};
	};
	
	function deleteMembership(membership, type) {
		const confirmText = type === 'group_class' 
			? `Are you sure you want to delete this group class membership for ${membership.member_name}?`
			: `Are you sure you want to delete this PT membership for ${membership.member_name}?`;
			
		if (confirm(confirmText)) {
			const form = document.createElement('form');
			form.method = 'POST';
			form.action = type === 'group_class' ? '?/deleteGC' : '?/deletePT';
			
			const input = document.createElement('input');
			input.type = 'hidden';
			input.name = 'id';
			input.value = membership.id;
			form.appendChild(input);
			
			document.body.appendChild(form);
			form.submit();
		}
	}
	
	function formatCurrency(amount) {
		return new Intl.NumberFormat('en-IN', {
			style: 'currency',
			currency: 'INR'
		}).format(amount);
	}
	
	function formatDate(dateString) {
		if (!dateString) return 'N/A';
		return new Date(dateString).toLocaleDateString();
	}
	
	async function showMemberHistory(memberId, memberName) {
		console.log('👤 showMemberHistory called with:', { memberId, memberName });
		selectedMemberForHistory = { id: memberId, name: memberName };
		showHistoryModal = true;
		historyLoading = true;
		
		try {
			const formData = new FormData();
			formData.append('member_id', memberId.toString());
			console.log('📤 Sending request to getMemberHistory with member_id:', memberId);
			
			const response = await fetch('?/getMemberHistory', {
				method: 'POST',
				body: formData
			});
			
			console.log('📥 Response status:', response.status);
			console.log('📥 Response ok:', response.ok);
			
			if (response.ok) {
				const result = await response.json();
				console.log('📋 Response data:', result);
				if (result.type === 'success' && result.data?.success) {
					selectedMemberHistory = result.data.history || [];
					console.log('✅ Successfully set history:', selectedMemberHistory.length, 'items');
				} else {
					selectedMemberHistory = [];
					console.log('❌ Server returned error:', result.data?.error);
					showError('Failed to load membership history: ' + (result.data?.error || 'Unknown error'));
				}
			} else {
				selectedMemberHistory = [];
				console.log('❌ HTTP error:', response.status);
				showError('Failed to load membership history: HTTP ' + response.status);
			}
		} catch (error) {
			selectedMemberHistory = [];
			showError('Failed to load membership history: ' + error.message);
		} finally {
			historyLoading = false;
		}
	}
	
	function closeHistoryModal() {
		showHistoryModal = false;
		selectedMemberHistory = [];
		selectedMemberForHistory = null;
		historyLoading = false;
	}
</script>

<svelte:head>
	<title>Memberships - Kranos Gym</title>
</svelte:head>

<div class="memberships-container animate-slide-up">
	<div class="membership-type-selector">
		<div class="switch-container">
			<label class="switch-label">
				<input 
					type="checkbox" 
					class="switch-input"
					bind:checked={isPersonalTraining}
					on:change={(e) => switchMembershipType(e.target.checked ? 'personal_training' : 'group_class')}
				/>
				<span class="switch-slider"></span>
				<span class="switch-text left" class:active={membershipType === 'group_class'}>Group Classes</span>
				<span class="switch-text right" class:active={membershipType === 'personal_training'}>Personal Training</span>
			</label>
		</div>
	</div>
	
	<div class="membership-content">
		<div class="membership-list card">
			<div class="header">
				<h2>
					<span class="section-icon">{membershipType === 'group_class' ? '🎯' : '🏋️'}</span>
					{membershipType === 'group_class' ? 'Group Class' : 'Personal Training'} Memberships
				</h2>
				<div class="header-buttons">
					{#if membershipType === 'group_class'}
						<a href="/memberships/bulk-import" class="btn btn-secondary">
							<span>📁</span>
							Bulk Import
						</a>
					{/if}
					<button class="btn btn-primary" on:click={openModal}>
						<span>➕</span>
						Add {membershipType === 'group_class' ? 'Group Class' : 'PT'} Membership
					</button>
				</div>
			</div>
			
			<div class="filters-container">
				<div class="search-container">
					<div class="search-input-wrapper">
						<span class="search-icon">🔍</span>
						<input
							id="membership_search"
							name="membership_search"
							type="text"
							class="search-input"
							placeholder="Search memberships..."
							bind:value={searchTerm}
						/>
					</div>
				</div>
				
				{#if membershipType === 'group_class'}
					<div class="filter-group">
						<label class="filter-label">Plan:</label>
						<select id="plan_name_filter" name="plan_name_filter" bind:value={planNameFilter} class="plan-filter">
							<option value="">All Plans</option>
							{#each [...new Set(plans.map(p => p.name))] as planName}
								<option value={planName}>{planName}</option>
							{/each}
						</select>
					</div>
				{/if}
			</div>
			
			{#if membershipType === 'group_class'}
				<div class="table-container">
					{#if filteredMemberships.length === 0}
						<div class="empty-state">
							<span class="empty-icon">🎯</span>
							<p>No group class memberships found.</p>
						</div>
					{:else}
						<table class="memberships-table">
							<thead>
								<tr>
									<th>Member Name</th>
									<th>Phone</th>
									<th>Plan Name</th>
									<th>Duration</th>
									<th>Start Date</th>
									<th>End Date</th>
									<th>Amount</th>
									<th>Type</th>
									<th>Status</th>
									<th>Actions</th>
								</tr>
							</thead>
							<tbody>
								{#each filteredMemberships as membership (membership.id)}
									<tr class="membership-row">
										<td class="member-name">{membership.member_name}</td>
										<td class="member-phone">{membership.member_phone}</td>
										<td class="plan-name">{membership.plan_base_name}</td>
										<td class="plan-duration">{membership.duration_days} days</td>
										<td class="start-date">{formatDate(membership.start_date)}</td>
										<td class="end-date">{formatDate(membership.end_date)}</td>
										<td class="amount">{formatCurrency(membership.amount_paid)}</td>
										<td class="membership-type">
											{#if membership.membership_type === 'Renewal'}
												<button 
													class="membership-type-badge clickable-badge" 
													on:click={() => showMemberHistory(membership.member_id, membership.member_name)}
													title="Click to view membership history"
												>
													{membership.membership_type}
												</button>
											{:else}
												<span class="membership-type-badge">{membership.membership_type}</span>
											{/if}
										</td>
										<td class="status-cell">
											<span class="status" 
												class:active={membershipStatusMap.get(membership.id) === 'Active'} 
												class:inactive={membershipStatusMap.get(membership.id) === 'Inactive'}
												class:deleted={membership.status === 'Deleted'}>
												{membership.status === 'Deleted' ? 'Deleted' : membershipStatusMap.get(membership.id)}
											</span>
										</td>
										<td class="actions-cell">
											<button class="btn btn-secondary btn-sm edit-btn" on:click={() => editMembership(membership)}>
												✏️
											</button>
											<button class="btn btn-danger btn-sm delete-btn" on:click={() => deleteMembership(membership, membershipType)}>
												🗑️
											</button>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					{/if}
				</div>
			{:else}
				<div class="table-container">
					{#if filteredMemberships.length === 0}
						<div class="empty-state">
							<span class="empty-icon">🏋️</span>
							<p>No personal training memberships found.</p>
						</div>
					{:else}
						<table class="memberships-table">
							<thead>
								<tr>
									<th>Member Name</th>
									<th>Phone</th>
									<th>Total Sessions</th>
									<th>Purchase Date</th>
									<th>Amount</th>
									<th>Actions</th>
								</tr>
							</thead>
							<tbody>
								{#each filteredMemberships as membership (membership.id)}
									<tr class="membership-row">
										<td class="member-name">{membership.member_name}</td>
										<td class="member-phone">{membership.member_phone}</td>
										<td class="sessions">{membership.sessions_total || 0} sessions</td>
										<td class="purchase-date">{formatDate(membership.purchase_date)}</td>
										<td class="amount">{formatCurrency(membership.amount_paid)}</td>
										<td class="actions-cell">
											<button class="btn btn-secondary btn-sm edit-btn" on:click={() => editMembership(membership)}>
												✏️
											</button>
											<button class="btn btn-danger btn-sm delete-btn" on:click={() => deleteMembership(membership, membershipType)}>
												🗑️
											</button>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Membership Modal -->
<Modal bind:show={showModal} title="{isEditing ? 'Edit' : 'Add'} {membershipType === 'group_class' ? 'Group Class' : 'Personal Training'} Membership" on:close={closeModal}>
	<form 
		method="post" 
		action={isEditing 
			? (membershipType === 'group_class' ? '?/updateGC' : '?/updatePT')
			: (membershipType === 'group_class' ? '?/createGC' : '?/createPT')
		}
		use:enhance={submitForm} 
		class="membership-form-content"
		novalidate
	>
		<!-- Hidden form fields for selected member and plan -->
		{#if isEditing}
			<input type="hidden" name="id" value={editingMembership?.id || ''} />
		{/if}
		<input type="hidden" name="member_id" value={selectedMember?.id || ''} />
		{#if membershipType === 'group_class'}
			<input type="hidden" name="plan_id" value={selectedPlan?.id || ''} />
			{#if isEditing}
				<input type="hidden" name="end_date" value={editingMembership?.end_date || ''} />
				<input type="hidden" name="purchase_date" value={editingMembership?.purchase_date || ''} />
				<input type="hidden" name="membership_type" value={editingMembership?.membership_type || ''} />
				<input type="hidden" name="status" value={editingMembership?.status || 'Active'} />
			{/if}
		{/if}
		
		<div class="form-group">
			<label for="member_search">Member *</label>
			<div class="member-search-container">
				<input
					type="text"
					id="member_search"
					name="member_search"
					class="form-control"
					class:error={formErrors.member}
					bind:value={selectedMemberText}
					placeholder="Type to search for a member..."
					on:input={() => {
						selectedMember = null;
						if (formErrors.member) {
							formErrors = { ...formErrors, member: '' };
						}
					}}
				/>
				{#if filteredMembers.length > 0 && selectedMemberText}
					<div class="member-dropdown">
						{#each filteredMembers as member}
							<button 
								type="button"
								class="member-option"
								on:click={() => selectMember(member)}
							>
								<div class="member-option-name">{member.name}</div>
								<div class="member-option-phone">{member.phone}</div>
							</button>
						{/each}
					</div>
				{/if}
			</div>
			{#if formErrors.member}
				<span class="error-message">{formErrors.member}</span>
			{/if}
		</div>
		
		{#if membershipType === 'group_class'}
			<div class="form-group">
				<label for="plan_name_select">Plan Name *</label>
				<select 
					id="plan_name_select" 
					name="plan_name"
					class="form-control"
					class:error={formErrors.plan}
					bind:value={selectedPlanName}
					on:change={() => {
						selectedPlanDuration = '';
						if (formErrors.plan) {
							formErrors = { ...formErrors, plan: '' };
						}
					}}
				>
					<option value="">Select a plan name</option>
					{#each [...new Set(plans.filter(p => p.status === 'Active').map(p => p.name))] as planName}
						<option value={planName}>{planName}</option>
					{/each}
				</select>
				{#if formErrors.plan}
					<span class="error-message">{formErrors.plan}</span>
				{/if}
			</div>
			
			<div class="form-group">
				<label for="plan_duration_select">Plan Duration *</label>
				<select 
					id="plan_duration_select" 
					name="plan_duration"
					class="form-control"
					bind:value={selectedPlanDuration}
					on:change={() => {
						if (selectedPlan) {
							gcFormData.plan_id = selectedPlan.id;
							gcFormData.amount_paid = selectedPlan.default_amount;
						}
					}}
				>
					<option value="">Select duration</option>
					{#each plans.filter(p => p.status === 'Active' && p.name === selectedPlanName) as plan}
						<option value={plan.duration_days}>{plan.duration_days} days</option>
					{/each}
				</select>
			</div>
		{/if}
		
		<div class="form-group">
			<label for="start_date">Start Date *</label>
			<input 
				type="date" 
				id="start_date" 
				name="start_date"
				class="form-control"
				class:error={formErrors.start_date}
				bind:value={gcFormData.start_date}
			/>
			{#if formErrors.start_date}
				<span class="error-message">{formErrors.start_date}</span>
			{/if}
		</div>
		
		<div class="form-group">
			<label for="amount_paid">Amount Paid *</label>
			<div class="input-group">
				<span class="input-prefix">₹</span>
				<input 
					type="number" 
					id="amount_paid" 
					name="amount_paid"
					class="form-control"
					class:error={formErrors.amount_paid}
					bind:value={currentAmountPaid}
					on:input={handleAmountChange}
					placeholder="0.00"
				/>
			</div>
			{#if formErrors.amount_paid}
				<span class="error-message">{formErrors.amount_paid}</span>
			{/if}
		</div>
		
		{#if membershipType === 'personal_training'}
			<div class="form-group">
				<label for="sessions_total">Total Sessions *</label>
				<input 
					type="number" 
					id="sessions_total" 
					name="sessions_total"
					class="form-control"
					class:error={formErrors.sessions_total}
					bind:value={ptFormData.sessions_total}
					placeholder="e.g., 10, 20"
				/>
				{#if formErrors.sessions_total}
					<span class="error-message">{formErrors.sessions_total}</span>
				{/if}
			</div>
		{/if}
		
		<div class="form-actions">
			<button type="button" class="btn btn-secondary" on:click={closeModal}>
				Cancel
			</button>
			<button 
				type="submit" 
				class="btn btn-primary" 
				disabled={isLoading}
			>
				{#if isLoading}
					<span class="loading-spinner"></span>
					{isEditing ? 'Updating...' : 'Creating...'}
				{:else}
					<span>{isEditing ? '✏️' : '➕'}</span>
					{isEditing ? 'Update' : 'Create'} Membership
				{/if}
			</button>
		</div>
	</form>
</Modal>

<!-- Membership History Modal -->
<Modal bind:show={showHistoryModal} title="Membership History - {selectedMemberForHistory?.name || ''}" on:close={closeHistoryModal}>
	<div class="history-modal-content">
		{#if historyLoading}
			<div class="loading-state">
				<span class="loading-spinner"></span>
				<p>Loading membership history...</p>
			</div>
		{:else if selectedMemberHistory.length === 0}
			<div class="empty-state">
				<span class="empty-icon">📋</span>
				<p>No membership history found for this member.</p>
			</div>
		{:else}
			<!-- Total Amount Summary -->
			<div class="total-summary">
				<div class="summary-card">
					<div class="summary-icon">💰</div>
					<div class="summary-content">
						<div class="summary-label">Total Amount Paid</div>
						<div class="summary-value">{formatCurrency(totalAmountPaid)}</div>
					</div>
				</div>
				<div class="summary-card">
					<div class="summary-icon">📊</div>
					<div class="summary-content">
						<div class="summary-label">Total Memberships</div>
						<div class="summary-value">{selectedMemberHistory.length}</div>
					</div>
				</div>
			</div>

			<div class="history-table-container">
				<table class="history-table">
					<thead>
						<tr>
							<th>Plan Name</th>
							<th>Duration</th>
							<th>Start Date</th>
							<th>End Date</th>
							<th>Amount Paid</th>
							<th>Status</th>
						</tr>
					</thead>
					<tbody>
						{#each selectedMemberHistory as membership (membership.id)}
							<tr class="history-row">
								<td class="plan-name">{membership.plan_base_name || membership.plan_name}</td>
								<td class="plan-duration">{membership.duration_days} days</td>
								<td class="start-date">{formatDate(membership.start_date)}</td>
								<td class="end-date">{formatDate(membership.end_date)}</td>
								<td class="amount">{formatCurrency(membership.amount_paid)}</td>
								<td class="status-cell">
									<span class="status" 
										class:active={(new Date() >= new Date(membership.start_date) && new Date() <= new Date(membership.end_date)) && membership.status !== 'Deleted'} 
										class:inactive={(new Date() < new Date(membership.start_date) || new Date() > new Date(membership.end_date)) && membership.status !== 'Deleted'}
										class:deleted={membership.status === 'Deleted'}>
										{membership.status === 'Deleted' ? 'Deleted' : 
											(new Date() >= new Date(membership.start_date) && new Date() <= new Date(membership.end_date)) ? 'Active' : 'Inactive'}
									</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
		
		<div class="modal-actions">
			<button type="button" class="btn btn-secondary" on:click={closeHistoryModal}>
				Close
			</button>
		</div>
	</div>
</Modal>

<style>
	.memberships-container {
		display: flex;
		flex-direction: column;
		gap: 2rem;
		min-height: calc(100vh - 140px);
		padding: 0;
	}
	
	.membership-type-selector {
		background: var(--gradient-dark);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 1.5rem;
		backdrop-filter: blur(10px);
	}
	
	.switch-container {
		display: flex;
		justify-content: flex-start;
	}
	
	.switch-label {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 1rem;
		cursor: pointer;
		padding: 0.5rem;
	}
	
	.switch-input {
		position: absolute;
		opacity: 0;
		width: 0;
		height: 0;
	}
	
	.switch-slider {
		position: relative;
		width: 60px;
		height: 30px;
		background: var(--surface);
		border: 2px solid var(--border);
		border-radius: 30px;
		transition: var(--transition-medium);
		order: 2;
	}
	
	.switch-slider::before {
		content: '';
		position: absolute;
		top: 2px;
		left: 2px;
		width: 22px;
		height: 22px;
		background: var(--text-muted);
		border-radius: 50%;
		transition: var(--transition-medium);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	}
	
	.switch-input:checked + .switch-slider {
		background: var(--primary);
		border-color: var(--primary);
		box-shadow: 0 0 10px rgba(243, 148, 7, 0.3);
	}
	
	.switch-input:checked + .switch-slider::before {
		transform: translateX(30px);
		background: white;
	}
	
	.switch-text {
		font-weight: 600;
		font-size: 1.1rem;
		color: var(--text-muted);
		transition: var(--transition-medium);
		white-space: nowrap;
	}
	
	.switch-text.left {
		order: 1;
	}
	
	.switch-text.right {
		order: 3;
	}
	
	.switch-text.active {
		color: var(--primary);
		text-shadow: 0 0 10px var(--primary);
	}
	
	.membership-content {
		display: block;
		flex: 1;
	}
	
	.membership-list {
		display: flex;
		flex-direction: column;
		height: fit-content;
	}
	
	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem;
		border-bottom: 1px solid var(--border);
		background: var(--gradient-glow);
	}
	
	.header h2 {
		margin: 0;
		color: var(--text);
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 1.3rem;
		font-weight: 600;
	}
	
	.header-buttons {
		display: flex;
		gap: 1rem;
		align-items: center;
	}
	
	.section-icon {
		font-size: 1.3rem;
		filter: drop-shadow(0 0 10px var(--primary));
	}
	
	.filters-container {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem 1.5rem;
		border-bottom: 1px solid var(--border);
		flex-wrap: wrap;
	}
	
	.search-container {
		flex: 1;
		min-width: 200px;
	}
	
	.filter-group {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	
	.filter-label {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--text-muted);
		white-space: nowrap;
	}
	
	.plan-filter {
		padding: 0.5rem;
		border: 1px solid var(--border);
		border-radius: 6px;
		background: var(--surface);
		color: var(--text);
		font-size: 0.85rem;
		min-width: 150px;
		transition: var(--transition-fast);
	}
	
	.plan-filter:focus {
		outline: none;
		border-color: var(--primary);
		box-shadow: 0 0 0 2px rgba(243, 148, 7, 0.2);
	}
	
	.search-input-wrapper {
		position: relative;
		display: flex;
		align-items: center;
	}
	
	.search-icon {
		position: absolute;
		left: 1rem;
		color: var(--text-muted);
		font-size: 1.2rem;
		z-index: 1;
	}
	
	.search-input {
		width: 100%;
		padding: 0.75rem 1rem 0.75rem 3rem;
		border: 1px solid var(--border);
		border-radius: 8px;
		background: var(--surface);
		color: var(--text);
		font-size: 1rem;
		transition: var(--transition-fast);
	}
	
	.search-input:focus {
		outline: none;
		border-color: var(--primary);
		box-shadow: 0 0 0 3px rgba(243, 148, 7, 0.2);
	}
	
	.table-container {
		flex: 1;
		padding: 1rem;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}
	
	.memberships-table {
		width: 100%;
		border-collapse: collapse;
		margin: 0;
	}
	
	.memberships-table th,
	.memberships-table td {
		padding: 1rem;
		text-align: left;
		border-bottom: 1px solid var(--border);
	}
	
	.memberships-table th {
		background: var(--surface-light);
		font-weight: 600;
		color: var(--text);
		border-bottom: 2px solid var(--primary);
		position: sticky;
		top: 0;
		z-index: 10;
	}
	
	.membership-row {
		transition: var(--transition-fast);
	}
	
	.membership-row:hover {
		background: var(--gradient-glow);
		transform: translateY(-1px);
		box-shadow: 0 2px 8px rgba(243, 148, 7, 0.2);
	}
	
	.member-name {
		font-weight: 600;
		color: var(--text);
	}
	
	.plan-name {
		color: var(--primary);
		font-weight: 500;
	}
	
	.start-date, .end-date {
		color: var(--text-muted);
		font-family: monospace;
	}
	
	.amount {
		font-weight: 600;
		color: var(--success);
	}
	
	.membership-type-badge {
		background: var(--info);
		color: white;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		white-space: nowrap;
	}
	
	.status-cell, .actions-cell {
		text-align: center;
	}
	
	.status-cell {
		min-width: 90px;
	}
	
	.actions-cell {
		min-width: 90px;
		white-space: nowrap;
	}
	
	.list-container {
		flex: 1;
		overflow-y: auto;
		padding: 1rem;
		max-height: calc(100vh - 350px);
	}
	
	.membership-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem;
		border: 1px solid var(--border);
		border-radius: 12px;
		margin-bottom: 0.75rem;
		background: var(--gradient-dark);
		position: relative;
		overflow: hidden;
		transition: var(--transition-medium);
	}
	
	.membership-item::before {
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
	
	.membership-item:hover::before {
		opacity: 1;
	}
	
	.membership-item:hover {
		transform: translateY(-2px);
		border-color: var(--primary);
		box-shadow: var(--shadow-glow);
	}
	
	.membership-info h3 {
		margin: 0 0 0.5rem 0;
		color: var(--text);
		font-size: 1.1rem;
		font-weight: 600;
	}
	
	.plan-name {
		margin: 0 0 0.75rem 0;
		color: var(--primary);
		font-size: 0.95rem;
		font-weight: 500;
	}
	
	.membership-details {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		font-size: 0.85rem;
	}
	
	.detail {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		color: var(--text-muted);
		font-weight: 500;
	}
	
	.membership-type-badge {
		background: var(--info);
		color: white;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		white-space: nowrap;
	}
	
	.membership-actions {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.75rem;
	}
	
	.status {
		padding: 0.4rem 0.8rem;
		border-radius: 6px;
		font-size: 0.8rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		position: relative;
		overflow: hidden;
		white-space: nowrap;
		min-width: fit-content;
	}
	
	.status::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: currentColor;
		opacity: 0.1;
		z-index: -1;
	}
	
	.status.active {
		color: var(--success);
		border: 1px solid var(--success);
		box-shadow: 0 0 10px rgba(74, 222, 128, 0.3);
	}
	
	.status.inactive {
		color: var(--error);
		border: 1px solid var(--error);
		box-shadow: 0 0 10px rgba(239, 68, 68, 0.3);
	}

	.status.deleted {
		color: #9CA3AF;
		border: 1px solid #9CA3AF;
		box-shadow: 0 0 10px rgba(156, 163, 175, 0.3);
	}
	
	.empty-state {
		text-align: center;
		padding: 3rem 2rem;
		color: var(--text-muted);
	}
	
	.empty-icon {
		font-size: 3rem;
		display: block;
		margin-bottom: 1rem;
		opacity: 0.6;
		filter: drop-shadow(0 0 10px var(--primary));
	}
	
	.form-group {
		margin-bottom: 1.5rem;
	}
	
	.form-group label {
		display: block;
		margin-bottom: 0.75rem;
		font-weight: 600;
		color: var(--text);
		font-size: 0.9rem;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}
	
	.input-group {
		position: relative;
		display: flex;
		align-items: center;
	}
	
	.input-prefix {
		position: absolute;
		left: 1rem;
		color: var(--text-muted);
		font-weight: 600;
		z-index: 1;
	}
	
	.input-group .form-control {
		padding-left: 2.5rem;
	}
	
	.form-actions {
		display: flex;
		gap: 1rem;
		margin-top: 2rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--border);
	}
	
	.loading-spinner {
		width: 16px;
		height: 16px;
		border: 2px solid transparent;
		border-top: 2px solid currentColor;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		display: inline-block;
		margin-right: 0.5rem;
	}
	
	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}
	
	.membership-form-content {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}
	
	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	
	.form-group label {
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
	
	.input-group {
		position: relative;
		display: flex;
		align-items: center;
	}
	
	.input-prefix {
		position: absolute;
		left: 1rem;
		color: var(--text-muted);
		font-weight: 600;
		z-index: 1;
	}
	
	.input-group .form-control {
		padding-left: 2.5rem;
	}
	
	.form-actions {
		display: flex;
		gap: 1rem;
		justify-content: flex-end;
		margin-top: 1rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--border);
	}
	
	.member-search-container {
		position: relative;
	}
	
	.member-dropdown {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		background: var(--surface);
		border: 1px solid var(--border);
		border-top: none;
		border-radius: 0 0 8px 8px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		z-index: 1000;
		max-height: 200px;
		overflow-y: auto;
	}
	
	.member-option {
		width: 100%;
		padding: 0.75rem;
		background: none;
		border: none;
		text-align: left;
		cursor: pointer;
		transition: var(--transition-fast);
		border-bottom: 1px solid var(--border);
	}
	
	.member-option:last-child {
		border-bottom: none;
	}
	
	.member-option:hover {
		background: var(--gradient-glow);
	}
	
	.member-option-name {
		font-weight: 600;
		color: var(--text);
		margin-bottom: 0.25rem;
	}
	
	.member-option-phone {
		font-size: 0.85rem;
		color: var(--text-muted);
		font-family: monospace;
	}
	
	@media (max-width: 768px) {
		.membership-type-selector {
			padding: 1rem;
		}
		
		.switch-text {
			font-size: 1rem;
		}
		
		.header {
			padding: 1rem;
			flex-direction: column;
			align-items: flex-start;
			gap: 1rem;
		}
		
		.header h2 {
			font-size: 1.1rem;
		}
		
		.header-buttons {
			width: 100%;
			justify-content: stretch;
		}
		
		.filters-container {
			flex-direction: column;
			align-items: stretch;
			gap: 1rem;
			padding: 1rem;
		}
		
		.search-container {
			width: 100%;
		}
		
		.filter-group {
			width: 100%;
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}
		
		.plan-filter {
			width: 100%;
			padding: 0.75rem;
			font-size: 1rem;
		}
		
		.search-input {
			padding: 0.75rem 1rem 0.75rem 3rem;
			font-size: 1rem;
		}
		
		.table-container {
			padding: 0.75rem;
			overflow-x: auto;
			-webkit-overflow-scrolling: touch;
		}
		
		.memberships-table {
			min-width: 850px;
			font-size: 0.85rem;
		}
		
		.memberships-table th,
		.memberships-table td {
			padding: 0.6rem 0.5rem;
		}
		
		.memberships-table th {
			font-size: 0.8rem;
		}
		
		.status {
			padding: 0.3rem 0.6rem;
			font-size: 0.7rem;
			white-space: nowrap;
			min-width: fit-content;
		}
		
		.membership-type-badge {
			padding: 0.2rem 0.5rem;
			font-size: 0.65rem;
			white-space: nowrap;
		}
		
		.edit-btn, .delete-btn {
			padding: 0.3rem 0.5rem;
			font-size: 0.7rem;
			min-width: 32px;
			height: 32px;
		}
		
		.actions-cell {
			white-space: nowrap;
			min-width: 80px;
		}
		
		.edit-btn, .delete-btn {
			padding: 0.3rem 0.5rem;
			font-size: 0.7rem;
		}
		
		.form-actions {
			flex-direction: column;
			gap: 0.75rem;
		}
		
		.form-control {
			padding: 0.875rem;
			font-size: 1rem;
		}
		
		.membership-form-content {
			gap: 1.25rem;
		}
		
		.member-dropdown {
			max-height: 150px;
		}
		
		.member-option {
			padding: 0.75rem;
		}
		
		.empty-state {
			padding: 2rem 1rem;
		}
		
		.empty-icon {
			font-size: 2.5rem;
		}
	}
	
	@media (max-width: 480px) {
		.membership-type-selector {
			padding: 0.75rem;
		}
		
		.switch-label {
			gap: 0.75rem;
		}
		
		.switch-text {
			font-size: 0.9rem;
		}
		
		.switch-slider {
			width: 50px;
			height: 26px;
		}
		
		.switch-slider::before {
			width: 18px;
			height: 18px;
		}
		
		.switch-input:checked + .switch-slider::before {
			transform: translateX(24px);
		}
		
		.header {
			padding: 0.75rem;
		}
		
		.header h2 {
			font-size: 1rem;
		}
		
		.filters-container {
			padding: 0.75rem;
		}
		
		.search-input {
			padding: 0.75rem 1rem 0.75rem 3rem;
			font-size: 1rem;
		}
		
		.table-container {
			padding: 0.5rem;
			overflow-x: auto;
			-webkit-overflow-scrolling: touch;
		}
		
		.memberships-table {
			min-width: 900px;
			font-size: 0.8rem;
		}
		
		.memberships-table th,
		.memberships-table td {
			padding: 0.5rem 0.4rem;
		}
		
		.memberships-table th {
			font-size: 0.75rem;
		}
		
		.status {
			padding: 0.3rem 0.6rem;
			font-size: 0.7rem;
			white-space: nowrap;
			min-width: fit-content;
		}
		
		.membership-type-badge {
			padding: 0.2rem 0.4rem;
			font-size: 0.65rem;
			white-space: nowrap;
		}
		
		.edit-btn, .delete-btn {
			padding: 0.25rem 0.4rem;
			font-size: 0.65rem;
			min-width: 28px;
			height: 28px;
		}
		
		.actions-cell {
			white-space: nowrap;
			min-width: 70px;
		}
		
		.empty-state {
			padding: 1.5rem 0.5rem;
		}
		
		.empty-icon {
			font-size: 2rem;
		}
		
		.total-summary {
			flex-direction: column;
			gap: 0.75rem;
		}
		
		.summary-card {
			padding: 0.875rem;
		}
		
		.summary-icon {
			font-size: 1.5rem;
		}
		
		.summary-value {
			font-size: 1.125rem;
		}
		
		.summary-label {
			font-size: 0.8rem;
		}
		
		.member-dropdown {
			max-height: 120px;
		}
		
		.member-option {
			padding: 0.625rem;
		}
		
		.member-option-name {
			font-size: 0.9rem;
		}
		
		.member-option-phone {
			font-size: 0.8rem;
		}
		
		.form-control {
			padding: 0.875rem;
			font-size: 1rem;
		}
		
		.form-group label {
			font-size: 0.9rem;
		}
	}

	/* Reduced font sizes and button sizes */
	.memberships-table {
		font-size: 0.85rem;
	}

	.memberships-table th {
		font-size: 0.8rem;
		padding: 0.75rem 0.5rem;
	}

	.memberships-table td {
		padding: 0.6rem 0.5rem;
		font-size: 0.85rem;
	}

	.status {
		padding: 0.25rem 0.6rem;
		font-size: 0.7rem;
	}

	.membership-type-badge {
		padding: 0.2rem 0.5rem;
		font-size: 0.7rem;
	}

	.edit-btn, .delete-btn {
		padding: 0.3rem 0.6rem;
		font-size: 0.75rem;
		min-width: auto;
	}

	.edit-btn {
		margin-right: 0.25rem;
	}

	.actions-cell {
		white-space: nowrap;
	}

	/* Clickable badge styles */
	.clickable-badge {
		background: var(--primary);
		color: white;
		padding: 0.2rem 0.5rem;
		border-radius: 4px;
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		border: none;
		cursor: pointer;
		transition: var(--transition-fast);
		box-shadow: 0 0 5px rgba(243, 148, 7, 0.3);
	}

	.clickable-badge:hover {
		background: var(--primary-dark);
		box-shadow: 0 0 10px rgba(243, 148, 7, 0.5);
		transform: translateY(-1px);
	}

	.clickable-badge:active {
		transform: translateY(0);
		box-shadow: 0 0 5px rgba(243, 148, 7, 0.3);
	}

	/* History Modal Styles */
	.history-modal-content {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		max-height: 70vh;
	}

	.loading-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 2rem;
		color: var(--text-muted);
	}

	.history-table-container {
		overflow-x: auto;
		overflow-y: auto;
		max-height: 50vh;
		border: 1px solid var(--border);
		border-radius: 8px;
	}

	.history-table {
		width: 100%;
		border-collapse: collapse;
		margin: 0;
		font-size: 0.85rem;
	}

	.history-table th,
	.history-table td {
		padding: 0.75rem 0.5rem;
		text-align: left;
		border-bottom: 1px solid var(--border);
	}

	.history-table th {
		background: var(--surface-light);
		font-weight: 600;
		color: var(--text);
		border-bottom: 2px solid var(--primary);
		position: sticky;
		top: 0;
		z-index: 10;
		font-size: 0.8rem;
	}

	.history-row {
		transition: var(--transition-fast);
	}

	.history-row:hover {
		background: var(--gradient-glow);
	}

	.modal-actions {
		display: flex;
		justify-content: flex-end;
		padding-top: 1rem;
		border-top: 1px solid var(--border);
	}

	/* Summary Cards Styles */
	.total-summary {
		display: flex;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.summary-card {
		flex: 1;
		background: var(--gradient-dark);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 1.25rem;
		display: flex;
		align-items: center;
		gap: 1rem;
		backdrop-filter: blur(10px);
	}

	.summary-icon {
		font-size: 2rem;
		opacity: 0.8;
	}

	.summary-content {
		flex: 1;
	}

	.summary-label {
		font-size: 0.85rem;
		color: var(--text-muted);
		margin-bottom: 0.25rem;
		font-weight: 500;
	}

	.summary-value {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--primary);
	}

	@media (max-width: 640px) {
		.total-summary {
			flex-direction: column;
		}
		
		.summary-card {
			padding: 1rem;
		}
		
		.summary-value {
			font-size: 1.25rem;
		}
	}
</style>