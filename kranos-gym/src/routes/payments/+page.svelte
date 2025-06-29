<!-- Context7-grounded: Payments Management Interface -->
<script>
    import { enhance } from '$app/forms';
    import { invalidateAll } from '$app/navigation';
    import { showSuccess, showError } from '$lib/stores/toast.js';
    import { onMount } from 'svelte';

    export let data;
    export let form;

    // Context7-grounded: Reactive data
    $: expenses = data.expenses || [];
    $: categories = data.categories || [];
    $: paymentSummary = data.paymentSummary || {};
    $: trainerRates = data.trainerRates || [];
    $: members = data.members || [];
    $: currentMonth = data.currentMonth || {};

    // State management
    let showCreateModal = false;
    let showEditModal = false;
    let showDeleteModal = false;
    let showTrainerRateModal = false;
    let selectedExpense = null;
    let isLoading = false;

    // Filter state
    let filters = {
        category: '',
        startDate: currentMonth.start,
        endDate: currentMonth.end,
        recipient: '',
        paymentMethod: ''
    };

    // Form state
    let expenseForm = {
        amount: '',
        category: '',
        description: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'Bank Transfer',
        recipient: ''
    };

    let trainerRateForm = {
        trainer_id: '',
        payment_type: 'fixed',
        monthly_salary: '',
        per_session_rate: ''
    };

    let formErrors = {};

    // Context7-grounded: Format currency helper
    function formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount || 0);
    }

    // Context7-grounded: Format date helper (DD/MM/YYYY)
    function formatDate(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-GB');
    }

    // Clear form errors on input change
    function clearError(field) {
        if (formErrors[field]) {
            formErrors = { ...formErrors };
            delete formErrors[field];
        }
    }

    // Modal management
    function openCreateModal() {
        expenseForm = {
            amount: '',
            category: '',
            description: '',
            payment_date: new Date().toISOString().split('T')[0],
            payment_method: 'Bank Transfer',
            recipient: ''
        };
        formErrors = {};
        showCreateModal = true;
    }

    function openEditModal(expense) {
        selectedExpense = expense;
        expenseForm = {
            amount: expense.amount,
            category: expense.category,
            description: expense.description || '',
            payment_date: expense.payment_date,
            payment_method: expense.payment_method || 'Bank Transfer',
            recipient: expense.recipient
        };
        formErrors = {};
        showEditModal = true;
    }

    function openDeleteModal(expense) {
        selectedExpense = expense;
        showDeleteModal = true;
    }

    function openTrainerRateModal() {
        trainerRateForm = {
            trainer_id: '',
            payment_type: 'fixed',
            monthly_salary: '',
            per_session_rate: ''
        };
        formErrors = {};
        showTrainerRateModal = true;
    }

    function closeModals() {
        showCreateModal = false;
        showEditModal = false;
        showDeleteModal = false;
        showTrainerRateModal = false;
        selectedExpense = null;
        isLoading = false;
        formErrors = {};
    }

    // Context7-grounded: Form validation
    function validateExpenseForm() {
        const errors = {};
        
        if (!expenseForm.amount || parseFloat(expenseForm.amount) <= 0) {
            errors.amount = 'Amount must be greater than 0';
        }
        if (!expenseForm.category?.trim()) {
            errors.category = 'Category is required';
        }
        if (!expenseForm.recipient?.trim()) {
            errors.recipient = 'Recipient is required';
        }
        if (!expenseForm.payment_date) {
            errors.payment_date = 'Payment date is required';
        }

        return errors;
    }

    function validateTrainerRateForm() {
        const errors = {};
        
        if (!trainerRateForm.trainer_id) {
            errors.trainer_id = 'Please select a trainer';
        }
        if (!trainerRateForm.payment_type) {
            errors.payment_type = 'Please select a payment type';
        }
        if (trainerRateForm.payment_type === 'fixed' && (!trainerRateForm.monthly_salary || parseFloat(trainerRateForm.monthly_salary) <= 0)) {
            errors.monthly_salary = 'Monthly salary must be greater than 0';
        }
        if (trainerRateForm.payment_type === 'session' && (!trainerRateForm.per_session_rate || parseFloat(trainerRateForm.per_session_rate) <= 0)) {
            errors.per_session_rate = 'Per session rate must be greater than 0';
        }

        return errors;
    }

    // Context7-grounded: Enhanced form submission
    const submitExpenseForm = (action) => {
        return async ({ formData, result }) => {
            const errors = action === 'createExpense' ? validateExpenseForm() : validateExpenseForm();
            if (Object.keys(errors).length > 0) {
                formErrors = errors;
                return;
            }

            isLoading = true;
            formErrors = {};

            if (result.type === 'success') {
                if (result.data?.success === false) {
                    if (result.data.errors) {
                        formErrors = result.data.errors;
                    } else {
                        showError(result.data.error || 'An error occurred');
                    }
                } else {
                    showSuccess(action === 'createExpense' ? 'Expense created successfully!' : 'Expense updated successfully!');
                    closeModals();
                    await invalidateAll();
                }
            } else {
                showError('An error occurred. Please try again.');
            }

            isLoading = false;
        };
    };

    const submitTrainerRateForm = () => {
        return async ({ formData, result }) => {
            const errors = validateTrainerRateForm();
            if (Object.keys(errors).length > 0) {
                formErrors = errors;
                return;
            }

            isLoading = true;
            formErrors = {};

            if (result.type === 'success') {
                if (result.data?.success === false) {
                    if (result.data.errors) {
                        formErrors = result.data.errors;
                    } else {
                        showError(result.data.error || 'An error occurred');
                    }
                } else {
                    showSuccess('Trainer rate created successfully!');
                    closeModals();
                    await invalidateAll();
                }
            } else {
                showError('An error occurred. Please try again.');
            }

            isLoading = false;
        };
    };

    const submitDeleteForm = () => {
        return async ({ result }) => {
            isLoading = true;

            if (result.type === 'success') {
                if (result.data?.success === false) {
                    showError(result.data.error || 'Failed to delete expense');
                } else {
                    showSuccess('Expense deleted successfully!');
                    closeModals();
                    await invalidateAll();
                }
            } else {
                showError('An error occurred. Please try again.');
            }

            isLoading = false;
        };
    };

    // Context7-grounded: Reactive filtered expenses
    $: filteredExpenses = expenses.filter(expense => {
        if (filters.category && expense.category !== filters.category) return false;
        if (filters.recipient && !expense.recipient.toLowerCase().includes(filters.recipient.toLowerCase())) return false;
        if (filters.paymentMethod && expense.payment_method !== filters.paymentMethod) return false;
        return true;
    });

    // Handle form result
    $: if (form?.errors) {
        formErrors = form.errors;
    }
