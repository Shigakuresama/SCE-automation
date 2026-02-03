import { chromium } from 'playwright';

const address = "1909 W Martha Ln";
const zipCode = "92706";

const browser = await chromium.launch({ 
  headless: false,  // This works!
  args: ['--disable-blink-features=AutomationControlled']
});
const context = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
});
const page = await context.newPage();

const q = encodeURIComponent(address + ' ' + zipCode);
const searchUrl = "https://html.duckduckgo.com/html/?q=" + q;
console.log('URL:', searchUrl);
await page.goto(searchUrl, { timeout: 20000, waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);

const pageText = await page.evaluate(() => document.body.innerText);
console.log('Page text length:', pageText.length);
console.log('Contains "Martha"?', pageText.includes('Martha'));

const sqFtPatterns = [
  /(\d{1,4}[,\d]*)\s*(?:square foot|sq\.? ft\.?|sqft|Square Feet)/i,
  /(\d{1,4}[,\d]*)\s*(?:square feet|sq feet)/i,
];

for (const pattern of sqFtPatterns) {
  const match = pageText.match(pattern);
  if (match) {
    console.log('SqFt matched:', match[1]);
  }
}

await browser.close();
