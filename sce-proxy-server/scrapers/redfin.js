import * as cheerio from 'cheerio';
import { ScrapingError } from '@sce/error-handling';

/**
 * Scrape property data from Redfin HTML
 * @param {string} address - Street address
 * @param {string} zipCode - ZIP code
 * @returns {Promise<{squareFootage: number|null, yearBuilt: number|null}>}
 */
export async function scrapeRedfin(address, zipCode) {
  // Redfin search URL format
  const searchUrl = `https://www.redfin.com/${zipCode}/apartments`;

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

    let squareFootage = null;
    let yearBuilt = null;

    // Try multiple selectors for square footage
    // Redfin uses various selectors depending on page type
    const sqftSelectors = [
      '.home-main-stats-variant .stats-value', // Primary selector
      '.stat-value', // Alternative
      '.sqft-value', // Another alternative
    ];

    for (const selector of sqftSelectors) {
      const sqftText = $(selector).first().text();
      if (sqftText) {
        // Extract number from various formats: "1,500", "1500 sqft", "1,500 sqft"
        const match = sqftText.match(/([\d,]+)/);
        if (match) {
          squareFootage = parseInt(match[1].replace(/,/g, ''), 10);
          if (squareFootage > 100) { // Reasonable minimum for a property
            break;
          }
        }
      }
    }

    // Try multiple selectors for year built
    const yearSelectors = [
      '.key-value-list span:contains("Year Built")', // Primary selector
      '.property-info:contains("Year Built")', // Alternative
      '.info-row:contains("Year")', // Another alternative
    ];

    for (const selector of yearSelectors) {
      const $element = $(selector);
      // Try to get text from next sibling or parent
      let yearText = $element.next().text();
      if (!yearText) {
        yearText = $element.parent().find('span').last().text();
      }
      if (!yearText) {
        yearText = $element.text();
      }

      if (yearText) {
        const match = yearText.match(/(19|20)\d{2}/);
        if (match) {
          const year = parseInt(match[0], 10);
          const currentYear = new Date().getFullYear();
          if (year >= 1800 && year <= currentYear + 1) { // Reasonable year range
            yearBuilt = year;
            break;
          }
        }
      }
    }

    // If we haven't found data yet, try broader search within content containers
    if (!squareFootage) {
      // Search within likely content containers instead of entire DOM
      const contentSelectors = [
        '.home-main-stats-variant',
        '.stats',
        '.property-info',
        '.details-section',
        'main',
        '#content',
        '.content'
      ];

      for (const containerSelector of contentSelectors) {
        const $container = $(containerSelector);
        if ($container.length === 0) continue;

        $container.find('*').each((i, el) => {
          if (squareFootage) return false; // Stop if found
          const text = $(el).text();
          if (text.includes('sqft') || text.includes('Sq Ft') || text.includes('Square Feet')) {
            const match = text.match(/([\d,]+)\s*(?:sqft|sq\.ft\.|Square Feet)/i);
            if (match) {
              const sqft = parseInt(match[1].replace(/,/g, ''), 10);
              if (sqft > 100) {
                squareFootage = sqft;
              }
            }
          }
        });

        if (squareFootage) break; // Found it, stop searching
      }
    }

    if (!yearBuilt) {
      // Same approach for year built - search within containers
      const contentSelectors = [
        '.key-value-list',
        '.details-section',
        '.property-info',
        'main',
        '#content'
      ];

      for (const containerSelector of contentSelectors) {
        const $container = $(containerSelector);
        if ($container.length === 0) continue;

        $container.find('*').each((i, el) => {
          if (yearBuilt) return false; // Stop if found
          const text = $(el).text();
          if (text.includes('Year Built') || text.includes('Built in')) {
            const match = text.match(/(?:Year Built|Built in)[:\s]*(19|20)\d{2}/i);
            if (match) {
              const year = parseInt(match[1], 10);
              const currentYear = new Date().getFullYear();
              if (year >= 1800 && year <= currentYear + 1) {
                yearBuilt = year;
              }
            }
          }
        });

        if (yearBuilt) break; // Found it, stop searching
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
