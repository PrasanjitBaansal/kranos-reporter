import { test, expect } from '@playwright/test';

test.describe('Complete User Journey - Gym Data Management', () => {
	test.beforeEach(async ({ page }) => {
		// Mock all necessary API endpoints
		await setupAPIMocks(page);
	});

	test('complete gym management workflow', async ({ page }) => {
		// 1. Start at dashboard
		await page.goto('/');
		await expect(page.getByText('Dashboard')).toBeVisible();
		await expect(page.getByText('Welcome back!')).toBeVisible();
		
		// 2. Verify dashboard stats are displayed
		await expect(page.getByText('Total Members')).toBeVisible();
		await expect(page.getByText('156')).toBeVisible();
		await expect(page.getByText('₹45,780.00')).toBeVisible();
		
		// 3. Navigate to Members page
		await page.getByRole('link', { name: /members/i }).click();
		await expect(page).toHaveURL('/members');
		await expect(page.getByText('Members')).toBeVisible();
		
		// 6. Add a new member
		await page.getByPlaceholder('Enter member name').fill('Test User');
		await page.getByPlaceholder('Enter phone number').fill('555-TEST');
		await page.getByPlaceholder('Enter email address').fill('test@gym.com');
		await page.getByText('Add Member').click();
		
		// 7. Verify member was added (check for success or reload)
		await page.waitForTimeout(1000);
		
		// 8. Search for the new member
		await page.getByPlaceholder('Search members...').fill('Test User');
		await expect(page.getByText('Test User')).toBeVisible();
		
		// 9. Navigate to Plans page
		await page.getByRole('link', { name: /plans/i }).click();
		await expect(page).toHaveURL('/plans');
		await expect(page.getByText('Gym Plans')).toBeVisible();
		
		// 10. Add a new plan
		await page.getByPlaceholder('e.g., MMA Focus, Weight Training').fill('Test Plan');
		await page.getByPlaceholder('e.g., 30, 90, 365').fill('30');
		await page.getByPlaceholder('0.00').fill('99.99');
		await page.getByText('Add Plan').click();
		
		// 11. Navigate to Memberships page
		await page.getByRole('link', { name: /memberships/i }).click();
		await expect(page).toHaveURL('/memberships');
		await expect(page.getByText('Group Classes')).toBeVisible();
		
		// 12. Create a Group Class membership
		// Select member
		const memberCard = page.locator('.member-card').filter({ hasText: 'Test User' });
		if (await memberCard.count() > 0) {
			await memberCard.click();
		}
		
		// Select plan
		const planCard = page.locator('.plan-card').filter({ hasText: 'Test Plan' });
		if (await planCard.count() > 0) {
			await planCard.click();
		}
		
		// Fill membership details
		await page.locator('input[type="date"]').fill('2024-06-22');
		await page.locator('input[placeholder="0.00"]').fill('99.99');
		
		// Submit membership
		await page.getByText('Create Membership').click();
		
		// 13. Switch to Personal Training tab
		await page.getByText('Personal Training').click();
		await expect(page.getByText('Personal Training Memberships')).toBeVisible();
		
		// 14. Create a PT membership
		if (await memberCard.count() > 0) {
			await memberCard.click();
		}
		
		await page.getByPlaceholder('e.g., 10, 20').fill('10');
		await page.locator('#pt_amount_paid').fill('200.00');
		await page.getByText('Create Membership').click();
		
		// 15. Navigate to Reports page
		await page.getByRole('link', { name: /reports/i }).click();
		await expect(page).toHaveURL('/reporting');
		await expect(page.getByText('Financial Report')).toBeVisible();
		
		// 16. View financial report
		await page.getByText('Financial Report').click();
		await expect(page.getByText('Total Revenue')).toBeVisible();
		await expect(page.getByText('₹45,780')).toBeVisible();
		
		// 17. Switch to renewals report
		await page.getByText('Upcoming Renewals').click();
		await expect(page.getByText('Upcoming Renewals (Next 30 Days)')).toBeVisible();
		
		// 18. Test export functionality
		await page.getByText('Download Report').click();
		// Note: This would trigger a download in a real scenario
		
		// 19. Verify navigation consistency
		await page.getByRole('link', { name: /dashboard/i }).click();
		await expect(page).toHaveURL('/');
		
		// 20. Test responsive behavior
		await page.setViewportSize({ width: 375, height: 667 });
		await page.getByRole('button', { name: /menu/i }).click();
		await page.getByRole('link', { name: /members/i }).click();
		await expect(page).toHaveURL('/members');
		
		// 21. Verify dark theme is maintained throughout
		const primaryColor = await page.evaluate(() => {
			return getComputedStyle(document.documentElement)
				.getPropertyValue('--primary').trim();
		});
		expect(primaryColor).toBe('#f39407');
	});

	test('error handling and recovery workflow', async ({ page }) => {
		// Start at dashboard
		await page.goto('/');
		
		// Navigate to members
		await page.getByRole('link', { name: /members/i }).click();
		
		// Mock API error for member creation
		await page.route('/api/members', async route => {
			if (route.request().method() === 'POST') {
				await route.fulfill({
					status: 500,
					contentType: 'text/plain',
					body: 'Server error'
				});
			} else {
				await route.continue();
			}
		});
		
		// Try to create member (should fail)
		await page.getByPlaceholder('Enter member name').fill('Error Test');
		await page.getByPlaceholder('Enter phone number').fill('555-ERROR');
		await page.getByText('Add Member').click();
		
		// Handle error dialog
		page.on('dialog', async dialog => {
			expect(dialog.message()).toContain('Error saving member');
			await dialog.accept();
		});
		
		// Verify form is still populated (user can retry)
		await expect(page.getByDisplayValue('Error Test')).toBeVisible();
		
		// Test recovery - fix the API and retry
		await page.route('/api/members', async route => {
			if (route.request().method() === 'POST') {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({ id: 999 })
				});
			} else {
				await route.continue();
			}
		});
		
		// Retry submission
		await page.getByText('Add Member').click();
		
		// Should succeed this time
		await page.waitForTimeout(500);
		await expect(page.getByPlaceholder('Enter member name')).toHaveValue('');
	});

	test('data persistence and state management', async ({ page }) => {
		// Login
		await page.goto('/login');
		await page.getByLabel('Username').fill('admin');
		await page.getByLabel('Password').fill('password123');
		await page.getByRole('button', { name: /sign in/i }).click();
		
		// Go to members and select one
		await page.getByRole('link', { name: /members/i }).click();
		await page.getByText('John Doe').click();
		
		// Verify form is populated
		await expect(page.getByDisplayValue('John Doe')).toBeVisible();
		await expect(page.getByDisplayValue('555-0001')).toBeVisible();
		
		// Navigate away and back
		await page.getByRole('link', { name: /dashboard/i }).click();
		await page.getByRole('link', { name: /members/i }).click();
		
		// State should be reset (no member selected)
		await expect(page.getByText('Add New Member')).toBeVisible();
		
		// Search functionality persistence
		await page.getByPlaceholder('Search members...').fill('John');
		await expect(page.getByText('John Doe')).toBeVisible();
		await expect(page.getByText('Jane Smith')).not.toBeVisible();
		
		// Clear search
		await page.getByPlaceholder('Search members...').fill('');
		await expect(page.getByText('Jane Smith')).toBeVisible();
	});

	test('accessibility and keyboard navigation', async ({ page }) => {
		await page.goto('/login');
		
		// Test keyboard navigation
		await page.keyboard.press('Tab'); // Should focus username
		await page.keyboard.type('admin');
		
		await page.keyboard.press('Tab'); // Should focus password
		await page.keyboard.type('password123');
		
		await page.keyboard.press('Enter'); // Should submit form
		
		// Should be on dashboard
		await expect(page).toHaveURL('/');
		
		// Test navigation with keyboard
		await page.keyboard.press('Tab'); // Focus first nav item
		await page.keyboard.press('Enter'); // Should navigate
		
		// Test form accessibility
		await page.goto('/members');
		
		// Labels should be properly associated
		const nameInput = page.getByLabel('Name *');
		await expect(nameInput).toBeVisible();
		
		const phoneInput = page.getByLabel('Phone *');
		await expect(phoneInput).toBeVisible();
		
		// Required fields should have proper attributes
		await expect(nameInput).toHaveAttribute('required');
		await expect(phoneInput).toHaveAttribute('required');
	});
});

