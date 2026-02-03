import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

// Try direct Zillow property URL approach
const address = "1909 W Martha Ln";
const zip = "92706";

// Try to search using Zillow's autocomplete/address lookup
console.log('Trying Zillow homepage search...');
await page.goto('https://www.zillow.com/', { timeout: 30000 });
await page.waitForTimeout(2000);

// Look for search input
const searchInput = await page.$('input[placeholder*="address"], input[placeholder*="Enter"], input[type="text"]');
if (searchInput) {
  await searchInput.fill(`${address} ${zip}`);
  await page.waitForTimeout(1500);
  
  // Check for autocomplete suggestions
  const suggestions = await page.evaluate(() => {
    const items = document.querySelectorAll('li[role="option"], [class*="suggestion"], [class*="autocomplete"]');
    return Array.from(items).slice(0, 5).map(item => ({
      text: item.textContent?.trim().substring(0, 100),
      class: item.className
    }));
  });
  
  console.log('Autocomplete suggestions:', JSON.stringify(suggestions, null, 2));
  
  // Take screenshot
  await page.screenshot({ path: 'zillow-search.png', fullPage: true });
  console.log('Screenshot saved to zillow-search.png');
}

await browser.close();
