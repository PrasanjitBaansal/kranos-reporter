import { test, expect } from '@playwright/test';

test.describe('Payment Management Workflow', () => {
    test.beforeEach(async ({ page }) => {
        // Mock authentication with admin permissions
        await page.route('/api/auth/check', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ 
                    authenticated: true,
                    user: {
                        id: 1,
                        username: 'admin',
                        role: 'admin',
                        permissions: ['payments.view', 'payments.create', 'payments.edit', 'payments.delete']
                    }
                })
            });
        });
    });

    test('should display payment dashboard with expense list', async ({ page }) => {
        await page.goto('/payments');
        
        // Check page title
        await expect(page.locator('h1')).toContainText('Payments Management');
        
        // Verify dashboard sections
        await expect(page.locator('.metrics-grid')).toBeVisible();
        await expect(page.locator('.expenses-section')).toBeVisible();
        
        // Check Add Expense button
        await expect(page.locator('button:has-text("Add Expense")')).toBeVisible();
    });

    test('should create a new expense', async ({ page }) => {
        await page.goto('/payments');
        
        // Click Add Expense button
        await page.click('button:has-text("Add Expense")');
        
        // Fill expense form
        await page.fill('input[name="amount"]', '1500');
        await page.fill('input[name="category"]', 'Utilities');
        await page.fill('input[name="recipient"]', 'Electricity Board');
        await page.fill('textarea[name="description"]', 'Monthly electricity bill');
        await page.fill('input[name="payment_date"]', '15-01-2024');
        await page.selectOption('select[name="payment_method"]', 'Bank Transfer');
        
        // Submit form
        await page.click('button[type="submit"]:has-text("Create Expense")');
        
        // Verify success
        await expect(page.locator('.toast-success')).toContainText('Expense created successfully');
        
        // Verify expense appears in list
        await expect(page.locator('tr:has-text("Electricity Board")')).toBeVisible();
        await expect(page.locator('tr:has-text("₹1,500")')).toBeVisible();
    });

    test('should edit an existing expense', async ({ page }) => {
        await page.goto('/payments');
        
        // Click edit button on first expense
        await page.click('tr:first-child button:has-text("Edit")');
        
        // Update expense details
        await page.fill('input[name="amount"]', '2000');
        await page.fill('textarea[name="description"]', 'Updated electricity bill');
        
        // Submit form
        await page.click('button[type="submit"]:has-text("Update Expense")');
        
        // Verify success
        await expect(page.locator('.toast-success')).toContainText('Expense updated successfully');
        
        // Verify updated amount
        await expect(page.locator('tr:first-child')).toContainText('₹2,000');
    });

    test('should delete an expense', async ({ page }) => {
        await page.goto('/payments');
        
        // Click delete button on first expense
        await page.click('tr:first-child button:has-text("Delete")');
        
        // Confirm deletion in dialog
        await page.click('button:has-text("Confirm Delete")');
        
        // Verify success
        await expect(page.locator('.toast-success')).toContainText('Expense deleted successfully');
        
        // Verify expense is removed from list
        const expenseCount = await page.locator('tbody tr').count();
        expect(expenseCount).toBeLessThan(5); // Assuming we had 5 expenses before
    });

    test('should filter expenses by category', async ({ page }) => {
        await page.goto('/payments');
        
        // Select category filter
        await page.selectOption('select[name="category"]', 'Rent');
        
        // Click filter button
        await page.click('button:has-text("Apply Filters")');
        
        // Verify only rent expenses are shown
        const expenses = page.locator('tbody tr');
        const count = await expenses.count();
        
        for (let i = 0; i < count; i++) {
            await expect(expenses.nth(i)).toContainText('Rent');
        }
    });

    test('should filter expenses by date range', async ({ page }) => {
        await page.goto('/payments');
        
        // Set date range
        await page.fill('input[name="startDate"]', '01-01-2024');
        await page.fill('input[name="endDate"]', '31-01-2024');
        
        // Click filter button
        await page.click('button:has-text("Apply Filters")');
        
        // Verify filtered results
        const expenses = page.locator('tbody tr');
        const count = await expenses.count();
        expect(count).toBeGreaterThan(0);
        
        // All expenses should be in January 2024
        for (let i = 0; i < count; i++) {
            const dateText = await expenses.nth(i).locator('td:nth-child(5)').textContent();
            expect(dateText).toMatch(/\d{2}\/01\/2024/);
        }
    });

    test('should export expenses to CSV', async ({ page }) => {
        await page.goto('/payments');
        
        // Set up download listener
        const downloadPromise = page.waitForEvent('download');
        
        // Click export button
        await page.click('button:has-text("Export to CSV")');
        
        // Wait for download
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toMatch(/expenses.*\.csv/);
    });

    test('should display expense summary metrics', async ({ page }) => {
        await page.goto('/payments');
        
        // Check metrics cards
        const totalExpenses = page.locator('.metric-card:has-text("Total Expenses")');
        await expect(totalExpenses).toBeVisible();
        await expect(totalExpenses.locator('.metric-value')).toContainText('₹');
        
        const monthlyExpenses = page.locator('.metric-card:has-text("This Month")');
        await expect(monthlyExpenses).toBeVisible();
        await expect(monthlyExpenses.locator('.metric-value')).toContainText('₹');
        
        const expenseCount = page.locator('.metric-card:has-text("Total Entries")');
        await expect(expenseCount).toBeVisible();
        await expect(expenseCount.locator('.metric-value')).toMatch(/\d+/);
    });

    test('should validate expense form inputs', async ({ page }) => {
        await page.goto('/payments');
        
        // Click Add Expense button
        await page.click('button:has-text("Add Expense")');
        
        // Try to submit empty form
        await page.click('button[type="submit"]:has-text("Create Expense")');
        
        // Check validation errors
        await expect(page.locator('.error:has-text("Amount is required")')).toBeVisible();
        await expect(page.locator('.error:has-text("Category is required")')).toBeVisible();
        await expect(page.locator('.error:has-text("Recipient is required")')).toBeVisible();
        await expect(page.locator('.error:has-text("Payment date is required")')).toBeVisible();
        
        // Enter invalid amount
        await page.fill('input[name="amount"]', '-100');
        await page.click('button[type="submit"]:has-text("Create Expense")');
        
        await expect(page.locator('.error:has-text("Amount must be greater than 0")')).toBeVisible();
    });

    test('should handle expense categories dynamically', async ({ page }) => {
        await page.goto('/payments');
        
        // Click Add Expense button
        await page.click('button:has-text("Add Expense")');
        
        // Type new category
        await page.fill('input[name="category"]', 'New Category');
        await page.fill('input[name="amount"]', '1000');
        await page.fill('input[name="recipient"]', 'Test Recipient');
        await page.fill('input[name="payment_date"]', '15-01-2024');
        
        // Submit form
        await page.click('button[type="submit"]:has-text("Create Expense")');
        
        // Verify new category appears in filter dropdown
        await page.goto('/payments'); // Reload page
        
        const categoryOptions = await page.locator('select[name="category"] option').allTextContents();
        expect(categoryOptions).toContain('New Category');
    });

    test('should restrict access for non-admin users', async ({ page }) => {
        // Mock authentication as trainer (view-only)
        await page.route('/api/auth/check', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ 
                    authenticated: true,
                    user: {
                        id: 2,
                        username: 'trainer',
                        role: 'trainer',
                        permissions: ['payments.view']
                    }
                })
            });
        });
        
        await page.goto('/payments');
        
        // Should see expenses but no action buttons
        await expect(page.locator('.expenses-section')).toBeVisible();
        await expect(page.locator('button:has-text("Add Expense")')).not.toBeVisible();
        await expect(page.locator('button:has-text("Edit")')).not.toBeVisible();
        await expect(page.locator('button:has-text("Delete")')).not.toBeVisible();
        
        // Should see "View Only Mode" indicator
        await expect(page.locator('.view-only-indicator')).toBeVisible();
    });

    test('should handle pagination for large expense lists', async ({ page }) => {
        // Mock API to return paginated data
        await page.route('/payments', async route => {
            const url = new URL(route.request().url());
            const pageParam = url.searchParams.get('page') || '1';
            
            // Return different data based on page
            const mockExpenses = Array.from({ length: 10 }, (_, i) => ({
                id: (parseInt(pageParam) - 1) * 10 + i + 1,
                amount: 1000 + i * 100,
                category: 'Test Category',
                recipient: `Recipient ${(parseInt(pageParam) - 1) * 10 + i + 1}`,
                payment_date: '2024-01-15',
                status: 'Paid'
            }));
            
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    expenses: mockExpenses,
                    totalPages: 5,
                    currentPage: parseInt(pageParam)
                })
            });
        });
        
        await page.goto('/payments');
        
        // Check pagination controls
        await expect(page.locator('.pagination')).toBeVisible();
        await expect(page.locator('.pagination button:has-text("Next")')).toBeVisible();
        
        // Navigate to next page
        await page.click('.pagination button:has-text("Next")');
        await expect(page.url()).toContain('page=2');
        
        // Verify different data on page 2
        await expect(page.locator('tbody tr:first-child')).toContainText('Recipient 11');
    });

    test('should work on mobile devices', async ({ page }) => {
        // Set mobile viewport
        await page.setViewportSize({ width: 375, height: 667 });
        
        await page.goto('/payments');
        
        // Check responsive layout
        await expect(page.locator('.metrics-grid')).toHaveCSS('grid-template-columns', /1fr/);
        
        // Check horizontal scroll on table
        const tableContainer = page.locator('.table-container');
        await expect(tableContainer).toHaveCSS('overflow-x', 'auto');
        
        // Mobile menu should work
        await page.click('.mobile-menu-toggle');
        await expect(page.locator('.mobile-menu')).toBeVisible();
    });
});