<script>
	import Modal from './Modal.svelte';
	import { onMount } from 'svelte';

	export let show = false;
	export let member = null;

	let membershipHistory = [];
	let loading = true;
	let renewalsCount = 0;

	$: if (show && member) {
		loadMembershipHistory();
	}

	async function loadMembershipHistory() {
		if (!member?.id) return;
		
		loading = true;
		try {
			const response = await fetch(`/api/members/${member.id}/memberships`);
			if (response.ok) {
				const data = await response.json();
				membershipHistory = data.memberships || [];
				renewalsCount = membershipHistory.filter(m => m.membership_type === 'Renewal').length;
			} else {
				membershipHistory = [];
				renewalsCount = 0;
			}
		} catch (error) {
			console.error('Error loading membership history:', error);
			membershipHistory = [];
			renewalsCount = 0;
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
				<div class="history-list">
					{#each membershipHistory as membership}
						<div class="history-item">
							<div class="history-header">
								<span class="plan-name">{membership.plan_name || 'Unknown Plan'}</span>
								<span class="membership-type {membership.membership_type?.toLowerCase() || 'new'}">{membership.membership_type || 'New'}</span>
							</div>
							<div class="history-details">
								<div class="detail-row">
									<span class="detail-label">Duration:</span>
									<span class="detail-value">{formatDate(membership.start_date)} - {formatDate(membership.end_date)}</span>
								</div>
								<div class="detail-row">
									<span class="detail-label">Amount:</span>
									<span class="detail-value">{formatCurrency(membership.amount_paid)}</span>
								</div>
								<div class="detail-row">
									<span class="detail-label">Purchase Date:</span>
									<span class="detail-value">{formatDate(membership.purchase_date)}</span>
								</div>
								<div class="detail-row">
									<span class="detail-label">Status:</span>
									<span class="status-badge {membership.status?.toLowerCase() || 'inactive'}">{membership.status || 'Inactive'}</span>
								</div>
							</div>
						</div>
					{/each}
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

	.history-list {
		max-height: 400px;
		overflow-y: auto;
	}

	.history-item {
		padding: 1rem;
		margin-bottom: 0.75rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 8px;
		transition: var(--transition-fast);
	}

	.history-item:hover {
		background: var(--gradient-glow);
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(243, 148, 7, 0.2);
	}

	.history-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
	}

	.plan-name {
		font-weight: 600;
		color: var(--text);
		font-size: 1rem;
	}

	.membership-type {
		padding: 0.25rem 0.5rem;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.membership-type.new {
		background: rgba(34, 197, 94, 0.2);
		color: var(--success);
		border: 1px solid var(--success);
	}

	.membership-type.renewal {
		background: rgba(59, 130, 246, 0.2);
		color: #3b82f6;
		border: 1px solid #3b82f6;
	}

	.history-details {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 0.5rem;
	}

	.detail-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.detail-label {
		font-size: 0.85rem;
		color: var(--text-muted);
		font-weight: 500;
	}

	.detail-value {
		font-size: 0.85rem;
		color: var(--text);
		font-weight: 500;
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

		.history-details {
			grid-template-columns: 1fr;
		}

		.detail-row {
			justify-content: flex-start;
			gap: 1rem;
		}
	}
</style>