import { test, expect } from '@playwright/test';

test('basic test - server is running', async ({ page }) => {
    const response = await page.goto('http://localhost:4173');
    console.log('Response status:', response?.status());
    
    // Check if we get redirected to login
    await page.waitForTimeout(2000);
    console.log('Current URL:', page.url());
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'test-results/basic-test.png' });
});