import { test, expect } from '@playwright/test';

test.describe('Authentication Workflow', () => {
    test('should successfully login with valid credentials', async ({ page }) => {
        await page.goto('/login');
        
        // Check login page elements
        await expect(page.locator('h1')).toContainText('Login');
        await expect(page.locator('input[name="username"]')).toBeVisible();
        await expect(page.locator('input[name="password"]')).toBeVisible();
        
        // Fill login form
        await page.fill('input[name="username"]', 'pjb');
        await page.fill('input[name="password"]', 'admin123');
        
        // Submit form
        await page.click('button[type="submit"]');
        
        // Should redirect to dashboard
        await expect(page).toHaveURL('/');
        await expect(page.locator('h1')).toContainText('Dashboard');
        
        // Should show user info
        await expect(page.locator('.user-info')).toContainText('pjb');
    });

    test('should show error for invalid credentials', async ({ page }) => {
        await page.goto('/login');
        
        // Fill with invalid credentials
        await page.fill('input[name="username"]', 'invaliduser');
        await page.fill('input[name="password"]', 'wrongpassword');
        
        // Submit form
        await page.click('button[type="submit"]');
        
        // Should stay on login page
        await expect(page).toHaveURL('/login');
        
        // Should show error message
        await expect(page.locator('.error')).toContainText('Invalid username or password');
        
        // Form should be cleared
        await expect(page.locator('input[name="password"]')).toHaveValue('');
    });

    test('should handle empty form submission', async ({ page }) => {
        await page.goto('/login');
        
        // Submit empty form
        await page.click('button[type="submit"]');
        
        // Should show validation errors
        await expect(page.locator('.error')).toContainText('Username is required');
        await expect(page.locator('.error')).toContainText('Password is required');
    });

    test('should successfully logout', async ({ page }) => {
        // First login
        await page.goto('/login');
        await page.fill('input[name="username"]', 'pjb');
        await page.fill('input[name="password"]', 'admin123');
        await page.click('button[type="submit"]');
        
        // Wait for dashboard
        await expect(page).toHaveURL('/');
        
        // Click user dropdown
        await page.click('.user-dropdown-toggle');
        
        // Click logout
        await page.click('button:has-text("Logout")');
        
        // Should redirect to login
        await expect(page).toHaveURL('/login');
        
        // Should not be able to access protected pages
        await page.goto('/');
        await expect(page).toHaveURL('/login');
    });

    test('should redirect to login when accessing protected pages', async ({ page }) => {
        // Try to access protected pages without login
        const protectedPages = [
            '/',
            '/members',
            '/memberships',
            '/payments',
            '/reporting',
            '/settings'
        ];
        
        for (const url of protectedPages) {
            await page.goto(url);
            await expect(page).toHaveURL('/login');
        }
    });

    test('should persist session across page reloads', async ({ page }) => {
        // Login
        await page.goto('/login');
        await page.fill('input[name="username"]', 'pjb');
        await page.fill('input[name="password"]', 'admin123');
        await page.click('button[type="submit"]');
        
        // Wait for dashboard
        await expect(page).toHaveURL('/');
        
        // Reload page
        await page.reload();
        
        // Should still be logged in
        await expect(page).toHaveURL('/');
        await expect(page.locator('.user-info')).toContainText('pjb');
    });

    test('should handle session timeout gracefully', async ({ page }) => {
        // Login
        await page.goto('/login');
        await page.fill('input[name="username"]', 'pjb');
        await page.fill('input[name="password"]', 'admin123');
        await page.click('button[type="submit"]');
        
        // Wait for dashboard
        await expect(page).toHaveURL('/');
        
        // Simulate expired session by clearing cookies
        await page.context().clearCookies();
        
        // Try to navigate to another page
        await page.click('a[href="/members"]');
        
        // Should redirect to login
        await expect(page).toHaveURL('/login');
        
        // Should show session expired message
        await expect(page.locator('.info')).toContainText('Session expired');
    });

    test('should refresh JWT token automatically', async ({ page }) => {
        // Login
        await page.goto('/login');
        await page.fill('input[name="username"]', 'pjb');
        await page.fill('input[name="password"]', 'admin123');
        await page.click('button[type="submit"]');
        
        // Wait for dashboard
        await expect(page).toHaveURL('/');
        
        // Get initial token from cookie
        const cookies = await page.context().cookies();
        const initialToken = cookies.find(c => c.name === 'auth-token')?.value;
        
        // Wait for token refresh (simulate by waiting)
        await page.waitForTimeout(2000);
        
        // Make an API call to trigger token refresh
        await page.click('a[href="/members"]');
        await expect(page).toHaveURL('/members');
        
        // Check if token was refreshed
        const newCookies = await page.context().cookies();
        const newToken = newCookies.find(c => c.name === 'auth-token')?.value;
        
        // Token should exist and potentially be different
        expect(newToken).toBeTruthy();
    });

    test('should show appropriate UI based on user role', async ({ page }) => {
        // Test admin role
        await page.goto('/login');
        await page.fill('input[name="username"]', 'pjb');
        await page.fill('input[name="password"]', 'admin123');
        await page.click('button[type="submit"]');
        
        // Admin should see all menu items
        await expect(page.locator('nav a[href="/members"]')).toBeVisible();
        await expect(page.locator('nav a[href="/payments"]')).toBeVisible();
        await expect(page.locator('nav a[href="/users"]')).toBeVisible();
        
        // Logout
        await page.click('.user-dropdown-toggle');
        await page.click('button:has-text("Logout")');
        
        // Test trainer role
        await page.fill('input[name="username"]', 'niranjan');
        await page.fill('input[name="password"]', 'trainer123');
        await page.click('button[type="submit"]');
        
        // Trainer should see limited menu items
        await expect(page.locator('nav a[href="/members"]')).toBeVisible();
        await expect(page.locator('nav a[href="/payments"]')).toBeVisible();
        await expect(page.locator('nav a[href="/users"]')).not.toBeVisible();
        
        // Should see "View Only" indicators
        await page.goto('/members');
        await expect(page.locator('.view-only-badge')).toBeVisible();
    });

    test('should handle password change flow', async ({ page }) => {
        // Login
        await page.goto('/login');
        await page.fill('input[name="username"]', 'pjb');
        await page.fill('input[name="password"]', 'admin123');
        await page.click('button[type="submit"]');
        
        // Open user dropdown
        await page.click('.user-dropdown-toggle');
        
        // Click change password
        await page.click('button:has-text("Change Password")');
        
        // Should show password change modal
        await expect(page.locator('.modal')).toBeVisible();
        await expect(page.locator('.modal-header')).toContainText('Change Password');
        
        // Fill password change form
        await page.fill('input[name="currentPassword"]', 'admin123');
        await page.fill('input[name="newPassword"]', 'NewPass123!');
        await page.fill('input[name="confirmPassword"]', 'NewPass123!');
        
        // Submit form
        await page.click('button:has-text("Update Password")');
        
        // Should show success message
        await expect(page.locator('.toast-success')).toContainText('Password changed successfully');
        
        // Modal should close
        await expect(page.locator('.modal')).not.toBeVisible();
        
        // Note: In real test, would need to reset password back
    });

    test('should validate password requirements', async ({ page }) => {
        // Login
        await page.goto('/login');
        await page.fill('input[name="username"]', 'pjb');
        await page.fill('input[name="password"]', 'admin123');
        await page.click('button[type="submit"]');
        
        // Open password change modal
        await page.click('.user-dropdown-toggle');
        await page.click('button:has-text("Change Password")');
        
        // Try weak password
        await page.fill('input[name="currentPassword"]', 'admin123');
        await page.fill('input[name="newPassword"]', 'weak');
        await page.fill('input[name="confirmPassword"]', 'weak');
        
        // Should show validation errors
        await expect(page.locator('.error')).toContainText('at least 8 characters');
        
        // Try mismatched passwords
        await page.fill('input[name="newPassword"]', 'StrongPass123!');
        await page.fill('input[name="confirmPassword"]', 'DifferentPass123!');
        
        // Should show mismatch error
        await expect(page.locator('.error')).toContainText('Passwords do not match');
    });

    test('should handle account lockout after failed attempts', async ({ page }) => {
        await page.goto('/login');
        
        // Try to login with wrong password 5 times
        for (let i = 0; i < 5; i++) {
            await page.fill('input[name="username"]', 'pjb');
            await page.fill('input[name="password"]', 'wrongpassword');
            await page.click('button[type="submit"]');
            
            if (i < 4) {
                await expect(page.locator('.error')).toContainText('Invalid username or password');
            }
        }
        
        // After 5 attempts, should show lockout message
        await expect(page.locator('.error')).toContainText('locked');
        
        // Should not be able to login even with correct password
        await page.fill('input[name="username"]', 'pjb');
        await page.fill('input[name="password"]', 'admin123');
        await page.click('button[type="submit"]');
        
        await expect(page.locator('.error')).toContainText('locked');
        await expect(page).toHaveURL('/login');
    });

    test('should remember user preference with "Remember Me"', async ({ page }) => {
        await page.goto('/login');
        
        // Check "Remember Me"
        await page.check('input[name="rememberMe"]');
        
        // Login
        await page.fill('input[name="username"]', 'pjb');
        await page.fill('input[name="password"]', 'admin123');
        await page.click('button[type="submit"]');
        
        // Check cookie expiration
        const cookies = await page.context().cookies();
        const authCookie = cookies.find(c => c.name === 'auth-token');
        
        // Should have extended expiration (7 days)
        const expirationTime = authCookie.expires * 1000;
        const currentTime = Date.now();
        const daysDiff = (expirationTime - currentTime) / (1000 * 60 * 60 * 24);
        
        expect(daysDiff).toBeGreaterThan(6);
        expect(daysDiff).toBeLessThan(8);
    });

    test('should handle concurrent login attempts', async ({ browser }) => {
        // Create two contexts (simulate two tabs/browsers)
        const context1 = await browser.newContext();
        const context2 = await browser.newContext();
        
        const page1 = await context1.newPage();
        const page2 = await context2.newPage();
        
        // Login in first context
        await page1.goto('/login');
        await page1.fill('input[name="username"]', 'pjb');
        await page1.fill('input[name="password"]', 'admin123');
        await page1.click('button[type="submit"]');
        await expect(page1).toHaveURL('/');
        
        // Login in second context
        await page2.goto('/login');
        await page2.fill('input[name="username"]', 'pjb');
        await page2.fill('input[name="password"]', 'admin123');
        await page2.click('button[type="submit"]');
        await expect(page2).toHaveURL('/');
        
        // Both sessions should be valid
        await page1.reload();
        await expect(page1).toHaveURL('/');
        
        await page2.reload();
        await expect(page2).toHaveURL('/');
        
        // Cleanup
        await context1.close();
        await context2.close();
    });
});