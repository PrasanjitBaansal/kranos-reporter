import { test, expect } from '@playwright/test';

test('debug login page structure', async ({ page }) => {
    await page.goto('http://localhost:4173/login');
    
    // Take a screenshot
    await page.screenshot({ path: 'test-results/login-page.png', fullPage: true });
    
    // Log all h1 elements
    const h1Elements = await page.locator('h1').all();
    console.log('H1 elements found:', h1Elements.length);
    for (const h1 of h1Elements) {
        console.log('H1 text:', await h1.textContent());
    }
    
    // Log form inputs
    const inputs = await page.locator('input').all();
    console.log('Input elements found:', inputs.length);
    for (const input of inputs) {
        const name = await input.getAttribute('name');
        const type = await input.getAttribute('type');
        console.log(`Input: name="${name}" type="${type}"`);
    }
    
    // Log buttons
    const buttons = await page.locator('button').all();
    console.log('Button elements found:', buttons.length);
    for (const button of buttons) {
        console.log('Button text:', await button.textContent());
    }
    
    // Check if user-menu exists (for logged in state)
    const userMenuExists = await page.locator('.user-menu').count() > 0;
    console.log('User menu exists:', userMenuExists);
    
    // Try to login
    await page.fill('input[name="username"]', 'pjb');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // Wait a bit and check where we are
    await page.waitForTimeout(2000);
    console.log('After login URL:', page.url());
    
    // Check if dashboard loaded
    const dashboardH1 = await page.locator('h1').textContent();
    console.log('Page H1 after login:', dashboardH1);
});