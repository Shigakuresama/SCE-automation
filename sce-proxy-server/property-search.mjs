import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();
const address = "1909 W Martha Ln";
const zip = "92706";

console.log('=== Trying Redfin ===');
await page.goto(`https://www.redfin.com/zipcode/${zip}`, { timeout: 30000 });
await page.waitForTimeout(3000);

// Look for the property on Redfin
const redfinResults = await page.evaluate((addr) => {
  const results = {
    pageTitle: document.title,
    propertyLinks: [],
    addressMatches: []
  };
  
  // Find all links that might be properties
  const links = document.querySelectorAll('a[href*="/home/"]');
  links.forEach(link => {
    const text = link.textContent?.trim() || '';
    const href = link.getAttribute('href');
    if (text.length > 10 && text.length < 200) {
      results.propertyLinks.push({ text: text.substring(0, 80), href });
    }
  });
  
  // Look for address matches
  const allElements = document.querySelectorAll('*');
  allElements.forEach(el => {
    const text = el.textContent?.trim() || '';
    if (text.includes('Martha') && el.children.length < 5 && text.length < 150) {
      results.addressMatches.push({
        tag: el.tagName,
        text: text.substring(0, 100)
      });
    }
  });
  
  return results;
}, address);

console.log('Redfin Results:', JSON.stringify(redfinResults, null, 2));
await page.screenshot({ path: 'redfin-page.png', fullPage: true });
console.log('Screenshot saved to redfin-page.png');

await browser.close();