async function setupAPIMocks(page) {
	// Authentication
	await page.route('/api/auth/login', async route => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ success: true })
		});
	});

	await page.route('/api/auth/check', async route => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ authenticated: true })
		});
	});

	// Dashboard data
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

	// Members
	await page.route('/api/members', async route => {
		if (route.request().method() === 'GET') {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify([
					{ id: 1, name: 'John Doe', phone: '555-0001', email: 'john@example.com', is_active: true },
					{ id: 2, name: 'Jane Smith', phone: '555-0002', email: 'jane@example.com', is_active: true },
					{ id: 3, name: 'Test User', phone: '555-TEST', email: 'test@gym.com', is_active: true }
				])
			});
		} else if (route.request().method() === 'POST') {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ id: 999 })
			});
		} else {
			await route.continue();
		}
	});

	// Plans
	await page.route('/api/plans', async route => {
		if (route.request().method() === 'GET') {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify([
					{ id: 1, name: 'MMA Focus', duration_days: 90, default_amount: 120.00, is_active: true },
					{ id: 2, name: 'Test Plan', duration_days: 30, default_amount: 99.99, is_active: true }
				])
			});
		} else if (route.request().method() === 'POST') {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ id: 998 })
			});
		} else {
			await route.continue();
		}
	});

	// Memberships
	await page.route('/api/memberships/group-class', async route => {
		if (route.request().method() === 'GET') {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify([
					{ id: 1, member_name: 'John Doe', plan_name: 'MMA Focus', start_date: '2024-06-01', end_date: '2024-08-30', is_active: true }
				])
			});
		} else if (route.request().method() === 'POST') {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ id: 997 })
			});
		} else {
			await route.continue();
		}
	});

	await page.route('/api/memberships/personal-training', async route => {
		if (route.request().method() === 'GET') {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify([
					{ id: 1, member_name: 'John Doe', sessions_total: 10, sessions_remaining: 7, amount_paid: 200.00 }
				])
			});
		} else if (route.request().method() === 'POST') {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ id: 996 })
			});
		} else {
			await route.continue();
		}
	});

	// Reports
	await page.route('/api/reports/financial**', async route => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				total_revenue: 45780,
				gc_revenue: 35000,
				pt_revenue: 10780,
				total_transactions: 156,
				transactions: [
					{ date: '2024-06-20', member_name: 'John Doe', type: 'group_class', amount: 120.00 }
				]
			})
		});
	});

	await page.route('/api/reports/renewals**', async route => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify([
				{ id: 1, member_name: 'John Doe', plan_name: 'MMA Focus', end_date: '2024-07-01' }
			])
		});
	});
}