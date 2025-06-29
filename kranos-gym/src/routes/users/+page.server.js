import { redirect } from '@sveltejs/kit';
import AuthenticationService from '$lib/security/auth-service.js';

export async function load({ locals }) {
    // Check if user is authenticated and has users.view permission
    if (!locals.user) {
        throw redirect(302, '/login');
    }
    
    const authService = new AuthenticationService();
    
    try {
        // Check permission
        const hasPermission = authService.hasPermission(locals.user.id, 'users.view');
        if (!hasPermission) {
            throw redirect(302, '/?error=unauthorized');
        }
        
        // Get all users
        const users = authService.getAllUsers({ includeInactive: true });
        
        return {
            users
        };
    } catch (error) {
        console.error('Error loading users:', error);
        if (error.status === 302) {
            throw error; // Re-throw redirects
        }
        return {
            users: [],
            error: error.message
        };
    }
}

export const actions = {
    create: async ({ request, locals }) => {
        if (!locals.user) {
            return { success: false, error: 'Not authenticated' };
        }
        
        const authService = new AuthenticationService();
        
        try {
            // Check permission
            const hasPermission = authService.hasPermission(locals.user.id, 'users.create');
            if (!hasPermission) {
                return { success: false, error: 'Insufficient permissions' };
            }
            
            const data = await request.formData();
            const username = data.get('username');
            const email = data.get('email');
            const password = data.get('password');
            const role = data.get('role');
            
            // Validation
            if (!username || !email || !password || !role) {
                return { success: false, error: 'All fields are required' };
            }
            
            if (password.length < 8) {
                return { success: false, error: 'Password must be at least 8 characters' };
            }
            
            const newUser = await authService.createUser({
                username,
                email,
                password,
                role,
                createdBy: locals.user.id
            });
            
            return { success: true, user: newUser };
            
        } catch (error) {
            console.error('Error creating user:', error);
            return { success: false, error: error.message };
        }
    },
    
    update: async ({ request, locals }) => {
        if (!locals.user) {
            return { success: false, error: 'Not authenticated' };
        }
        
        const authService = new AuthenticationService();
        
        try {
            // Check permission
            const hasPermission = authService.hasPermission(locals.user.id, 'users.edit');
            if (!hasPermission) {
                return { success: false, error: 'Insufficient permissions' };
            }
            
            const data = await request.formData();
            const userId = parseInt(data.get('userId'));
            const username = data.get('username');
            const email = data.get('email');
            const role = data.get('role');
            const status = data.get('status');
            
            if (!userId) {
                return { success: false, error: 'User ID is required' };
            }
            
            const updates = {};
            if (username) updates.username = username;
            if (email) updates.email = email;
            if (role) updates.role = role;
            if (status) updates.status = status;
            
            const updatedUser = await authService.updateUser(userId, updates, locals.user.id);
            
            return { success: true, user: updatedUser };
            
        } catch (error) {
            console.error('Error updating user:', error);
            return { success: false, error: error.message };
        }
    },
    
    delete: async ({ request, locals }) => {
        if (!locals.user) {
            return { success: false, error: 'Not authenticated' };
        }
        
        const authService = new AuthenticationService();
        
        try {
            // Check permission
            const hasPermission = authService.hasPermission(locals.user.id, 'users.delete');
            if (!hasPermission) {
                return { success: false, error: 'Insufficient permissions' };
            }
            
            const data = await request.formData();
            const userId = parseInt(data.get('userId'));
            
            if (!userId) {
                return { success: false, error: 'User ID is required' };
            }
            
            const result = await authService.deleteUser(userId, locals.user.id);
            
            return { success: true, message: result.message };
            
        } catch (error) {
            console.error('Error deleting user:', error);
            return { success: false, error: error.message };
        }
    },
    
    resetPassword: async ({ request, locals }) => {
        if (!locals.user) {
            return { success: false, error: 'Not authenticated' };
        }
        
        const authService = new AuthenticationService();
        
        try {
            // Check permission
            const hasPermission = authService.hasPermission(locals.user.id, 'users.reset_passwords');
            if (!hasPermission) {
                return { success: false, error: 'Insufficient permissions' };
            }
            
            const data = await request.formData();
            const userId = parseInt(data.get('userId'));
            const newPassword = data.get('newPassword');
            
            if (!userId || !newPassword) {
                return { success: false, error: 'User ID and password are required' };
            }
            
            if (newPassword.length < 8) {
                return { success: false, error: 'Password must be at least 8 characters' };
            }
            
            const result = await authService.resetUserPassword(userId, newPassword, locals.user.id);
            
            return { success: true, message: result.message };
            
        } catch (error) {
            console.error('Error resetting password:', error);
            return { success: false, error: error.message };
        }
    }
};