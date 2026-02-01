const { chromium } = require('playwright');

async function downloadSCEPage() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Navigate to the page (you'll need to log in first)
  await page.goto('https://sce.dsmcentral.com/onsite/assessment/summary-info/159345108/159342224?projectId=17468421');

  // Wait for you to log in if needed
  console.log('Press ENTER after the page loads...');
  await new Promise(r => process.stdin.once('data', r));

  // Get the fully rendered HTML
  const html = await page.content();

  // Save to file
  const fs = require('fs');
  fs.writeFileSync('sce-form-full.html', html, 'utf8');
  console.log('Saved: sce-form-full.html');

  await browser.close();
}

downloadSCEPage();
