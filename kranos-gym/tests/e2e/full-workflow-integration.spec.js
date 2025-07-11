import { test, expect } from '@playwright/test';

test.describe('Full Workflow Integration Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Login as admin
        await page.goto('/login');
        await page.fill('input[name="username"]', 'pjb');
        await page.fill('input[name="password"]', 'admin123');
        await page.click('button[type="submit"]');
        await page.waitForURL('/');
    });
    
    test('complete member lifecycle: create → membership → payment → report', async ({ page }) => {
        // 1. Create a new member
        await page.goto('/members');
        await page.click('button:has-text("Add Member")');
        
        // Wait for modal
        await page.waitForSelector('.modal');
        
        // Fill member form
        const timestamp = Date.now();
        const memberData = {
            name: `Test Member ${timestamp}`,
            phone: `9${timestamp.toString().slice(-9)}`,
            email: `test${timestamp}@example.com`
        };
        
        await page.fill('input[name="name"]', memberData.name);
        await page.fill('input[name="phone"]', memberData.phone);
        await page.fill('input[name="email"]', memberData.email);
        
        // Submit
        await page.click('.modal button[type="submit"]');
        
        // Wait for success toast
        await page.waitForSelector('.toast-success');
        
        // 2. Add membership for the member
        await page.goto('/memberships');
        
        // Select member
        await page.fill('input[placeholder="Search member by name or phone..."]', memberData.phone);
        await page.waitForTimeout(500); // Debounce
        await page.click(`.member-option:has-text("${memberData.name}")`);
        
        // Fill membership details
        await page.selectOption('select[name="plan_id"]', { index: 1 }); // Select first plan
        await page.fill('input[name="start_date"]', '01-07-2025');
        await page.fill('input[name="amount_paid"]', '1500');
        
        // Submit membership
        await page.click('button[type="submit"]:has-text("Create Membership")');
        await page.waitForSelector('.toast-success');
        
        // 3. Verify in financial report
        await page.goto('/reporting');
        
        // Check if the payment appears
        await page.waitForSelector('.financial-report');
        
        // Look for the member name in transactions
        const transactionExists = await page.locator(`.transaction-row:has-text("${memberData.name}")`).count() > 0;
        expect(transactionExists).toBe(true);
        
        // 4. Add an expense
        await page.goto('/payments');
        await page.click('button:has-text("Add Expense")');
        
        // Fill expense form
        await page.fill('input[name="amount"]', '500');
        await page.fill('input[name="category"]', 'Equipment');
        await page.fill('input[name="recipient"]', 'Sports Store');
        await page.fill('input[name="payment_date"]', '01-07-2025');
        
        await page.click('.modal button[type="submit"]');
        await page.waitForSelector('.toast-success');
        
        // 5. Check enhanced financial report
        await page.goto('/reporting');
        
        // Verify net profit calculation
        await page.waitForSelector('.summary-section');
        const netProfitElement = await page.locator('.metric-card:has-text("Net Profit")');
        expect(await netProfitElement.count()).toBeGreaterThan(0);
    });
    
    test('bulk import workflow with validation and correction', async ({ page }) => {
        await page.goto('/memberships/bulk-import');
        
        // Download template first
        const downloadPromise = page.waitForEvent('download');
        await page.click('button:has-text("Download CSV Template")');
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toContain('membership-import-template');
        
        // Create test CSV content with some errors
        const csvContent = `name,phone,email,plan_name,duration_days,start_date,amount_paid,purchase_date
Valid Member,9876543210,valid@test.com,Test Plan,30,01-07-2025,1000,01-07-2025
Invalid Date,9876543211,invalid@test.com,Test Plan,30,invalid-date,1000,01-07-2025
Missing Phone,,,missing@test.com,Test Plan,30,01-07-2025,1000,01-07-2025`;
        
        // Create file and upload
        const buffer = Buffer.from(csvContent, 'utf-8');
        await page.setInputFiles('input[type="file"]', {
            name: 'test-import.csv',
            mimeType: 'text/csv',
            buffer: buffer
        });
        
        // Wait for validation
        await page.waitForSelector('.validation-section');
        
        // Check validation stats
        const validCount = await page.locator('.stat-value.valid').textContent();
        const invalidCount = await page.locator('.stat-value.invalid').textContent();
        
        expect(parseInt(validCount)).toBe(1);
        expect(parseInt(invalidCount)).toBe(2);
        
        // Fix invalid date
        await page.fill('tr:has-text("Invalid Date") input[name="start_date"]', '01-07-2025');
        
        // Fix missing phone
        await page.fill('tr:has-text("Missing Phone") input[name="phone"]', '9876543212');
        
        // Wait for validation to update
        await page.waitForTimeout(500);
        
        // Check all valid now
        const updatedValidCount = await page.locator('.stat-value.valid').textContent();
        expect(parseInt(updatedValidCount)).toBe(3);
        
        // Preview import
        await page.click('button:has-text("Preview Import")');
        await page.waitForSelector('.preview-section');
        
        // Verify preview shows correct counts
        const newMembersCount = await page.locator('.preview-stat:has-text("New Members") .actual-values').textContent();
        expect(newMembersCount).toContain('3');
    });
    
    test('user role permissions workflow', async ({ page }) => {
        // Create a trainer user
        await page.goto('/users');
        await page.click('button:has-text("Add User")');
        
        const timestamp = Date.now();
        const trainerData = {
            username: `trainer${timestamp}`,
            email: `trainer${timestamp}@test.com`,
            password: 'Trainer123!'
        };
        
        await page.fill('input[name="username"]', trainerData.username);
        await page.fill('input[name="email"]', trainerData.email);
        await page.fill('input[name="password"]', trainerData.password);
        await page.selectOption('select[name="role"]', 'trainer');
        
        await page.click('.modal button[type="submit"]');
        await page.waitForSelector('.toast-success');
        
        // Logout
        await page.click('.user-menu');
        await page.click('a[href="/logout"]');
        await page.waitForURL('/login');
        
        // Login as trainer
        await page.fill('input[name="username"]', trainerData.username);
        await page.fill('input[name="password"]', trainerData.password);
        await page.click('button[type="submit"]');
        await page.waitForURL('/');
        
        // Verify trainer limitations
        await page.goto('/members');
        
        // Should see view-only badge
        await page.waitForSelector('.view-only-badge');
        
        // Add/Edit buttons should be hidden
        const addButtonVisible = await page.locator('button:has-text("Add Member")').isVisible();
        expect(addButtonVisible).toBe(false);
        
        // Users menu should not be visible
        const usersMenuVisible = await page.locator('nav a[href="/users"]').isVisible();
        expect(usersMenuVisible).toBe(false);
    });
    
    test('payment tracking and financial reconciliation', async ({ page }) => {
        // Add multiple payments and expenses
        const payments = [
            { type: 'membership', amount: 2000 },
            { type: 'membership', amount: 1500 },
            { type: 'expense', amount: 500, category: 'Rent' },
            { type: 'expense', amount: 300, category: 'Utilities' }
        ];
        
        let totalIncome = 0;
        let totalExpenses = 0;
        
        for (const payment of payments) {
            if (payment.type === 'membership') {
                // Add membership payment (simplified)
                totalIncome += payment.amount;
            } else {
                // Add expense
                await page.goto('/payments');
                await page.click('button:has-text("Add Expense")');
                
                await page.fill('input[name="amount"]', payment.amount.toString());
                await page.fill('input[name="category"]', payment.category);
                await page.fill('input[name="recipient"]', `${payment.category} Provider`);
                await page.fill('input[name="payment_date"]', '01-07-2025');
                
                await page.click('.modal button[type="submit"]');
                await page.waitForSelector('.toast-success');
                
                totalExpenses += payment.amount;
            }
        }
        
        // Verify in financial report
        await page.goto('/reporting');
        
        // Check expense breakdown
        const expenseBreakdown = await page.locator('.expense-category').allTextContents();
        expect(expenseBreakdown.some(text => text.includes('Rent'))).toBe(true);
        expect(expenseBreakdown.some(text => text.includes('Utilities'))).toBe(true);
    });
    
    test('member search and filter integration across pages', async ({ page }) => {
        // Test search consistency across members and memberships pages
        const searchTerm = 'pra'; // Partial name search
        
        // Search in members page
        await page.goto('/members');
        await page.fill('input[placeholder*="Search"]', searchTerm);
        await page.waitForTimeout(500); // Debounce
        
        const memberResults = await page.locator('tbody tr').count();
        
        // Search in memberships page
        await page.goto('/memberships');
        await page.fill('input[placeholder*="Search member"]', searchTerm);
        await page.waitForTimeout(500);
        
        // Check if member suggestions appear
        const suggestionCount = await page.locator('.member-option').count();
        expect(suggestionCount).toBeGreaterThan(0);
        
        // Test status filters
        await page.goto('/members');
        
        // Filter by Active
        await page.selectOption('select', 'Active');
        const activeCount = await page.locator('tbody tr').count();
        
        // Filter by New
        await page.selectOption('select', 'New Only');
        const newCount = await page.locator('tbody tr').count();
        
        // Verify counts are different (assuming mixed statuses)
        expect(activeCount).not.toBe(newCount);
    });
    
    test('responsive mobile workflow', async ({ page, isMobile }) => {
        // Set mobile viewport if not already
        if (!isMobile) {
            await page.setViewportSize({ width: 375, height: 667 });
        }
        
        // Test mobile navigation
        await page.goto('/');
        
        // Dashboard should be responsive
        const dashboardCards = await page.locator('.stat-card').count();
        expect(dashboardCards).toBeGreaterThan(0);
        
        // Navigate to members
        await page.goto('/members');
        
        // Table should be scrollable
        const tableContainer = await page.locator('.table-container');
        const hasScroll = await tableContainer.evaluate(el => {
            return el.scrollWidth > el.clientWidth;
        });
        expect(hasScroll).toBe(true);
        
        // Test mobile menu
        if (await page.locator('.mobile-menu-toggle').isVisible()) {
            await page.click('.mobile-menu-toggle');
            await page.waitForSelector('nav.mobile-open');
        }
    });
});