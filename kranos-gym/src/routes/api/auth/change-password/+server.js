import { json } from '@sveltejs/kit';
import AuthenticationService from '$lib/security/auth-service.js';

export async function POST({ request, locals, getClientAddress }) {
    if (!locals.user) {
        return json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    
    try {
        const { currentPassword, newPassword } = await request.json();
        
        // Validation
        if (!currentPassword || !newPassword) {
            return json({ success: false, error: 'Current password and new password are required' }, { status: 400 });
        }
        
        if (newPassword.length < 8) {
            return json({ success: false, error: 'New password must be at least 8 characters' }, { status: 400 });
        }
        
        const authService = new AuthenticationService();
        
        // Change password using the auth service
        const result = await authService.changePassword(
            locals.user.id,
            currentPassword,
            newPassword
        );
        
        return json({ 
            success: true, 
            message: 'Password changed successfully. Please log in again with your new password.' 
        });
        
    } catch (error) {
        console.error('Password change error:', error);
        
        // Return appropriate error message
        if (error.message === 'Current password is incorrect') {
            return json({ success: false, error: 'Current password is incorrect' }, { status: 400 });
        }
        
        return json({ 
            success: false, 
            error: 'Failed to change password. Please try again.' 
        }, { status: 500 });
    }
}