<script>
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { showSuccess, showError } from '$lib/stores/toast.js';
	
	export let form;
	
	// Component state
	let currentStep = 'upload'; // 'upload', 'validate', 'preview', 'success'
	let isLoading = false;
	let csvData = [];
	let importPreview = null;
	let editableData = [];
	let selectedFile = null;
	
	// Reactive variables
	$: hasData = editableData.length > 0;
	$: validRows = editableData.filter(row => row._isValid).length;
	$: invalidRows = editableData.length - validRows;
	$: allRowsValid = validRows === editableData.length && editableData.length > 0;
	$: membershipDisplayCount = editableData.filter(row => row._isValid).length;
	
	// Debug reactive variables
	$: if (editableData.length > 0) {
		console.log('=== REACTIVE STATS UPDATE ===');
		console.log('Total rows:', editableData.length);
		console.log('Valid rows:', validRows);
		console.log('Invalid rows:', invalidRows);
		console.log('All rows valid:', allRowsValid);
		console.log('=== END REACTIVE STATS ===');
	}
	
	// Debug form responses - comprehensive logging
	$: if (form) {
		console.log('=== FORM RESPONSE DEBUG ===');
		console.log('Full form object:', form);
		console.log('form.success:', form.success, typeof form.success);
		console.log('form.data:', form.data);
		console.log('form.data exists?', !!form.data);
		console.log('form.data length?', form.data?.length);
		console.log('Condition form?.success === true:', form?.success === true);
		console.log('Condition form?.data:', !!form?.data);
		console.log('Combined condition result:', (form?.success === true && form?.data));
		console.log('=== END FORM DEBUG ===');
	}

	// Handle form responses - using more robust condition
	$: if (form && form.success && form.data) {
		console.log('Form success response - transitioning to validate step:', form);
		csvData = form.data;
		editableData = [...form.data];
		importPreview = form.preview;
		currentStep = 'validate';
		isLoading = false;
		console.log('Step changed to:', currentStep);
		console.log('CSV data length:', csvData.length);
		console.log('Editable data length:', editableData.length);
	}
	
	$: if (form?.error) {
		console.log('Form error response:', form);
		showError(form.error);
		isLoading = false;
	}
	
	// Handle server action errors (when success=false in response)
	$: if (form?.success === false) {
		console.log('Server validation error:', form);
		showError(form.error || 'Upload failed');
		isLoading = false;
	}
	
	// Navigation functions
	function goBack() {
		goto('/memberships');
	}
	
	function resetUpload() {
		currentStep = 'upload';
		csvData = [];
		editableData = [];
		importPreview = null;
		selectedFile = null;
	}

	// Validate DD-MM-YYYY date format
	function isValidDDMMYYYY(dateString) {
		if (!dateString || typeof dateString !== 'string') return true; // Allow empty for optional fields
		
		const parts = dateString.trim().split(/[-\/]/);
		if (parts.length !== 3) return false;
		
		const day = parseInt(parts[0]);
		const month = parseInt(parts[1]);
		const year = parseInt(parts[2]);
		
		// Basic validation
		if (isNaN(day) || isNaN(month) || isNaN(year)) return false;
		if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900) return false;
		
		// Create date object to validate
		const date = new Date(year, month - 1, day);
		return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
	}
	
	// Handle file selection
	function handleFileSelect(event) {
		const file = event.target.files[0];
		selectedFile = file;
	}
	
	// Cell editing functions
	function updateCell(rowIndex, field, value) {
		editableData[rowIndex][field] = value;
		
		// Re-validate the row
		const errors = validateRow(editableData[rowIndex]);
		editableData[rowIndex]._errors = errors;
		editableData[rowIndex]._isValid = errors.length === 0;
		
		// Trigger reactivity
		editableData = [...editableData];
	}
	
	function validateRow(row) {
		const errors = [];
		
		// Required fields
		const requiredFields = ['name', 'phone', 'plan_name', 'duration_days', 'start_date', 'amount_paid'];
		
		for (const field of requiredFields) {
			if (!row[field] || row[field].toString().trim() === '') {
				errors.push(`Missing ${field}`);
			}
		}
		
		// Validate phone format
		if (row.phone && !/^\d{10}$/.test(row.phone.toString())) {
			errors.push('Phone must be 10 digits');
		}
		
		// Validate duration_days is a positive number
		if (row.duration_days) {
			const duration = parseInt(row.duration_days);
			if (isNaN(duration) || duration <= 0) {
				errors.push('Duration days must be a positive number');
			}
		}
		
		// Validate amount_paid is a positive number
		if (row.amount_paid) {
			const amount = parseFloat(row.amount_paid);
			if (isNaN(amount) || amount <= 0) {
				errors.push('Amount paid must be a positive number');
			}
		}
		
		// Validate dates - DD-MM-YYYY format
		if (row.start_date) {
			if (!isValidDDMMYYYY(row.start_date)) {
				errors.push('Invalid start date format (use DD-MM-YYYY)');
			}
		}
		
		if (row.purchase_date) {
			if (!isValidDDMMYYYY(row.purchase_date)) {
				errors.push('Invalid purchase date format (use DD-MM-YYYY)');
			}
		}
		
		return errors;
	}
	
	// Form submission handlers
	const handleUpload = () => {
		return async ({ result, formData }) => {
			console.log('Upload started - Setting loading state');
			isLoading = true;
			
			console.log('Upload result type:', result.type);
			console.log('Upload result data:', result.data);
			console.log('Form data file:', formData.get('csvFile'));
			
			// Safety timeout to reset loading state
			setTimeout(() => {
				if (isLoading) {
					console.log('Upload timeout - resetting loading state');
					isLoading = false;
					showError('Upload timed out. Please try again.');
				}
			}, 30000); // 30 second timeout
			
			if (result.type === 'success') {
				console.log('Success type result:', result.data);
				console.log('Checking if result.data has success and data properties...');
				
				// Fallback mechanism - directly handle step transition if reactive statement fails
				if (result.data?.success && result.data?.data) {
					console.log('Fallback: Directly transitioning to validate step');
					csvData = result.data.data;
					editableData = [...result.data.data];
					importPreview = result.data.preview;
					currentStep = 'validate';
				}
				
				// Clear loading state since reactive statement will handle the response
				isLoading = false;
			} else if (result.type === 'failure') {
				console.log('Failure type result:', result.data);
				isLoading = false;
				showError(result.data?.error || 'Upload failed. Please try again.');
			} else if (result.type === 'error') {
				console.log('Error type result:', result.error);
				isLoading = false;
				showError('Upload failed. Please try again.');
			} else {
				console.log('Other result type:', result.type, result);
				isLoading = false;
				showError('Upload failed. Please try again.');
			}
		};
	};
	
	const handleUpdateData = () => {
		return async ({ formData, result }) => {
			isLoading = true;
			
			// Add updated data to form
			formData.set('updatedData', JSON.stringify(editableData));
			
			if (result.type === 'success') {
				if (result.data?.success) {
					// Update editable data and trigger reactivity
					editableData = [...result.data.data];
					importPreview = result.data.preview;
					
					console.log('Re-validation completed. Valid rows:', validRows, 'Invalid rows:', invalidRows, 'All valid:', allRowsValid);
					showSuccess('Data re-validated successfully!');
				} else {
					showError(result.data?.error || 'Re-validation failed');
				}
			} else {
				showError('Re-validation failed. Please try again.');
			}
			
			isLoading = false;
		};
	};
	
	const handleImport = () => {
		return async ({ formData, result }) => {
			console.log('=== IMPORT STARTED ===');
			isLoading = true;
			
			// Data is sent via hidden input field
			const validData = editableData.filter(row => row._isValid);
			console.log('Valid data being sent:', validData.length, 'rows');
			console.log('First row structure:', validData.length > 0 ? validData[0] : 'No data');
			
			console.log('Import result type:', result.type);
			console.log('Import result data:', result.data);
			
			if (result.type === 'success') {
				if (result.data?.success) {
					console.log('Import successful:', result.data);
					currentStep = 'success';
					showSuccess(`Successfully imported ${result.data?.imported || 0} memberships!`);
				} else {
					console.log('Import failed:', result.data?.error);
					showError(result.data?.error || 'Import failed');
				}
			} else if (result.type === 'failure') {
				console.log('Form failure:', result.data);
				showError(result.data?.error || 'Import failed. Please try again.');
			} else if (result.type === 'error') {
				console.log('Form error:', result.error);
				showError('Import failed. Please try again.');
			} else {
				console.log('Unknown result type:', result.type);
				showError('Import failed. Please try again.');
			}
			
			isLoading = false;
			console.log('=== IMPORT COMPLETED ===');
		};
	};
	
