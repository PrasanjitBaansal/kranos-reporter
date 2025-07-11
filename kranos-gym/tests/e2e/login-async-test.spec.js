import { test, expect } from '@playwright/test';

test.describe('Login Async Flow Tests', () => {
    test('test login async flow with response interception', async ({ page }) => {
        // Intercept the form submission
        page.on('response', response => {
            if (response.url().includes('/login') && response.request().method() === 'POST') {
                console.log('Login POST response status:', response.status());
                response.text().then(body => {
                    console.log('Response body preview:', body.substring(0, 200));
                });
            }
        });

        // Navigate to login
        await page.goto('/login');
        
        // Fill form
        await page.fill('input[name="username"]', 'pjb');
        await page.fill('input[name="password"]', 'admin123');
        
        // Submit and wait for navigation
        const navigationPromise = page.waitForNavigation({ waitUntil: 'load' });
        await page.click('button[type="submit"]');
        
        try {
            await navigationPromise;
            console.log('Navigation completed to:', page.url());
        } catch (error) {
            console.log('Navigation error:', error.message);
            console.log('Current URL:', page.url());
        }
        
        // Check if we're on dashboard or still on login
        const currentUrl = page.url();
        console.log('Final URL:', currentUrl);
        
        // Check for error messages
        const errorElements = await page.locator('.toast-error').count();
        if (errorElements > 0) {
            const errorText = await page.locator('.toast-error').textContent();
            console.log('Error toast found:', errorText);
        }
        
        // Check if user menu exists (indicating successful login)
        const userMenuExists = await page.locator('.user-menu').count() > 0;
        console.log('User menu exists:', userMenuExists);
        
        // Take screenshot for debugging
        await page.screenshot({ path: 'test-results/login-async-test.png', fullPage: true });
    });

    test('test login with explicit async handling', async ({ page }) => {
        await page.goto('/login');
        
        // Fill and submit form
        await page.fill('input[name="username"]', 'pjb');
        await page.fill('input[name="password"]', 'admin123');
        
        // Click submit and wait for either navigation or error
        await Promise.all([
            page.waitForResponse(response => 
                response.url().includes('/login') && response.request().method() === 'POST',
                { timeout: 10000 }
            ),
            page.click('button[type="submit"]')
        ]);
        
        // Wait a bit for any async operations
        await page.waitForTimeout(2000);
        
        // Check where we are
        const url = page.url();
        console.log('URL after login attempt:', url);
        
        if (url.includes('/login')) {
            console.log('Still on login page - checking for errors');
            
            // Check for form errors
            const formErrors = await page.locator('.error').allTextContents();
            if (formErrors.length > 0) {
                console.log('Form errors:', formErrors);
            }
            
            // Check for toast errors
            const toastErrors = await page.locator('.toast-error').allTextContents();
            if (toastErrors.length > 0) {
                console.log('Toast errors:', toastErrors);
            }
        } else {
            console.log('Successfully navigated away from login');
            
            // Verify we're on dashboard
            expect(url).toContain('http://localhost:4173/');
        }
    });
});