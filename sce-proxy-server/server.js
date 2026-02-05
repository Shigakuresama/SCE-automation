/**
 * SCE Proxy Server
 * Local server for scraping property data via Google Search
 * Aggregates data from Zillow, Redfin, County Records
 * Runs on localhost:3000
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { scrapeProperty } from './scrapers/index.js';
import { retryWithBackoff, NetworkError } from '@sce/error-handling/dist/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const CACHE_FILE = path.join(__dirname, 'property-cache.json');
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

// Load version from package.json
const { version } = JSON.parse(await fs.readFile(path.join(__dirname, 'package.json'), 'utf8'));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.text({ type: 'text/plain', limit: '50mb' }));

// Property cache
let propertyCache = {};
let cacheCleanupInterval = null;

// Load cache from disk
async function loadCache() {
  try {
    const data = await fs.readFile(CACHE_FILE, 'utf8');
    propertyCache = JSON.parse(data);
    console.log(`[Cache] Loaded ${Object.keys(propertyCache).length} cached properties`);
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log('[Cache] No existing cache found, starting fresh');
    } else if (err instanceof SyntaxError) {
      console.error('[Cache] Cache file corrupted, backing up and starting fresh');
      // Backup corrupted file for debugging
      try {
        await fs.rename(CACHE_FILE, `${CACHE_FILE}.corrupted.${Date.now()}`);
      } catch (renameErr) {
        console.error('[Cache] Failed to backup corrupted cache file:', renameErr.message);
      }
    } else {
      console.error('[Cache] Error loading cache:', err.message);
    }
    propertyCache = {};
  }
}

// Save cache to disk
async function saveCache() {
  try {
    await fs.writeFile(CACHE_FILE, JSON.stringify(propertyCache, null, 2));
  } catch (err) {
    console.error('[Cache] Failed to save cache:', err.message);
    console.error('[Cache] Property data will not be cached between requests');
    // Track failure count and alert after repeated failures
    saveCache.failureCount = (saveCache.failureCount || 0) + 1;
    if (saveCache.failureCount >= 5) {
      console.error('[Cache] CRITICAL: Multiple cache save failures - check disk space and permissions');
    }
  }
}

// Generate cache key from address
function getCacheKey(address, zipCode) {
  return `${address.toLowerCase().trim()},${zipCode.trim()}`;
}

// Clean expired cache entries
async function cleanExpiredCache() {
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
    await saveCache();
  }
}

// ============================================
// LEGACY DUCKDUCKGO SCRAPER
// NOTE: Replaced by unified scraper with fallback chain (see scrapers/index.js)
// Kept for reference only
// ============================================
/*
async function scrapeDuckDuckGo(address, zipCode) {
  console.log(`[DuckDuckGo] Searching: ${address}, ${zipCode}`);
  // Note: headless: false required because DuckDuckGo detects headless browsers
  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-blink-features=AutomationControlled']
  });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();
  let result = { sqFt: null, yearBuilt: null };

  try {
    // Use DuckDuckGo HTML version (no JS required, no CAPTCHA)
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(address + ' ' + zipCode)}`;
    await page.goto(searchUrl, { timeout: 20000, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Extract property data from search results
    result = await page.evaluate(() => {
      const pageText = document.body.innerText;
      const data = { sqFt: null, yearBuilt: null };

      // Extract Square Footage - look for patterns in Redfin/Zillow snippets
      // Examples from actual results:
      // "1,249 square foot house"
      // "1,249 Square Feet single family home"
      const sqFtPatterns = [
        /(\d{1,4}[,\d]*)\s*(?:square foot|sq\.? ft\.?|sqft|Square Feet)/i,
        /(\d{1,4}[,\d]*)\s*(?:square feet|sq feet)/i,
        /(?:is a|was a|home is)\s+(\d{1,4}[,\d]*)\s*(?:square foot)/i,
      ];

      for (const pattern of sqFtPatterns) {
        const match = pageText.match(pattern);
        if (match) {
          data.sqFt = match[1].replace(/,/g, '');
          break;
        }
      }

      // Extract Year Built - Zillow often includes "built in 1954"
      const yearPatterns = [
        /(?:built in|constructed in|year built)[:\s]+(\d{4})/i,
        /(?:single family home built in)\s+(\d{4})/i,
        /(?:home was built in)\s+(\d{4})/i,
        /(?:was built)\s+(\d{4})/i,
      ];

      for (const pattern of yearPatterns) {
        const match = pageText.match(pattern);
        if (match) {
          const year = parseInt(match[1]);
          // Validate year is reasonable (1800-2026)
          if (year >= 1800 && year <= 2026) {
            data.yearBuilt = year.toString();
            break;
          }
        }
      }

      return data;
    });

    console.log(`[DuckDuckGo] Found: SqFt=${result?.sqFt}, Year=${result?.yearBuilt}`);

  } catch (err) {
    console.log(`[DuckDuckGo] Error: ${err.message}`);
  } finally {
    await context.close();
    await browser.close();
  }

  return result;
}
*/

