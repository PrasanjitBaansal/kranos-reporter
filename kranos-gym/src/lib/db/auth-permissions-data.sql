-- Default Permissions and Role Mappings
-- Kranos Gym Management System Authentication

-- ============================================================================
-- PERMISSIONS DATA - Granular permission definitions
-- ============================================================================

-- Member Management Permissions
INSERT INTO permissions (name, description, category) VALUES
('members.view', 'View member list and details', 'members'),
('members.create', 'Create new members', 'members'),
('members.edit', 'Edit existing member information', 'members'),
('members.delete', 'Delete members (soft delete)', 'members'),
('members.export', 'Export member data', 'members');

-- Plan Management Permissions
INSERT INTO permissions (name, description, category) VALUES
('plans.view', 'View plan list and details', 'plans'),
('plans.create', 'Create new plans', 'plans'),
('plans.edit', 'Edit existing plans', 'plans'),
('plans.delete', 'Delete plans (soft delete)', 'plans');

-- Membership Management Permissions
INSERT INTO permissions (name, description, category) VALUES
('memberships.view', 'View membership list and details', 'memberships'),
('memberships.create', 'Create new memberships', 'memberships'),
('memberships.edit', 'Edit existing memberships', 'memberships'),
('memberships.delete', 'Delete memberships', 'memberships'),
('memberships.bulk_import', 'Bulk import memberships from CSV', 'memberships');

-- Reporting Permissions
INSERT INTO permissions (name, description, category) VALUES
('reports.view', 'View all reports and analytics', 'reports'),
('reports.financial', 'Access financial reports', 'reports'),
('reports.renewals', 'Access renewal reports', 'reports'),
('reports.export', 'Export report data', 'reports');

-- User Management Permissions
INSERT INTO permissions (name, description, category) VALUES
('users.view', 'View user list and details', 'users'),
('users.create', 'Create new user accounts', 'users'),
('users.edit', 'Edit existing user accounts', 'users'),
('users.delete', 'Delete user accounts', 'users'),
('users.manage_roles', 'Assign and modify user roles', 'users'),
('users.reset_passwords', 'Reset user passwords', 'users'),
('users.view_activity', 'View user activity logs', 'users');

-- System Administration Permissions
INSERT INTO permissions (name, description, category) VALUES
('settings.view', 'View system settings', 'settings'),
('settings.edit', 'Modify system settings', 'settings'),
('settings.backup', 'Create system backups', 'settings'),
('settings.maintenance', 'Perform system maintenance', 'settings');

-- Security and Audit Permissions
INSERT INTO permissions (name, description, category) VALUES
('security.view_events', 'View security event logs', 'security'),
('security.manage_sessions', 'Manage active user sessions', 'security'),
('security.audit_logs', 'Access comprehensive audit logs', 'security');

-- ============================================================================
-- ROLE PERMISSION MAPPINGS
-- ============================================================================

-- ADMIN ROLE - Full system access except super user functions
INSERT INTO role_permissions (role, permission_id) 
SELECT 'admin', id FROM permissions WHERE name IN (
    -- Member permissions
    'members.view', 'members.create', 'members.edit', 'members.delete', 'members.export',
    
    -- Plan permissions
    'plans.view', 'plans.create', 'plans.edit', 'plans.delete',
    
    -- Membership permissions
    'memberships.view', 'memberships.create', 'memberships.edit', 'memberships.delete', 'memberships.bulk_import',
    
    -- Reporting permissions
    'reports.view', 'reports.financial', 'reports.renewals', 'reports.export',
    
    -- User management (limited - can only manage trainers)
    'users.view', 'users.create', 'users.edit', 'users.delete', 'users.reset_passwords', 'users.view_activity',
    
    -- Settings permissions
    'settings.view', 'settings.edit', 'settings.backup',
    
    -- Security permissions
    'security.view_events', 'security.manage_sessions', 'security.audit_logs'
);

-- TRAINER ROLE - Limited operational access
INSERT INTO role_permissions (role, permission_id)
SELECT 'trainer', id FROM permissions WHERE name IN (
    -- Member permissions
    'members.view', 'members.create', 'members.edit',
    
    -- Plan permissions  
    'plans.view', 'plans.create', 'plans.edit',
    
    -- Membership permissions
    'memberships.view', 'memberships.create', 'memberships.edit', 'memberships.bulk_import'
    
    -- Note: Trainers explicitly EXCLUDED from:
    -- - All reporting permissions
    -- - User management permissions
    -- - Settings permissions
    -- - Security permissions
    -- - Delete permissions (for data integrity)
);

-- MEMBER ROLE - Future customer portal access (placeholder)
INSERT INTO role_permissions (role, permission_id)
SELECT 'member', id FROM permissions WHERE name IN (
    -- Very limited permissions for future member portal
    'members.view' -- Only view their own profile (implementation TBD)
    
    -- Note: Member role is reserved for future customer portal
    -- Current implementation will not use this role
);