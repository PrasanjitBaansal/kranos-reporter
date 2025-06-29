<script>
    import { enhance } from '$app/forms';
    import { page } from '$app/stores';
    import { showSuccess, showError } from '$lib/stores/toast.js';
    import { onMount } from 'svelte';
    
    export let data;
    export let form;
    
    let users = data.users || [];
    let showCreateModal = false;
    let showEditModal = false;
    let showDeleteModal = false;
    let showPasswordModal = false;
    let selectedUser = null;
    let isLoading = false;
    let searchTerm = '';
    let statusFilter = 'active';
    let roleFilter = '';
    
    // Form data
    let createForm = {
        username: '',
        email: '',
        password: '',
        role: 'trainer'
    };
    
    let editForm = {
        username: '',
        email: '',
        role: '',
        status: ''
    };
    
    let passwordForm = {
        newPassword: '',
        confirmPassword: ''
    };
    
    // Available roles
    const roles = [
        { value: 'admin', label: 'Admin', description: 'Full system access except super user functions' },
        { value: 'trainer', label: 'Trainer', description: 'Operational access to members, plans, and memberships' },
        { value: 'member', label: 'Member', description: 'Future customer portal access (not used currently)' }
    ];
    
    // Handle form responses
    $: if (form?.success) {
        showSuccess(form.message || 'Operation completed successfully');
        closeModals();
        if (form.user) {
            // Update user in list
            const index = users.findIndex(u => u.id === form.user.id);
            if (index >= 0) {
                users[index] = form.user;
            } else {
                users = [form.user, ...users];
            }
            users = users; // Trigger reactivity
        }
    } else if (form?.error) {
        showError(form.error);
        isLoading = false;
    }
    
    // Filtered users
    $: filteredUsers = users.filter(user => {
        const matchesSearch = !searchTerm || 
            user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = !statusFilter || 
            (statusFilter === 'active' && user.status === 'active') ||
            (statusFilter === 'inactive' && user.status === 'inactive') ||
            statusFilter === 'all';
        
        const matchesRole = !roleFilter || user.role === roleFilter;
        
        return matchesSearch && matchesStatus && matchesRole;
    });
    
    function openCreateModal() {
        createForm = { username: '', email: '', password: '', role: 'trainer' };
        showCreateModal = true;
    }
    
    function openEditModal(user) {
        selectedUser = user;
        editForm = {
            username: user.username,
            email: user.email,
            role: user.role,
            status: user.status
        };
        showEditModal = true;
    }
    
    function openDeleteModal(user) {
        selectedUser = user;
        showDeleteModal = true;
    }
    
    function openPasswordModal(user) {
        selectedUser = user;
        passwordForm = { newPassword: '', confirmPassword: '' };
        showPasswordModal = true;
    }
    
    function closeModals() {
        showCreateModal = false;
        showEditModal = false;
        showDeleteModal = false;
        showPasswordModal = false;
        selectedUser = null;
        isLoading = false;
        
        // Reset forms
        createForm = { username: '', email: '', password: '', role: 'trainer' };
        editForm = { username: '', email: '', role: '', status: '' };
        passwordForm = { newPassword: '', confirmPassword: '' };
    }
    
    function handleCreateSubmit() {
        if (!createForm.username || !createForm.email || !createForm.password) {
            showError('Please fill in all required fields');
            return false;
        }
        
        if (createForm.password.length < 8) {
            showError('Password must be at least 8 characters');
            return false;
        }
        
        isLoading = true;
        return true;
    }
    
    function handleEditSubmit() {
        if (!editForm.username || !editForm.email) {
            showError('Username and email are required');
            return false;
        }
        
        isLoading = true;
        return true;
    }
    
    function handlePasswordSubmit() {
        if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
            showError('Please fill in both password fields');
            return false;
        }
        
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            showError('Passwords do not match');
            return false;
        }
        
        if (passwordForm.newPassword.length < 8) {
            showError('Password must be at least 8 characters');
            return false;
        }
        
        isLoading = true;
        return true;
    }
    
    function formatDate(dateStr) {
        if (!dateStr) return 'Never';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-GB') + ' ' + date.toLocaleTimeString('en-GB', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }
    
    function getRoleColor(role) {
        switch (role) {
            case 'admin': return 'var(--primary)';
            case 'trainer': return 'var(--info)';
            case 'member': return 'var(--text-muted)';
            default: return 'var(--text-muted)';
        }
    }
    
    function getStatusColor(status) {
        switch (status) {
            case 'active': return 'var(--success)';
            case 'inactive': return 'var(--warning)';
            default: return 'var(--text-muted)';
        }
    }
</script>

<svelte:head>
    <title>User Management - Kranos Gym</title>
</svelte:head>

<div class="users-page">
    <div class="page-header">
        <h1 class="page-title">
            <span class="page-icon">👤</span>
            User Management
        </h1>
        <button class="btn btn-primary" on:click={openCreateModal}>
            <span>➕</span>
            Add New User
        </button>
    </div>
    
    <div class="filters-section card">
        <div class="filters-grid">
            <div class="filter-group">
                <label for="search">Search Users</label>
                <input
                    id="search"
                    type="text"
                    class="form-control"
                    placeholder="Search by username or email..."
                    bind:value={searchTerm}
                />
            </div>
            
            <div class="filter-group">
                <label for="status-filter">Status</label>
                <select id="status-filter" class="form-control" bind:value={statusFilter}>
                    <option value="active">Active Only</option>
                    <option value="inactive">Inactive Only</option>
                    <option value="all">All Status</option>
                </select>
            </div>
            
            <div class="filter-group">
                <label for="role-filter">Role</label>
                <select id="role-filter" class="form-control" bind:value={roleFilter}>
                    <option value="">All Roles</option>
                    {#each roles as role}
                        <option value={role.value}>{role.label}</option>
                    {/each}
                </select>
            </div>
        </div>
    </div>
    
    <div class="users-table-container card">
        <div class="table-header">
            <h2>Users ({filteredUsers.length})</h2>
        </div>
        
        {#if filteredUsers.length === 0}
            <div class="empty-state">
                <div class="empty-icon">👥</div>
                <h3>No users found</h3>
                <p>
                    {#if searchTerm || statusFilter !== 'active' || roleFilter}
                        Try adjusting your filters to see more users.
                    {:else}
                        Get started by creating your first user account.
                    {/if}
                </p>
            </div>
        {:else}
            <div class="table-responsive">
                <table class="users-table">
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Last Login</th>
                            <th>Created</th>
                            <th class="actions-column">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each filteredUsers as user}
                            <tr>
                                <td class="user-info">
                                    <div class="user-avatar">
                                        {user.username.charAt(0).toUpperCase()}
                                    </div>
                                    <div class="user-details">
                                        <div class="username">{user.username}</div>
                                        <div class="email">{user.email}</div>
                                    </div>
                                </td>
                                <td>
                                    <span 
                                        class="role-badge" 
                                        style="color: {getRoleColor(user.role)}"
                                    >
                                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                                    </span>
                                </td>
                                <td>
                                    <span 
                                        class="status-badge {user.status}"
                                        style="color: {getStatusColor(user.status)}"
                                    >
                                        {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                                    </span>
                                </td>
                                <td class="last-login">{formatDate(user.last_login_at)}</td>
                                <td class="created-date">{formatDate(user.created_at)}</td>
                                <td class="actions">
                                    <div class="action-buttons">
                                        <button 
                                            class="btn-icon edit" 
                                            on:click={() => openEditModal(user)}
                                            title="Edit user"
                                        >
                                            ✏️
                                        </button>
                                        <button 
                                            class="btn-icon password" 
                                            on:click={() => openPasswordModal(user)}
                                            title="Reset password"
                                        >
                                            🔑
                                        </button>
                                        <button 
                                            class="btn-icon delete" 
                                            on:click={() => openDeleteModal(user)}
                                            title="Deactivate user"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        {/if}
    </div>
</div>

<!-- Create User Modal -->
{#if showCreateModal}
    <div class="modal-overlay" on:click={closeModals}>
        <div class="modal" on:click|stopPropagation>
            <div class="modal-header">
                <h3>Create New User</h3>
                <button class="modal-close" on:click={closeModals}>×</button>
            </div>
            
            <form 
                method="POST" 
                action="?/create" 
                use:enhance={() => {
                    if (!handleCreateSubmit()) return;
                    return ({ result }) => {
                        if (result.type === 'success') {
                            showSuccess('User created successfully');
                            closeModals();
                            // Refresh page to get updated user list
                            location.reload();
                        }
                    };
                }}
            >
                <div class="modal-body">
                    <div class="form-group">
                        <label for="create-username">Username *</label>
                        <input
                            id="create-username"
                            name="username"
                            type="text"
                            class="form-control"
                            placeholder="Enter username"
                            bind:value={createForm.username}
                            required
                        />
                    </div>
                    
                    <div class="form-group">
                        <label for="create-email">Email *</label>
                        <input
                            id="create-email"
                            name="email"
                            type="email"
                            class="form-control"
                            placeholder="Enter email address"
                            bind:value={createForm.email}
                            required
                        />
                    </div>
                    
                    <div class="form-group">
                        <label for="create-password">Password *</label>
                        <input
                            id="create-password"
                            name="password"
                            type="password"
                            class="form-control"
                            placeholder="Enter password (min 8 characters)"
                            bind:value={createForm.password}
                            required
                        />
                    </div>
                    
                    <div class="form-group">
                        <label for="create-role">Role *</label>
                        <select
                            id="create-role"
                            name="role"
                            class="form-control"
                            bind:value={createForm.role}
                            required
                        >
                            {#each roles as role}
                                <option value={role.value}>{role.label}</option>
                            {/each}
                        </select>
                        <small class="form-help">
                            {roles.find(r => r.value === createForm.role)?.description || ''}
                        </small>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" on:click={closeModals}>
                        Cancel
                    </button>
                    <button type="submit" class="btn btn-primary" disabled={isLoading}>
                        {#if isLoading}Creating...{:else}Create User{/if}
                    </button>
                </div>
            </form>
        </div>
    </div>
{/if}

<!-- Edit User Modal -->
{#if showEditModal && selectedUser}
    <div class="modal-overlay" on:click={closeModals}>
        <div class="modal" on:click|stopPropagation>
            <div class="modal-header">
                <h3>Edit User: {selectedUser.username}</h3>
                <button class="modal-close" on:click={closeModals}>×</button>
            </div>
            
            <form 
                method="POST" 
                action="?/update" 
                use:enhance={() => {
                    if (!handleEditSubmit()) return;
                    return ({ result }) => {
                        if (result.type === 'success') {
                            showSuccess('User updated successfully');
                            closeModals();
                            location.reload();
                        }
                    };
                }}
            >
                <input type="hidden" name="userId" value={selectedUser.id} />
                
                <div class="modal-body">
                    <div class="form-group">
                        <label for="edit-username">Username</label>
                        <input
                            id="edit-username"
                            name="username"
                            type="text"
                            class="form-control"
                            bind:value={editForm.username}
                            required
                        />
                    </div>
                    
                    <div class="form-group">
                        <label for="edit-email">Email</label>
                        <input
                            id="edit-email"
                            name="email"
                            type="email"
                            class="form-control"
                            bind:value={editForm.email}
                            required
                        />
                    </div>
                    
                    <div class="form-group">
                        <label for="edit-role">Role</label>
                        <select
                            id="edit-role"
                            name="role"
                            class="form-control"
                            bind:value={editForm.role}
                        >
                            {#each roles as role}
                                <option value={role.value}>{role.label}</option>
                            {/each}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="edit-status">Status</label>
                        <select
                            id="edit-status"
                            name="status"
                            class="form-control"
                            bind:value={editForm.status}
                        >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" on:click={closeModals}>
                        Cancel
                    </button>
                    <button type="submit" class="btn btn-primary" disabled={isLoading}>
                        {#if isLoading}Updating...{:else}Update User{/if}
                    </button>
                </div>
            </form>
        </div>
    </div>
{/if}

<!-- Reset Password Modal -->
{#if showPasswordModal && selectedUser}
    <div class="modal-overlay" on:click={closeModals}>
        <div class="modal" on:click|stopPropagation>
            <div class="modal-header">
                <h3>Reset Password: {selectedUser.username}</h3>
                <button class="modal-close" on:click={closeModals}>×</button>
            </div>
            
            <form 
                method="POST" 
                action="?/resetPassword" 
                use:enhance={() => {
                    if (!handlePasswordSubmit()) return;
                    return ({ result }) => {
                        if (result.type === 'success') {
                            showSuccess('Password reset successfully');
                            closeModals();
                        }
                    };
                }}
            >
                <input type="hidden" name="userId" value={selectedUser.id} />
                
                <div class="modal-body">
                    <div class="form-group">
                        <label for="new-password">New Password</label>
                        <input
                            id="new-password"
                            name="newPassword"
                            type="password"
                            class="form-control"
                            placeholder="Enter new password (min 8 characters)"
                            bind:value={passwordForm.newPassword}
                            required
                        />
                    </div>
                    
                    <div class="form-group">
                        <label for="confirm-password">Confirm Password</label>
                        <input
                            id="confirm-password"
                            type="password"
                            class="form-control"
                            placeholder="Confirm new password"
                            bind:value={passwordForm.confirmPassword}
                            required
                        />
                    </div>
                    
                    <div class="alert alert-info">
                        <strong>Note:</strong> The user will be required to change their password on next login.
                        All existing sessions will be invalidated.
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" on:click={closeModals}>
                        Cancel
                    </button>
                    <button type="submit" class="btn btn-primary" disabled={isLoading}>
                        {#if isLoading}Resetting...{:else}Reset Password{/if}
                    </button>
                </div>
            </form>
        </div>
    </div>
{/if}

<!-- Delete User Modal -->
{#if showDeleteModal && selectedUser}
    <div class="modal-overlay" on:click={closeModals}>
        <div class="modal" on:click|stopPropagation>
            <div class="modal-header">
                <h3>Deactivate User</h3>
                <button class="modal-close" on:click={closeModals}>×</button>
            </div>
            
            <form 
                method="POST" 
                action="?/delete" 
                use:enhance={() => {
                    isLoading = true;
                    return ({ result }) => {
                        if (result.type === 'success') {
                            showSuccess('User deactivated successfully');
                            closeModals();
                            location.reload();
                        }
                    };
                }}
            >
                <input type="hidden" name="userId" value={selectedUser.id} />
                
                <div class="modal-body">
                    <div class="alert alert-warning">
                        <strong>Warning:</strong> This will deactivate the user account for:
                    </div>
                    
                    <div class="user-summary">
                        <div class="user-avatar large">
                            {selectedUser.username.charAt(0).toUpperCase()}
                        </div>
                        <div class="user-details">
                            <div class="username">{selectedUser.username}</div>
                            <div class="email">{selectedUser.email}</div>
                            <div class="role">Role: {selectedUser.role}</div>
                        </div>
                    </div>
                    
                    <div class="alert alert-info">
                        The user will be deactivated (not permanently deleted) and all active sessions will be terminated.
                        This action can be reversed by editing the user and changing their status back to active.
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" on:click={closeModals}>
                        Cancel
                    </button>
                    <button type="submit" class="btn btn-danger" disabled={isLoading}>
                        {#if isLoading}Deactivating...{:else}Deactivate User{/if}
                    </button>
                </div>
            </form>
        </div>
    </div>
{/if}

<style>
    .users-page {
        max-width: 1200px;
        margin: 0 auto;
        padding: 2rem 1rem;
    }
    
    .page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2rem;
    }
    
    .page-title {
        display: flex;
        align-items: center;
        gap: 1rem;
        font-size: 2rem;
        font-weight: 700;
        margin: 0;
        background: var(--gradient-primary);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
    }
    
    .page-icon {
        font-size: 2.5rem;
        filter: drop-shadow(0 0 10px var(--primary));
    }
    
    .filters-section {
        margin-bottom: 2rem;
    }
    
    .filters-grid {
        display: grid;
        grid-template-columns: 2fr 1fr 1fr;
        gap: 1rem;
        align-items: end;
    }
    
    .filter-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .filter-group label {
        font-weight: 600;
        color: var(--text);
        font-size: 0.9rem;
    }
    
    .users-table-container {
        overflow: hidden;
    }
    
    .table-header {
        padding: 1.5rem;
        border-bottom: 1px solid var(--border);
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    
    .table-header h2 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
    }
    
    .table-responsive {
        overflow-x: auto;
    }
    
    .users-table {
        width: 100%;
        border-collapse: collapse;
    }
    
    .users-table th,
    .users-table td {
        padding: 1rem;
        text-align: left;
        border-bottom: 1px solid var(--border);
    }
    
    .users-table th {
        font-weight: 600;
        color: var(--text-muted);
        background: var(--surface-light);
        font-size: 0.9rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    
    .user-info {
        display: flex;
        align-items: center;
        gap: 1rem;
    }
    
    .user-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: var(--gradient-primary);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 600;
        font-size: 1rem;
        flex-shrink: 0;
    }
    
    .user-avatar.large {
        width: 60px;
        height: 60px;
        font-size: 1.5rem;
    }
    
    .user-details .username {
        font-weight: 600;
        color: var(--text);
        margin-bottom: 0.25rem;
    }
    
    .user-details .email {
        color: var(--text-muted);
        font-size: 0.9rem;
    }
    
    .user-details .role {
        color: var(--text-muted);
        font-size: 0.85rem;
        margin-top: 0.25rem;
    }
    
    .role-badge,
    .status-badge {
        font-weight: 600;
        font-size: 0.85rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    
    .last-login,
    .created-date {
        color: var(--text-muted);
        font-size: 0.9rem;
    }
    
    .actions-column {
        width: 150px;
    }
    
    .action-buttons {
        display: flex;
        gap: 0.5rem;
    }
    
    .btn-icon {
        background: none;
        border: 1px solid var(--border);
        border-radius: 6px;
        padding: 0.5rem;
        cursor: pointer;
        transition: var(--transition-fast);
        font-size: 1rem;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .btn-icon:hover {
        background: var(--surface-light);
        border-color: var(--primary);
    }
    
    .btn-icon.delete:hover {
        background: rgba(239, 68, 68, 0.1);
        border-color: #ef4444;
    }
    
    .empty-state {
        text-align: center;
        padding: 4rem 2rem;
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
        z-index: 1000;
        padding: 1rem;
    }
    
    .modal {
        background: var(--gradient-dark);
        border: 1px solid var(--border);
        border-radius: 12px;
        max-width: 500px;
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
    }
    
    .modal-close {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        padding: 0.25rem;
        color: var(--text-muted);
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
    
    .form-group {
        margin-bottom: 1.5rem;
    }
    
    .form-group label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 600;
        color: var(--text);
    }
    
    .form-help {
        display: block;
        margin-top: 0.5rem;
        color: var(--text-muted);
        font-size: 0.85rem;
        font-style: italic;
    }
    
    .alert {
        padding: 1rem;
        border-radius: 6px;
        margin-bottom: 1rem;
    }
    
    .alert-info {
        background: rgba(59, 130, 246, 0.1);
        border: 1px solid rgba(59, 130, 246, 0.3);
        color: #3b82f6;
    }
    
    .alert-warning {
        background: rgba(245, 158, 11, 0.1);
        border: 1px solid rgba(245, 158, 11, 0.3);
        color: #f59e0b;
    }
    
    .user-summary {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin: 1.5rem 0;
        padding: 1rem;
        background: var(--surface);
        border-radius: 8px;
        border: 1px solid var(--border);
    }
    
    @media (max-width: 768px) {
        .users-page {
            padding: 1rem 0.5rem;
        }
        
        .page-header {
            flex-direction: column;
            gap: 1rem;
            align-items: stretch;
        }
        
        .filters-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
        }
        
        .users-table {
            font-size: 0.9rem;
        }
        
        .users-table th,
        .users-table td {
            padding: 0.75rem 0.5rem;
        }
        
        .action-buttons {
            gap: 0.25rem;
        }
        
        .btn-icon {
            width: 32px;
            height: 32px;
            font-size: 0.9rem;
        }
        
        .modal {
            margin: 0.5rem;
        }
        
        .modal-header,
        .modal-body,
        .modal-footer {
            padding: 1rem;
        }
    }
</style>