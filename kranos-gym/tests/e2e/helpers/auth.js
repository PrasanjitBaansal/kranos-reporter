/**
 * E2E Test Helpers for Authentication
 */

export async function login(page, username = 'pjb', password = 'admin123') {
    await page.goto('/login');
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForURL('/');
}

export async function logout(page) {
    // Click user menu
    await page.click('.user-menu-button');
    
    // Click logout
    await page.click('text=Logout');
    
    // Wait for redirect to login
    await page.waitForURL('/login');
}

export async function expectToBeLoggedIn(page, username) {
    // Check we're on dashboard
    await expect(page).toHaveURL('/');
    
    // Check user is shown
    await expect(page.locator('.user-info')).toContainText(username);
}

export async function expectToBeLoggedOut(page) {
    // Should be on login page
    await expect(page).toHaveURL('/login');
    
    // Should see login form
    await expect(page.locator('input[name="username"]')).toBeVisible();
}

/**
 * Create a new user for testing
 */
export async function createTestUser(page, userData) {
    // First login as admin
    await login(page);
    
    // Navigate to users page
    await page.goto('/users');
    
    // Click add user button
    await page.click('button:has-text("Add User")');
    
    // Fill user form
    await page.fill('input[name="username"]', userData.username);
    await page.fill('input[name="email"]', userData.email);
    await page.fill('input[name="password"]', userData.password);
    await page.selectOption('select[name="role"]', userData.role);
    
    // Submit form
    await page.click('button:has-text("Create User")');
    
    // Wait for success
    await page.waitForSelector('.toast.success');
}

/**
 * Delete a test user
 */
export async function deleteTestUser(page, username) {
    // Navigate to users page
    await page.goto('/users');
    
    // Find user row
    const userRow = page.locator(`tr:has-text("${username}")`);
    
    // Click delete button
    await userRow.locator('button:has-text("Delete")').click();
    
    // Confirm deletion
    await page.click('button:has-text("Yes, Delete")');
    
    // Wait for success
    await page.waitForSelector('.toast.success');
}