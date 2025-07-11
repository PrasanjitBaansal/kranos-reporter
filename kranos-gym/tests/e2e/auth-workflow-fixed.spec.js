import { test, expect } from '@playwright/test';

test.describe('Authentication Workflow - Fixed', () => {
    test('should successfully login with valid credentials', async ({ page }) => {
        await page.goto('/login');
        
        // Check login page elements - the actual page has a floating card with login form
        await expect(page.locator('.login-content h1')).toContainText('Kranos Gym Management');
        await expect(page.locator('input[name="username"]')).toBeVisible();
        await expect(page.locator('input[name="password"]')).toBeVisible();
        
        // Fill login form
        await page.fill('input[name="username"]', 'pjb');
        await page.fill('input[name="password"]', 'admin123');
        
        // Submit form
        await page.click('button[type="submit"]');
        
        // Wait for navigation - should redirect to dashboard
        await page.waitForURL('/');
        
        // Check dashboard elements
        await expect(page.locator('.dashboard-header h1')).toContainText('Dashboard');
        
        // Should show user info in nav
        await expect(page.locator('.user-menu')).toBeVisible();
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
        
        // Should show error toast notification
        await page.waitForSelector('.toast-error', { timeout: 5000 });
        await expect(page.locator('.toast-error')).toContainText('Invalid username or password');
    });

    test('should handle empty form submission', async ({ page }) => {
        await page.goto('/login');
        
        // Submit empty form
        await page.click('button[type="submit"]');
        
        // Should show validation errors
        await expect(page.locator('.error').first()).toContainText('required');
    });

    test('should successfully logout', async ({ page }) => {
        // First login
        await page.goto('/login');
        await page.fill('input[name="username"]', 'pjb');
        await page.fill('input[name="password"]', 'admin123');
        await page.click('button[type="submit"]');
        
        // Wait for dashboard
        await page.waitForURL('/');
        
        // Click user dropdown
        await page.click('.user-menu');
        
        // Click logout
        await page.click('a[href="/logout"]');
        
        // Should redirect to login
        await page.waitForURL('/login');
        
        // Should not be able to access protected pages
        await page.goto('/');
        await expect(page).toHaveURL('/login?redirect=%2F');
    });

    test('should redirect to login when accessing protected pages', async ({ page }) => {
        // Try to access protected pages without login
        const protectedPages = ['/', '/members', '/memberships', '/payments'];
        
        for (const url of protectedPages) {
            await page.goto(url);
            await expect(page).toHaveURL(/\/login\?redirect=/);
        }
    });
});