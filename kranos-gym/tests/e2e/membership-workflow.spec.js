import { test, expect } from '@playwright/test';

test.describe('Membership Management Workflow', () => {
    test.beforeEach(async ({ page }) => {
        // Mock authentication
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
                        permissions: ['memberships.view', 'memberships.create', 'memberships.edit', 'memberships.delete']
                    }
                })
            });
        });
    });

    test('should display membership list with filters', async ({ page }) => {
        await page.goto('/memberships');
        
        // Check page title
        await expect(page.locator('h1')).toContainText('Group Class Memberships');
        
        // Verify filter section
        await expect(page.locator('.filter-section')).toBeVisible();
        await expect(page.locator('button:has-text("Active Only")')).toBeVisible();
        await expect(page.locator('button:has-text("Expired Only")')).toBeVisible();
        await expect(page.locator('button:has-text("Clear Filters")')).toBeVisible();
        
        // Check Add Membership button
        await expect(page.locator('button:has-text("Add Membership")')).toBeVisible();
        
        // Check Bulk Import button
        await expect(page.locator('a:has-text("Bulk Import")')).toBeVisible();
    });

    test('should create a new membership', async ({ page }) => {
        await page.goto('/memberships');
        
        // Click Add Membership button
        await page.click('button:has-text("Add Membership")');
        
        // Select member
        await page.selectOption('select[name="member_id"]', { label: 'John Doe - 9876543210' });
        
        // Select plan
        await page.selectOption('select[name="plan_id"]', { label: 'MMA Focus - 30 days' });
        
        // Fill dates
        await page.fill('input[name="start_date"]', '01-02-2024');
        await page.fill('input[name="purchase_date"]', '01-02-2024');
        
        // Fill amount
        await page.fill('input[name="amount_paid"]', '2000');
        
        // Submit form
        await page.click('button[type="submit"]:has-text("Create Membership")');
        
        // Verify success
        await expect(page.locator('.toast-success')).toContainText('Membership created successfully');
        
        // Verify membership appears in list
        await expect(page.locator('tr:has-text("John Doe")')).toBeVisible();
    });

    test('should auto-populate end date based on plan duration', async ({ page }) => {
        await page.goto('/memberships');
        
        // Click Add Membership button
        await page.click('button:has-text("Add Membership")');
        
        // Select member and plan
        await page.selectOption('select[name="member_id"]', { label: 'Jane Smith - 9876543211' });
        await page.selectOption('select[name="plan_id"]', { label: 'MMA Focus - 30 days' });
        
        // Set start date
        await page.fill('input[name="start_date"]', '15-01-2024');
        
        // Verify end date is auto-calculated (30 days from start)
        await expect(page.locator('input[name="end_date"]')).toHaveValue('14/02/2024');
    });

    test('should validate membership overlaps', async ({ page }) => {
        await page.goto('/memberships');
        
        // Click Add Membership button
        await page.click('button:has-text("Add Membership")');
        
        // Try to create overlapping membership
        await page.selectOption('select[name="member_id"]', { label: 'John Doe - 9876543210' });
        await page.selectOption('select[name="plan_id"]', { label: 'MMA Focus - 30 days' });
        await page.fill('input[name="start_date"]', '15-01-2024');
        await page.fill('input[name="amount_paid"]', '2000');
        
        // Submit form
        await page.click('button[type="submit"]:has-text("Create Membership")');
        
        // Verify overlap error
        await expect(page.locator('.error')).toContainText('overlapping membership');
    });

    test('should filter active memberships', async ({ page }) => {
        await page.goto('/memberships');
        
        // Click Active Only filter
        await page.click('button:has-text("Active Only")');
        
        // Verify URL has filter parameter
        await expect(page.url()).toContain('filter=active');
        
        // Verify only active memberships shown
        const rows = page.locator('tbody tr');
        const count = await rows.count();
        
        for (let i = 0; i < count; i++) {
            const statusBadge = rows.nth(i).locator('.status-badge');
            await expect(statusBadge).toHaveClass(/active/);
        }
    });

    test('should filter expired memberships', async ({ page }) => {
        await page.goto('/memberships');
        
        // Click Expired Only filter
        await page.click('button:has-text("Expired Only")');
        
        // Verify URL has filter parameter
        await expect(page.url()).toContain('filter=expired');
        
        // Verify only expired memberships shown
        const rows = page.locator('tbody tr');
        const count = await rows.count();
        
        for (let i = 0; i < count; i++) {
            const statusBadge = rows.nth(i).locator('.status-badge');
            await expect(statusBadge).toHaveClass(/expired/);
        }
    });

    test('should search memberships by member name', async ({ page }) => {
        await page.goto('/memberships');
        
        // Type in search box
        await page.fill('input[placeholder="Search by name or phone..."]', 'John');
        
        // Verify filtered results
        const rows = page.locator('tbody tr');
        const count = await rows.count();
        
        for (let i = 0; i < count; i++) {
            await expect(rows.nth(i)).toContainText('John');
        }
    });

    test('should sort memberships by different columns', async ({ page }) => {
        await page.goto('/memberships');
        
        // Click on Start Date column header to sort
        await page.click('th:has-text("Start Date")');
        
        // Verify ascending sort
        const dates = await page.locator('tbody tr td:nth-child(4)').allTextContents();
        for (let i = 1; i < dates.length; i++) {
            const prevDate = new Date(dates[i-1].split('/').reverse().join('-'));
            const currDate = new Date(dates[i].split('/').reverse().join('-'));
            expect(prevDate.getTime()).toBeLessThanOrEqual(currDate.getTime());
        }
        
        // Click again for descending sort
        await page.click('th:has-text("Start Date")');
        
        // Verify descending sort
        const descDates = await page.locator('tbody tr td:nth-child(4)').allTextContents();
        for (let i = 1; i < descDates.length; i++) {
            const prevDate = new Date(descDates[i-1].split('/').reverse().join('-'));
            const currDate = new Date(descDates[i].split('/').reverse().join('-'));
            expect(prevDate.getTime()).toBeGreaterThanOrEqual(currDate.getTime());
        }
    });

    test('should handle bulk import workflow', async ({ page }) => {
        await page.goto('/memberships');
        
        // Click Bulk Import link
        await page.click('a:has-text("Bulk Import")');
        
        // Verify navigation to bulk import page
        await expect(page.url()).toContain('/memberships/bulk-import');
        await expect(page.locator('h1')).toContainText('Bulk Import Group Memberships');
        
        // Step 1: Download template
        const downloadPromise = page.waitForEvent('download');
        await page.click('button:has-text("Download CSV Template")');
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toBe('membership_import_template.csv');
        
        // Step 2: Upload CSV
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles({
            name: 'test_memberships.csv',
            mimeType: 'text/csv',
            buffer: Buffer.from(
                'name,phone,email,plan_name,duration_days,start_date,amount_paid,purchase_date\n' +
                'Test User,9999999999,test@example.com,MMA Focus,30,15-01-2024,2000,15-01-2024'
            )
        });
        
        // Wait for validation
        await expect(page.locator('.validation-table')).toBeVisible();
        await expect(page.locator('.validation-stats')).toContainText('Valid Rows: 1');
        
        // Step 3: Preview import
        await page.click('button:has-text("Preview Import")');
        
        await expect(page.locator('.preview-section')).toBeVisible();
        await expect(page.locator('.preview-stats')).toContainText('New Members: 1');
        
        // Step 4: Confirm import
        await page.click('button:has-text("Confirm Import")');
        
        // Verify success
        await expect(page.locator('.success-message')).toContainText('Successfully imported 1 membership');
    });

    test('should validate membership form inputs', async ({ page }) => {
        await page.goto('/memberships');
        
        // Click Add Membership button
        await page.click('button:has-text("Add Membership")');
        
        // Try to submit empty form
        await page.click('button[type="submit"]:has-text("Create Membership")');
        
        // Check validation errors
        await expect(page.locator('.error:has-text("Please select a member")')).toBeVisible();
        await expect(page.locator('.error:has-text("Please select a plan")')).toBeVisible();
        await expect(page.locator('.error:has-text("Start date is required")')).toBeVisible();
        await expect(page.locator('.error:has-text("Amount is required")')).toBeVisible();
        
        // Enter invalid amount
        await page.fill('input[name="amount_paid"]', '-100');
        await page.click('button[type="submit"]:has-text("Create Membership")');
        
        await expect(page.locator('.error:has-text("Amount must be greater than 0")')).toBeVisible();
        
        // Enter invalid date format
        await page.fill('input[name="start_date"]', '2024-01-15');
        await page.click('button[type="submit"]:has-text("Create Membership")');
        
        await expect(page.locator('.error:has-text("Date must be in DD-MM-YYYY format")')).toBeVisible();
    });

    test('should display membership details modal', async ({ page }) => {
        await page.goto('/memberships');
        
        // Click on member name to view details
        await page.click('tbody tr:first-child a.member-link');
        
        // Verify modal opens
        await expect(page.locator('.modal')).toBeVisible();
        await expect(page.locator('.modal-header')).toContainText('Member Details');
        
        // Verify member information is displayed
        await expect(page.locator('.member-info')).toBeVisible();
        await expect(page.locator('.membership-history')).toBeVisible();
        
        // Close modal
        await page.click('.modal-close');
        await expect(page.locator('.modal')).not.toBeVisible();
    });

    test('should handle renewal workflow', async ({ page }) => {
        await page.goto('/memberships');
        
        // Find an expired membership and click renew
        await page.click('tr:has(.status-badge.expired) button:has-text("Renew")');
        
        // Verify form is pre-filled
        const memberSelect = page.locator('select[name="member_id"]');
        await expect(memberSelect).toBeDisabled(); // Member should be pre-selected
        
        const planSelect = page.locator('select[name="plan_id"]');
        await expect(planSelect).not.toHaveValue(''); // Plan should be pre-selected
        
        // Verify membership type is set to Renewal
        await expect(page.locator('input[name="membership_type"]')).toHaveValue('Renewal');
        
        // Complete renewal
        await page.fill('input[name="amount_paid"]', '2000');
        await page.click('button[type="submit"]:has-text("Create Membership")');
        
        // Verify success
        await expect(page.locator('.toast-success')).toContainText('Renewal created successfully');
    });

    test('should export memberships to CSV', async ({ page }) => {
        await page.goto('/memberships');
        
        // Apply filters first
        await page.click('button:has-text("Active Only")');
        
        // Set up download listener
        const downloadPromise = page.waitForEvent('download');
        
        // Click export button
        await page.click('button:has-text("Export to CSV")');
        
        // Wait for download
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toMatch(/memberships.*\.csv/);
    });

    test('should work on mobile devices', async ({ page }) => {
        // Set mobile viewport
        await page.setViewportSize({ width: 375, height: 667 });
        
        await page.goto('/memberships');
        
        // Check responsive layout
        await expect(page.locator('.filter-section')).toHaveCSS('flex-direction', 'column');
        
        // Check horizontal scroll on table
        const tableContainer = page.locator('.table-container');
        await expect(tableContainer).toHaveCSS('overflow-x', 'auto');
        
        // Status badges should not wrap text
        const statusBadge = page.locator('.status-badge').first();
        await expect(statusBadge).toHaveCSS('white-space', 'nowrap');
        
        // Action buttons should be visible
        await expect(page.locator('.actions-cell button').first()).toBeVisible();
    });

    test('should show upcoming renewals notification', async ({ page }) => {
        await page.goto('/memberships');
        
        // Check for renewal notification banner
        const renewalBanner = page.locator('.renewal-notification');
        if (await renewalBanner.isVisible()) {
            await expect(renewalBanner).toContainText('upcoming renewal');
            
            // Click view renewals link
            await page.click('.renewal-notification a:has-text("View Renewals")');
            
            // Should navigate to reporting page
            await expect(page.url()).toContain('/reporting');
            await expect(page.locator('h2:has-text("Upcoming Renewals")')).toBeVisible();
        }
    });
});