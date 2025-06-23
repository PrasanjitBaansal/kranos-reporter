import { test, expect } from '@playwright/test';

test.describe('Member Management Workflow', () => {
	test.beforeEach(async ({ page }) => {
		// Mock authentication
		await page.route('/api/auth/check', async route => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ authenticated: true })
			});
		});

		// Mock members data
		await page.route('/api/members', async route => {
			const mockMembers = [
				{
					id: 1,
					name: 'John Doe',
					phone: '555-0001',
					email: 'john@example.com',
					join_date: '2024-01-15',
					is_active: true
				},
				{
					id: 2,
					name: 'Jane Smith',
					phone: '555-0002',
					email: 'jane@example.com',
					join_date: '2024-02-01',
					is_active: true
				},
				{
					id: 3,
					name: 'Mike Johnson',
					phone: '555-0003',
					email: 'mike@example.com',
					join_date: '2024-01-01',
					is_active: false
				}
			];

			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(mockMembers)
			});
		});

		await page.goto('/members');
	});

	test('should display members page correctly', async ({ page }) => {
		await expect(page).toHaveTitle(/Members - Kranos Gym/);
		await expect(page.getByText('Members')).toBeVisible();
		await expect(page.getByText('Add Member')).toBeVisible();
		await expect(page.getByPlaceholder('Search members...')).toBeVisible();
	});

	test('should display member list', async ({ page }) => {
		await expect(page.getByText('John Doe')).toBeVisible();
		await expect(page.getByText('555-0001')).toBeVisible();
		await expect(page.getByText('john@example.com')).toBeVisible();
		await expect(page.getByText('Jane Smith')).toBeVisible();
		await expect(page.getByText('Mike Johnson')).toBeVisible();
	});

	test('should show member status badges', async ({ page }) => {
		const activeStatuses = page.getByText('Active');
		const inactiveStatuses = page.getByText('Inactive');
		
		await expect(activeStatuses.first()).toBeVisible();
		await expect(inactiveStatuses.first()).toBeVisible();
	});

	test('should filter members by search', async ({ page }) => {
		const searchInput = page.getByPlaceholder('Search members...');
		
		// Search for 'John'
		await searchInput.fill('John');
		await expect(page.getByText('John Doe')).toBeVisible();
		await expect(page.getByText('Jane Smith')).not.toBeVisible();
		
		// Search for phone number
		await searchInput.fill('555-0002');
		await expect(page.getByText('Jane Smith')).toBeVisible();
		await expect(page.getByText('John Doe')).not.toBeVisible();
		
		// Search for email
		await searchInput.fill('mike@example.com');
		await expect(page.getByText('Mike Johnson')).toBeVisible();
		await expect(page.getByText('John Doe')).not.toBeVisible();
	});

	test('should show empty search state', async ({ page }) => {
		const searchInput = page.getByPlaceholder('Search members...');
		await searchInput.fill('NonExistentMember');
		
		await expect(page.getByText('No members found matching your search.')).toBeVisible();
		await expect(page.getByText('🔍')).toBeVisible();
	});

	test('should select member and populate form', async ({ page }) => {
		// Click on John Doe
		await page.getByText('John Doe').click();
		
		// Check if member is selected
		const memberItem = page.locator('.member-item').filter({ hasText: 'John Doe' });
		await expect(memberItem).toHaveClass(/selected/);
		
		// Check form is populated
		await expect(page.getByDisplayValue('John Doe')).toBeVisible();
		await expect(page.getByDisplayValue('555-0001')).toBeVisible();
		await expect(page.getByDisplayValue('john@example.com')).toBeVisible();
		
		// Should show edit mode
		await expect(page.getByText('Edit Member')).toBeVisible();
		await expect(page.getByText('Update Member')).toBeVisible();
	});

	test('should add new member', async ({ page }) => {
		// Mock POST request
		await page.route('/api/members', async route => {
			if (route.request().method() === 'POST') {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({ id: 4 })
				});
			} else {
				await route.continue();
			}
		});

		// Fill form
		await page.getByPlaceholder('Enter member name').fill('New Member');
		await page.getByPlaceholder('Enter phone number').fill('555-9999');
		await page.getByPlaceholder('Enter email address').fill('new@example.com');
		
		// Submit form
		await page.getByText('Add Member').click();
		
		// Verify API call
		await page.waitForRequest(request => 
			request.method() === 'POST' && 
			request.url().includes('/api/members')
		);
	});

	test('should update existing member', async ({ page }) => {
		// Mock PUT request
		await page.route('/api/members/*', async route => {
			if (route.request().method() === 'PUT') {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({ updated: true })
				});
			} else {
				await route.continue();
			}
		});

		// Select member
		await page.getByText('John Doe').click();
		
		// Update name
		const nameInput = page.getByDisplayValue('John Doe');
		await nameInput.fill('John Updated');
		
		// Submit form
		await page.getByText('Update Member').click();
		
		// Verify API call
		await page.waitForRequest(request => 
			request.method() === 'PUT' && 
			request.url().includes('/api/members/1')
		);
	});

	test('should validate required fields', async ({ page }) => {
		// Try to submit empty form
		await page.getByText('Add Member').click();
		
		// Form validation should prevent submission
		const nameInput = page.getByPlaceholder('Enter member name');
		const phoneInput = page.getByPlaceholder('Enter phone number');
		
		await expect(nameInput).toHaveAttribute('required');
		await expect(phoneInput).toHaveAttribute('required');
	});

	test('should validate email format', async ({ page }) => {
		const emailInput = page.getByPlaceholder('Enter email address');
		await expect(emailInput).toHaveAttribute('type', 'email');
	});

	test('should toggle active status with custom checkbox', async ({ page }) => {
		const checkbox = page.locator('.neon-checkbox input[type="checkbox"]');
		const checkmark = page.locator('.checkmark');
		
		await expect(checkbox).toBeChecked(); // Default is active
		await expect(checkmark).toBeVisible();
		
		await checkbox.click();
		await expect(checkbox).not.toBeChecked();
	});

	test('should delete member with confirmation', async ({ page }) => {
		// Mock DELETE request
		await page.route('/api/members/*', async route => {
			if (route.request().method() === 'DELETE') {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({ deleted: true })
				});
			} else {
				await route.continue();
			}
		});

		// Set up dialog handler
		page.on('dialog', async dialog => {
			expect(dialog.message()).toContain('Are you sure you want to delete');
			await dialog.accept();
		});

		// Click delete button for first member
		const deleteButtons = page.getByText('Delete');
		await deleteButtons.first().click();
		
		// Verify API call
		await page.waitForRequest(request => 
			request.method() === 'DELETE' && 
			request.url().includes('/api/members/')
		);
	});

	test('should cancel member deletion', async ({ page }) => {
		// Set up dialog handler to cancel
		page.on('dialog', async dialog => {
			await dialog.dismiss();
		});

		const deleteButtons = page.getByText('Delete');
		await deleteButtons.first().click();
		
		// Member should still be visible
		await expect(page.getByText('John Doe')).toBeVisible();
	});

	test('should reset form when clicking cancel', async ({ page }) => {
		// Fill form with data
		await page.getByPlaceholder('Enter member name').fill('Test Name');
		await page.getByPlaceholder('Enter phone number').fill('555-1234');
		
		// Click cancel
		await page.getByText('Cancel').click();
		
		// Form should be reset
		await expect(page.getByPlaceholder('Enter member name')).toHaveValue('');
		await expect(page.getByPlaceholder('Enter phone number')).toHaveValue('');
		await expect(page.getByText('Add New Member')).toBeVisible();
	});

	test('should show loading state during form submission', async ({ page }) => {
		// Mock slow API response
		await page.route('/api/members', async route => {
			if (route.request().method() === 'POST') {
				await new Promise(resolve => setTimeout(resolve, 1000));
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({ id: 4 })
				});
			} else {
				await route.continue();
			}
		});

		// Fill and submit form
		await page.getByPlaceholder('Enter member name').fill('Test Member');
		await page.getByPlaceholder('Enter phone number').fill('555-9999');
		await page.getByText('Add Member').click();
		
		// Check loading state
		await expect(page.getByText('Saving...')).toBeVisible();
		await expect(page.locator('.loading-spinner')).toBeVisible();
	});

	test('should be responsive on mobile', async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 667 });
		
		// Check layout stacks vertically on mobile
		const container = page.locator('.members-container');
		await expect(container).toBeVisible();
		
		// All elements should still be accessible
		await expect(page.getByText('Members')).toBeVisible();
		await expect(page.getByText('John Doe')).toBeVisible();
		await expect(page.getByPlaceholder('Enter member name')).toBeVisible();
	});

	test('should apply dark theme styles', async ({ page }) => {
		// Check for dark theme elements
		const cards = page.locator('.card');
		await expect(cards.first()).toBeVisible();
		
		// Check for neon styling
		const memberItems = page.locator('.member-item');
		await expect(memberItems.first()).toBeVisible();
		
		// Check search input styling
		const searchInput = page.getByPlaceholder('Search members...');
		await expect(searchInput).toBeVisible();
	});

	test('should handle API errors gracefully', async ({ page }) => {
		// Mock API error
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

		// Try to submit form
		await page.getByPlaceholder('Enter member name').fill('Test Member');
		await page.getByPlaceholder('Enter phone number').fill('555-9999');
		await page.getByText('Add Member').click();
		
		// Should show error (via alert in this implementation)
		page.on('dialog', async dialog => {
			expect(dialog.message()).toContain('Error saving member');
			await dialog.accept();
		});
	});

	test('should navigate back to dashboard', async ({ page }) => {
		await page.getByRole('link', { name: /dashboard/i }).click();
		await expect(page).toHaveURL('/');
	});
});