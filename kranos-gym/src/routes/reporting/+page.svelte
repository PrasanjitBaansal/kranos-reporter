<script>
	import { onMount } from 'svelte';
	
	export let data;
	
	let reportType = 'financial'; // 'financial' or 'renewals'
	let dateRange = {
		start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
		end: new Date().toISOString().split('T')[0]
	};
	let isLoading = false;
	let financialData = null;
	let renewalsData = data.upcomingRenewals || [];
	let exportFormat = 'excel';
	
	onMount(async () => {
		await loadReports();
	});
	
	async function loadReports() {
		await Promise.all([
			loadFinancialReport(),
			loadRenewalsReport()
		]);
	}
	
	async function loadFinancialReport() {
		isLoading = true;
		try {
			// Context7-grounded: Use enhanced financial report with expense integration
			const response = await fetch(`/api/reports/financial-enhanced?start=${dateRange.start}&end=${dateRange.end}`);
			if (response.ok) {
				const result = await response.json();
				if (result.success) {
					financialData = result;
				}
			} else {
				// Fallback to original API if enhanced is not available
				const fallbackResponse = await fetch(`/api/reports/financial?start=${dateRange.start}&end=${dateRange.end}`);
				if (fallbackResponse.ok) {
					const fallbackResult = await fallbackResponse.json();
					if (fallbackResult.success) {
						financialData = fallbackResult;
					}
				}
			}
		} catch (error) {
			console.error('Failed to load financial report:', error);
		} finally {
			isLoading = false;
		}
	}
	
	async function loadRenewalsReport() {
		try {
			const response = await fetch('/api/reports/renewals?days=30');
			if (response.ok) {
				const result = await response.json();
				if (result.success) {
					renewalsData = result.data || [];
				}
			}
		} catch (error) {
			console.error('Failed to load renewals report:', error);
		}
	}
	
	function switchReportType(type) {
		reportType = type;
	}
	
	async function updateDateRange() {
		if (reportType === 'financial') {
			await loadFinancialReport();
		}
	}
	
	async function exportReport() {
		try {
			const endpoint = reportType === 'financial' 
				? `/api/reports/financial/export?start=${dateRange.start}&end=${dateRange.end}&format=${exportFormat}`
				: `/api/reports/renewals/export?format=${exportFormat}`;
			
			const response = await fetch(endpoint);
			if (response.ok) {
				const blob = await response.blob();
				const url = window.URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = `${reportType}_report_${new Date().toISOString().split('T')[0]}.${exportFormat === 'excel' ? 'xlsx' : 'csv'}`;
				document.body.appendChild(a);
				a.click();
				window.URL.revokeObjectURL(url);
				document.body.removeChild(a);
			}
		} catch (error) {
			console.error('Failed to export report:', error);
			alert('Failed to export report');
		}
	}
	
	function formatCurrency(amount) {
		return new Intl.NumberFormat('en-IN', {
			style: 'currency',
			currency: 'INR'
		}).format(amount || 0);
	}
	
	function formatDate(dateString) {
		if (!dateString) return 'N/A';
		return new Date(dateString).toLocaleDateString();
	}
	
	function getDaysUntilExpiry(endDate) {
		if (!endDate) return 0;
		const today = new Date();
		const expiry = new Date(endDate);
		const diffTime = expiry - today;
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		return Math.max(0, diffDays);
	}
	
	function getExpiryStatus(days) {
		if (days <= 7) return 'critical';
		if (days <= 14) return 'warning';
		return 'normal';
	}
</script>

<svelte:head>
	<title>Reports - Kranos Gym</title>
</svelte:head>

