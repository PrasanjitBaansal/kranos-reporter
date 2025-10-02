import { test, expect } from '@playwright/test';

test.describe('Cookie Propagation Test', () => {
    test('check if cookies are set after login', async ({ page, context }) => {
        await page.goto('/login');

        console.log('=== BEFORE LOGIN ===');
        const cookiesBefore = await context.cookies();
        console.log('Cookies before login:', cookiesBefore);

        // Fill and submit login form
        await page.fill('input[name="username"]', 'pjb');
        await page.fill('input[name="password"]', 'admin123');
        await page.click('button[type="submit"]');

        // Wait a bit for form submission to complete
        await page.waitForTimeout(2000);

        console.log('=== AFTER LOGIN (immediately) ===');
        const cookiesAfter = await context.cookies();
        console.log('Cookies after login:', cookiesAfter);
        console.log('Current URL:', page.url());

        // Check if access_token cookie exists
        const accessToken = cookiesAfter.find(c => c.name === 'access_token');
        const refreshToken = cookiesAfter.find(c => c.name === 'refresh_token');
        const sessionId = cookiesAfter.find(c => c.name === 'session_id');

        console.log('Access token present:', !!accessToken);
        console.log('Refresh token present:', !!refreshToken);
        console.log('Session ID present:', !!sessionId);

        if (accessToken) {
            console.log('Access token details:', {
                name: accessToken.name,
                httpOnly: accessToken.httpOnly,
                secure: accessToken.secure,
                sameSite: accessToken.sameSite,
                path: accessToken.path
            });
        }

        // Try navigating to dashboard manually
        await page.goto('/');
        await page.waitForTimeout(1000);

        console.log('=== AFTER MANUAL NAVIGATION ===');
        console.log('URL after manual navigation:', page.url());
        const cookiesAfterNav = await context.cookies();
        console.log('Cookies after navigation:', cookiesAfterNav.map(c => c.name));

        // Check if we can see the user menu (means we're authenticated)
        const userMenuExists = await page.locator('.user-menu-trigger').count() > 0;
        console.log('User menu exists:', userMenuExists);

        expect(accessToken).toBeDefined();
    });
});
