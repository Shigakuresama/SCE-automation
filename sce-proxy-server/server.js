/**
 * SCE Proxy Server
 * Local server for scraping property data from Zillow/Redfin
 * Runs on localhost:3000
 */

const express = require('express');
const cors = require('cors');
const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 3000;
const CACHE_FILE = path.join(__dirname, 'property-cache.json');
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

// Middleware
app.use(cors());
app.use(express.json());

// Property cache
let propertyCache = {};

// Load cache from disk
async function loadCache() {
  try {
    const data = await fs.readFile(CACHE_FILE, 'utf8');
    propertyCache = JSON.parse(data);
    console.log(`[Cache] Loaded ${Object.keys(propertyCache).length} cached properties`);
  } catch (err) {
    propertyCache = {};
    console.log('[Cache] No existing cache found, starting fresh');
  }
}

// Save cache to disk
async function saveCache() {
  try {
    await fs.writeFile(CACHE_FILE, JSON.stringify(propertyCache, null, 2));
  } catch (err) {
    console.error('[Cache] Failed to save:', err.message);
  }
}

// Generate cache key from address
function getCacheKey(address, zipCode) {
  return `${address.toLowerCase().trim()},${zipCode.trim()}`;
}

// Clean expired cache entries
function cleanExpiredCache() {
  const now = Date.now();
  let cleaned = 0;
  for (const [key, value] of Object.entries(propertyCache)) {
    if (now - value.timestamp > CACHE_TTL) {
      delete propertyCache[key];
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.log(`[Cache] Cleaned ${cleaned} expired entries`);
    saveCache();
  }
}

// ============================================
// ZILLOW SCRAPER
// ============================================
async function scrapeZillow(address, zipCode) {
  console.log(`[Zillow] Searching: ${address}, ${zipCode}`);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  let result = null;

  try {
    // Set realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    // Go to Zillow search
    const searchUrl = `https://www.zillow.com/${zipCode}/?searchQueryState={"pagination":{},"usersSearchTerm":"${address} ${zipCode}","mapBounds":{}}`;
    await page.goto(searchUrl, { timeout: 15000, waitUntil: 'domcontentloaded' });

    // Wait for results
    await page.waitForTimeout(2000);

    // Try to find property card with address
    const propertyCard = await page.$('div[data-address*="' + address.toLowerCase() + '" i], address-component a');
    if (propertyCard) {
      await propertyCard.click();
      await page.waitForTimeout(1500);
    }

    // Extract property data from the page
    result = await page.evaluate(() => {
      // Helper to find text by selector patterns
      function findValue(selectors) {
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el) {
            let text = el.textContent || el.value || '';
            // Extract numbers
            const match = text.match(/[\d,]+/);
            return match ? match[0].replace(/,/g, '') : null;
          }
        }
        return null;
      }

      // Try multiple selector patterns for SqFt
      const sqFt = findValue([
        'span:has-text("sqft")',
        'dt:has-text("sqft") + dd',
        '[data-testid="home-details-row"]',
        '.ds-home-fact-label:has-text("sqft") + .ds-home-fact-value'
      ]);

      // Try multiple patterns for Year Built
      const yearBuilt = findValue([
        'dt:has-text("Year Built") + dd',
        '[data-testid="home-details-row"]',
        '.ds-home-fact-label:has-text("Year Built") + .ds-home-fact-value'
      ]);

      return { sqFt, yearBuilt };
    });

    console.log(`[Zillow] Found: SqFt=${result?.sqFt}, Year=${result?.yearBuilt}`);

  } catch (err) {
    console.log(`[Zillow] Error: ${err.message}`);
  } finally {
    await browser.close();
  }

  return result;
}