<div class="reporting-container animate-slide-up">
	<div class="report-type-selector">
		<div class="type-buttons">
			<button 
				class="type-btn" 
				class:active={reportType === 'financial'}
				on:click={() => switchReportType('financial')}
			>
				<span class="type-icon">💰</span>
				<span class="type-label">Financial Report</span>
			</button>
			<button 
				class="type-btn" 
				class:active={reportType === 'renewals'}
				on:click={() => switchReportType('renewals')}
			>
				<span class="type-icon">🔄</span>
				<span class="type-label">Upcoming Renewals</span>
			</button>
		</div>
	</div>
	
	<div class="report-controls card">
		<div class="controls-section">
			{#if reportType === 'financial'}
				<div class="date-range">
					<h3>
						<span class="section-icon">📅</span>
						Date Range
					</h3>
					<div class="date-inputs">
						<div class="form-group">
							<label for="start_date">Start Date</label>
							<input 
								type="date" 
								id="start_date" 
								class="form-control"
								bind:value={dateRange.start}
								on:change={updateDateRange}
							/>
						</div>
						<div class="form-group">
							<label for="end_date">End Date</label>
							<input 
								type="date" 
								id="end_date" 
								class="form-control"
								bind:value={dateRange.end}
								on:change={updateDateRange}
							/>
						</div>
					</div>
				</div>
			{/if}
			
			<div class="export-section">
				<h3>
					<span class="section-icon">📥</span>
					Export Report
				</h3>
				<div class="export-controls">
					<select class="form-control" bind:value={exportFormat}>
						<option value="excel">Excel (.xlsx)</option>
						<option value="csv">CSV (.csv)</option>
					</select>
					<button class="btn btn-primary export-btn" on:click={exportReport}>
						<span>⬇️</span>
						Download Report
					</button>
				</div>
			</div>
		</div>
	</div>
	
	{#if reportType === 'financial'}
		<div class="financial-report">
			{#if isLoading}
				<div class="loading-container card">
					<div class="loading-spinner"></div>
					<p>Loading financial data...</p>
				</div>
			{:else if financialData}
				<div class="financial-summary">
					<!-- Context7-grounded: Enhanced financial metrics with expenses -->
					<div class="summary-card total-revenue">
						<div class="summary-header">
							<span class="summary-icon">💰</span>
							<h3>Total Revenue</h3>
						</div>
						<div class="summary-value">{formatCurrency(financialData.income?.total || financialData.total_revenue)}</div>
						<div class="summary-breakdown">
							{#if financialData.income?.data}
								{#each financialData.income.data as incomeItem}
									<span>{incomeItem.type}: {formatCurrency(incomeItem.total_amount)}</span>
								{/each}
							{:else}
								<span>GC: {formatCurrency(financialData.gc_revenue)}</span>
								<span>PT: {formatCurrency(financialData.pt_revenue)}</span>
							{/if}
						</div>
					</div>
					
					<div class="summary-card total-expenses">
						<div class="summary-header">
							<span class="summary-icon">💸</span>
							<h3>Total Expenses</h3>
						</div>
						<div class="summary-value expense-value">{formatCurrency(financialData.expenses?.total || 0)}</div>
						<div class="summary-breakdown">
							{#if financialData.summary?.expenseRatio}
								<span>Expense Ratio: {financialData.summary.expenseRatio}%</span>
							{:else}
								<span>No expense data</span>
							{/if}
						</div>
					</div>
					
					<div class="summary-card net-profit">
						<div class="summary-header">
							<span class="summary-icon">📊</span>
							<h3>Net Profit</h3>
						</div>
						<div class="summary-value {(financialData.summary?.netProfit || 0) >= 0 ? 'profit' : 'loss'}">
							{formatCurrency(financialData.summary?.netProfit || (financialData.total_revenue || 0))}
						</div>
						<div class="summary-breakdown">
							{#if financialData.summary?.profitMargin}
								<span>Margin: {financialData.summary.profitMargin}%</span>
							{:else}
								<span>Transactions: {financialData.total_transactions || 0}</span>
							{/if}
						</div>
					</div>
					
					<div class="summary-card avg-transaction">
						<div class="summary-header">
							<span class="summary-icon">📈</span>
							<h3>Average Transaction</h3>
						</div>
						<div class="summary-value">{formatCurrency(financialData.avg_transaction)}</div>
						<div class="summary-breakdown">
							<span>Daily Avg: {formatCurrency(financialData.daily_average)}</span>
						</div>
					</div>
				</div>
				
				<!-- Context7-grounded: Expense breakdown section -->
				{#if financialData.expenses?.data && financialData.expenses.data.length > 0}
					<div class="expense-breakdown card">
						<div class="header">
							<h2>
								<span class="section-icon">💸</span>
								Expense Categories
							</h2>
						</div>
						
						<div class="expense-categories">
							{#each financialData.expenses.data as expense}
								<div class="expense-category">
									<div class="category-name">{expense.category}</div>
									<div class="category-amount">{formatCurrency(expense.total_amount)}</div>
									<div class="category-count">{expense.count} transactions</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
				
				<div class="financial-details card">
					<div class="header">
						<h2>
							<span class="section-icon">📋</span>
							Transaction Details
						</h2>
					</div>
					
					<div class="table-container">
						<table class="financial-table">
							<thead>
								<tr>
									<th>Date</th>
									<th>Member</th>
									<th>Type</th>
									<th>Plan/Sessions</th>
									<th>Amount</th>
								</tr>
							</thead>
							<tbody>
								{#each financialData.transactions as transaction}
									<tr class="transaction-row">
										<td>{formatDate(transaction.date)}</td>
										<td class="member-name">{transaction.member_name}</td>
										<td>
											<span class="transaction-type {transaction.type}">
												{transaction.type === 'group_class' ? 'Group Class' : 'Personal Training'}
											</span>
										</td>
										<td class="plan-info">{transaction.plan_or_sessions}</td>
										<td class="amount">{formatCurrency(transaction.amount)}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			{/if}
		</div>
	{:else}
		<div class="renewals-report">
			<div class="renewals-summary">
				<div class="summary-card critical-renewals">
					<div class="summary-header">
						<span class="summary-icon">🚨</span>
						<h3>Critical (≤7 days)</h3>
					</div>
					<div class="summary-value critical">
						{renewalsData.filter(r => getDaysUntilExpiry(r.end_date) <= 7).length}
					</div>
				</div>
				
				<div class="summary-card warning-renewals">
					<div class="summary-header">
						<span class="summary-icon">⚠️</span>
						<h3>Warning (≤14 days)</h3>
					</div>
					<div class="summary-value warning">
						{renewalsData.filter(r => getDaysUntilExpiry(r.end_date) <= 14 && getDaysUntilExpiry(r.end_date) > 7).length}
					</div>
				</div>
				
				<div class="summary-card total-renewals">
					<div class="summary-header">
						<span class="summary-icon">📋</span>
						<h3>Total Upcoming</h3>
					</div>
					<div class="summary-value">{renewalsData.length}</div>
				</div>
			</div>
			
			<div class="renewals-details card">
				<div class="header">
					<h2>
						<span class="section-icon">🔄</span>
						Upcoming Renewals (Next 30 Days)
					</h2>
				</div>
				
				<div class="table-container">
					<table class="renewals-table">
						<thead>
							<tr>
								<th>Member</th>
								<th>Plan</th>
								<th>Start Date</th>
								<th>End Date</th>
								<th>Days Left</th>
								<th>Status</th>
							</tr>
						</thead>
						<tbody>
							{#each renewalsData as renewal}
								{@const daysLeft = getDaysUntilExpiry(renewal.end_date)}
								{@const status = getExpiryStatus(daysLeft)}
								<tr class="renewal-row">
									<td class="member-name">{renewal.member_name}</td>
									<td class="plan-name">{renewal.plan_name}</td>
									<td>{formatDate(renewal.start_date)}</td>
									<td>{formatDate(renewal.end_date)}</td>
									<td class="days-left {status}">{daysLeft}</td>
									<td>
										<span class="renewal-status {status}">
											{#if status === 'critical'}
												🚨 Critical
											{:else if status === 'warning'}
												⚠️ Warning
											{:else}
												✅ Normal
											{/if}
										</span>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
					
					{#if renewalsData.length === 0}
						<div class="empty-state">
							<span class="empty-icon">🎉</span>
							<p>No memberships expiring in the next 30 days!</p>
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.reporting-container {
		display: flex;
		flex-direction: column;
		gap: 2rem;
		min-height: calc(100vh - 140px);
		padding: 0;
	}
	
	.report-type-selector {
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
	
	.report-controls {
		padding: 1.5rem;
	}
	
	.controls-section {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		gap: 2rem;
	}
	
	.date-range, .export-section {
		flex: 1;
	}
	
	.date-range h3, .export-section h3 {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0 0 1rem 0;
		color: var(--text);
		font-size: 1.1rem;
		font-weight: 600;
	}
	
	.section-icon {
		font-size: 1.2rem;
		filter: drop-shadow(0 0 10px var(--primary));
	}
	
	.date-inputs {
		display: flex;
		gap: 1rem;
	}
	
	.form-group {
		flex: 1;
	}
	
	.form-group label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 600;
		color: var(--text);
		font-size: 0.9rem;
	}
	
	.export-controls {
		display: flex;
		gap: 1rem;
		align-items: end;
	}
	
	.export-controls select {
		flex: 1;
	}
	
	.export-btn {
		white-space: nowrap;
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
	
	.financial-summary, .renewals-summary {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1.5rem;
		margin-bottom: 2rem;
	}
	
	.summary-card {
		background: var(--gradient-dark);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 1.5rem;
		position: relative;
		overflow: hidden;
		transition: var(--transition-medium);
		backdrop-filter: blur(10px);
	}
	
	.summary-card::before {
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
	
	.summary-card:hover::before {
		opacity: 1;
	}
	
	.summary-card:hover {
		transform: translateY(-3px);
		box-shadow: var(--shadow-glow);
		border-color: var(--primary);
	}
	
	.summary-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}
	
	.summary-icon {
		font-size: 1.5rem;
		filter: drop-shadow(0 0 10px currentColor);
	}
	
	.summary-header h3 {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-muted);
	}
	
	.summary-value {
		font-size: 2rem;
		font-weight: 700;
		color: var(--text);
		margin-bottom: 0.5rem;
		text-shadow: 0 0 10px rgba(243, 148, 7, 0.3);
	}
	
	.summary-value.critical {
		color: var(--error);
		text-shadow: 0 0 10px rgba(239, 68, 68, 0.3);
	}
	
	.summary-value.warning {
		color: var(--warning);
		text-shadow: 0 0 10px rgba(245, 158, 11, 0.3);
	}
	
	.summary-breakdown {
		display: flex;
		gap: 1rem;
		font-size: 0.9rem;
		color: var(--text-muted);
	}
	
	.total-revenue .summary-icon { color: var(--success); }
	.total-transactions .summary-icon { color: var(--info); }
	.avg-transaction .summary-icon { color: var(--primary); }
	.critical-renewals .summary-icon { color: var(--error); }
	.warning-renewals .summary-icon { color: var(--warning); }
	.total-renewals .summary-icon { color: var(--primary); }
	
	.financial-details, .renewals-details {
		margin-bottom: 2rem;
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
	
	.table-container {
		padding: 1.5rem;
		overflow-x: auto;
	}
	
	.financial-table, .renewals-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.9rem;
	}
	
	.financial-table th, .renewals-table th {
		background: var(--surface);
		color: var(--text);
		padding: 1rem;
		text-align: left;
		font-weight: 600;
		border-bottom: 2px solid var(--border);
		position: sticky;
		top: 0;
		z-index: 10;
	}
	
	.financial-table td, .renewals-table td {
		padding: 1rem;
		border-bottom: 1px solid var(--border);
		color: var(--text);
	}
	
	.transaction-row:hover, .renewal-row:hover {
		background: var(--gradient-glow);
	}
	
	.member-name {
		font-weight: 600;
		color: var(--primary);
	}
	
	.plan-name, .plan-info {
		color: var(--text-muted);
		font-style: italic;
	}
	
	.amount {
		font-weight: 600;
		color: var(--success);
		text-align: right;
	}
	
	.transaction-type {
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.8rem;
		font-weight: 600;
		text-transform: uppercase;
	}
	
	.transaction-type.group_class {
		background: var(--info);
		color: white;
	}
	
	.transaction-type.personal_training {
		background: var(--primary);
		color: white;
	}
	
	.days-left {
		font-weight: 600;
		text-align: center;
	}
	
	.days-left.critical {
		color: var(--error);
	}
	
	.days-left.warning {
		color: var(--warning);
	}
	
	.days-left.normal {
		color: var(--success);
	}
	
	.renewal-status {
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.8rem;
		font-weight: 600;
		white-space: nowrap;
	}
	
	.renewal-status.critical {
		background: rgba(239, 68, 68, 0.2);
		color: var(--error);
		border: 1px solid var(--error);
	}
	
	.renewal-status.warning {
		background: rgba(245, 158, 11, 0.2);
		color: var(--warning);
		border: 1px solid var(--warning);
	}
	
	.renewal-status.normal {
		background: rgba(74, 222, 128, 0.2);
		color: var(--success);
		border: 1px solid var(--success);
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
	
	@media (max-width: 1024px) {
		.controls-section {
			flex-direction: column;
			align-items: stretch;
			gap: 1.5rem;
		}
		
		.date-inputs {
			flex-direction: column;
		}
		
		.export-controls {
			flex-direction: column;
		}
		
		.type-buttons {
			flex-direction: column;
			align-items: center;
		}
		
		.type-btn {
			width: 100%;
			max-width: 300px;
		}
	}
	
	@media (max-width: 768px) {
		.reporting-container {
			gap: 1.5rem;
		}
		
		.report-type-selector {
			padding: 1rem;
		}
		
		.type-buttons {
			flex-direction: column;
			gap: 0.75rem;
		}
		
		.type-btn {
			padding: 1.25rem 1.5rem;
			min-width: unset;
			max-width: none;
		}
		
		.type-icon {
			font-size: 1.75rem;
		}
		
		.type-label {
			font-size: 1rem;
		}
		
		.report-controls {
			padding: 1rem;
		}
		
		.controls-section {
			flex-direction: column;
			gap: 1.25rem;
		}
		
		.date-range h3, .export-section h3 {
			font-size: 1rem;
		}
		
		.date-inputs {
			flex-direction: column;
			gap: 0.75rem;
		}
		
		.export-controls {
			flex-direction: column;
			gap: 0.75rem;
		}
		
		.financial-summary, .renewals-summary {
			grid-template-columns: 1fr;
			gap: 1rem;
		}
		
		.summary-card {
			padding: 1.25rem;
		}
		
		.summary-value {
			font-size: 1.75rem;
		}
		
		.summary-breakdown {
			flex-direction: column;
			gap: 0.5rem;
		}
		
		.header {
			padding: 1rem;
		}
		
		.header h2 {
			font-size: 1.1rem;
		}
		
		.table-container {
			padding: 1rem;
			overflow-x: auto;
			-webkit-overflow-scrolling: touch;
		}
		
		.financial-table, .renewals-table {
			min-width: 700px;
			font-size: 0.85rem;
		}
		
		.financial-table th, .renewals-table th {
			padding: 0.75rem 0.5rem;
			font-size: 0.8rem;
		}
		
		.financial-table td, .renewals-table td {
			padding: 0.75rem 0.5rem;
		}
		
		.transaction-type, .renewal-status {
			font-size: 0.7rem;
			padding: 0.2rem 0.4rem;
		}
		
		.empty-state {
			padding: 2rem 1rem;
		}
		
		.empty-icon {
			font-size: 2.5rem;
		}
	}
	
	@media (max-width: 480px) {
		.reporting-container {
			gap: 1rem;
		}
		
		.report-type-selector {
			padding: 0.75rem;
		}
		
		.type-buttons {
			gap: 0.5rem;
		}
		
		.type-btn {
			padding: 1rem 1.25rem;
		}
		
		.type-icon {
			font-size: 1.5rem;
		}
		
		.type-label {
			font-size: 0.9rem;
		}
		
		.report-controls {
			padding: 0.75rem;
		}
		
		.controls-section {
			gap: 1rem;
		}
		
		.date-range h3, .export-section h3 {
			font-size: 0.95rem;
		}
		
		.form-group label {
			font-size: 0.85rem;
		}
		
		.form-control {
			padding: 0.75rem;
			font-size: 1rem;
		}
		
		.financial-summary, .renewals-summary {
			gap: 0.75rem;
		}
		
		.summary-card {
			padding: 1rem;
		}
		
		.summary-header h3 {
			font-size: 0.9rem;
		}
		
		.summary-value {
			font-size: 1.5rem;
		}
		
		.summary-breakdown {
			font-size: 0.8rem;
		}
		
		.header {
			padding: 0.75rem;
		}
		
		.header h2 {
			font-size: 1rem;
		}
		
		.table-container {
			padding: 0.75rem;
		}
		
		.financial-table, .renewals-table {
			min-width: 600px;
			font-size: 0.8rem;
		}
		
		.financial-table th, .renewals-table th {
			padding: 0.6rem 0.4rem;
			font-size: 0.75rem;
		}
		
		.financial-table td, .renewals-table td {
			padding: 0.6rem 0.4rem;
		}
		
		.transaction-type, .renewal-status {
			font-size: 0.65rem;
			padding: 0.15rem 0.3rem;
		}
		
		.empty-state {
			padding: 1.5rem 0.5rem;
		}
		
		.empty-icon {
			font-size: 2rem;
		}
		
		.loading-container {
			padding: 3rem 1rem;
		}
		
		.loading-spinner {
			width: 40px;
			height: 40px;
		}
	}

	/* Context7-grounded: Expense integration styles */
	.total-expenses .summary-icon { 
		color: var(--error); 
	}

	.net-profit .summary-icon { 
		color: var(--success); 
	}

	.summary-value.expense-value {
		color: var(--error);
		text-shadow: 0 0 10px rgba(239, 68, 68, 0.3);
	}

	.summary-value.profit {
		color: var(--success);
		text-shadow: 0 0 10px rgba(74, 222, 128, 0.3);
	}

	.summary-value.loss {
		color: var(--error);
		text-shadow: 0 0 10px rgba(239, 68, 68, 0.3);
	}

	.expense-breakdown {
		margin-bottom: 2rem;
	}

	.expense-categories {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		padding: 1.5rem;
	}

	.expense-category {
		background: var(--surface-light);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 1rem;
		text-align: center;
		transition: var(--transition-fast);
	}

	.expense-category:hover {
		border-color: var(--primary);
		transform: translateY(-2px);
		box-shadow: 0 4px 15px rgba(243, 148, 7, 0.2);
	}

	.category-name {
		font-weight: 600;
		color: var(--text);
		margin-bottom: 0.5rem;
		font-size: 0.9rem;
	}

	.category-amount {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--error);
		margin-bottom: 0.25rem;
	}

	.category-count {
		font-size: 0.8rem;
		color: var(--text-muted);
	}

	@media (max-width: 768px) {
		.expense-categories {
			grid-template-columns: 1fr;
			padding: 1rem;
		}

		.expense-category {
			padding: 0.75rem;
		}

		.category-amount {
			font-size: 1.1rem;
		}
	}

	@media (max-width: 480px) {
		.expense-categories {
			padding: 0.75rem;
		}

		.expense-category {
			padding: 0.6rem;
		}

		.category-name {
			font-size: 0.85rem;
		}

		.category-amount {
			font-size: 1rem;
		}

		.category-count {
			font-size: 0.75rem;
		}
	}
</style>