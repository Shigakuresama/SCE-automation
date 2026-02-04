/**
 * SCE Tab Manager Module
 * Manages batch processing of multiple addresses across tabs
 */

// Default configuration
const DEFAULT_CONFIG = {
  captureDelay: 5000,        // 5 seconds for data capture
  tabOpenDelay: 1000,        // 1 second between opening tabs
  formFillDelay: 2000,       // 2 seconds for form to settle before filling
  maxConcurrentTabs: 3,      // Process 3 tabs at a time
  captureScreenshot: true    // Capture screenshot after data collection
};

/**
 * Sleep utility for delays
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Process a single address in a tab
 * @param {Object} addressData - Address object { number, street, city, state, zip, full }
 * @param {Object} config - Configuration options
 * @param {Function} progressCallback - Callback for progress updates
 * @returns {Promise<Object>} Result object { success, address, capturedData, screenshot, error }
 */
export async function processSingleAddress(addressData, config = {}, progressCallback = null) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  try {
    if (progressCallback) {
      progressCallback({
        type: 'start',
        address: addressData.full,
        message: `Starting: ${addressData.full}`
      });
    }

    // Check if we're already on an SCE form page
    const currentUrl = window.location.href;
    const isSCEPage = currentUrl.includes('sce.dsmcentral.com') ||
                      currentUrl.includes('sce-trade-ally-community.my.site.com');

    let tabId = null;

    if (isSCEPage) {
      // We're already on a SCE page, use this tab
      if (progressCallback) {
        progressCallback({
          type: 'info',
          address: addressData.full,
          message: 'Using current tab'
        });
      }
    } else {
      // Need to open new tab with SCE form
      if (progressCallback) {
        progressCallback({
          type: 'info',
          address: addressData.full,
          message: 'Opening new tab (navigate to SCE form manually)'
        });
      }

      // Since we can't open tabs from content script, return instructions
      return {
        success: false,
        address: addressData.full,
        error: 'Not on SCE form page. Please navigate to sce.dsmcentral.com and try again.',
        needsNavigation: true
      };
    }

    // Wait for form to be ready
    await sleep(finalConfig.formFillDelay);

    // Store address data for form filling
    const addressForSCE = {
      streetNumber: addressData.number,
      streetName: addressData.street,
      zipCode: addressData.zip
    };

    // Trigger form fill with address data
    const fillResult = await fillFormWithAddress(addressForSCE, finalConfig, progressCallback);

    if (!fillResult.success) {
      throw new Error(fillResult.error || 'Failed to fill form');
    }

    // Wait for data capture
    const capturedData = await waitForDataCapture(finalConfig.captureDelay, progressCallback);

    // Capture screenshot if requested
    let screenshotDataUrl = null;
    if (finalConfig.captureScreenshot && typeof chrome !== 'undefined') {
      try {
        // This would typically be handled by background script
        // For now, we'll store the request for later processing
        if (progressCallback) {
          progressCallback({
            type: 'screenshot',
            address: addressData.full,
            message: 'Screenshot requested'
          });
        }
      } catch (screenshotError) {
        console.warn('Failed to capture screenshot:', screenshotError);
      }
    }

    const result = {
      success: true,
      address: addressData.full,
      capturedData: capturedData,
      timestamp: new Date().toISOString()
    };

    if (progressCallback) {
      progressCallback({
        type: 'complete',
        address: addressData.full,
        result: result,
        message: `✅ Completed: ${addressData.full}`
      });
    }

    return result;

  } catch (error) {
    const errorResult = {
      success: false,
      address: addressData.full,
      error: error.message,
      timestamp: new Date().toISOString()
    };

    if (progressCallback) {
      progressCallback({
        type: 'error',
        address: addressData.full,
        error: error.message,
        message: `❌ Error: ${addressData.full} - ${error.message}`
      });
    }

    return errorResult;
  }
}

/**
 * Fill form with address data
 * @param {Object} addressData - { streetNumber, streetName, zipCode }
 * @param {Object} config - Configuration
 * @param {Function} progressCallback - Progress callback
 * @returns {Promise<Object>} Result { success, error }
 */
