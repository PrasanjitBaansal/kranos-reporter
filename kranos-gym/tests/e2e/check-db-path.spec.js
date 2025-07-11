import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test('check database exists and has users', async ({ page }) => {
    // First check if database file exists locally
    const dbPath = path.join(process.cwd(), 'kranos.db');
    console.log('Checking database at:', dbPath);
    console.log('Database exists:', fs.existsSync(dbPath));
    
    // Try to access a page that doesn't require auth first
    const response = await page.goto('/setup', { waitUntil: 'networkidle' });
    console.log('Setup page status:', response?.status());
    
    // Check if we get redirected
    await page.waitForTimeout(1000);
    console.log('Current URL after /setup:', page.url());
    
    // Now check what happens when we try login
    await page.goto('/login');
    
    // Try to submit a test login
    await page.fill('input[name="username"]', 'test');
    await page.fill('input[name="password"]', 'test');
    
    // Intercept the response
    const responsePromise = page.waitForResponse(resp => 
        resp.url().includes('/login') && resp.request().method() === 'POST'
    );
    
    await page.click('button[type="submit"]');
    
    const response2 = await responsePromise;
    const responseBody = await response2.text();
    console.log('Login response:', responseBody);
    
    // Parse the response to see the actual error
    try {
        const parsed = JSON.parse(responseBody);
        console.log('Parsed response:', JSON.stringify(parsed, null, 2));
    } catch (e) {
        console.log('Could not parse response as JSON');
    }
});