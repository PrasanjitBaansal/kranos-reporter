import { test, expect } from '@playwright/test';

test('debug user menu dropdown', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[name="username"]', 'pjb');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await page.waitForURL('/');

    console.log('=== DEBUGGING USER MENU ===');

    // Check if user menu trigger exists
    const triggerExists = await page.locator('.user-menu-trigger').count();
    console.log('User menu trigger count:', triggerExists);

    if (triggerExists > 0) {
        // Get the trigger's HTML
        const triggerHTML = await page.locator('.user-menu-trigger').innerHTML();
        console.log('Trigger HTML:', triggerHTML);

        // Check if menu exists before click
        const menuBeforeClick = await page.locator('.user-menu').count();
        console.log('Menu count before click:', menuBeforeClick);

        // Click the trigger
        console.log('Clicking user menu trigger...');
        await page.locator('.user-menu-trigger').click();

        // Wait a bit
        await page.waitForTimeout(1000);

        // Check if menu exists after click
        const menuAfterClick = await page.locator('.user-menu').count();
        console.log('Menu count after click:', menuAfterClick);

        if (menuAfterClick > 0) {
            const menuHTML = await page.locator('.user-menu').innerHTML();
            console.log('Menu HTML:', menuHTML);

            // Check for logout link
            const logoutLink = await page.locator('a[href="/logout"]').count();
            console.log('Logout link count:', logoutLink);
        } else {
            console.log('ERROR: Menu did not appear after click!');

            // Take a screenshot
            await page.screenshot({ path: 'test-results/debug-no-menu.png' });

            // Get all elements with class containing 'menu'
            const allMenuElements = await page.locator('[class*="menu"]').all();
            console.log('All elements with "menu" in class:', allMenuElements.length);

            for (let i = 0; i < allMenuElements.length; i++) {
                const className = await allMenuElements[i].getAttribute('class');
                console.log(`  Element ${i}: class="${className}"`);
            }
        }
    } else {
        console.log('ERROR: User menu trigger not found!');
    }
});