</script>

<svelte:head>
	<title>Bulk Import - Kranos Gym</title>
</svelte:head>

<div class="bulk-import-page">
	<div class="page-header">
		<div class="header-content">
			<h1 class="page-title animate-slide-up">
				Bulk Import Memberships
			</h1>
			<p class="page-subtitle animate-slide-up">Import multiple memberships from CSV file</p>
		</div>
		<div class="header-actions animate-slide-up">
			<button class="btn btn-secondary" on:click={goBack}>
				<span class="btn-icon">←</span>
				Back to Memberships
			</button>
		</div>
	</div>

	<div class="import-content">
		{#if currentStep === 'upload'}
			<!-- Step 1: Upload CSV -->
			<div class="import-sections">
				<!-- Left Section: Template Download -->
				<div class="template-section">
					<div class="section-card">
						<h2>
							<span class="section-icon">📁</span>
							Download Template
						</h2>
						<p>Download the CSV template with the required headers to ensure proper import format.</p>
						
						<a href="/memberships/bulk-import/template" class="btn btn-primary" download="membership-import-template.csv">
							<span class="btn-icon">⬇️</span>
							Download Template
						</a>
						
						<div class="template-info">
							<h4>Required Headers:</h4>
							<ul>
								<li><strong>name</strong> - Member name (required)</li>
								<li><strong>phone</strong> - 10-digit phone number (required)</li>
								<li><strong>email</strong> - Email address (optional)</li>
								<li><strong>plan_name</strong> - Plan name (required)</li>
								<li><strong>duration_days</strong> - Plan duration in days (required)</li>
								<li><strong>start_date</strong> - Membership start date (required)</li>
								<li><strong>amount_paid</strong> - Amount paid (required)</li>
								<li><strong>purchase_date</strong> - Purchase date (optional)</li>
							</ul>
						</div>
					</div>
				</div>
				
				<!-- Right Section: Upload CSV -->
				<div class="upload-section">
					<div class="section-card">
						<h2>
							<span class="section-icon">⬆️</span>
							Upload CSV File
						</h2>
						<p>Select your CSV file with membership data to begin the import process.</p>
						
						<form method="POST" action="?/uploadCSV" use:enhance={handleUpload} enctype="multipart/form-data">
							<div class="file-upload">
								<input
									type="file"
									name="csvFile"
									accept=".csv"
									required
									class="file-input"
									id="csvFile"
									on:change={handleFileSelect}
								/>
								
								{#if selectedFile}
									<div class="file-upload-row">
										<div class="selected-file">
											<span class="file-name">📁 {selectedFile.name}</span>
											<span class="file-size">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
										</div>
										<label for="csvFile" class="file-label has-file">
											<span class="file-icon">📄</span>
											Change File
										</label>
									</div>
								{:else}
									<label for="csvFile" class="file-label highlight-initial">
										<span class="file-icon">📄</span>
										Choose CSV File
									</label>
								{/if}
							</div>
							
							<button 
								type="submit" 
								class="btn"
								class:btn-primary={selectedFile}
								class:btn-secondary={!selectedFile}
								class:highlight={selectedFile}
								disabled={isLoading || !selectedFile}
							>
								{#if isLoading}
									<span class="loading-spinner"></span>
								{/if}
								<span class="btn-icon">🔍</span>
								Upload & Validate
							</button>
						</form>
					</div>
				</div>
			</div>
		
		{:else if currentStep === 'validate'}
			<!-- Step 2: Validate & Edit Data -->
			<div class="validate-section">
				<div class="section-card">
					<div class="validation-header">
						<h2>
							<span class="section-icon">✅</span>
							Validate & Edit Data
						</h2>
						<div class="validation-stats">
							<span class="stat valid">✅ Valid: {validRows}</span>
							<span class="stat invalid">❌ Invalid: {invalidRows}</span>
							<span class="stat total">📊 Total: {csvData.length}</span>
						</div>
					</div>
					
					{#if hasData}
						<div class="data-table-container">
							<table class="data-table">
								<thead>
									<tr>
										<th>Row</th>
										<th>Name</th>
										<th>Phone</th>
										<th>Email</th>
										<th>Plan Name</th>
										<th>Duration</th>
										<th>Start Date</th>
										<th>Amount</th>
										<th>Purchase Date</th>
										<th>Validation</th>
									</tr>
								</thead>
								<tbody>
									{#each editableData as row, index}
										<tr class="data-row" class:invalid={!row._isValid}>
											<td class="row-number">{row._rowIndex}</td>
											<td>
												<input
													type="text"
													bind:value={row.name}
													on:input={() => updateCell(index, 'name', row.name)}
													class="cell-input"
													class:error={row._errors?.some(e => e.includes('name'))}
												/>
											</td>
											<td>
												<input
													type="text"
													bind:value={row.phone}
													on:input={() => updateCell(index, 'phone', row.phone)}
													class="cell-input"
													class:error={row._errors?.some(e => e.includes('phone') || e.includes('Phone'))}
												/>
											</td>
											<td>
												<input
													type="email"
													bind:value={row.email}
													on:input={() => updateCell(index, 'email', row.email)}
													class="cell-input"
												/>
											</td>
											<td>
												<input
													type="text"
													bind:value={row.plan_name}
													on:input={() => updateCell(index, 'plan_name', row.plan_name)}
													class="cell-input"
													class:error={row._errors?.some(e => e.includes('plan_name'))}
												/>
											</td>
											<td>
												<input
													type="number"
													bind:value={row.duration_days}
													on:input={() => updateCell(index, 'duration_days', row.duration_days)}
													class="cell-input"
													class:error={row._errors?.some(e => e.includes('duration') || e.includes('Duration'))}
												/>
											</td>
											<td>
												<input
													type="text"
													bind:value={row.start_date}
													on:input={() => updateCell(index, 'start_date', row.start_date)}
													class="cell-input"
													class:error={row._errors?.some(e => e.includes('start date') || e.includes('start_date'))}
													placeholder="DD-MM-YYYY"
												/>
											</td>
											<td>
												<input
													type="number"
													step="0.01"
													bind:value={row.amount_paid}
													on:input={() => updateCell(index, 'amount_paid', row.amount_paid)}
													class="cell-input"
													class:error={row._errors?.some(e => e.includes('amount') || e.includes('Amount'))}
												/>
											</td>
											<td>
												<input
													type="text"
													bind:value={row.purchase_date}
													on:input={() => updateCell(index, 'purchase_date', row.purchase_date)}
													class="cell-input"
													class:error={row._errors?.some(e => e.includes('purchase date') || e.includes('purchase_date'))}
													placeholder="DD-MM-YYYY"
												/>
											</td>
											<td class="validation-cell">
												{#if row._isValid}
													<span class="validation-status valid">✅</span>
												{:else}
													<div class="validation-status invalid">
														<span class="error-icon">❌</span>
														<div class="error-details">
															{#each row._errors as error}
																<div class="error-item">{error}</div>
															{/each}
															<div class="current-values">
																<strong>Current values:</strong>
																<div class="value-item">Name: {row.name || 'empty'}</div>
																<div class="value-item">Phone: {row.phone || 'empty'}</div>
																<div class="value-item">Email: {row.email || 'empty'}</div>
																<div class="value-item">Plan: {row.plan_name || 'empty'}</div>
																<div class="value-item">Duration: {row.duration_days || 'empty'}</div>
																<div class="value-item">Start Date: {row.start_date || 'empty'}</div>
																<div class="value-item">Amount: {row.amount_paid || 'empty'}</div>
																<div class="value-item">Purchase Date: {row.purchase_date || 'empty'}</div>
															</div>
														</div>
													</div>
												{/if}
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
						
						<div class="action-buttons">
							<button class="btn btn-secondary" on:click={resetUpload}>
								<span class="btn-icon">🔄</span>
								Upload Different File
							</button>
							
							{#if allRowsValid}
								<button class="btn btn-success" on:click={() => currentStep = 'preview'}>
									<span class="btn-icon">👁️</span>
									Preview Import
								</button>
							{:else}
								<form method="POST" action="?/updateData" use:enhance={handleUpdateData}>
									<button type="submit" class="btn btn-primary" disabled={isLoading}>
										{#if isLoading}
											<span class="loading-spinner"></span>
										{/if}
										<span class="btn-icon">🔄</span>
										Re-validate Data
									</button>
								</form>
							{/if}
						</div>
					{/if}
				</div>
			</div>
		
		{:else if currentStep === 'preview'}
			<!-- Step 3: Preview Import -->
			<div class="preview-section">
				<div class="section-card">
					<h2>
						<span class="section-icon">👁️</span>
						Import Preview
					</h2>
					
					{#if importPreview}
						<div class="preview-stats">
							<div class="preview-stat">
								<span class="stat-icon">👥</span>
								<span class="stat-number">{importPreview.newMembersCount}</span>
								<span class="stat-label">New Members</span>
								<div class="stat-preview">
									{#if importPreview.newMembersCount > 0}
										{#each importPreview.newMembers.slice(0, 3) as phone}
											<div class="preview-item">{phone}</div>
										{/each}
										{#if importPreview.newMembers.length > 3}
											<div class="preview-more">+{importPreview.newMembers.length - 3} more</div>
										{/if}
									{:else}
										<div class="preview-none">All members exist</div>
									{/if}
								</div>
							</div>
							<div class="preview-stat">
								<span class="stat-icon">📋</span>
								<span class="stat-number">{importPreview.newPlansCount}</span>
								<span class="stat-label">New Plans</span>
								<div class="stat-preview">
									{#if importPreview.newPlansCount > 0}
										{#each importPreview.newPlans.slice(0, 3) as plan}
											<div class="preview-item">{plan}</div>
										{/each}
										{#if importPreview.newPlans.length > 3}
											<div class="preview-more">+{importPreview.newPlans.length - 3} more</div>
										{/if}
									{:else}
										<div class="preview-none">All plans exist</div>
									{/if}
								</div>
							</div>
							<div class="preview-stat">
								<span class="stat-icon">🏋️</span>
								<span class="stat-number">{membershipDisplayCount}</span>
								<span class="stat-label">New Memberships</span>
								<div class="stat-preview">
									{#each editableData.filter(row => row._isValid).slice(0, 3) as row}
										<div class="preview-item">{row.name} - {row.plan_name}</div>
									{/each}
									{#if membershipDisplayCount > 3}
										<div class="preview-more">+{membershipDisplayCount - 3} more</div>
									{/if}
								</div>
							</div>
						</div>
						
						{#if importPreview.newMembersCount > 0}
							<div class="preview-details">
								<h4>New Members to be Created:</h4>
								<ul>
									{#each importPreview.newMembers.slice(0, 10) as phone}
										<li>{phone}</li>
									{/each}
									{#if importPreview.newMembers.length > 10}
										<li>...and {importPreview.newMembers.length - 10} more</li>
									{/if}
								</ul>
							</div>
						{/if}
						
						{#if importPreview.newPlansCount > 0}
							<div class="preview-details">
								<h4>New Plans to be Created:</h4>
								<ul>
									{#each importPreview.newPlans.slice(0, 10) as plan}
										<li>{plan}</li>
									{/each}
									{#if importPreview.newPlans.length > 10}
										<li>...and {importPreview.newPlans.length - 10} more</li>
									{/if}
								</ul>
							</div>
						{/if}
					{/if}
					
					<div class="action-buttons">
						<button class="btn btn-secondary" on:click={() => currentStep = 'validate'}>
							<span class="btn-icon">←</span>
							Back to Edit
						</button>
						
						<form method="POST" action="?/importData" use:enhance={handleImport}>
							<input type="hidden" name="finalData" value={JSON.stringify(editableData.filter(row => row._isValid))} />
							<button type="submit" class="btn btn-success" disabled={isLoading}>
								{#if isLoading}
									<span class="loading-spinner"></span>
								{/if}
								<span class="btn-icon">✅</span>
								Confirm Import
							</button>
						</form>
					</div>
				</div>
			</div>
		
		{:else if currentStep === 'success'}
			<!-- Step 4: Success -->
			<div class="success-section">
				<div class="section-card">
					<div class="success-content">
						<div class="success-icon">🎉</div>
						<h2>Import Successful!</h2>
						<p>Your membership data has been imported successfully.</p>
						
						<button class="btn btn-primary" on:click={goBack}>
							<span class="btn-icon">←</span>
							Back to Memberships
						</button>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.bulk-import-page {
		max-width: 1400px;
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
	}

	.page-subtitle {
		color: var(--text-muted);
		font-size: 1.1rem;
	}

	.import-sections {
		display: grid;
		grid-template-columns: 30% 70%;
		gap: 2rem;
	}

	.section-card {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 2rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.section-card h2 {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 1.5rem;
		font-weight: 600;
		margin-bottom: 1rem;
	}

	.section-icon {
		font-size: 1.5rem;
		filter: drop-shadow(0 0 10px var(--primary));
	}

	.template-info {
		margin-top: 2rem;
		padding: 1rem;
		background: var(--bg-secondary);
		border-radius: 8px;
	}

	.template-info h4 {
		margin-bottom: 0.5rem;
		color: var(--text);
	}

	.template-info ul {
		list-style: none;
		padding: 0;
	}

	.template-info li {
		padding: 0.25rem 0;
		color: var(--text-muted);
	}

	.file-upload {
		margin: 1.5rem 0;
	}

	.file-input {
		display: none;
	}

	.file-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 1rem;
		border: 2px dashed var(--border);
		border-radius: 8px;
		cursor: pointer;
		transition: var(--transition-fast);
		background: var(--bg-secondary);
	}

	.file-label:hover {
		border-color: var(--primary);
		background: var(--gradient-glow);
	}
	
	.file-label.has-file {
		border-color: var(--primary);
		background: var(--gradient-glow);
	}
	
	.file-label.highlight-initial {
		animation: pulse-file-select 2s infinite;
		border-color: var(--primary);
	}
	
	.file-upload-row {
		display: flex;
		gap: 1rem;
		align-items: center;
	}
	
	.selected-file {
		flex: 0 0 70%;
		padding: 0.75rem;
		background: var(--bg-secondary);
		border: 1px solid var(--border);
		border-radius: 6px;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	
	.file-upload-row .file-label {
		flex: 0 0 30%;
		margin: 0;
	}
	
	.file-name {
		font-weight: 500;
		color: var(--text);
	}
	
	.file-size {
		color: var(--text-muted);
		font-size: 0.9rem;
	}
	
	.btn.highlight {
		animation: pulse-glow 2s infinite;
		box-shadow: 0 0 15px rgba(59, 130, 246, 0.5);
	}
	
	@keyframes pulse-glow {
		0%, 100% {
			box-shadow: 0 0 15px rgba(59, 130, 246, 0.5);
		}
		50% {
			box-shadow: 0 0 25px rgba(59, 130, 246, 0.8);
		}
	}
	
	@keyframes pulse-file-select {
		0%, 100% {
			border-color: var(--primary);
			background: var(--bg-secondary);
		}
		50% {
			border-color: var(--primary);
			background: var(--gradient-glow);
			box-shadow: 0 0 10px rgba(59, 130, 246, 0.3);
		}
	}

	.validation-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.validation-stats {
		display: flex;
		gap: 1rem;
	}

	.stat {
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-weight: 500;
		font-size: 0.9rem;
	}

	.stat.valid {
		background: rgba(74, 222, 128, 0.2);
		color: var(--success);
	}

	.stat.invalid {
		background: rgba(239, 68, 68, 0.2);
		color: var(--error);
	}

	.stat.total {
		background: rgba(59, 130, 246, 0.2);
		color: var(--primary);
	}

	.data-table-container {
		overflow-x: auto;
		margin: 1rem 0;
		max-height: 60vh;
		overflow-y: auto;
	}

	.data-table {
		width: 100%;
		border-collapse: collapse;
		min-width: 1200px;
	}

	.data-table th,
	.data-table td {
		padding: 0.75rem;
		text-align: left;
		border-bottom: 1px solid var(--border);
	}

	.data-table th {
		background: var(--surface-light);
		font-weight: 600;
		position: sticky;
		top: 0;
		z-index: 10;
	}

	.data-row.invalid {
		background: rgba(239, 68, 68, 0.05);
	}

	.cell-input {
		width: 100%;
		padding: 0.5rem;
		border: 1px solid var(--border);
		border-radius: 4px;
		background: var(--surface);
		color: var(--text);
		font-size: 0.9rem;
	}

	.cell-input.error {
		border-color: var(--error);
		background: rgba(239, 68, 68, 0.1);
	}

	.validation-cell {
		min-width: 120px;
	}

	.validation-status.valid {
		color: var(--success);
	}

	.validation-status.invalid {
		position: relative;
	}

	.error-details {
		position: absolute;
		top: 100%;
		left: 0;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 4px;
		padding: 0.5rem;
		z-index: 100;
		min-width: 200px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
		display: none;
	}

	.validation-status.invalid:hover .error-details {
		display: block;
	}

	.error-item {
		font-size: 0.8rem;
		color: var(--error);
		margin: 0.25rem 0;
	}

	.current-values {
		margin-top: 0.5rem;
		padding-top: 0.5rem;
		border-top: 1px solid var(--border);
		font-size: 0.75rem;
	}

	.current-values strong {
		color: var(--text);
		display: block;
		margin-bottom: 0.25rem;
	}

	.value-item {
		color: var(--text-muted);
		margin: 0.1rem 0;
		font-family: monospace;
	}

	.preview-stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 1rem;
		margin: 2rem 0;
	}

	.preview-stat {
		text-align: center;
		padding: 1.5rem;
		background: var(--gradient-glow);
		border-radius: 8px;
		border: 1px solid var(--border);
	}

	.stat-icon {
		font-size: 2rem;
		display: block;
		margin-bottom: 0.5rem;
	}

	.stat-number {
		font-size: 2rem;
		font-weight: 700;
		color: var(--primary);
		display: block;
	}

	.stat-label {
		color: var(--text-muted);
		font-size: 0.9rem;
	}

	.stat-preview {
		margin-top: 0.5rem;
		font-size: 0.75rem;
		max-height: 4rem;
		overflow-y: auto;
	}

	.preview-item {
		color: var(--text-muted);
		padding: 0.1rem 0;
		font-family: monospace;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.preview-more {
		color: var(--primary);
		font-weight: 500;
		padding: 0.1rem 0;
		font-style: italic;
	}

	.preview-none {
		color: var(--success);
		font-style: italic;
		padding: 0.1rem 0;
	}

	.preview-details {
		margin: 1.5rem 0;
		padding: 1rem;
		background: var(--bg-secondary);
		border-radius: 8px;
	}

	.preview-details h4 {
		margin-bottom: 0.5rem;
		color: var(--text);
	}

	.preview-details ul {
		list-style: none;
		padding: 0;
	}

	.preview-details li {
		padding: 0.25rem 0;
		color: var(--text-muted);
	}

	.success-section {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 50vh;
	}

	.success-content {
		text-align: center;
		padding: 3rem;
	}

	.success-icon {
		font-size: 5rem;
		margin-bottom: 1rem;
	}

	.action-buttons {
		display: flex;
		gap: 1rem;
		justify-content: flex-end;
		margin-top: 2rem;
		flex-wrap: wrap;
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

	@media (max-width: 768px) {
		.import-sections {
			grid-template-columns: 1fr;
		}

		.validation-header {
			flex-direction: column;
			align-items: flex-start;
		}

		.validation-stats {
			flex-wrap: wrap;
		}

		.preview-stats {
			grid-template-columns: 1fr;
		}

		.action-buttons {
			flex-direction: column;
		}
	}
</style>