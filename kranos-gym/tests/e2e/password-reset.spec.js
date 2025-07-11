import { test, expect } from '@playwright/test';

test.describe('Password Reset Workflow', () => {
    test('should show forgot password link on login page', async ({ page }) => {
        await page.goto('/login');
        
        // Should have forgot password link
        const forgotLink = page.locator('a:has-text("Forgot Password?")');
        await expect(forgotLink).toBeVisible();
        
        // Click the link
        await forgotLink.click();
        
        // Should navigate to password reset page
        await expect(page).toHaveURL('/forgot-password');
        await expect(page.locator('h1')).toContainText('Reset Password');
    });

    test('should handle password reset request', async ({ page }) => {
        await page.goto('/forgot-password');
        
        // Check page elements
        await expect(page.locator('input[name="email"]')).toBeVisible();
        await expect(page.locator('button[type="submit"]')).toContainText('Send Reset Link');
        
        // Enter email
        await page.fill('input[name="email"]', 'baansalprasanjit@gmail.com');
        
        // Submit form
        await page.click('button[type="submit"]');
        
        // Should show success message
        await expect(page.locator('.success')).toContainText('Password reset link sent');
        await expect(page.locator('.success')).toContainText('Check your email');
        
        // Form should be disabled after submission
        await expect(page.locator('input[name="email"]')).toBeDisabled();
        await expect(page.locator('button[type="submit"]')).toBeDisabled();
    });

    test('should validate email format', async ({ page }) => {
        await page.goto('/forgot-password');
        
        // Try invalid email
        await page.fill('input[name="email"]', 'invalid-email');
        await page.click('button[type="submit"]');
        
        // Should show validation error
        await expect(page.locator('.error')).toContainText('valid email');
        
        // Try empty email
        await page.fill('input[name="email"]', '');
        await page.click('button[type="submit"]');
        
        // Should show required error
        await expect(page.locator('.error')).toContainText('Email is required');
    });

    test('should handle non-existent email gracefully', async ({ page }) => {
        await page.goto('/forgot-password');
        
        // Enter non-existent email
        await page.fill('input[name="email"]', 'nonexistent@example.com');
        await page.click('button[type="submit"]');
        
        // Should still show success message (for security)
        await expect(page.locator('.success')).toContainText('Password reset link sent');
        
        // But should not actually send email (would need to verify in backend logs)
    });

    test('should handle password reset with valid token', async ({ page }) => {
        // Simulate clicking reset link with token
        const mockToken = 'mock-reset-token-123';
        await page.goto(`/reset-password?token=${mockToken}`);
        
        // Should show password reset form
        await expect(page.locator('h1')).toContainText('Set New Password');
        await expect(page.locator('input[name="password"]')).toBeVisible();
        await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();
        
        // Fill new password
        await page.fill('input[name="password"]', 'NewSecurePass123!');
        await page.fill('input[name="confirmPassword"]', 'NewSecurePass123!');
        
        // Submit form
        await page.click('button[type="submit"]');
        
        // Should show success and redirect to login
        await expect(page.locator('.success')).toContainText('Password reset successful');
        await expect(page).toHaveURL('/login');
    });

    test('should handle invalid reset token', async ({ page }) => {
        // Try with invalid token
        await page.goto('/reset-password?token=invalid-token');
        
        // Should show error
        await expect(page.locator('.error')).toContainText('Invalid or expired reset link');
        
        // Should show link to request new reset
        const requestNewLink = page.locator('a:has-text("Request new reset link")');
        await expect(requestNewLink).toBeVisible();
        
        // Click to go back to forgot password
        await requestNewLink.click();
        await expect(page).toHaveURL('/forgot-password');
    });

    test('should handle expired reset token', async ({ page }) => {
        // Try with expired token
        await page.goto('/reset-password?token=expired-token-123');
        
        // Should show error
        await expect(page.locator('.error')).toContainText('expired');
        
        // Should not show password form
        await expect(page.locator('input[name="password"]')).not.toBeVisible();
    });

    test('should validate new password requirements', async ({ page }) => {
        const mockToken = 'mock-reset-token-123';
        await page.goto(`/reset-password?token=${mockToken}`);
        
        // Try weak password
        await page.fill('input[name="password"]', 'weak');
        await page.fill('input[name="confirmPassword"]', 'weak');
        
        // Should show password requirements
        await expect(page.locator('.error')).toContainText('at least 8 characters');
        
        // Try mismatched passwords
        await page.fill('input[name="password"]', 'StrongPass123!');
        await page.fill('input[name="confirmPassword"]', 'DifferentPass123!');
        
        // Should show mismatch error
        await expect(page.locator('.error')).toContainText('Passwords do not match');
    });

    test('should prevent reuse of reset token', async ({ page }) => {
        const mockToken = 'mock-reset-token-456';
        
        // First use - should work
        await page.goto(`/reset-password?token=${mockToken}`);
        await page.fill('input[name="password"]', 'NewSecurePass123!');
        await page.fill('input[name="confirmPassword"]', 'NewSecurePass123!');
        await page.click('button[type="submit"]');
        
        // Should succeed
        await expect(page).toHaveURL('/login');
        
        // Try to use same token again
        await page.goto(`/reset-password?token=${mockToken}`);
        
        // Should show error
        await expect(page.locator('.error')).toContainText('already been used');
    });

    test('should show password strength indicator', async ({ page }) => {
        const mockToken = 'mock-reset-token-789';
        await page.goto(`/reset-password?token=${mockToken}`);
        
        // Should show strength indicator
        const strengthIndicator = page.locator('.password-strength');
        
        // Weak password
        await page.fill('input[name="password"]', 'weak');
        await expect(strengthIndicator).toContainText('Weak');
        await expect(strengthIndicator).toHaveClass(/weak/);
        
        // Medium password
        await page.fill('input[name="password"]', 'Medium123');
        await expect(strengthIndicator).toContainText('Medium');
        await expect(strengthIndicator).toHaveClass(/medium/);
        
        // Strong password
        await page.fill('input[name="password"]', 'StrongPass123!@#');
        await expect(strengthIndicator).toContainText('Strong');
        await expect(strengthIndicator).toHaveClass(/strong/);
    });

    test('should handle rate limiting for reset requests', async ({ page }) => {
        await page.goto('/forgot-password');
        
        // Make multiple requests quickly
        for (let i = 0; i < 3; i++) {
            await page.fill('input[name="email"]', 'test@example.com');
            await page.click('button[type="submit"]');
            
            // Clear for next attempt
            if (i < 2) {
                await page.reload();
            }
        }
        
        // Should show rate limit error
        await expect(page.locator('.error')).toContainText('Too many reset attempts');
        await expect(page.locator('.error')).toContainText('try again later');
    });

    test('should allow navigation back to login', async ({ page }) => {
        await page.goto('/forgot-password');
        
        // Should have back to login link
        const backLink = page.locator('a:has-text("Back to Login")');
        await expect(backLink).toBeVisible();
        
        // Click to go back
        await backLink.click();
        await expect(page).toHaveURL('/login');
    });

    test('should handle password reset for different user roles', async ({ page }) => {
        // Test for each role
        const emails = [
            'baansalprasanjit@gmail.com', // Admin
            'trainer@example.com', // Trainer
            'member@example.com' // Member
        ];
        
        for (const email of emails) {
            await page.goto('/forgot-password');
            await page.fill('input[name="email"]', email);
            await page.click('button[type="submit"]');
            
            // All should show same success message
            await expect(page.locator('.success')).toContainText('Password reset link sent');
        }
    });
});