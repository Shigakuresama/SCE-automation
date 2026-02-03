import { chromium } from 'playwright';
import { promises as fs } from 'fs';

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
});
const page = await context.newPage();

const address = "1909 W Martha Ln";
const zipCode = "92706";
const encoded = encodeURIComponent(address + ' ' + zipCode);
const searchUrl = "https://www.google.com/search?q=" + encoded;

console.log('URL:', searchUrl);
await page.goto(searchUrl, { timeout: 20000, waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);

const fullText = await page.evaluate(() => document.body.innerText);
await fs.writeFile('google-results.txt', fullText);
console.log('Saved to google-results.txt');

console.log('\n=== Looking for SqFt patterns ===');
const sqFtPatterns = [
  /(\d{1,4}[,\d]*)\s*(?:square foot|sq\.? ft\.?|sqft|Sq Ft)/i,
  /(\d{1,4}[,\d]*)\s*(?:square feet|sq feet)/i,
];

for (const pattern of sqFtPatterns) {
  const match = fullText.match(pattern);
  if (match) {
    console.log('Pattern matched:', match[1]);
  }
}

console.log('\n=== Looking for Year Built patterns ===');
const yearPatterns = [
  /(?:built in|constructed in|year built)[:\s]+(\d{4})/i,
  /(?:single family home built in)\s+(\d{4})/i,
  /(?:home built in)\s+(\d{4})/i,
];

for (const pattern of yearPatterns) {
  const match = fullText.match(pattern);
  if (match) {
    console.log('Pattern matched:', match[1]);
  }
}

console.log('\n=== Snippets around "Martha" ===');
if (fullText.includes('Martha')) {
  const idx = fullText.indexOf('Martha');
  console.log(fullText.substring(idx - 100, idx + 600));
}

await browser.close();
