<script>
	import Modal from './Modal.svelte';

	export let show = false;
	export let member = null;
	
	let membershipHistory = [];
	let loading = false;
	let renewalsCount = 0;
	let totalAmountPaid = 0;

	$: {
		if (show && member && member.id) {
			loadMembershipHistory();
		} else if (!show) {
			// Reset data when modal is closed
			membershipHistory = [];
			renewalsCount = 0;
			totalAmountPaid = 0;
			loading = false;
		}
	}

	async function loadMembershipHistory() {
		if (!member?.id) {
			return;
		}
		
		loading = true;
		membershipHistory = [];
		renewalsCount = 0;
		totalAmountPaid = 0;
		
		try {
			const response = await fetch(`/api/members/${member.id}/memberships`);
			
			if (response.ok) {
				const data = await response.json();
				
				if (data.memberships && Array.isArray(data.memberships)) {
					membershipHistory = data.memberships;
					renewalsCount = membershipHistory.filter(m => m.membership_type === 'Renewal').length;
					totalAmountPaid = membershipHistory.reduce((sum, m) => sum + (m.amount_paid || 0), 0);
				} else {
					membershipHistory = [];
				}
			} else {
				membershipHistory = [];
				renewalsCount = 0;
				totalAmountPaid = 0;
			}
		} catch (error) {
			membershipHistory = [];
			renewalsCount = 0;
			totalAmountPaid = 0;
		}
		
		loading = false;
	}

	function formatDate(dateStr) {
		if (!dateStr) return '-';
		return new Date(dateStr).toLocaleDateString('en-IN');
	}

	function formatCurrency(amount) {
		if (!amount) return '₹0';
		return new Intl.NumberFormat('en-IN', {
			style: 'currency',
			currency: 'INR'
		}).format(amount);
	}
</script>

