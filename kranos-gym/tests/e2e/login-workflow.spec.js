import { test, expect } from '@playwright/test';

test.describe('Login Workflow', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/login');
	});

	test('should display login page correctly', async ({ page }) => {
		// Check page title
		await expect(page).toHaveTitle(/Login - Kranos Gym/);
		
		// Check main elements
		await expect(page.getByText('Kranos Gym')).toBeVisible();
		await expect(page.getByText('Welcome back! Please sign in to your account.')).toBeVisible();
		await expect(page.getByLabel('Username')).toBeVisible();
		await expect(page.getByLabel('Password')).toBeVisible();
		await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
	});

	test('should show validation error for empty fields', async ({ page }) => {
		await page.getByRole('button', { name: /sign in/i }).click();
		await expect(page.getByText('Please enter both username and password')).toBeVisible();
	});

	test('should show validation error for empty username', async ({ page }) => {
		await page.getByLabel('Password').fill('password123');
		await page.getByRole('button', { name: /sign in/i }).click();
		await expect(page.getByText('Please enter both username and password')).toBeVisible();
	});

	test('should show validation error for empty password', async ({ page }) => {
		await page.getByLabel('Username').fill('admin');
		await page.getByRole('button', { name: /sign in/i }).click();
		await expect(page.getByText('Please enter both username and password')).toBeVisible();
	});

	test('should toggle password visibility', async ({ page }) => {
		const passwordInput = page.getByLabel('Password');
		const toggleButton = page.locator('.password-toggle');
		
		// Initially password type
		await expect(passwordInput).toHaveAttribute('type', 'password');
		await expect(toggleButton).toHaveText('👁️');
		
		// Click to show password
		await toggleButton.click();
		await expect(passwordInput).toHaveAttribute('type', 'text');
		await expect(toggleButton).toHaveText('🙈');
		
		// Click to hide password
		await toggleButton.click();
		await expect(passwordInput).toHaveAttribute('type', 'password');
		await expect(toggleButton).toHaveText('👁️');
	});

	test('should handle Enter key in password field', async ({ page }) => {
		await page.getByLabel('Username').fill('admin');
		await page.getByLabel('Password').fill('password123');
		await page.getByLabel('Password').press('Enter');
		
		// Should attempt login
		await page.waitForLoadState('networkidle');
	});

	test('should show loading state during login attempt', async ({ page }) => {
		// Mock slow network response
		await page.route('/api/auth/login', async route => {
			await new Promise(resolve => setTimeout(resolve, 1000));
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ success: true })
			});
		});

		await page.getByLabel('Username').fill('admin');
		await page.getByLabel('Password').fill('password123');
		await page.getByRole('button', { name: /sign in/i }).click();
		
		// Check loading state
		await expect(page.getByText('Signing In...')).toBeVisible();
		await expect(page.locator('.loading-spinner')).toBeVisible();
		
		// Form should be disabled
		await expect(page.getByLabel('Username')).toBeDisabled();
		await expect(page.getByLabel('Password')).toBeDisabled();
		await expect(page.getByRole('button', { name: /signing in/i })).toBeDisabled();
	});

	test('should handle successful login', async ({ page }) => {
		// Mock successful login
		await page.route('/api/auth/login', async route => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ success: true })
			});
		});

		// Mock dashboard data
		await page.route('/api/dashboard/stats', async route => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					totalMembers: 156,
					activeMembers: 142,
					monthlyRevenue: 45780,
					expiringSoon: 8
				})
			});
		});

		await page.getByLabel('Username').fill('admin');
		await page.getByLabel('Password').fill('password123');
		await page.getByRole('button', { name: /sign in/i }).click();
		
		// Should redirect to dashboard
		await expect(page).toHaveURL('/');
		await expect(page.getByText('Dashboard')).toBeVisible();
	});

	test('should handle login failure', async ({ page }) => {
		// Mock failed login
		await page.route('/api/auth/login', async route => {
			await route.fulfill({
				status: 401,
				contentType: 'text/plain',
				body: 'Invalid credentials'
			});
		});

		await page.getByLabel('Username').fill('admin');
		await page.getByLabel('Password').fill('wrongpassword');
		await page.getByRole('button', { name: /sign in/i }).click();
		
		// Should show error message
		await expect(page.getByText('Invalid credentials')).toBeVisible();
		await expect(page.getByText('⚠️')).toBeVisible();
		
		// Should stay on login page
		await expect(page).toHaveURL('/login');
	});

	test('should display feature showcase', async ({ page }) => {
		await expect(page.getByText('Gym Management Features')).toBeVisible();
		await expect(page.getByText('Member Management')).toBeVisible();
		await expect(page.getByText('Track members, contact info, and status')).toBeVisible();
		await expect(page.getByText('Flexible Plans')).toBeVisible();
		await expect(page.getByText('Create custom gym and PT plans')).toBeVisible();
		await expect(page.getByText('Membership Tracking')).toBeVisible();
		await expect(page.getByText('Monitor memberships and renewals')).toBeVisible();
		await expect(page.getByText('Financial Reports')).toBeVisible();
		await expect(page.getByText('Comprehensive revenue analytics')).toBeVisible();
	});

	test('should redirect if already authenticated', async ({ page }) => {
		// Mock authenticated state
		await page.route('/api/auth/check', async route => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ authenticated: true })
			});
		});

		await page.goto('/login');
		
		// Should redirect to dashboard
		await expect(page).toHaveURL('/');
	});

	test('should be responsive on mobile', async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 667 });
		
		// Check mobile layout
		await expect(page.getByText('Kranos Gym')).toBeVisible();
		await expect(page.getByLabel('Username')).toBeVisible();
		await expect(page.getByLabel('Password')).toBeVisible();
		
		// Features should still be visible (might be stacked)
		await expect(page.getByText('Gym Management Features')).toBeVisible();
	});

	test('should apply dark theme styles', async ({ page }) => {
		// Check CSS variables are applied
		const background = await page.evaluate(() => {
			return getComputedStyle(document.documentElement).getPropertyValue('--background');
		});
		expect(background.trim()).toBe('#0a0a0a');

		const primary = await page.evaluate(() => {
			return getComputedStyle(document.documentElement).getPropertyValue('--primary');
		});
		expect(primary.trim()).toBe('#f39407');
	});

	test('should have floating particles animation', async ({ page }) => {
		const backgroundElement = page.locator('.login-background');
		await expect(backgroundElement).toBeVisible();
		
		// Check if particles are created (they're added by JavaScript)
		await page.waitForTimeout(1000); // Wait for onMount
		const particles = page.locator('.floating-particle');
		await expect(particles.first()).toBeVisible();
	});

	test('should handle network errors gracefully', async ({ page }) => {
		// Mock network failure
		await page.route('/api/auth/login', async route => {
			await route.abort('internetdisconnected');
		});

		await page.getByLabel('Username').fill('admin');
		await page.getByLabel('Password').fill('password123');
		await page.getByRole('button', { name: /sign in/i }).click();
		
		// Should show generic error message
		await expect(page.getByText('Login failed. Please try again.')).toBeVisible();
	});
});