<script>
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { showSuccess, showError } from '$lib/stores/toast.js';
	
	export let data;
	export let form;
	
	let membershipType = 'group_class'; // 'group_class' or 'personal_training'
	let selectedMember = null;
	let selectedPlan = null;
	let isLoading = false;
	let searchTerm = '';
	let formErrors = {};
	
	$: members = data.members || [];
	$: plans = data.groupPlans || [];
	$: groupMemberships = data.groupClassMemberships || [];
	$: ptMemberships = data.ptMemberships || [];
	
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
	$: filteredMemberships = currentMemberships.filter(membership => {
		const memberName = membership.member_name?.toLowerCase() || '';
		const planName = membership.plan_name?.toLowerCase() || '';
		const searchLower = searchTerm.toLowerCase();
		return memberName.includes(searchLower) || planName.includes(searchLower);
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
	
	function validateForm(formData) {
		const errors = {};
		const member_id = formData.get('member_id');

		// Member selection validation
		if (!member_id || !selectedMember) {
			errors.member = 'Please select a member';
		}

		if (membershipType === 'group_class') {
			const plan_id = formData.get('plan_id');
			const start_date = formData.get('start_date');
			const amount_paid = formData.get('amount_paid');

			// Plan selection validation
			if (!plan_id || !selectedPlan) {
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
				resetForm();
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
</script>

<svelte:head>
	<title>Memberships - Kranos Gym</title>
</svelte:head>

<div class="memberships-container animate-slide-up">
	<div class="membership-type-selector">
		<div class="type-buttons">
			<button 
				class="type-btn" 
				class:active={membershipType === 'group_class'}
				on:click={() => switchMembershipType('group_class')}
			>
				<span class="type-icon">🎯</span>
				<span class="type-label">Group Classes</span>
				<span class="type-count">{groupMemberships.length}</span>
			</button>
			<button 
				class="type-btn" 
				class:active={membershipType === 'personal_training'}
				on:click={() => switchMembershipType('personal_training')}
			>
				<span class="type-icon">🏋️</span>
				<span class="type-label">Personal Training</span>
				<span class="type-count">{ptMemberships.length}</span>
			</button>
		</div>
	</div>
	
	<div class="membership-content">
		<div class="membership-list card">
			<div class="header">
				<h2>
					<span class="section-icon">{membershipType === 'group_class' ? '🎯' : '🏋️'}</span>
					{membershipType === 'group_class' ? 'Group Class' : 'Personal Training'} Memberships
				</h2>
			</div>
			
			<div class="search-container">
				<div class="search-input-wrapper">
					<span class="search-icon">🔍</span>
					<input
						type="text"
						class="search-input"
						placeholder="Search memberships..."
						bind:value={searchTerm}
					/>
				</div>
			</div>
			
			<div class="list-container">
				{#each filteredMemberships as membership (membership.id)}
					<div class="membership-item">
						<div class="membership-info">
							<h3>{membership.member_name}</h3>
							{#if membershipType === 'group_class'}
								<p class="plan-name">{membership.plan_name}</p>
								<div class="membership-details">
									<span class="detail">📅 {formatDate(membership.start_date)} - {formatDate(membership.end_date)}</span>
									<span class="detail">💰 {formatCurrency(membership.amount_paid)}</span>
									<span class="detail membership-type-badge">{membership.membership_type}</span>
								</div>
							{:else}
								<div class="membership-details">
									<span class="detail">🎯 {membership.sessions_remaining || 0} / {membership.sessions_total || 0} sessions</span>
									<span class="detail">💰 {formatCurrency(membership.amount_paid)}</span>
									<span class="detail">📅 {formatDate(membership.purchase_date)}</span>
								</div>
							{/if}
						</div>
						<div class="membership-actions">
							<span class="status" 
								class:active={membership.status === 'Active'} 
								class:inactive={membership.status === 'Inactive'}
								class:deleted={membership.status === 'Deleted'}>
								{membership.status || 'Active'}
							</span>
							<button class="btn btn-danger" on:click={() => deleteMembership(membership, membershipType)}>
								<span>🗑️</span>
								Delete
							</button>
						</div>
					</div>
				{/each}
				
				{#if filteredMemberships.length === 0 && currentMemberships.length > 0}
					<div class="empty-state">
						<span class="empty-icon">🔍</span>
						<p>No memberships found matching your search.</p>
					</div>
				{:else if currentMemberships.length === 0}
					<div class="empty-state">
						<span class="empty-icon">{membershipType === 'group_class' ? '🎯' : '🏋️'}</span>
						<p>No {membershipType === 'group_class' ? 'group class' : 'personal training'} memberships found.</p>
					</div>
				{/if}
			</div>
		</div>
		
		<div class="membership-form card">
			<div class="header">
				<h2>
					<span class="section-icon">➕</span>
					New {membershipType === 'group_class' ? 'Group Class' : 'Personal Training'} Membership
				</h2>
			</div>
			
			<form 
				method="post" 
				action={membershipType === 'group_class' ? '?/createGC' : '?/createPT'}
				use:enhance={submitForm} 
				class="membership-form-content"
				novalidate
			>
				<!-- Hidden form fields for selected member and plan -->
				<input type="hidden" name="member_id" value={selectedMember?.id || ''} />
				{#if membershipType === 'group_class'}
					<input type="hidden" name="plan_id" value={selectedPlan?.id || ''} />
				{/if}
				<div class="form-section">
					<h3>
						<span class="section-icon">👤</span>
						Select Member
					</h3>
					{#if formErrors.member}
						<div class="error-message">{formErrors.member}</div>
					{/if}
					<div class="member-grid">
						{#each members.filter(m => m.status === 'Active') as member}
							<button
								type="button"
								class="member-card"
								class:selected={selectedMember?.id === member.id}
								on:click={() => selectMember(member)}
							>
								<div class="member-info">
									<h4>{member.name}</h4>
									<p>{member.phone}</p>
								</div>
							</button>
						{:else}
							<div class="empty-state">
								<p>No active members available. Please add members first.</p>
							</div>
						{/each}
					</div>
				</div>
				
				{#if membershipType === 'group_class'}
					<div class="form-section">
						<h3>
							<span class="section-icon">💪</span>
							Select Plan
						</h3>
						{#if formErrors.plan}
							<div class="error-message">{formErrors.plan}</div>
						{/if}
						<div class="plan-grid">
							{#each plans.filter(p => p.status === 'Active') as plan}
								<button
									type="button"
									class="plan-card"
									class:selected={selectedPlan?.id === plan.id}
									on:click={() => selectPlan(plan)}
								>
									<div class="plan-info">
										<h4>{plan.name}</h4>
										<p>{plan.duration_days} days - {formatCurrency(plan.default_amount)}</p>
									</div>
								</button>
							{:else}
								<div class="empty-state">
									<p>No active plans available. Please add plans first.</p>
								</div>
							{/each}
						</div>
					</div>
				{/if}
				
				<div class="form-section">
					<h3>
						<span class="section-icon">📝</span>
						Membership Details
					</h3>
					
					{#if membershipType === 'group_class'}
						<div class="form-group">
							<label for="start_date">Start Date *</label>
							<input 
								type="date" 
								id="start_date" 
								name="start_date"
								class="form-control"
								class:error={formErrors.start_date}
								bind:value={gcFormData.start_date}
								on:input={() => {
									if (formErrors.start_date) {
										formErrors = { ...formErrors, start_date: '' };
									}
								}}
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
									bind:value={gcFormData.amount_paid}
									placeholder="0.00"
									on:input={() => {
										if (formErrors.amount_paid) {
											formErrors = { ...formErrors, amount_paid: '' };
										}
									}}
								/>
							</div>
							{#if formErrors.amount_paid}
								<span class="error-message">{formErrors.amount_paid}</span>
							{/if}
						</div>
						
						<div class="form-group">
							<label for="membership_type">Membership Type</label>
							<select id="membership_type" name="membership_type" class="form-control" bind:value={gcFormData.membership_type}>
								<option value="New">New</option>
								<option value="Renewal">Renewal</option>
							</select>
						</div>
					{:else}
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
								on:input={() => {
									if (formErrors.sessions_total) {
										formErrors = { ...formErrors, sessions_total: '' };
									}
								}}
							/>
							{#if formErrors.sessions_total}
								<span class="error-message">{formErrors.sessions_total}</span>
							{/if}
						</div>
						
						<div class="form-group">
							<label for="pt_amount_paid">Amount Paid *</label>
							<div class="input-group">
								<span class="input-prefix">₹</span>
								<input 
									type="number" 
									id="pt_amount_paid" 
									name="amount_paid"
									class="form-control"
									class:error={formErrors.amount_paid}
									bind:value={ptFormData.amount_paid}
									placeholder="0.00"
									on:input={() => {
										if (formErrors.amount_paid) {
											formErrors = { ...formErrors, amount_paid: '' };
										}
									}}
								/>
							</div>
							{#if formErrors.amount_paid}
								<span class="error-message">{formErrors.amount_paid}</span>
							{/if}
						</div>
					{/if}
				</div>
				
				<div class="form-actions">
					<button 
						type="submit" 
						class="btn btn-primary" 
						disabled={isLoading || !selectedMember || (membershipType === 'group_class' && !selectedPlan)}
					>
						{#if isLoading}
							<span class="loading-spinner"></span>
							Creating...
						{:else}
							<span>➕</span>
							Create Membership
						{/if}
					</button>
					<button type="button" class="btn btn-secondary" on:click={resetForm}>
						<span>🔄</span>
						Reset Form
					</button>
				</div>
			</form>
		</div>
	</div>
</div>

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
	
	.type-buttons {
		display: flex;
		gap: 1rem;
		justify-content: center;
	}
	
	.type-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 1.5rem 2rem;
		border: 2px solid var(--border);
		border-radius: 12px;
		background: var(--gradient-dark);
		color: var(--text-muted);
		cursor: pointer;
		transition: var(--transition-medium);
		position: relative;
		overflow: hidden;
		min-width: 200px;
	}
	
	.type-btn::before {
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
	
	.type-btn:hover::before,
	.type-btn.active::before {
		opacity: 1;
	}
	
	.type-btn:hover,
	.type-btn.active {
		border-color: var(--primary);
		color: var(--text);
		box-shadow: var(--shadow-glow);
		transform: translateY(-2px);
	}
	
	.type-icon {
		font-size: 2rem;
		filter: drop-shadow(0 0 10px currentColor);
	}
	
	.type-label {
		font-weight: 600;
		font-size: 1.1rem;
	}
	
	.type-count {
		background: var(--primary);
		color: white;
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		font-size: 0.9rem;
		font-weight: 600;
		box-shadow: 0 0 10px rgba(243, 148, 7, 0.3);
	}
	
	.membership-content {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2rem;
		flex: 1;
	}
	
	.membership-list, .membership-form {
		display: flex;
		flex-direction: column;
		height: fit-content;
		max-height: calc(100vh - 250px);
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
	
	.section-icon {
		font-size: 1.3rem;
		filter: drop-shadow(0 0 10px var(--primary));
	}
	
	.search-container {
		padding: 1rem 1.5rem;
		border-bottom: 1px solid var(--border);
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
	
	.membership-form {
		padding: 0;
	}
	
	.membership-form-content {
		padding: 1.5rem;
		flex: 1;
		overflow-y: auto;
	}
	
	.form-section {
		margin-bottom: 2rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid var(--border);
	}
	
	.form-section:last-of-type {
		border-bottom: none;
		margin-bottom: 0;
	}
	
	.form-section h3 {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0 0 1rem 0;
		color: var(--text);
		font-size: 1.1rem;
		font-weight: 600;
	}
	
	.member-grid, .plan-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 0.75rem;
	}
	
	.member-card, .plan-card {
		display: flex;
		flex-direction: column;
		padding: 1rem;
		border: 2px solid var(--border);
		border-radius: 8px;
		background: var(--gradient-dark);
		color: var(--text);
		cursor: pointer;
		transition: var(--transition-fast);
		text-align: left;
	}
	
	.member-card:hover, .plan-card:hover {
		border-color: var(--primary);
		box-shadow: 0 0 15px rgba(243, 148, 7, 0.2);
	}
	
	.member-card.selected, .plan-card.selected {
		border-color: var(--primary);
		background: var(--gradient-glow);
		box-shadow: var(--shadow-glow);
	}
	
	.member-info h4, .plan-info h4 {
		margin: 0 0 0.25rem 0;
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--text);
	}
	
	.member-info p, .plan-info p {
		margin: 0;
		font-size: 0.85rem;
		color: var(--text-muted);
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
	
	@media (max-width: 1024px) {
		.membership-content {
			grid-template-columns: 1fr;
			gap: 1.5rem;
		}
		
		.type-buttons {
			flex-direction: column;
			align-items: center;
		}
		
		.type-btn {
			width: 100%;
			max-width: 300px;
		}
		
		.membership-list, .membership-form {
			max-height: none;
		}
		
		.list-container {
			max-height: 400px;
		}
	}
	
	@media (max-width: 640px) {
		.membership-item {
			flex-direction: column;
			align-items: flex-start;
			gap: 1rem;
		}
		
		.membership-actions {
			flex-direction: row;
			align-items: center;
			width: 100%;
			justify-content: space-between;
		}
		
		.membership-details {
			flex-direction: column;
			gap: 0.5rem;
		}
		
		.member-grid, .plan-grid {
			grid-template-columns: 1fr;
		}
		
		.form-actions {
			flex-direction: column;
		}
	}
</style>