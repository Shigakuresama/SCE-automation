import { scrapeZillow } from './zillow.js';
import { scrapeRedfin } from './redfin.js';
import { retryWithBackoff, ScrapingError, Logger } from '@sce/error-handling';

const logger = new Logger('scraper');

/**
 * Scrape property data with fallback chain
 * Tries Zillow first, then falls back to Redfin
 * @param {string} address - Street address
 * @param {string} zipCode - ZIP code
 * @returns {Promise<{squareFootage: number|null, yearBuilt: number|null}>}
 */
export async function scrapeProperty(address, zipCode) {
  logger.info('Starting property scrape', { address, zipCode });

  let zillowError;

  // Try Zillow first
  try {
    const result = await retryWithBackoff(
      () => scrapeZillow(address, zipCode),
      { maxAttempts: 2, baseDelayMs: 500 }
    );
    logger.info('Zillow scrape successful', { address, result });
    return result;
  } catch (error) {
    zillowError = error;
    logger.warn('Zillow scrape failed, trying Redfin', { address, error: error.message });
  }

  // Fallback to Redfin
  try {
    const result = await retryWithBackoff(
      () => scrapeRedfin(address, zipCode),
      { maxAttempts: 2, baseDelayMs: 500 }
    );
    logger.info('Redfin scrape successful', { address, result });
    return result;
  } catch (redfinError) {
    logger.error('Both scrapers failed', { address, zillowError: zillowError.message, redfinError: redfinError.message });
    throw new ScrapingError(
      `${address}, ${zipCode}`,
      'All scrapers failed',
      {
        zillowError: zillowError.message,
        redfinError: redfinError.message
      }
    );
  }
}