</script>

<svelte:head>
    <title>Payments - Kranos Gym</title>
</svelte:head>

<div class="page-container">
    <div class="page-header">
        <h1>💸 Payments Management</h1>
        <p>Track expenses, trainer payments, and operational costs</p>
    </div>

    <!-- Context7-grounded: Metrics Cards -->
    <div class="metrics-grid">
        <div class="metric-card">
            <div class="metric-value">{formatCurrency(paymentSummary.total_amount || 0)}</div>
            <div class="metric-label">Total Expenses</div>
            <div class="metric-period">Current Month</div>
        </div>
        
        <div class="metric-card">
            <div class="metric-value">{paymentSummary.total_expenses || 0}</div>
            <div class="metric-label">Total Transactions</div>
            <div class="metric-period">Current Month</div>
        </div>
        
        <div class="metric-card">
            <div class="metric-value">{formatCurrency(paymentSummary.avg_amount || 0)}</div>
            <div class="metric-label">Average Amount</div>
            <div class="metric-period">Per Transaction</div>
        </div>
        
        <div class="metric-card">
            <div class="metric-value">{paymentSummary.categoryBreakdown?.length || 0}</div>
            <div class="metric-label">Categories</div>
            <div class="metric-period">Active Categories</div>
        </div>
    </div>

    <!-- Context7-grounded: Action Section -->
    <div class="action-section">
        <div class="filters-container">
            <div class="filter-group">
                <label for="category-filter">Category:</label>
                <select id="category-filter" bind:value={filters.category} class="form-control">
                    <option value="">All Categories</option>
                    {#each categories as category}
                        <option value={category}>{category}</option>
                    {/each}
                </select>
            </div>
            
            <div class="filter-group">
                <label for="recipient-filter">Recipient:</label>
                <input 
                    id="recipient-filter" 
                    type="text" 
                    placeholder="Search recipient..." 
                    bind:value={filters.recipient}
                    class="form-control"
                />
            </div>
        </div>
        
        <div class="action-buttons">
            <button type="button" class="btn btn-secondary" on:click={openTrainerRateModal}>
                👤 Trainer Rates
            </button>
            <button type="button" class="btn btn-primary" on:click={openCreateModal}>
                ➕ Add Expense
            </button>
        </div>
    </div>

    <!-- Context7-grounded: Expenses Table -->
    <div class="table-container">
        <table class="table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Recipient</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                {#each filteredExpenses as expense}
                    <tr>
                        <td>{formatDate(expense.payment_date)}</td>
                        <td>
                            <span class="category-badge">{expense.category}</span>
                        </td>
                        <td>{expense.recipient}</td>
                        <td class="description-cell">{expense.description || '-'}</td>
                        <td class="amount-cell">{formatCurrency(expense.amount)}</td>
                        <td>{expense.payment_method || 'Bank Transfer'}</td>
                        <td class="actions-cell">
                            <button 
                                type="button" 
                                class="btn-icon btn-edit" 
                                on:click={() => openEditModal(expense)}
                                title="Edit expense"
                            >
                                ✏️
                            </button>
                            <button 
                                type="button" 
                                class="btn-icon btn-delete" 
                                on:click={() => openDeleteModal(expense)}
                                title="Delete expense"
                            >
                                🗑️
                            </button>
                        </td>
                    </tr>
                {/each}
                {#if filteredExpenses.length === 0}
                    <tr>
                        <td colspan="7" class="no-data">No expenses found</td>
                    </tr>
                {/if}
            </tbody>
        </table>
    </div>
</div>

<!-- Context7-grounded: Create Expense Modal -->
{#if showCreateModal}
    <div class="modal-overlay" on:click={closeModals}>
        <div class="modal" on:click|stopPropagation>
            <div class="modal-header">
                <h3>Add New Expense</h3>
                <button class="modal-close" on:click={closeModals}>×</button>
            </div>
            
            <form method="POST" action="?/createExpense" use:enhance={submitExpenseForm('createExpense')} novalidate>
                <div class="modal-body">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="amount">Amount *</label>
                            <input
                                id="amount"
                                name="amount"
                                type="number"
                                step="0.01"
                                min="0"
                                class="form-control"
                                class:error={formErrors.amount}
                                bind:value={expenseForm.amount}
                                on:input={() => clearError('amount')}
                                disabled={isLoading}
                                required
                            />
                            {#if formErrors.amount}
                                <div class="error-message">{formErrors.amount}</div>
                            {/if}
                        </div>
                        
                        <div class="form-group">
                            <label for="payment_date">Payment Date *</label>
                            <input
                                id="payment_date"
                                name="payment_date"
                                type="date"
                                class="form-control"
                                class:error={formErrors.payment_date}
                                bind:value={expenseForm.payment_date}
                                on:input={() => clearError('payment_date')}
                                disabled={isLoading}
                                required
                            />
                            {#if formErrors.payment_date}
                                <div class="error-message">{formErrors.payment_date}</div>
                            {/if}
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="category">Category *</label>
                            <input
                                id="category"
                                name="category"
                                type="text"
                                list="categories-list"
                                class="form-control"
                                class:error={formErrors.category}
                                bind:value={expenseForm.category}
                                on:input={() => clearError('category')}
                                disabled={isLoading}
                                placeholder="e.g., Trainer Fees, Marketing, Equipment"
                                required
                            />
                            <datalist id="categories-list">
                                {#each categories as category}
                                    <option value={category} />
                                {/each}
                            </datalist>
                            {#if formErrors.category}
                                <div class="error-message">{formErrors.category}</div>
                            {/if}
                        </div>
                        
                        <div class="form-group">
                            <label for="recipient">Recipient *</label>
                            <input
                                id="recipient"
                                name="recipient"
                                type="text"
                                class="form-control"
                                class:error={formErrors.recipient}
                                bind:value={expenseForm.recipient}
                                on:input={() => clearError('recipient')}
                                disabled={isLoading}
                                placeholder="Person or company name"
                                required
                            />
                            {#if formErrors.recipient}
                                <div class="error-message">{formErrors.recipient}</div>
                            {/if}
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="payment_method">Payment Method</label>
                        <select
                            id="payment_method"
                            name="payment_method"
                            class="form-control"
                            bind:value={expenseForm.payment_method}
                            disabled={isLoading}
                        >
                            <option value="Bank Transfer">Bank Transfer</option>
                            <option value="Cash">Cash</option>
                            <option value="UPI">UPI</option>
                            <option value="Card">Card</option>
                            <option value="Cheque">Cheque</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="description">Description</label>
                        <textarea
                            id="description"
                            name="description"
                            class="form-control"
                            rows="3"
                            bind:value={expenseForm.description}
                            disabled={isLoading}
                            placeholder="Optional details about the expense"
                        ></textarea>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" on:click={closeModals} disabled={isLoading}>
                        Cancel
                    </button>
                    <button type="submit" class="btn btn-primary" disabled={isLoading}>
                        {#if isLoading}Creating...{:else}Create Expense{/if}
                    </button>
                </div>
            </form>
        </div>
    </div>
{/if}

<!-- Context7-grounded: Edit Expense Modal -->
{#if showEditModal && selectedExpense}
    <div class="modal-overlay" on:click={closeModals}>
        <div class="modal" on:click|stopPropagation>
            <div class="modal-header">
                <h3>Edit Expense</h3>
                <button class="modal-close" on:click={closeModals}>×</button>
            </div>
            
            <form method="POST" action="?/updateExpense" use:enhance={submitExpenseForm('updateExpense')} novalidate>
                <input type="hidden" name="id" value={selectedExpense.id} />
                
                <div class="modal-body">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="edit-amount">Amount *</label>
                            <input
                                id="edit-amount"
                                name="amount"
                                type="number"
                                step="0.01"
                                min="0"
                                class="form-control"
                                class:error={formErrors.amount}
                                bind:value={expenseForm.amount}
                                on:input={() => clearError('amount')}
                                disabled={isLoading}
                                required
                            />
                            {#if formErrors.amount}
                                <div class="error-message">{formErrors.amount}</div>
                            {/if}
                        </div>
                        
                        <div class="form-group">
                            <label for="edit-payment_date">Payment Date *</label>
                            <input
                                id="edit-payment_date"
                                name="payment_date"
                                type="date"
                                class="form-control"
                                class:error={formErrors.payment_date}
                                bind:value={expenseForm.payment_date}
                                on:input={() => clearError('payment_date')}
                                disabled={isLoading}
                                required
                            />
                            {#if formErrors.payment_date}
                                <div class="error-message">{formErrors.payment_date}</div>
                            {/if}
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="edit-category">Category *</label>
                            <input
                                id="edit-category"
                                name="category"
                                type="text"
                                list="edit-categories-list"
                                class="form-control"
                                class:error={formErrors.category}
                                bind:value={expenseForm.category}
                                on:input={() => clearError('category')}
                                disabled={isLoading}
                                required
                            />
                            <datalist id="edit-categories-list">
                                {#each categories as category}
                                    <option value={category} />
                                {/each}
                            </datalist>
                            {#if formErrors.category}
                                <div class="error-message">{formErrors.category}</div>
                            {/if}
                        </div>
                        
                        <div class="form-group">
                            <label for="edit-recipient">Recipient *</label>
                            <input
                                id="edit-recipient"
                                name="recipient"
                                type="text"
                                class="form-control"
                                class:error={formErrors.recipient}
                                bind:value={expenseForm.recipient}
                                on:input={() => clearError('recipient')}
                                disabled={isLoading}
                                required
                            />
                            {#if formErrors.recipient}
                                <div class="error-message">{formErrors.recipient}</div>
                            {/if}
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="edit-payment_method">Payment Method</label>
                        <select
                            id="edit-payment_method"
                            name="payment_method"
                            class="form-control"
                            bind:value={expenseForm.payment_method}
                            disabled={isLoading}
                        >
                            <option value="Bank Transfer">Bank Transfer</option>
                            <option value="Cash">Cash</option>
                            <option value="UPI">UPI</option>
                            <option value="Card">Card</option>
                            <option value="Cheque">Cheque</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="edit-description">Description</label>
                        <textarea
                            id="edit-description"
                            name="description"
                            class="form-control"
                            rows="3"
                            bind:value={expenseForm.description}
                            disabled={isLoading}
                        ></textarea>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" on:click={closeModals} disabled={isLoading}>
                        Cancel
                    </button>
                    <button type="submit" class="btn btn-primary" disabled={isLoading}>
                        {#if isLoading}Updating...{:else}Update Expense{/if}
                    </button>
                </div>
            </form>
        </div>
    </div>
{/if}

<!-- Context7-grounded: Delete Confirmation Modal -->
{#if showDeleteModal && selectedExpense}
    <div class="modal-overlay" on:click={closeModals}>
        <div class="modal" on:click|stopPropagation>
            <div class="modal-header">
                <h3>Delete Expense</h3>
                <button class="modal-close" on:click={closeModals}>×</button>
            </div>
            
            <form method="POST" action="?/deleteExpense" use:enhance={submitDeleteForm} novalidate>
                <input type="hidden" name="id" value={selectedExpense.id} />
                
                <div class="modal-body">
                    <p>Are you sure you want to delete this expense?</p>
                    <div class="expense-details">
                        <strong>{formatCurrency(selectedExpense.amount)}</strong> - {selectedExpense.category}<br>
                        <small>Paid to: {selectedExpense.recipient}</small>
                    </div>
                    <p class="text-warning">This action cannot be undone.</p>
                </div>
                
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" on:click={closeModals} disabled={isLoading}>
                        Cancel
                    </button>
                    <button type="submit" class="btn btn-danger" disabled={isLoading}>
                        {#if isLoading}Deleting...{:else}Delete Expense{/if}
                    </button>
                </div>
            </form>
        </div>
    </div>
{/if}

<!-- Context7-grounded: Trainer Rate Modal -->
{#if showTrainerRateModal}
    <div class="modal-overlay" on:click={closeModals}>
        <div class="modal" on:click|stopPropagation>
            <div class="modal-header">
                <h3>Setup Trainer Payment Rate</h3>
                <button class="modal-close" on:click={closeModals}>×</button>
            </div>
            
            <form method="POST" action="?/createTrainerRate" use:enhance={submitTrainerRateForm} novalidate>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="trainer_id">Trainer *</label>
                        <select
                            id="trainer_id"
                            name="trainer_id"
                            class="form-control"
                            class:error={formErrors.trainer_id}
                            bind:value={trainerRateForm.trainer_id}
                            on:change={() => clearError('trainer_id')}
                            disabled={isLoading}
                            required
                        >
                            <option value="">Select a trainer</option>
                            {#each members as member}
                                <option value={member.id}>{member.name}</option>
                            {/each}
                        </select>
                        {#if formErrors.trainer_id}
                            <div class="error-message">{formErrors.trainer_id}</div>
                        {/if}
                    </div>
                    
                    <div class="form-group">
                        <label for="payment_type">Payment Type *</label>
                        <select
                            id="payment_type"
                            name="payment_type"
                            class="form-control"
                            class:error={formErrors.payment_type}
                            bind:value={trainerRateForm.payment_type}
                            on:change={() => clearError('payment_type')}
                            disabled={isLoading}
                            required
                        >
                            <option value="fixed">Fixed Monthly Salary</option>
                            <option value="session">Per Session Payment</option>
                        </select>
                        {#if formErrors.payment_type}
                            <div class="error-message">{formErrors.payment_type}</div>
                        {/if}
                    </div>
                    
                    {#if trainerRateForm.payment_type === 'fixed'}
                        <div class="form-group">
                            <label for="monthly_salary">Monthly Salary *</label>
                            <input
                                id="monthly_salary"
                                name="monthly_salary"
                                type="number"
                                step="0.01"
                                min="0"
                                class="form-control"
                                class:error={formErrors.monthly_salary}
                                bind:value={trainerRateForm.monthly_salary}
                                on:input={() => clearError('monthly_salary')}
                                disabled={isLoading}
                                placeholder="Enter monthly salary amount"
                                required
                            />
                            {#if formErrors.monthly_salary}
                                <div class="error-message">{formErrors.monthly_salary}</div>
                            {/if}
                        </div>
                    {:else if trainerRateForm.payment_type === 'session'}
                        <div class="form-group">
                            <label for="per_session_rate">Per Session Rate *</label>
                            <input
                                id="per_session_rate"
                                name="per_session_rate"
                                type="number"
                                step="0.01"
                                min="0"
                                class="form-control"
                                class:error={formErrors.per_session_rate}
                                bind:value={trainerRateForm.per_session_rate}
                                on:input={() => clearError('per_session_rate')}
                                disabled={isLoading}
                                placeholder="Enter per session amount"
                                required
                            />
                            {#if formErrors.per_session_rate}
                                <div class="error-message">{formErrors.per_session_rate}</div>
                            {/if}
                        </div>
                    {/if}
                    
                    <div class="info-box">
                        <strong>Note:</strong> Setting up a new rate will deactivate any existing rate for this trainer.
                        All payments for the previous month go out on the 10th of the current month.
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" on:click={closeModals} disabled={isLoading}>
                        Cancel
                    </button>
                    <button type="submit" class="btn btn-primary" disabled={isLoading}>
                        {#if isLoading}Setting up...{:else}Setup Rate{/if}
                    </button>
                </div>
            </form>
        </div>
    </div>
{/if}

<style>
    .page-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0;
    }

    .page-header {
        margin-bottom: 2rem;
    }

    .page-header h1 {
        font-size: 2rem;
        font-weight: 700;
        color: var(--text);
        margin-bottom: 0.5rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .page-header p {
        color: var(--text-muted);
        margin: 0;
    }

    /* Context7-grounded: Metrics grid */
    .metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1.5rem;
        margin-bottom: 2rem;
    }

    .metric-card {
        background: var(--gradient-dark);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 1.5rem;
        text-align: center;
        transition: var(--transition-medium);
    }

    .metric-card:hover {
        border-color: var(--primary);
        box-shadow: var(--shadow-glow);
        transform: translateY(-2px);
    }

    .metric-value {
        font-size: 2rem;
        font-weight: 700;
        color: var(--primary);
        margin-bottom: 0.5rem;
    }

    .metric-label {
        font-size: 1rem;
        font-weight: 600;
        color: var(--text);
        margin-bottom: 0.25rem;
    }

    .metric-period {
        font-size: 0.8rem;
        color: var(--text-muted);
    }

    /* Action section */
    .action-section {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        margin-bottom: 1.5rem;
        gap: 1rem;
    }

    .filters-container {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
    }

    .filter-group {
        display: flex;
        flex-direction: column;
        min-width: 150px;
    }

    .filter-group label {
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--text-muted);
        margin-bottom: 0.25rem;
    }

    .action-buttons {
        display: flex;
        gap: 0.75rem;
    }

    /* Context7-grounded: Table styling */
    .table-container {
        background: var(--gradient-dark);
        border: 1px solid var(--border);
        border-radius: 12px;
        overflow: hidden;
        box-shadow: var(--shadow-soft);
    }

    .table {
        width: 100%;
        border-collapse: collapse;
    }

    .table th {
        background: var(--surface-light);
        color: var(--text);
        font-weight: 600;
        font-size: 0.9rem;
        padding: 1rem;
        text-align: left;
        border-bottom: 1px solid var(--border);
    }

    .table td {
        padding: 1rem;
        border-bottom: 1px solid var(--border);
        color: var(--text);
        font-size: 0.9rem;
    }

    .table tr:last-child td {
        border-bottom: none;
    }

    .table tr:hover {
        background: var(--surface-light);
    }

    .category-badge {
        background: var(--gradient-primary);
        color: white;
        font-size: 0.75rem;
        font-weight: 600;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        white-space: nowrap;
    }

    .description-cell {
        max-width: 200px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .amount-cell {
        font-weight: 600;
        color: var(--primary);
        text-align: right;
    }

    .actions-cell {
        white-space: nowrap;
        text-align: center;
    }

    .btn-icon {
        background: none;
        border: none;
        font-size: 1.2rem;
        cursor: pointer;
        padding: 0.5rem;
        border-radius: 6px;
        transition: var(--transition-fast);
        margin: 0 0.25rem;
    }

    .btn-icon:hover {
        background: var(--surface-light);
        transform: scale(1.1);
    }

    .btn-edit:hover {
        background: rgba(59, 130, 246, 0.1);
    }

    .btn-delete:hover {
        background: rgba(239, 68, 68, 0.1);
    }

    .no-data {
        text-align: center;
        color: var(--text-muted);
        font-style: italic;
        padding: 2rem;
    }

    /* Context7-grounded: Modal styling */
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
        padding: 1rem;
    }

    .modal {
        background: var(--gradient-dark);
        border: 1px solid var(--border);
        border-radius: 12px;
        max-width: 600px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: var(--shadow-hard);
    }

    .modal-header {
        padding: 1.5rem;
        border-bottom: 1px solid var(--border);
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .modal-header h3 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
        color: var(--text);
    }

    .modal-close {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        padding: 0.25rem;
        color: var(--text-muted);
        transition: var(--transition-fast);
    }

    .modal-close:hover {
        color: var(--text);
    }

    .modal-body {
        padding: 1.5rem;
    }

    .modal-footer {
        padding: 1.5rem;
        border-top: 1px solid var(--border);
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
    }

    .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
        margin-bottom: 1rem;
    }

    .form-group {
        margin-bottom: 1.5rem;
    }

    .form-group label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 600;
        color: var(--text);
        font-size: 0.9rem;
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

    .expense-details {
        background: var(--surface-light);
        padding: 1rem;
        border-radius: 6px;
        margin: 1rem 0;
        border-left: 4px solid var(--primary);
    }

    .text-warning {
        color: var(--warning);
        font-size: 0.9rem;
        margin-bottom: 0;
    }

    .info-box {
        background: rgba(59, 130, 246, 0.1);
        border: 1px solid rgba(59, 130, 246, 0.3);
        color: #3b82f6;
        padding: 1rem;
        border-radius: 6px;
        font-size: 0.9rem;
        margin-top: 1rem;
    }

    /* Context7-grounded: Mobile responsive */
    @media (max-width: 768px) {
        .metrics-grid {
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
        }

        .action-section {
            flex-direction: column;
            align-items: stretch;
        }

        .filters-container {
            margin-bottom: 1rem;
        }

        .filter-group {
            min-width: 120px;
        }

        .table-container {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
        }

        .table {
            min-width: 800px;
        }

        .modal {
            margin: 0.5rem;
            max-height: calc(100vh - 1rem);
        }

        .form-row {
            grid-template-columns: 1fr;
        }
    }

    @media (max-width: 480px) {
        .metrics-grid {
            grid-template-columns: 1fr;
        }

        .metric-value {
            font-size: 1.5rem;
        }

        .filters-container {
            flex-direction: column;
        }

        .action-buttons {
            flex-direction: column;
        }

        .table {
            min-width: 900px;
        }
    }
</style>