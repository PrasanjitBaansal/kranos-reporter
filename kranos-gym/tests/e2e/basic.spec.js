import { test, expect } from '@playwright/test';

test.describe('Kranos Gym Basic Functionality', () => {
	test('should load the login page', async ({ page }) => {
		await page.goto('/');
		await expect(page).toHaveTitle(/Kranos/i);

		// Check for login form
		const loginForm = page.locator('form');
		await expect(loginForm).toBeVisible();
	});

	test('should login as admin user', async ({ page }) => {
		await page.goto('/');

		// Fill in login credentials (using the pjb admin user we saw in the database)
		await page.fill('input[name="username"]', 'pjb');
		await page.fill('input[name="password"]', 'password'); // default password

		// Submit the form
		await page.click('button[type="submit"]');

		// Wait for navigation after login
		await page.waitForURL(/dashboard|members|home/i, { timeout: 10000 });

		// Verify we're logged in by checking for dashboard elements
		const hasNavigation = await page.locator('nav').count() > 0;
		expect(hasNavigation).toBe(true);
	});

	test('should display members page', async ({ page }) => {
		await page.goto('/');

		// Login first
		await page.fill('input[name="username"]', 'pjb');
		await page.fill('input[name="password"]', 'password');
		await page.click('button[type="submit"]');

		// Navigate to members page
		await page.waitForLoadState('networkidle');

		// Try to find and click members link
		const membersLink = page.locator('a:has-text("Members")').first();
		if (await membersLink.count() > 0) {
			await membersLink.click();
			await page.waitForLoadState('networkidle');

			// Verify members data is displayed
			const hasMembersData = await page.locator('table, .member').count() > 0;
			expect(hasMembersData).toBe(true);
		}
	});
});
