import * as cheerio from 'cheerio';
import { ScrapingError } from '@sce/error-handling';

/**
 * Scrape property data from Zillow HTML
 * @param {string} address - Street address
 * @param {string} zipCode - ZIP code
 * @returns {Promise<{squareFootage: number|null, yearBuilt: number|null}>}
 */
export async function scrapeZillow(address, zipCode) {
  const searchUrl = `https://www.zillow.com/homes/${encodeURIComponent(address)}-${zipCode}_rb/`;

  try {
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
      }
    });

    if (!response.ok) {
      throw new ScrapingError(searchUrl, `HTTP ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Try to extract from __NEXT_DATA__ script
    const nextData = $('#__NEXT_DATA__').html();
    if (nextData) {
      try {
        const data = JSON.parse(nextData);
        const property = extractPropertyFromNextData(data);
        if (property && (property.squareFootage || property.yearBuilt)) {
          return property;
        }
      } catch (e) {
        // Continue to fallback
      }
    }

    // Fallback: parse from HTML
    let squareFootage = null;
    let yearBuilt = null;

    // Try to find sqft in various selectors
    const sqftText = $('[data-testid="bed-bath-sqft-facts"] li:contains("sqft"), .sc-1u6e4er-0:contains("sqft"), [data-testid="facts-list"] li:contains("sqft")').first().text();
    if (sqftText) {
      const match = sqftText.match(/([\d,]+)\s*sqft/i);
      if (match) {
        squareFootage = parseInt(match[1].replace(/,/g, ''), 10);
      }
    }

    // Try to find year built
    const yearText = $('span:contains("Built in"), .sc-1u6e4er-0:contains("Built in"), [data-testid="facts-list"] li:contains("Built")').first().text();
    if (yearText) {
      const match = yearText.match(/Built\s+in\s+(\d{4})/i);
      if (match) {
        yearBuilt = parseInt(match[1], 10);
      }
    }

    if (!squareFootage && !yearBuilt) {
      throw new ScrapingError(searchUrl, 'Property data not found in page');
    }

    return { squareFootage, yearBuilt };
  } catch (error) {
    if (error instanceof ScrapingError) throw error;
    throw new ScrapingError(searchUrl, error.message);
  }
}

/**
 * Extract property data from Zillow's __NEXT_DATA__ JSON
 * @param {object} data - Parsed __NEXT_DATA__ JSON
 * @returns {object|null} - Property data or null
 */
function extractPropertyFromNextData(data) {
  try {
    // Try multiple paths to find property data
    const cache = data?.props?.pageProps?.componentProps?.gdpClientCache;
    if (!cache) return null;

    // Find the first key that starts with 'Property'
    const propertyKey = Object.keys(cache).find(k => k.startsWith('Property'));
    if (!propertyKey) return null;

    // Handle both: cache.Property: {"123": {...}} and cache."Property:123": {...}
    let property = cache[propertyKey];
    if (propertyKey.includes(':') && !property.squareFootage && !property.yearBuilt) {
      // Direct property object like "Property:123": {...}
      return {
        squareFootage: property.squareFootage || property.livingArea || null,
        yearBuilt: property.yearBuilt || null
      };
    }

    // Nested structure like Property: {"123": {...}, "456": {...}}
    const nestedKey = Object.keys(property).find(k => {
      const p = property[k];
      return p?.squareFootage || p?.yearBuilt || p?.livingArea;
    });

    if (nestedKey) {
      const p = property[nestedKey];
      return {
        squareFootage: p.squareFootage || p.livingArea || null,
        yearBuilt: p.yearBuilt || null
      };
    }

    // If property itself has the data
    return {
      squareFootage: property.squareFootage || property.livingArea || null,
      yearBuilt: property.yearBuilt || null
    };
  } catch {
    return null;
  }
}
