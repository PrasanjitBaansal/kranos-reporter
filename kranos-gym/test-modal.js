import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ 
    headless: false, 
    devtools: true,
    slowMo: 500
  });
  
  const page = await browser.newPage();
  
  // Listen to console messages from the browser
  page.on('console', (msg) => {
    console.log('BROWSER:', msg.text());
  });
  
  // Navigate to the memberships page
  await page.goto('http://localhost:5173/memberships');
  await page.waitForSelector('table');
  
  console.log('✅ Page loaded, looking for renewal buttons...');
  
  // Find and click the first renewal button
  const renewalButtons = await page.$$('button:has-text("Renewal")');
  
  if (renewalButtons.length > 0) {
    console.log(`📋 Found ${renewalButtons.length} renewal buttons, clicking the first one...`);
    await renewalButtons[0].click();
    
    // Wait for modal to appear
    await page.waitForSelector('.modal', { timeout: 5000 });
    console.log('✅ Modal appeared');
    
    // Wait a bit to see the data loading
    await page.waitForTimeout(3000);
    
    // Check if membership history is displayed
    const historyItems = await page.$$('.history-item, .membership-history-item, li');
    console.log(`📊 Found ${historyItems.length} history items in modal`);
    
    // Take a screenshot
    await page.screenshot({ path: 'modal-test-result.png', fullPage: true });
    console.log('📸 Screenshot saved as modal-test-result.png');
    
  } else {
    console.log('❌ No renewal buttons found');
    await page.screenshot({ path: 'no-buttons.png', fullPage: true });
  }
  
  // Keep browser open for manual inspection
  console.log('🔍 Keeping browser open for manual inspection...');
  await page.waitForTimeout(30000);
  
  await browser.close();
})().catch(console.error);