async function fillFormWithAddress(addressData, config, progressCallback) {
  try {
    // Check if runFillForm is available (from content.js)
    if (typeof globalThis.runFillForm === 'function') {
      if (progressCallback) {
        progressCallback({
          type: 'info',
          message: `Filling form for ${addressData.streetNumber} ${addressData.streetName}`
        });
      }

      // Load config from storage
      const configPromise = new Promise((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.storage) {
          chrome.storage.sync.get('sceConfig', (result) => {
            resolve(result.sceConfig || {});
          });
        } else {
          resolve({});
        }
      });

      const storedConfig = await configPromise;

      // Merge with address data
      const fillConfig = {
        ...storedConfig,
        address: `${addressData.streetNumber} ${addressData.streetName}`,
        zipCode: addressData.zipCode
      };

      // Trigger form fill
      await globalThis.runFillForm(fillConfig);

      return { success: true };
    }

    // If runFillForm not available, try to detect and fill manually
    // This is a fallback for when the content script hasn't fully loaded
    if (progressCallback) {
      progressCallback({
        type: 'warning',
        message: 'Auto-fill function not available, please fill manually'
      });
    }

    return {
      success: false,
      error: 'Auto-fill not ready. Please ensure extension is loaded.'
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Wait for data capture after form fill
 * @param {number} delay - Delay in milliseconds
 * @param {Function} progressCallback - Progress callback
 * @returns {Promise<Object>} Captured data
 */
export async function waitForDataCapture(delay = 5000, progressCallback = null) {
  if (progressCallback) {
    progressCallback({
      type: 'info',
      message: `Waiting ${delay}ms for data capture...`
    });
  }

  // Wait for the specified delay
  await sleep(delay);

  // Try to capture visible data from the page
  const capturedData = {
    timestamp: new Date().toISOString(),
    url: window.location.href,
    pageTitle: document.title
  };

  // Try to capture homeowner info if visible
  try {
    const homeownerLabel = Array.from(document.querySelectorAll('mat-label'))
      .find(l => l.textContent.includes('Homeowner First Name'));

    if (homeownerLabel) {
      const formField = homeownerLabel.closest('mat-form-field');
      if (formField) {
        const input = formField.querySelector('input');
        if (input && input.value) {
          capturedData.homeownerFirstName = input.value;
        }
      }
    }

    // Capture additional visible fields
    const visibleInputs = document.querySelectorAll('input:not([type="hidden"]):not([type="password"])');
    const formData = {};
    visibleInputs.forEach(input => {
      if (input.id || input.name) {
        const key = input.id || input.name;
        if (input.value) {
          formData[key] = input.value;
        }
      }
    });

    if (Object.keys(formData).length > 0) {
      capturedData.formData = formData;
    }

  } catch (error) {
    console.warn('Error capturing form data:', error);
  }

  if (progressCallback) {
    progressCallback({
      type: 'data_captured',
      message: `Captured data: ${Object.keys(capturedData).length} fields`
    });
  }

  return capturedData;
}

/**
 * Process a batch of addresses sequentially
 * @param {Array<Object>} addresses - Array of address objects
 * @param {Object} config - Configuration options
 * @param {Function} progressCallback - Progress callback
 * @returns {Promise<Array<Object>>} Array of results
 */
export async function processAddressBatch(addresses, config = {}, progressCallback = null) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const results = [];

  if (progressCallback) {
    progressCallback({
      type: 'batch_start',
      total: addresses.length,
      message: `Starting batch processing: ${addresses.length} addresses`
    });
  }

  for (let i = 0; i < addresses.length; i++) {
    const addressData = addresses[i];

    if (progressCallback) {
      progressCallback({
        type: 'progress',
        current: i + 1,
        total: addresses.length,
        percent: Math.round(((i) / addresses.length) * 100),
        message: `Processing ${i + 1}/${addresses.length}: ${addressData.full}`
      });
    }

    const result = await processSingleAddress(addressData, finalConfig, (update) => {
      // Forward individual progress updates
      if (progressCallback) {
        progressCallback({
          ...update,
          batchIndex: i,
          batchTotal: addresses.length
        });
      }
    });

    results.push(result);

    // Delay between addresses (unless it's the last one)
    if (i < addresses.length - 1) {
      await sleep(finalConfig.tabOpenDelay);
    }
  }

  // Calculate summary
  const summary = {
    total: results.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length
  };

  if (progressCallback) {
    progressCallback({
      type: 'batch_complete',
      summary: summary,
      results: results,
      message: `Batch complete: ${summary.successful}/${summary.total} successful`
    });
  }

  return results;
}

/**
 * Cancel batch processing
 * @param {string} batchId - Batch identifier
 */
export function cancelBatch(batchId) {
  // This would integrate with a batch tracking system
  // For now, it's a placeholder for future enhancement
  console.log(`Cancel batch requested: ${batchId}`);

  // In a full implementation, this would:
  // 1. Set a flag to stop processing
  // 2. Close any open tabs
  // 3. Clean up resources
  // 4. Return partial results

  return { cancelled: true, batchId };
}

/**
 * Validate address data before processing
 * @param {Object} address - Address object
 * @returns {Object} Validation result { valid, errors }
 */
export function validateAddress(address) {
  const errors = [];

  if (!address.number) {
    errors.push('Missing street number');
  }

  if (!address.street) {
    errors.push('Missing street name');
  }

  if (!address.zip) {
    errors.push('Missing ZIP code');
  } else if (!/^\d{5}$/.test(address.zip)) {
    errors.push('Invalid ZIP code format (must be 5 digits)');
  }

  return {
    valid: errors.length === 0,
    errors: errors
  };
}

// Export to global scope for use in content scripts
if (typeof globalThis !== 'undefined') {
  Object.defineProperty(globalThis, 'SCETabManager', {
    value: {
      processAddressBatch,
      processSingleAddress,
      waitForDataCapture,
      sleep,
      validateAddress,
      cancelBatch
    },
    writable: false,
    configurable: false,
    enumerable: false
  });
}
