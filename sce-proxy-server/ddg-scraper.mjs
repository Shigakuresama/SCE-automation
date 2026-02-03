import { chromium } from 'playwright';
import { promises as fs } from 'fs';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

const address = "1909 W Martha Ln";
const zipCode = "92706";

// Use DuckDuckGo HTML version (no JS required, no CAPTCHA)
const searchUrl = "https://html.duckduckgo.com/html/?q=" + encodeURIComponent(address + " " + zipCode);
console.log('URL:', searchUrl);

await page.goto(searchUrl, { timeout: 20000 });
await page.waitForTimeout(2000);

const fullText = await page.evaluate(() => document.body.innerText);
await fs.writeFile('ddg-results.txt', fullText);
console.log('Saved to ddg-results.txt');

// Take screenshot
await page.screenshot({ path: 'ddg-page.png', fullPage: true });
console.log('Screenshot saved to ddg-page.png');

// Look for property data
console.log('\n=== Searching for property data ===');

// SqFt patterns
const sqFtPatterns = [
  /(\d{1,4}[,\d]*)\s*(?:sq\.? ft\.?|sqft|square foot)/i,
  /(\d{1,4}[,\d]*)\s*(?:square feet|sq feet)/i,
];

for (const pattern of sqFtPatterns) {
  const match = fullText.match(pattern);
  if (match) {
    console.log('SqFt found:', match[1]);
  }
}

// Year patterns
const yearPatterns = [
  /(?:built in|year built)[:\s]+(\d{4})/i,
  /(?:built)\s+(\d{4})/i,
];

for (const pattern of yearPatterns) {
  const match = fullText.match(pattern);
  if (match) {
    console.log('Year found:', match[1]);
  }
}

// Show snippets
if (fullText.includes('Martha')) {
  const idx = fullText.indexOf('Martha');
  console.log('\n=== Snippet around Martha ===');
  console.log(fullText.substring(Math.max(0, idx - 200), idx + 800));
}

await browser.close();
