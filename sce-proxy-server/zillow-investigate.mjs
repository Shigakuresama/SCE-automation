import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

console.log('Navigating to Zillow search for 1909 W Martha Ln 92706...');
await page.goto('https://www.zillow.com/92706/?searchQueryState={"pagination":{},"usersSearchTerm":"1909 W Martha Ln 92706","mapBounds":{}}', { timeout: 30000 });

// Wait for page to load
await page.waitForTimeout(5000);

// Take screenshot
await page.screenshot({ path: 'zillow-page.png', fullPage: true });
console.log('Screenshot saved to zillow-page.png');

// Investigate actual page structure
const investigation = await page.evaluate(() => {
  const results = {
    // Check for any property cards
    allDivsWithAddress: [],
    allLinks: [],
    scriptContents: [],
    
    // Look for common patterns
    propertyCards: []
  };
  
  // Find divs that might contain addresses
  const divs = document.querySelectorAll('div');
  for (const div of divs) {
    const text = div.textContent?.trim() || '';
    if (text.includes('Martha') && text.length < 200) {
      results.allDivsWithAddress.push({
        tag: div.tagName,
        class: div.className,
        id: div.id,
        text: text.substring(0, 100)
      });
    }
  }
  
  // Find all links
  const links = document.querySelectorAll('a[href]');
  for (const link of Array.from(links).slice(0, 20)) {
    results.allLinks.push({
      href: link.getAttribute('href'),
      text: link.textContent?.trim().substring(0, 50)
    });
  }
  
  // Check script tags for JSON data
  const scripts = document.querySelectorAll('script[type="application/json"], script[type="application/ld+json"]');
  scripts.forEach((script, i) => {
    try {
      const content = script.textContent?.trim();
      if (content && content.length < 1000) {
        results.scriptContents.push({ index: i, content: content.substring(0, 200) });
      }
    } catch (e) {}
  });
  
  // Look for any card-like structures
  const potentialCards = document.querySelectorAll('[class*="card"], [class*="Card"], [class*="property"], [class*="Property"], [class*="listing"], [class*="Listing"], article');
  results.potentialCardsCount = potentialCards.length;
  
  // Get page title
  results.pageTitle = document.title;
  
  return results;
});

console.log('\n=== INVESTIGATION RESULTS ===\n');
console.log('Page Title:', investigation.pageTitle);
console.log('Potential cards found:', investigation.potentialCardsCount);
console.log('\nDivs with "Martha":', JSON.stringify(investigation.allDivsWithAddress, null, 2));
console.log('\nFirst 20 links:', JSON.stringify(investigation.allLinks, null, 2));
console.log('\nScript contents:', JSON.stringify(investigation.scriptContents, null, 2));

await browser.close();
