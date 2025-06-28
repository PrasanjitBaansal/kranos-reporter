<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import PasswordModal from '$lib/components/PasswordModal.svelte';
	
	export let data;
	
	let stats = {
		totalMembers: 0,
		activeMembers: 0,
		monthlyRevenue: 0,
		expiringSoon: 0
	};
	
	let isLoading = true;
	let recentActivities = [];
	let showPasswordModal = false;
	
	onMount(async () => {
		await loadDashboardData();
		isLoading = false;
	});
	
	async function loadDashboardData() {
		try {
			// Calculate stats from actual data
			const activeMembers = data.members.filter(m => m.status === 'Active').length;
			const newMembers = data.members.filter(m => m.status === 'New').length;
			const totalMembers = data.members.length;
			
			// Calculate monthly revenue from current month memberships
			const now = new Date();
			const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
			
			const monthlyGCRevenue = data.groupClassMemberships
				.filter(gcm => gcm.purchase_date && gcm.purchase_date.startsWith(currentMonth))
				.reduce((sum, gcm) => sum + (gcm.amount_paid || 0), 0);
			
			const monthlyPTRevenue = data.ptMemberships
				.filter(pt => pt.purchase_date && pt.purchase_date.startsWith(currentMonth))
				.reduce((sum, pt) => sum + (pt.amount_paid || 0), 0);
			
			const monthlyRevenue = monthlyGCRevenue + monthlyPTRevenue;
			
			// Count expiring memberships (next 30 days)
			const thirtyDaysFromNow = new Date();
			thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
			const thirtyDaysStr = thirtyDaysFromNow.toISOString().split('T')[0];
			const todayStr = now.toISOString().split('T')[0];
			
			const expiringSoon = data.groupClassMemberships
				.filter(gcm => gcm.end_date && gcm.end_date >= todayStr && gcm.end_date <= thirtyDaysStr && gcm.status === 'Active')
				.length;
			
			stats = {
				totalMembers,
				activeMembers,
				newMembers,
				monthlyRevenue,
				expiringSoon
			};
			
			// Create recent activities from actual data
			recentActivities = [
				...data.groupClassMemberships
					.filter(gcm => gcm.purchase_date)
					.sort((a, b) => new Date(b.purchase_date) - new Date(a.purchase_date))
					.slice(0, 3)
					.map(gcm => ({
						type: gcm.membership_type === 'New' ? 'new_member' : 'renewal',
						name: gcm.member_name,
						timestamp: formatTimestamp(gcm.purchase_date),
						icon: gcm.membership_type === 'New' ? '👤' : '🔄'
					})),
				...data.ptMemberships
					.filter(pt => pt.purchase_date)
					.sort((a, b) => new Date(b.purchase_date) - new Date(a.purchase_date))
					.slice(0, 2)
					.map(pt => ({
						type: 'pt_booking',
						name: pt.member_name,
						amount: formatCurrency(pt.amount_paid),
						timestamp: formatTimestamp(pt.purchase_date),
						icon: '🎯'
					}))
			].slice(0, 5);
		} catch (error) {
			console.error('Failed to load dashboard data:', error);
		}
	}
	
	function formatTimestamp(dateStr) {
		const date = new Date(dateStr);
		const now = new Date();
		const diffTime = now - date;
		const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
		
		if (diffDays === 0) return 'Today';
		if (diffDays === 1) return '1 day ago';
		if (diffDays < 7) return `${diffDays} days ago`;
		if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
		return `${Math.floor(diffDays / 30)} months ago`;
	}
	
	function extractDate(timestamp) {
		// Simple extraction for sorting - this is approximate
		const now = new Date();
		if (timestamp === 'Today') return now;
		if (timestamp.includes('day ago')) {
			const days = parseInt(timestamp);
			return new Date(now - days * 24 * 60 * 60 * 1000);
		}
		return new Date(now - 7 * 24 * 60 * 60 * 1000); // Default to week ago
	}
	
	function formatCurrency(amount) {
		return new Intl.NumberFormat('en-IN', {
			style: 'currency',
			currency: 'INR'
		}).format(amount);
	}
	
	function handleAdminClick() {
		showPasswordModal = true;
	}
	
	function handlePasswordSuccess() {
		showPasswordModal = false;
		goto('/settings');
	}
	
	function handlePasswordClose() {
		showPasswordModal = false;
	}
</script>

<svelte:head>
	<title>Dashboard - Kranos Gym</title>
</svelte:head>

