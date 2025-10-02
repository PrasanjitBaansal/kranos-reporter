import { test, expect } from '@playwright/test';

test.describe('Authentication Workflow - Fixed', () => {
    test('should successfully login with valid credentials', async ({ page }) => {
        await page.goto('/login');
        
        // Check login page elements - the actual page has a floating card with login form
        await expect(page.locator('.login-card .logo-text')).toContainText('Kranos Gym');
        await expect(page.locator('input[name="username"]')).toBeVisible();
        await expect(page.locator('input[name="password"]')).toBeVisible();
        
        // Fill login form
        await page.fill('input[name="username"]', 'pjb');
        await page.fill('input[name="password"]', 'admin123');
        
        // Submit form
        await page.click('button[type="submit"]');
        
        // Wait for navigation - should redirect to dashboard
        await page.waitForURL('/', { timeout: 10000 });
        
        // Check dashboard elements
        await expect(page.locator('.dashboard-title')).toContainText('Dashboard');
        
        // Should show user info in nav
        await expect(page.locator('.user-menu-trigger')).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
        await page.goto('/login');
        
        // Fill with invalid credentials
        await page.fill('input[name="username"]', 'invaliduser');
        await page.fill('input[name="password"]', 'wrongpassword');
        
        // Submit form
        await page.click('button[type="submit"]');
        
        // Should stay on login page (may have ?/login query param from form action)
        await expect(page).toHaveURL(/\/login/);
        
        // Should show error toast notification
        await page.waitForSelector('.toast-error', { timeout: 5000 });
        await expect(page.locator('.toast-error').last()).toContainText('Invalid username or password');
    });

    test('should handle empty form submission', async ({ page }) => {
        await page.goto('/login');
        
        // Submit empty form
        await page.click('button[type="submit"]');
        
        // Should show validation errors
        await expect(page.locator('.error-message').first()).toContainText('required');
    });

    test('should successfully logout', async ({ page }) => {
        // First login
        await page.goto('/login');
        await page.fill('input[name="username"]', 'pjb');
        await page.fill('input[name="password"]', 'admin123');
        await page.click('button[type="submit"]');
        
        // Wait for dashboard
        await page.waitForURL('/', { timeout: 10000 });
        
        // Click user dropdown and wait for menu to appear
        await page.locator('.user-menu-trigger').click();
        await page.waitForSelector('.user-menu', { state: 'attached' });

        // Click logout
        await page.locator('.user-menu a[href="/logout"]').click();
        
        // Should redirect to login
        await page.waitForURL(/\/login/);
        
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