import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
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
    '[data-zpid]'
  ];
  
  for (const sel of selectors) {
    const elements = await page.$$(sel);
    console.log(`${sel}: ${elements.length} found`);
  }
  
  const title = await page.title();
  console.log('Page title:', title);
  
  // Take screenshot
  await page.screenshot({ path: '/tmp/zillow-debug.png' });
  console.log('Screenshot saved to /tmp/zillow-debug.png');
  
  await browser.close();
})();