<Modal bind:show title="Member Details" on:close>
	{#if member}
		<!-- Member Header Info -->
		<div class="member-header">
			<h3>{member.name}</h3>
			<div class="member-info">
				<div class="info-item">
					<span class="label">Phone:</span>
					<span class="value">{member.phone}</span>
				</div>
				<div class="info-item">
					<span class="label">Email:</span>
					<span class="value">{member.email || 'Not provided'}</span>
				</div>
				<div class="info-item">
					<span class="label">Join Date:</span>
					<span class="value">{formatDate(member.join_date)}</span>
				</div>
				<div class="info-item">
					<span class="label">Status:</span>
					<span class="status-badge {member.status?.toLowerCase() || 'inactive'}">{member.status || 'Inactive'}</span>
				</div>
			</div>
		</div>

		<!-- Renewals Summary -->
		<div class="renewals-summary">
			<h4>📊 Membership Summary</h4>
			<div class="summary-stats">
				<div class="stat-item">
					<span class="stat-value">{formatCurrency(totalAmountPaid)}</span>
					<span class="stat-label">Total Amount Paid</span>
				</div>
				<div class="stat-item">
					<span class="stat-value">{membershipHistory.length}</span>
					<span class="stat-label">Total Memberships</span>
				</div>
				<div class="stat-item">
					<span class="stat-value">{renewalsCount}</span>
					<span class="stat-label">Renewals</span>
				</div>
			</div>
		</div>

		<!-- Membership History -->
		<div class="membership-history">
			<h4>📋 Membership History</h4>
			
			{#if loading}
				<div class="loading-state">
					<div class="loading-spinner"></div>
					<p>Loading membership history...</p>
				</div>
			{:else if membershipHistory.length === 0}
				<div class="empty-state">
					<div class="empty-icon">📝</div>
					<h5>No memberships yet</h5>
					<p>This member hasn't purchased any memberships yet.</p>
				</div>
			{:else}
				<div class="history-table-container">
					<table class="history-table">
						<thead>
							<tr>
								<th>Plan Name</th>
								<th>Type</th>
								<th>Duration</th>
								<th>Start Date</th>
								<th>End Date</th>
								<th>Amount Paid</th>
								<th>Status</th>
							</tr>
						</thead>
						<tbody>
							{#each membershipHistory as membership}
								<tr class="history-row">
									<td class="plan-name">{membership?.plan_name || 'Unknown Plan'}</td>
									<td>
										{#if membership?.type && typeof membership.type === 'string'}
											<span class="membership-type {membership.type.toLowerCase().replace(' ', '-')}">
												{membership.type}
											</span>
										{:else}
											<span class="membership-type group-class">
												Group Class
											</span>
										{/if}
									</td>
									<td>
										{#if membership?.duration_days}
											{membership.duration_days} days
										{:else if membership?.sessions_total}
											{membership.sessions_total} sessions
										{:else}
											-
										{/if}
									</td>
									<td>{formatDate(membership?.start_date)}</td>
									<td>{formatDate(membership?.end_date)}</td>
									<td class="amount">{formatCurrency(membership?.amount_paid)}</td>
									<td>
										{#if membership?.status && typeof membership.status === 'string'}
											<span class="status-badge {membership.status.toLowerCase()}">
												{membership.status}
											</span>
										{:else}
											<span class="status-badge inactive">
												Inactive
											</span>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	{/if}
</Modal>

<style>
	.member-header {
		margin-bottom: 1.5rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--border);
	}

	.member-header h3 {
		margin: 0 0 1rem 0;
		font-size: 1.5rem;
		color: var(--text);
		background: var(--gradient-primary);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.member-info {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 0.75rem;
	}

	.info-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.label {
		font-weight: 600;
		color: var(--text-muted);
		min-width: 70px;
	}

	.value {
		color: var(--text);
	}

	.renewals-summary {
		margin-bottom: 1.5rem;
		padding: 1rem;
		background: var(--gradient-glow);
		border-radius: 8px;
		border: 1px solid var(--border);
	}

	.renewals-summary h4 {
		margin: 0 0 1rem 0;
		font-size: 1.1rem;
		color: var(--text);
	}

	.summary-stats {
		display: flex;
		gap: 2rem;
	}

	.stat-item {
		text-align: center;
	}

	.stat-value {
		display: block;
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--primary);
	}

	.stat-label {
		display: block;
		font-size: 0.8rem;
		color: var(--text-muted);
		margin-top: 0.25rem;
	}

	.membership-history h4 {
		margin: 0 0 1rem 0;
		font-size: 1.1rem;
		color: var(--text);
	}

	.loading-state {
		text-align: center;
		padding: 2rem;
		color: var(--text-muted);
	}

	.loading-spinner {
		width: 24px;
		height: 24px;
		border: 2px solid transparent;
		border-top: 2px solid var(--primary);
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin: 0 auto 1rem;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.empty-state {
		text-align: center;
		padding: 2rem;
		color: var(--text-muted);
	}

	.empty-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
		opacity: 0.5;
	}

	.empty-state h5 {
		margin: 0 0 0.5rem 0;
		color: var(--text);
	}

	.history-table-container {
		max-height: 400px;
		overflow-y: auto;
		border: 1px solid var(--border);
		border-radius: 8px;
	}

	.history-table {
		width: 100%;
		border-collapse: collapse;
		background: var(--surface);
	}

	.history-table th {
		background: var(--surface-light);
		padding: 0.75rem;
		text-align: left;
		font-weight: 600;
		color: var(--text);
		border-bottom: 2px solid var(--primary);
		position: sticky;
		top: 0;
		z-index: 10;
		font-size: 0.85rem;
	}

	.history-table td {
		padding: 0.75rem;
		border-bottom: 1px solid var(--border);
		color: var(--text);
		font-size: 0.85rem;
	}

	.history-row:hover {
		background: var(--gradient-glow);
	}

	.plan-name {
		font-weight: 600;
		color: var(--text);
	}

	.amount {
		font-weight: 600;
		color: var(--primary);
	}

	.membership-type {
		padding: 0.25rem 0.5rem;
		border-radius: 12px;
		font-size: 0.7rem;
		font-weight: 500;
		white-space: nowrap;
	}

	.membership-type.group-class {
		background: rgba(34, 197, 94, 0.2);
		color: var(--success);
		border: 1px solid var(--success);
	}

	.membership-type.personal-training {
		background: rgba(59, 130, 246, 0.2);
		color: #3b82f6;
		border: 1px solid #3b82f6;
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

	.status-badge.deleted {
		background: rgba(156, 163, 175, 0.2);
		color: #9ca3af;
		border: 1px solid #9ca3af;
	}

	@media (max-width: 768px) {
		.member-info {
			grid-template-columns: 1fr;
		}

		.summary-stats {
			flex-direction: column;
			gap: 1rem;
		}

		.history-table-container {
			overflow-x: auto;
		}

		.history-table {
			min-width: 600px;
		}

		.history-table th,
		.history-table td {
			padding: 0.5rem;
			font-size: 0.8rem;
		}
	}
</style>