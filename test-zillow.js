const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Test with a simple known address
  const address = '1909 W Martha Ln';
  const zip = '92706';
  
  console.log('Navigating to Zillow...');
  await page.goto(`https://www.zillow.com/${zip}/?searchQueryState={"pagination":{},"usersSearchTerm":"${address} ${zip}","mapBounds":{}}`, { timeout: 30000 });
  
  console.log('Waiting for page to load...');
  await page.waitForTimeout(5000);
  
  // Try different selectors
  const selectors = [
    'div[data-address]',
    'a[href*="/homedetails/"]',
    '[data-zpid]',
    '.address-cell'
  ];
  
  for (const sel of selectors) {
    const elements = await page.$$(sel);
    console.log(`${sel}: ${elements.length} found`);
  }
  
  // Get page title to verify we're on Zillow
  const title = await page.title();
  console.log('Page title:', title);
  
  await browser.close();
})();
