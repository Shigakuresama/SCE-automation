// Project section form filling
import { DomCache } from '../modules/dom-cache.js';

const domCache = new DomCache('project');

/**
 * Fill Project Information section
 * @param {Object} config - Configuration object containing:
 *   - address: Property address
 *   - zipCode: Property zip code
 *   - spaceOrUnit: Space or unit number
 * @param {Object} helpers - Helper functions from content.js:
 *   - log: Logging function
 *   - sleep: Sleep function
 *   - setInputValue: Input filling function
 *   - fetchPropertyDataFromProxy: Property data fetcher
 * @returns {Promise<boolean>} Success status
 */
export async function fill(config, helpers) {
  const { log, sleep, setInputValue, fetchPropertyDataFromProxy } = helpers;

  log('📋 Filling Project Information (Phase 3)...');
  await sleep(500);

  try {
    // Get property data from proxy (with fallback to config)
    const propertyData = await fetchPropertyDataFromProxy(
      config.address,
      config.zipCode
    );

    // Space Or Unit - skip if filled (doesn't come from Zillow)
    const spaceLabel = Array.from(document.querySelectorAll('mat-label')).find(l => l.textContent.includes('Space Or Unit'));
    if (spaceLabel) {
      const formField = spaceLabel.closest('mat-form-field');
      if (formField) {
        const input = formField.querySelector('input');
        if (input) {
          await setInputValue(input, config.spaceOrUnit, 'Space Or Unit', true);
        }
      }
    }

    // Fill Total Sq.Ft. from property data - ALWAYS fill (skipIfFilled = false)
    const sqFtLabel = Array.from(document.querySelectorAll('mat-label')).find(l => l.textContent.includes('Total Sq') || l.textContent.includes('Square Foot'));
    if (sqFtLabel) {
      const formField = sqFtLabel.closest('mat-form-field');
      if (formField) {
        const input = formField.querySelector('input');
        if (input) {
          const sqFtValue = propertyData.sqFt || '1200';
          await setInputValue(input, sqFtValue, 'Total Sq.Ft.', false);
        }
      }
    }

    // Fill Year Built from property data - ALWAYS fill (skipIfFilled = false)
    const yearLabel = Array.from(document.querySelectorAll('mat-label')).find(l => l.textContent.includes('Year Built'));
    if (yearLabel) {
      const formField = yearLabel.closest('mat-form-field');
      if (formField) {
        const input = formField.querySelector('input');
        if (input) {
          const yearValue = propertyData.yearBuilt || '1970';
          await setInputValue(input, yearValue, 'Year Built', false);
        }
      }
    }

    log('✅ Project Information filled!');
    return true;
  } catch (error) {
    console.error('Error filling Project section:', error);
    log('❌ Error filling Project Information:', error.message);

    // Notify user if helpers available
    if (helpers && helpers.showError) {
      helpers.showError('Failed to fill Project Information', error.message);
    }

    return false;
  }
}