// ============================================
// REDFIN SCRAPER (Fallback)
// ============================================
async function scrapeRedfin(address, zipCode) {
  console.log(`[Redfin] Searching: ${address}, ${zipCode}`);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  let result = null;

  try {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    // Search Redfin
    const searchUrl = `https://www.redfin.com/zipcode/${zipCode}/filter/${encodeURIComponent(address)}`;
    await page.goto(searchUrl, { timeout: 15000, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Extract data
    result = await page.evaluate(() => {
      const sqFtSelector = document.querySelector('[data-rn-test="home-details-summary-term-sqft"], .sqft, .fact-row:has-text("sqft")');
      const yearSelector = document.querySelector('[data-rn-test="home-details-summary-term-year-built"], .year-built, .fact-row:has-text("Year Built")');

      const extractNum = (el) => {
        if (!el) return null;
        const match = el.textContent?.match(/[\d,]+/);
        return match ? match[0].replace(/,/g, '') : null;
      };

      return {
        sqFt: extractNum(sqFtSelector),
        yearBuilt: extractNum(yearSelector)
      };
    });

    console.log(`[Redfin] Found: SqFt=${result?.sqFt}, Year=${result?.yearBuilt}`);

  } catch (err) {
    console.log(`[Redfin] Error: ${err.message}`);
  } finally {
    await browser.close();
  }

  return result;
}

// ============================================
// API ENDPOINTS
// ============================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    cacheSize: Object.keys(propertyCache).length
  });
});

// Get property data
app.get('/api/property', async (req, res) => {
  const { address, zip } = req.query;

  if (!address || !zip) {
    return res.status(400).json({ error: 'address and zip parameters required' });
  }

  const cacheKey = getCacheKey(address, zip);

  // Check cache first
  if (propertyCache[cacheKey]) {
    const cached = propertyCache[cacheKey];
    const age = Date.now() - cached.timestamp;

    if (age < CACHE_TTL) {
      console.log(`[API] Cache HIT for ${cacheKey}`);
      return res.json({
        source: 'cache',
        age: Math.round(age / 1000), // seconds
        data: cached.data
      });
    } else {
      delete propertyCache[cacheKey];
    }
  }

  console.log(`[API] Cache MISS for ${cacheKey}`);

  // Scrape from sources
  let result = null;
  let source = null;

  // Try Zillow first
  result = await scrapeZillow(address, zip);
  if (result && (result.sqFt || result.yearBuilt)) {
    source = 'zillow';
  }

  // Fallback to Redfin
  if (!result || (!result.sqFt && !result.yearBuilt)) {
    result = await scrapeRedfin(address, zip);
    if (result && (result.sqFt || result.yearBuilt)) {
      source = 'redfin';
    }
  }

  // Cache the result
  if (result) {
    propertyCache[cacheKey] = {
      data: result,
      timestamp: Date.now(),
      source
    };
    saveCache();

    return res.json({
      source,
      data: result
    });
  }

  // No data found
  return res.status(404).json({
    error: 'Property data not found',
    message: 'Could not find property data on Zillow or Redfin'
  });
});

// Manual cache entry (for testing or manual input)
app.post('/api/property/cache', async (req, res) => {
  const { address, zip, sqFt, yearBuilt } = req.body;

  if (!address || !zip) {
    return res.status(400).json({ error: 'address and zip required' });
  }

  const cacheKey = getCacheKey(address, zip);
  propertyCache[cacheKey] = {
    data: { sqFt: sqFt || null, yearBuilt: yearBuilt || null },
    timestamp: Date.now(),
    source: 'manual'
  };
  await saveCache();

  res.json({
    success: true,
    message: 'Property cached successfully'
  });
});

// Get all cached properties
app.get('/api/cache', (req, res) => {
  const properties = Object.entries(propertyCache).map(([key, value]) => ({
    address: key,
    ...value.data,
    source: value.source,
    timestamp: new Date(value.timestamp).toISOString()
  }));
  res.json({ count: properties.length, properties });
});

// Clear cache
app.delete('/api/cache', async (req, res) => {
  propertyCache = {};
  await saveCache();
  res.json({ success: true, message: 'Cache cleared' });
});

// ============================================
// START SERVER
// ============================================
async function startServer() {
  await loadCache();
  cleanExpiredCache();

  // Clean cache every hour
  setInterval(cleanExpiredCache, 60 * 60 * 1000);

  app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════╗
║   SCE Proxy Server Running                ║
║   Local: http://localhost:${PORT}            ║
║   Health: http://localhost:${PORT}/api/health  ║
╚═══════════════════════════════════════════╝
    `);
  });
}

startServer().catch(console.error);
