-- Context7-grounded: Add profile view permissions for member portal
-- Profile Management Permissions
INSERT OR IGNORE INTO permissions (name, description, category) VALUES
('profile.view', 'View own profile and membership details', 'profile');

-- Update Member role to include profile access
INSERT OR IGNORE INTO role_permissions (role, permission_id)
SELECT 'member', id FROM permissions WHERE name = 'profile.view';

-- Remove the old broad members.view permission from member role (too permissive)
DELETE FROM role_permissions 
WHERE role = 'member' AND permission_id IN (
    SELECT id FROM permissions WHERE name = 'members.view'
);

-- Update Trainer role permissions (Context7-grounded: trainers can only view members, not create/edit)
DELETE FROM role_permissions 
WHERE role = 'trainer' AND permission_id IN (
    SELECT id FROM permissions WHERE name IN ('members.create', 'members.edit')
);