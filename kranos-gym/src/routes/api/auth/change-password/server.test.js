import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from './+server.js';
import AuthenticationService from '$lib/security/auth-service.js';

// Mock AuthenticationService
vi.mock('$lib/security/auth-service.js', () => ({
    default: vi.fn()
}));


describe('POST /api/auth/change-password', () => {
    let mockAuthService;
    let mockRequest;
    let mockLocals;

    beforeEach(() => {
        vi.clearAllMocks();
        
        mockAuthService = {
            changePassword: vi.fn()
        };
        
        AuthenticationService.mockReturnValue(mockAuthService);
        
        mockLocals = {
            user: {
                id: 1,
                username: 'testuser',
                role: 'admin'
            }
        };
    });

    it('should successfully change password with valid credentials', async () => {
        mockAuthService.changePassword.mockResolvedValue(true);

        mockRequest = {
            json: vi.fn().mockResolvedValue({
                currentPassword: 'oldPassword123',
                newPassword: 'NewPassword123!'
            })
        };

        const response = await POST({ request: mockRequest, locals: mockLocals });
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result.success).toBe(true);
        expect(result.message).toContain('Password changed successfully');
        
        expect(mockAuthService.changePassword).toHaveBeenCalledWith(1, 'oldPassword123', 'NewPassword123!');
    });

    it('should require authentication', async () => {
        mockRequest = {
            json: vi.fn().mockResolvedValue({
                currentPassword: 'oldPassword123',
                newPassword: 'NewPassword123!'
            })
        };

        const response = await POST({ request: mockRequest, locals: {} });
        const result = await response.json();

        expect(response.status).toBe(401);
        expect(result.success).toBe(false);
        expect(result.error).toBe('Not authenticated');
    });

    it('should validate required fields', async () => {
        mockRequest = {
            json: vi.fn().mockResolvedValue({
                currentPassword: '',
                newPassword: ''
            })
        };

        const response = await POST({ request: mockRequest, locals: mockLocals });
        const result = await response.json();

        expect(response.status).toBe(400);
        expect(result.error).toContain('required');
    });

    it('should reject incorrect current password', async () => {
        mockAuthService.changePassword.mockRejectedValue(new Error('Current password is incorrect'));

        mockRequest = {
            json: vi.fn().mockResolvedValue({
                currentPassword: 'wrongPassword',
                newPassword: 'NewPassword123!'
            })
        };

        const response = await POST({ request: mockRequest, locals: mockLocals });
        const result = await response.json();

        expect(response.status).toBe(400);
        expect(result.error).toBe('Current password is incorrect');
    });

    it('should validate new password strength', async () => {

        mockRequest = {
            json: vi.fn().mockResolvedValue({
                currentPassword: 'oldPassword123',
                newPassword: 'weak'
            })
        };

        const response = await POST({ request: mockRequest, locals: mockLocals });
        const result = await response.json();

        expect(response.status).toBe(400);
        expect(result.error).toBe('New password must be at least 8 characters');
    });


    it('should handle service errors gracefully', async () => {
        mockAuthService.changePassword.mockRejectedValue(new Error('Database error'));

        mockRequest = {
            json: vi.fn().mockResolvedValue({
                currentPassword: 'oldPassword123',
                newPassword: 'NewPassword123!'
            })
        };

        const response = await POST({ request: mockRequest, locals: mockLocals });
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result.error).toBe('Failed to change password. Please try again.');
    });

    it('should handle invalid JSON in request', async () => {
        mockRequest = {
            json: vi.fn().mockRejectedValue(new Error('Invalid JSON'))
        };

        const response = await POST({ request: mockRequest, locals: mockLocals });
        const result = await response.json();

        expect(response.status).toBe(400);
        expect(result.error).toContain('required');
    });

});