// ============================================
// API ENDPOINTS
// ============================================

// Health check
app.get('/proxy/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version
  });
});

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

  // Scrape using unified scraper with fallback chain
  let result;
  let source;

  try {
    result = await retryWithBackoff(
      () => scrapeProperty(address, zip),
      { maxAttempts: 3, baseDelayMs: 1000 }
    );
    source = result?.squareFootage || result?.yearBuilt ? 'unified-scraper' : null;
  } catch (error) {
    console.error(`[API] Scraping failed: ${error.message}`);
    return res.status(500).json({
      error: error.message,
      code: error.code || 'SCRAPING_ERROR'
    });
  }

  // Cache the result
  if (result) {
    propertyCache[cacheKey] = {
      data: {
        sqFt: result.squareFootage,
        yearBuilt: result.yearBuilt
      },
      timestamp: Date.now(),
      source
    };
    saveCache();

    return res.json({
      source,
      data: {
        sqFt: result.squareFootage,
        yearBuilt: result.yearBuilt
      }
    });
  }

  // No data found
  return res.status(404).json({
    error: 'Property data not found',
    message: 'Could not find property data via Zillow or Redfin'
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
// OVERPASS API PROXY
// ============================================

/**
 * Proxy requests to Overpass API
 * Used for block detection and street data
 */
app.post('/api/overpass', async (req, res) => {
  try {
    const query = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Query must be a string'
      });
    }

    console.log('[Overpass] Processing query');

    // Call Overpass API
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: query,
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      throw new Error(`Overpass API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    console.log(`[Overpass] Returning ${data.elements?.length || 0} elements`);

    res.json(data);
  } catch (error) {
    console.error('[Overpass] Error:', error.message);

    // Handle timeout
    if (error.name === 'AbortError') {
      return res.status(504).json({
        error: 'Gateway Timeout',
        message: 'Overpass API request timed out'
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

// ============================================
// START SERVER
// ============================================
async function startServer() {
  await loadCache();
  await cleanExpiredCache();

  // Clean cache every hour - store interval for cleanup
  cacheCleanupInterval = setInterval(() => {
    cleanExpiredCache().catch(err => {
      console.error('[Cache] Failed to clean expired entries:', err.message);
    });
  }, 60 * 60 * 1000);

  // Handle graceful shutdown
  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);

  function gracefulShutdown() {
    console.log('[Server] Shutting down gracefully...');
    if (cacheCleanupInterval) {
      clearInterval(cacheCleanupInterval);
    }
    process.exit(0);
  }

  const server = app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════╗
║   SCE Proxy Server Running                ║
║   Local: http://localhost:${PORT}            ║
║   Health: http://localhost:${PORT}/api/health  ║
╚═══════════════════════════════════════════╝
    `);
  });

  return server;
}

startServer().catch(console.error);
