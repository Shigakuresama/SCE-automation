import { chromium } from 'playwright';

const browser = await chromium.launch({ 
  headless: false,
  args: ['--disable-blink-features=AutomationControlled']
});

const page = await browser.newPage();
await page.addInitScript(() => {
  Object.defineProperty(navigator, 'webdriver', { get: () => false });
  Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
});

const address = "1909 W Martha Ln, Santa Ana, CA 92706";

console.log('=== Trying Google Maps for property data ===');
const searchUrl = "https://www.google.com/search?q=" + encodeURIComponent(address);
await page.goto(searchUrl, { timeout: 30000 });
await page.waitForTimeout(3000);

const googleResults = await page.evaluate(() => {
  const results = {
    factLabels: [],
    pageText: document.body.innerText.substring(0, 2000)
  };
  
  // Look for fact labels
  const allDivs = document.querySelectorAll('div');
  allDivs.forEach(div => {
    const text = div.textContent?.trim();
    if (text === 'Sq. ft.' || text === 'Year built' || text === 'Bedrooms' || text === 'Bathrooms') {
      results.factLabels.push(text);
    }
  });
  
  return results;
});

console.log('Google Results:', JSON.stringify(googleResults, null, 2));
await page.screenshot({ path: 'google-maps.png', fullPage: true });
console.log('Screenshot saved to google-maps.png');

await browser.close();
