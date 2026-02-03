import { chromium } from 'playwright';

const address = "1909 W Martha Ln";
const zipCode = "92706";

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

const q = encodeURIComponent(address + ' ' + zipCode);
const searchUrl = "https://html.duckduckgo.com/html/?q=" + q;
console.log('URL:', searchUrl);
await page.goto(searchUrl, { timeout: 20000, waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);

const pageText = await page.evaluate(() => document.body.innerText);
console.log('Page text length:', pageText.length);
console.log('Contains "Martha"?', pageText.includes('Martha'));
console.log('Contains "square"?', pageText.includes('square'));
console.log('Contains "built"?', pageText.includes('built'));

const sqFtPatterns = [
  /(\d{1,4}[,\d]*)\s*(?:square foot|sq\.? ft\.?|sqft|Square Feet)/i,
  /(\d{1,4}[,\d]*)\s*(?:square feet|sq feet)/i,
];

for (const pattern of sqFtPatterns) {
  const match = pageText.match(pattern);
  if (match) {
    console.log('SqFt pattern matched:', match[1]);
  }
}

const yearPatterns = [
  /(?:built in|constructed in|year built)[:\s]+(\d{4})/i,
  /(?:single family home built in)\s+(\d{4})/i,
];

for (const pattern of yearPatterns) {
  const match = pageText.match(pattern);
  if (match) {
    console.log('Year pattern matched:', match[1]);
  }
}

await browser.close();