<div class="dashboard">
	<div class="dashboard-header">
		<h1 class="dashboard-title animate-slide-up">
			<span class="title-icon">📊</span>
			Dashboard
		</h1>
		<p class="dashboard-subtitle animate-slide-up">Welcome back! Here's what's happening at your gym.</p>
	</div>
	
	{#if isLoading}
		<div class="loading-container">
			<div class="loading-spinner animate-pulse"></div>
			<p>Loading dashboard...</p>
		</div>
	{:else}
		<div class="quick-actions card animate-slide-up">
			<div class="card-header">
				<h2>
					<span class="section-icon">⚡</span>
					Quick Actions
				</h2>
			</div>
			
			<div class="actions-grid-full">
				<a href="/members" class="action-item">
					<div class="action-icon">👥</div>
					<div class="action-content">
						<h4>Add Member</h4>
						<p>Register new member</p>
					</div>
				</a>
				
				<a href="/memberships" class="action-item">
					<div class="action-icon">🎯</div>
					<div class="action-content">
						<h4>New Membership</h4>
						<p>Create membership</p>
					</div>
				</a>
				
				<a href="/plans" class="action-item">
					<div class="action-icon">💪</div>
					<div class="action-content">
						<h4>Manage Plans</h4>
						<p>Edit gym plans</p>
					</div>
				</a>
				
				<a href="/reporting" class="action-item">
					<div class="action-icon">📈</div>
					<div class="action-content">
						<h4>View Reports</h4>
						<p>Analytics & insights</p>
					</div>
				</a>
			</div>
		</div>
		
		<div class="stats-grid animate-slide-up">
			<div class="stat-card total-members">
				<div class="stat-header">
					<span class="stat-icon">👥</span>
					<h3>Total Members</h3>
				</div>
				<div class="stat-value">{stats.totalMembers}</div>
				<div class="stat-trend positive">
					<span class="trend-icon">📈</span>
					+12 this month
				</div>
			</div>
			
			<div class="stat-card active-members">
				<div class="stat-header">
					<span class="stat-icon">✅</span>
					<h3>Active Members</h3>
				</div>
				<div class="stat-value">{stats.activeMembers}</div>
				<div class="stat-trend positive">
					<span class="trend-icon">📈</span>
					{Math.round((stats.activeMembers / stats.totalMembers) * 100)}% active
				</div>
			</div>
			
			<div class="stat-card new-members">
				<div class="stat-header">
					<span class="stat-icon">🆕</span>
					<h3>New Members</h3>
				</div>
				<div class="stat-value">{stats.newMembers}</div>
				<div class="stat-trend">
					<span class="trend-icon">👤</span>
					{stats.newMembers > 0 ? `${Math.round((stats.newMembers / stats.totalMembers) * 100)}% new` : 'No new members'}
				</div>
			</div>
			
			<div class="stat-card revenue">
				<div class="stat-header">
					<span class="stat-icon">💰</span>
					<h3>Monthly Revenue</h3>
				</div>
				<div class="stat-value">{formatCurrency(stats.monthlyRevenue)}</div>
				<div class="stat-trend positive">
					<span class="trend-icon">📈</span>
					+8.5% from last month
				</div>
			</div>
			
			<div class="stat-card expiring">
				<div class="stat-header">
					<span class="stat-icon">⏰</span>
					<h3>Expiring Soon</h3>
				</div>
				<div class="stat-value">{stats.expiringSoon}</div>
				<div class="stat-trend warning">
					<span class="trend-icon">⚠️</span>
					Need renewal
				</div>
			</div>
		</div>
		
		<div class="recent-activity card animate-slide-up">
			<div class="card-header">
				<h2>
					<span class="section-icon">📋</span>
					Recent Activity
				</h2>
			</div>
			
			<div class="activity-list">
				{#each recentActivities.slice(0, 5) as activity}
					<div class="activity-item">
						<div class="activity-icon">
							{activity.icon}
						</div>
						<div class="activity-content">
							<div class="activity-main">
								<span class="activity-name">{activity.name}</span>
								{#if activity.type === 'new_member'}
									joined the gym
								{:else if activity.type === 'renewal'}
									renewed membership
								{:else if activity.type === 'pt_booking'}
									booked PT sessions
									{#if activity.amount}
										<span class="highlight">{activity.amount}</span>
									{/if}
								{/if}
							</div>
							<div class="activity-time">{activity.timestamp}</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
		
		<!-- Admin Access Button -->
		<div class="admin-access animate-slide-up">
			<button 
				class="admin-button" 
				on:click={handleAdminClick}
				title="Access admin settings"
			>
				<span class="admin-icon">⚙️</span>
				<span class="admin-text">Admin</span>
			</button>
		</div>
	{/if}
</div>

<!-- Password Modal -->
<PasswordModal 
	bind:show={showPasswordModal} 
	on:success={handlePasswordSuccess}
	on:close={handlePasswordClose}
/>

<style>
	.dashboard {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem 1rem;
	}
	
	.dashboard-header {
		text-align: center;
		margin-bottom: 3rem;
	}
	
	.dashboard-title {
		font-size: 3rem;
		font-weight: 700;
		margin-bottom: 1rem;
		background: var(--gradient-primary);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1rem;
	}
	
	.title-icon {
		font-size: 3.5rem;
		filter: drop-shadow(0 0 20px var(--primary));
	}
	
	.dashboard-subtitle {
		font-size: 1.2rem;
		color: var(--text-muted);
		animation-delay: 0.2s;
	}
	
	.loading-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 4rem 2rem;
		color: var(--text-muted);
	}
	
	.loading-spinner {
		width: 50px;
		height: 50px;
		border: 3px solid var(--border);
		border-top: 3px solid var(--primary);
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 1rem;
		box-shadow: 0 0 20px rgba(243, 148, 7, 0.3);
	}
	
	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}
	
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 1.5rem;
		margin-bottom: 3rem;
		animation-delay: 0.3s;
	}
	
	.stat-card {
		background: var(--gradient-dark);
		border: 1px solid var(--border);
		border-radius: 16px;
		padding: 2rem;
		position: relative;
		overflow: hidden;
		transition: var(--transition-medium);
		backdrop-filter: blur(10px);
	}
	
	.stat-card::before {
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
	
	.stat-card:hover::before {
		opacity: 1;
	}
	
	.stat-card:hover {
		transform: translateY(-5px);
		box-shadow: var(--shadow-glow);
		border-color: var(--primary);
	}
	
	.stat-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}
	
	.stat-icon {
		font-size: 2rem;
		filter: drop-shadow(0 0 10px currentColor);
	}
	
	.stat-header h3 {
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--text-muted);
		margin: 0;
	}
	
	.stat-value {
		font-size: 2.5rem;
		font-weight: 700;
		color: var(--text);
		margin-bottom: 0.5rem;
		text-shadow: 0 0 10px rgba(243, 148, 7, 0.3);
	}
	
	.stat-trend {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.9rem;
		font-weight: 500;
	}
	
	.stat-trend.positive {
		color: var(--success);
	}
	
	.stat-trend.warning {
		color: var(--warning);
	}
	
	.trend-icon {
		font-size: 1rem;
	}
	
	.total-members .stat-icon { color: #3b82f6; }
	.active-members .stat-icon { color: var(--success); }
	.revenue .stat-icon { color: var(--primary); }
	.expiring .stat-icon { color: var(--warning); }
	
	.quick-actions {
		margin-bottom: 3rem;
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
	
	.activity-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	
	.activity-item {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		padding: 1rem;
		border-radius: 8px;
		transition: var(--transition-fast);
		border: 1px solid transparent;
	}
	
	.activity-item:hover {
		background: var(--gradient-glow);
		border-color: var(--primary);
	}
	
	.activity-icon {
		font-size: 1.5rem;
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--surface);
		border-radius: 50%;
		border: 1px solid var(--border);
		flex-shrink: 0;
	}
	
	.activity-content {
		flex: 1;
	}
	
	.activity-main {
		font-weight: 500;
		margin-bottom: 0.25rem;
	}
	
	.activity-name {
		color: var(--primary);
		font-weight: 600;
	}
	
	.highlight {
		color: var(--success);
		font-weight: 600;
	}
	
	.activity-time {
		color: var(--text-muted);
		font-size: 0.85rem;
	}
	
	.actions-grid-full {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1rem;
	}
	
	.action-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1.5rem;
		border-radius: 12px;
		background: var(--gradient-dark);
		border: 1px solid var(--border);
		text-decoration: none;
		color: var(--text);
		transition: var(--transition-medium);
		position: relative;
		overflow: hidden;
	}
	
	.action-item::before {
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
	
	.action-item:hover::before {
		opacity: 1;
	}
	
	.action-item:hover {
		transform: translateY(-3px);
		box-shadow: var(--shadow-glow);
		border-color: var(--primary);
	}
	
	.action-icon {
		font-size: 2rem;
		width: 50px;
		height: 50px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--surface);
		border-radius: 12px;
		border: 1px solid var(--border);
		flex-shrink: 0;
		filter: drop-shadow(0 0 10px var(--primary));
	}
	
	.action-content h4 {
		margin: 0 0 0.25rem 0;
		font-weight: 600;
		color: var(--text);
	}
	
	.action-content p {
		margin: 0;
		color: var(--text-muted);
		font-size: 0.9rem;
	}
	
	
	@media (max-width: 768px) {
		.dashboard {
			padding: 1rem 0.5rem;
		}
		
		.dashboard-header {
			margin-bottom: 2rem;
		}
		
		.dashboard-title {
			font-size: 2rem;
			flex-direction: column;
			gap: 0.5rem;
		}
		
		.title-icon {
			font-size: 2.5rem;
		}
		
		.dashboard-subtitle {
			font-size: 1rem;
		}
		
		.stats-grid {
			grid-template-columns: 1fr;
			gap: 1rem;
			margin-bottom: 2rem;
		}
		
		.stat-card {
			padding: 1.5rem;
		}
		
		.stat-value {
			font-size: 2rem;
		}
		
		.actions-grid-full {
			grid-template-columns: repeat(2, 1fr);
			gap: 0.75rem;
		}
		
		.action-item {
			padding: 1rem;
			flex-direction: column;
			text-align: center;
			gap: 0.75rem;
		}
		
		.action-icon {
			width: 40px;
			height: 40px;
			font-size: 1.5rem;
		}
		
		.action-content h4 {
			font-size: 0.9rem;
		}
		
		.action-content p {
			font-size: 0.8rem;
		}
		
		.activity-item {
			padding: 0.75rem;
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}
		
		.activity-icon {
			width: 36px;
			height: 36px;
			font-size: 1.25rem;
		}
		
		.admin-access {
			justify-content: center;
			margin-top: 1.5rem;
		}
		
		.admin-button {
			padding: 0.75rem 1.5rem;
		}
	}
	
	/* Admin Access Button */
	.admin-access {
		display: flex;
		justify-content: flex-end;
		margin-top: 2rem;
		padding-top: 1rem;
		animation-delay: 0.8s;
	}
	
	.admin-button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.6rem 1rem;
		background: var(--gradient-dark);
		border: 1px solid var(--border);
		border-radius: var(--radius-full);
		color: var(--text-muted);
		font-size: 0.85rem;
		font-weight: 500;
		cursor: pointer;
		transition: var(--transition-medium);
		position: relative;
		overflow: hidden;
	}
	
	.admin-button::before {
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
	
	.admin-button:hover::before {
		opacity: 0.3;
	}
	
	.admin-button:hover {
		color: var(--primary);
		border-color: var(--primary);
		transform: translateY(-1px);
		box-shadow: 0 0 15px rgba(243, 148, 7, 0.2);
	}
	
	.admin-icon {
		font-size: 1rem;
		filter: drop-shadow(0 0 5px currentColor);
	}
	
	.admin-text {
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}
	
	@media (max-width: 480px) {
		.dashboard {
			padding: 0.5rem 0.25rem;
		}
		
		.dashboard-header {
			margin-bottom: 1.5rem;
		}
		
		.dashboard-title {
			font-size: 1.75rem;
		}
		
		.title-icon {
			font-size: 2rem;
		}
		
		.dashboard-subtitle {
			font-size: 0.9rem;
		}
		
		.actions-grid-full {
			grid-template-columns: 1fr;
			gap: 0.5rem;
		}
		
		.action-item {
			padding: 1.25rem;
			gap: 1rem;
		}
		
		.action-icon {
			width: 48px;
			height: 48px;
			font-size: 1.75rem;
		}
		
		.stat-card {
			padding: 1.25rem;
		}
		
		.stat-value {
			font-size: 1.75rem;
		}
		
		.stat-header h3 {
			font-size: 1rem;
		}
		
		.stat-trend {
			font-size: 0.8rem;
		}
		
		.card-header h2 {
			font-size: 1.25rem;
		}
		
		.activity-item {
			padding: 1rem;
			border-radius: var(--radius-md);
		}
		
		.admin-access {
			justify-content: center;
			margin-top: 1rem;
		}
		
		.admin-button {
			padding: 0.75rem 2rem;
			border-radius: var(--radius-lg);
		}
	}
</style>