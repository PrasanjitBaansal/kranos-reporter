<script>
	export let data;

	$: member = data.member || {};
	$: groupMemberships = data.groupMemberships || [];
	$: ptMemberships = data.ptMemberships || [];
	$: memberRenewals = data.memberRenewals || [];
	$: isActive = data.isActive || false;
	$: activeMemberships = data.activeMemberships || 0;

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

	function getStatusColor(status) {
		switch (status) {
			case 'Active':
				return 'var(--success)';
			case 'Inactive':
				return 'var(--error)';
			case 'New':
				return '#3b82f6';
			default:
				return 'var(--text-muted)';
		}
	}

	function getMembershipStatus(membership) {
		const today = new Date().toISOString().split('T')[0];
		if (membership.status === 'Active' && today >= membership.start_date && today <= membership.end_date) {
			return 'Current';
		} else if (membership.status === 'Active' && today < membership.start_date) {
			return 'Upcoming';
		} else {
			return 'Expired';
		}
	}

	function getDaysUntilExpiry(endDate) {
		const today = new Date();
		const expiry = new Date(endDate);
		const diffTime = expiry - today;
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		return diffDays;
	}
</script>

<svelte:head>
	<title>My Profile - Kranos Gym</title>
</svelte:head>

<div class="profile-page">
	<div class="page-header">
		<div class="header-content">
			<h1 class="page-title animate-slide-up">
				My Profile
			</h1>
			<p class="page-subtitle animate-slide-up">View your membership details and history</p>
		</div>
	</div>

	{#if data.error}
		<div class="error-banner">
			<span class="error-icon">⚠️</span>
			<span>{data.error}</span>
		</div>
	{:else if member}
		<div class="profile-content">
			<!-- Member Information Card -->
			<div class="card animate-slide-up">
				<div class="card-header">
					<h2>
						<span class="section-icon">👤</span>
						Personal Information
					</h2>
					<div class="status-indicator" style="background-color: {getStatusColor(member.status)}">
						{member.status}
					</div>
				</div>
				<div class="card-content">
					<div class="info-grid">
						<div class="info-item">
							<label>Full Name</label>
							<span>{member.name}</span>
						</div>
						<div class="info-item">
							<label>Phone Number</label>
							<span>{member.phone}</span>
						</div>
						<div class="info-item">
							<label>Email</label>
							<span>{member.email || 'Not provided'}</span>
						</div>
						<div class="info-item">
							<label>Member Since</label>
							<span>{formatDateForDisplay(member.join_date)}</span>
						</div>
					</div>
				</div>
			</div>

			<!-- Membership Status Card -->
			<div class="card animate-slide-up">
				<div class="card-header">
					<h2>
						<span class="section-icon">📊</span>
						Membership Status
					</h2>
				</div>
				<div class="card-content">
					<div class="status-grid">
						<div class="status-card {isActive ? 'active' : 'inactive'}">
							<div class="status-number">{activeMemberships}</div>
							<div class="status-label">Active Memberships</div>
						</div>
						<div class="status-card">
							<div class="status-number">{groupMemberships.length}</div>
							<div class="status-label">Total Group Memberships</div>
						</div>
						<div class="status-card">
							<div class="status-number">{ptMemberships.length}</div>
							<div class="status-label">PT Sessions Purchased</div>
						</div>
						<div class="status-card {memberRenewals.length > 0 ? 'warning' : ''}">
							<div class="status-number">{memberRenewals.length}</div>
							<div class="status-label">Upcoming Renewals</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Group Class Memberships -->
			{#if groupMemberships.length > 0}
				<div class="card animate-slide-up">
					<div class="card-header">
						<h2>
							<span class="section-icon">🏃‍♂️</span>
							Group Class Memberships
						</h2>
					</div>
					<div class="card-content">
						<div class="memberships-table-container">
							<table class="memberships-table">
								<thead>
									<tr>
										<th>Plan</th>
										<th>Start Date</th>
										<th>End Date</th>
										<th>Amount Paid</th>
										<th>Type</th>
										<th>Status</th>
									</tr>
								</thead>
								<tbody>
									{#each groupMemberships as membership}
										<tr>
											<td class="plan-name">{membership.plan_name}</td>
											<td>{formatDateForDisplay(membership.start_date)}</td>
											<td>{formatDateForDisplay(membership.end_date)}</td>
											<td class="amount">₹{membership.amount_paid?.toLocaleString()}</td>
											<td>
												<span class="membership-type-badge {membership.membership_type?.toLowerCase()}">
													{membership.membership_type}
												</span>
											</td>
											<td>
												<span class="status-badge {getMembershipStatus(membership).toLowerCase()}">
													{getMembershipStatus(membership)}
													{#if getMembershipStatus(membership) === 'Current'}
														{#if getDaysUntilExpiry(membership.end_date) <= 7}
															<small>(Expires in {getDaysUntilExpiry(membership.end_date)} days)</small>
														{/if}
													{/if}
												</span>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			{/if}

			<!-- Personal Training Sessions -->
			{#if ptMemberships.length > 0}
				<div class="card animate-slide-up">
					<div class="card-header">
						<h2>
							<span class="section-icon">💪</span>
							Personal Training Sessions
						</h2>
					</div>
					<div class="card-content">
						<div class="memberships-table-container">
							<table class="memberships-table">
								<thead>
									<tr>
										<th>Purchase Date</th>
										<th>Total Sessions</th>
										<th>Remaining Sessions</th>
										<th>Amount Paid</th>
										<th>Utilization</th>
									</tr>
								</thead>
								<tbody>
									{#each ptMemberships as ptMembership}
										<tr>
											<td>{formatDateForDisplay(ptMembership.purchase_date)}</td>
											<td>{ptMembership.sessions_total}</td>
											<td class="sessions-remaining">{ptMembership.sessions_remaining}</td>
											<td class="amount">₹{ptMembership.amount_paid?.toLocaleString()}</td>
											<td>
												<div class="progress-container">
													<div class="progress-bar">
														<div 
															class="progress-fill" 
															style="width: {((ptMembership.sessions_total - ptMembership.sessions_remaining) / ptMembership.sessions_total) * 100}%"
														></div>
													</div>
													<span class="progress-text">
														{Math.round(((ptMembership.sessions_total - ptMembership.sessions_remaining) / ptMembership.sessions_total) * 100)}%
													</span>
												</div>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			{/if}

			<!-- Upcoming Renewals -->
			{#if memberRenewals.length > 0}
				<div class="card animate-slide-up">
					<div class="card-header">
						<h2>
							<span class="section-icon">⏰</span>
							Upcoming Renewals
						</h2>
					</div>
					<div class="card-content">
						<div class="renewals-list">
							{#each memberRenewals as renewal}
								<div class="renewal-item">
									<div class="renewal-info">
										<h3>{renewal.plan_name}</h3>
										<p>Expires on {formatDateForDisplay(renewal.end_date)}</p>
										<small>
											{#if getDaysUntilExpiry(renewal.end_date) <= 0}
												<span class="expired">Expired</span>
											{:else if getDaysUntilExpiry(renewal.end_date) <= 7}
												<span class="critical">{getDaysUntilExpiry(renewal.end_date)} days remaining</span>
											{:else}
												<span class="warning">{getDaysUntilExpiry(renewal.end_date)} days remaining</span>
											{/if}
										</small>
									</div>
									<div class="renewal-action">
										<span class="amount">₹{renewal.amount_paid?.toLocaleString()}</span>
									</div>
								</div>
							{/each}
						</div>
					</div>
				</div>
			{/if}

			<!-- Empty State -->
			{#if groupMemberships.length === 0 && ptMemberships.length === 0}
				<div class="card animate-slide-up">
					<div class="card-content">
						<div class="empty-state">
							<div class="empty-icon">🏋️‍♂️</div>
							<h3>No Membership History</h3>
							<p>You haven't purchased any memberships yet. Contact the gym to get started!</p>
						</div>
					</div>
				</div>
			{/if}
		</div>
	{:else}
		<div class="error-banner">
			<span class="error-icon">❌</span>
			<span>Unable to load profile information. Please contact the gym administration.</span>
		</div>
	{/if}
</div>

<style>
	.profile-page {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem 1rem;
	}

	.page-header {
		margin-bottom: 3rem;
		text-align: center;
	}

	.page-title {
		font-size: 2.5rem;
		font-weight: 700;
		margin-bottom: 0.5rem;
		background: var(--gradient-primary);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.page-subtitle {
		color: var(--text-muted);
		font-size: 1.1rem;
	}

	.profile-content {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.card {
		background: var(--surface);
		border-radius: var(--radius-lg);
		padding: 1.5rem;
		box-shadow: var(--shadow-lg);
		border: 1px solid var(--border);
	}

	.card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1.5rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--border);
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

	.status-indicator {
		padding: 0.5rem 1rem;
		border-radius: 20px;
		color: white;
		font-weight: 600;
		font-size: 0.9rem;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.info-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1.5rem;
	}

	.info-item {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.info-item label {
		font-weight: 600;
		color: var(--text-muted);
		font-size: 0.9rem;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.info-item span {
		font-size: 1.1rem;
		color: var(--text);
	}

	.status-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1.5rem;
	}

	.status-card {
		background: var(--bg-secondary);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		padding: 1.5rem;
		text-align: center;
		transition: var(--transition-fast);
	}

	.status-card.active {
		background: rgba(74, 222, 128, 0.1);
		border-color: var(--success);
	}

	.status-card.inactive {
		background: rgba(239, 68, 68, 0.1);
		border-color: var(--error);
	}

	.status-card.warning {
		background: rgba(251, 191, 36, 0.1);
		border-color: #f59e0b;
	}

	.status-number {
		font-size: 2.5rem;
		font-weight: 700;
		color: var(--primary);
		margin-bottom: 0.5rem;
	}

	.status-label {
		font-weight: 600;
		color: var(--text-muted);
		font-size: 0.9rem;
	}

	.memberships-table-container {
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
		border-radius: var(--radius-md);
	}

	.memberships-table {
		width: 100%;
		border-collapse: collapse;
		min-width: 700px;
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
		font-size: 0.9rem;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.plan-name {
		font-weight: 600;
		color: var(--primary);
	}

	.amount {
		font-weight: 600;
		color: var(--success);
		font-family: monospace;
	}

	.sessions-remaining {
		font-weight: 600;
		color: var(--primary);
	}

	.membership-type-badge,
	.status-badge {
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		white-space: nowrap;
	}

	.membership-type-badge.new {
		background: rgba(59, 130, 246, 0.2);
		color: #3b82f6;
		border: 1px solid #3b82f6;
	}

	.membership-type-badge.renewal {
		background: rgba(168, 85, 247, 0.2);
		color: #a855f7;
		border: 1px solid #a855f7;
	}

	.status-badge.current {
		background: rgba(74, 222, 128, 0.2);
		color: var(--success);
		border: 1px solid var(--success);
	}

	.status-badge.upcoming {
		background: rgba(59, 130, 246, 0.2);
		color: #3b82f6;
		border: 1px solid #3b82f6;
	}

	.status-badge.expired {
		background: rgba(239, 68, 68, 0.2);
		color: var(--error);
		border: 1px solid var(--error);
	}

	.progress-container {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.progress-bar {
		flex: 1;
		height: 8px;
		background: var(--bg-secondary);
		border-radius: 4px;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: var(--primary);
		transition: width 0.3s ease;
	}

	.progress-text {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--text-muted);
		min-width: 40px;
	}

	.renewals-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.renewal-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem;
		background: var(--bg-secondary);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		transition: var(--transition-fast);
	}

	.renewal-item:hover {
		border-color: var(--primary);
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(243, 148, 7, 0.15);
	}

	.renewal-info h3 {
		margin: 0 0 0.5rem 0;
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--text);
	}

	.renewal-info p {
		margin: 0 0 0.25rem 0;
		color: var(--text-muted);
		font-size: 0.9rem;
	}

	.renewal-info small {
		font-size: 0.8rem;
		font-weight: 600;
	}

	.renewal-info .critical {
		color: var(--error);
	}

	.renewal-info .warning {
		color: #f59e0b;
	}

	.renewal-info .expired {
		color: var(--error);
	}

	.renewal-action .amount {
		font-size: 1.1rem;
		font-weight: 700;
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

	.error-banner {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid var(--error);
		border-radius: var(--radius-md);
		color: var(--error);
		font-weight: 600;
		margin-bottom: 2rem;
	}

	.error-icon {
		font-size: 1.25rem;
	}

	@media (max-width: 768px) {
		.profile-page {
			padding: 1rem 0.5rem;
		}

		.page-title {
			font-size: 2rem;
		}

		.page-subtitle {
			font-size: 1rem;
		}

		.card {
			padding: 1rem;
		}

		.card-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 1rem;
		}

		.info-grid {
			grid-template-columns: 1fr;
			gap: 1rem;
		}

		.status-grid {
			grid-template-columns: repeat(2, 1fr);
			gap: 1rem;
		}

		.status-card {
			padding: 1rem;
		}

		.status-number {
			font-size: 2rem;
		}

		.memberships-table th,
		.memberships-table td {
			padding: 0.75rem 0.5rem;
			font-size: 0.9rem;
		}

		.renewal-item {
			flex-direction: column;
			align-items: flex-start;
			gap: 1rem;
		}

		.renewal-action {
			align-self: flex-end;
		}
	}

	@media (max-width: 480px) {
		.status-grid {
			grid-template-columns: 1fr;
		}

		.memberships-table {
			min-width: 600px;
		}

		.memberships-table th,
		.memberships-table td {
			padding: 0.5rem 0.25rem;
			font-size: 0.8rem;
		}
	}

	/* Animation classes */
	.animate-slide-up {
		animation: slideUp 0.6s ease-out forwards;
	}

	@keyframes slideUp {
		from {
			opacity: 0;
			transform: translateY(30px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>