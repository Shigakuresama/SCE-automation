/**
 * SCE Route Processor Module
 * Background batch processing for address routing and data collection
 */

import { sleep, sendToContentScript, openTab, closeTab, captureScreenshot } from './route-processor-utils.js';
import { ROUTE_CONFIG, activeBatches, processRouteBatch as processBatchInternal } from './route-processor-batch.js';

// Generate unique batch ID
function generateBatchId() {
  return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Process a single address in a new tab
 * @param {Object} address - Address object { number, street, city, state, zip, full }
 * @param {Object} config - Configuration options
 * @param {Function} progressCallback - Progress callback
 * @returns {Promise<Object>} Processing result
 */
export async function processRouteAddress(address, config = {}, progressCallback = null) {
  const finalConfig = { ...ROUTE_CONFIG, ...config };
  const sceFormUrl = 'https://sce.dsmcentral.com/s/program-management-app/new-customer';

  let tabId = null;
  let attempt = 0;

  while (attempt < finalConfig.retryAttempts) {
    try {
      if (progressCallback) {
        progressCallback({
          type: 'start',
          address: address.full,
          attempt: attempt + 1,
          message: `Opening: ${address.full}`
        });
      }

      // Open new tab with SCE form
      tabId = await openTab(sceFormUrl);

      if (progressCallback) {
        progressCallback({
          type: 'tab_opened',
          address: address.full,
          tabId: tabId,
          message: `Tab ${tabId} opened`
        });
      }

      // Wait for page to load
      await sleep(finalConfig.tabOpenDelay);

      // Send fill form command to content script
      const fillMessage = {
        action: 'fillRouteAddress',
        address: {
          streetNumber: address.number,
          streetName: address.street,
          zipCode: address.zip
        }
      };

      const fillResult = await sendToContentScript(tabId, fillMessage);

      if (!fillResult || !fillResult.success) {
        throw new Error(fillResult?.error || 'Failed to fill form');
      }

      if (progressCallback) {
        progressCallback({
          type: 'form_filled',
          address: address.full,
          message: 'Form filled successfully'
        });
      }

      // Wait for data capture
      await sleep(finalConfig.captureDelay);

      // Request data capture from content script
      const captureResult = await sendToContentScript(tabId, {
        action: 'captureRouteData'
      });

      // Capture screenshot
      let screenshotDataUrl = null;
      try {
        await sleep(finalConfig.screenshotDelay);
        screenshotDataUrl = await captureScreenshot(tabId);

        if (progressCallback) {
          progressCallback({
            type: 'screenshot_captured',
            address: address.full,
            message: 'Screenshot captured'
          });
        }
      } catch (screenshotError) {
        console.error(`Screenshot failed for ${address.full}:`, screenshotError);
        // Notify user about screenshot failure
        if (progressCallback) {
          progressCallback({
            type: 'screenshot_failed',
            address: address.full,
            error: screenshotError.message,
            message: `⚠️ Screenshot failed: ${screenshotError.message}`
          });
        }
      }

      // Close tab
      await closeTab(tabId);
      tabId = null;

      const result = {
        success: true,
        address: address.full,
        capturedData: captureResult?.data || {},
        screenshot: screenshotDataUrl,
        timestamp: new Date().toISOString()
      };

      if (progressCallback) {
        progressCallback({
          type: 'complete',
          address: address.full,
          result: result,
          message: `✅ Completed: ${address.full}`
        });
      }

      return result;

    } catch (error) {
      attempt++;

      // Clean up tab on error
      if (tabId !== null) {
        try {
          await closeTab(tabId);
        } catch (closeError) {
          console.warn('Failed to close tab after error:', closeError);
        }
        tabId = null;
      }

      // Log retry attempt
      if (attempt < finalConfig.retryAttempts) {
        if (progressCallback) {
          progressCallback({
            type: 'retry',
            address: address.full,
            attempt: attempt,
            error: error.message,
            message: `⚠️ Retrying (${attempt}/${finalConfig.retryAttempts}): ${error.message}`
          });
        }

        await sleep(finalConfig.retryDelay);
      } else {
        // Final attempt failed
        const errorResult = {
          success: false,
          address: address.full,
          error: error.message,
          timestamp: new Date().toISOString()
        };

        if (progressCallback) {
          progressCallback({
            type: 'error',
            address: address.full,
            error: error.message,
            result: errorResult,
            message: `❌ Failed: ${address.full} - ${error.message}`
          });
        }

        return errorResult;
      }
    }
  }

  // Should not reach here, but just in case
  return {
    success: false,
    address: address.full,
    error: 'Max retry attempts exceeded',
    timestamp: new Date().toISOString()
  };
}

/**
 * Process batch of addresses with concurrency control
 * @param {Array<Object>} addresses - Array of address objects
 * @param {Object} config - Configuration options
/**
 * Process batch of addresses with concurrency control
 * @param {Array<Object>} addresses - Array of address objects
 * @param {Object} config - Configuration options
 * @param {Function} progressCallback - Progress callback
 * @returns {Promise<Object>} Batch processing result
 */
export async function processRouteBatch(addresses, config = {}, progressCallback = null) {
  return processBatchInternal(addresses, config, progressCallback, processRouteAddress);
}

/**
 * Get status of active batch
 * @param {string} batchId - Batch identifier
 * @returns {Object|null} Batch state or null if not found
 */
export function getBatchStatus(batchId) {
  return activeBatches.get(batchId) || null;
}

/**
 * Cancel active batch
 * @param {string} batchId - Batch identifier
 * @returns {boolean} True if cancelled, false if not found
 */
export function cancelRouteBatch(batchId) {
  const batch = activeBatches.get(batchId);

  if (!batch) {
    return false;
  }

  batch.status = 'cancelled';
  activeBatches.delete(batchId);

  // Note: This doesn't immediately stop processing, but sets a flag
  // that can be checked in the processing loop

  return true;
}

/**
 * Validate address before processing
 * @param {Object} address - Address object
 * @returns {Object} Validation result { valid, errors }
 */
export function validateRouteAddress(address) {
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

  if (!address.full) {
    errors.push('Missing full address string');
  }

  return {
    valid: errors.length === 0,
    errors: errors
  };
}

/**
 * Clean up old batch data
 * @param {number} maxAge - Maximum age in milliseconds (default: 1 hour)
 */
export function cleanupOldBatches(maxAge = 3600000) {
  const now = Date.now();
  const toDelete = [];

  for (const [batchId, batch] of activeBatches.entries()) {
    if (batch.endTime && (now - batch.endTime) > maxAge) {
      toDelete.push(batchId);
    }
  }

  toDelete.forEach(batchId => {
    activeBatches.delete(batchId);
  });

  return toDelete.length;
}

// Export to global scope for background script usage
if (typeof globalThis !== 'undefined') {
  Object.defineProperty(globalThis, 'SCERouteProcessor', {
    value: {
      processRouteAddress,
      processRouteBatch,
      getBatchStatus,
      cancelRouteBatch,
      validateRouteAddress,
      cleanupOldBatches,
      ROUTE_CONFIG
    },
    writable: false,
    configurable: false,
    enumerable: false
  });
}
