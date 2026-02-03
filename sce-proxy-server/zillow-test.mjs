import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

console.log('Navigating to Zillow 92706...');
await page.goto('https://www.zillow.com/92706/', { timeout: 30000 });
await page.waitForTimeout(3000);

console.log('Searching for 1909 W Martha Ln...');
await page.goto('https://www.zillow.com/92706/?searchQueryState={"pagination":{},"usersSearchTerm":"1909 W Martha Ln 92706","mapBounds":{}}', { timeout: 30000 });
await page.waitForTimeout(5000);

const results = await page.evaluate(() => {
  const r = {};
  r['data-address'] = document.querySelectorAll('div[data-address]').length;
  r['data-zpid'] = document.querySelectorAll('[data-zpid]').length;
  r['homedetails links'] = document.querySelectorAll('a[href*="/homedetails/"]').length;
  r['script tags'] = document.querySelectorAll('script').length;
  return r;
});

console.log('Results:', results);

await browser.close();
