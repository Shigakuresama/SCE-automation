/**
 * SCE Route Processor Module
 * Background batch processing for address routing and data collection
 */

// Default configuration for route processing
const ROUTE_CONFIG = {
  captureDelay: 5000,           // 5 seconds for page load and data capture
  tabOpenDelay: 2000,           // 2 seconds between opening tabs
  screenshotDelay: 1000,        // 1 second before screenshot
  maxConcurrentTabs: 3,         // Maximum tabs to process concurrently
  maxBatchSize: 50,             // Maximum addresses in single batch
  retryAttempts: 2,             // Retry failed addresses
  retryDelay: 3000,             // Delay before retry (ms)
  progressBarUpdateInterval: 500 // Update progress every 500ms
};

// Active batch storage
const activeBatches = new Map();

/**
 * Generate unique batch ID
 * @returns {string} Unique batch identifier
 */
function generateBatchId() {
  return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Sleep utility
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Send message to content script
 * @param {number} tabId - Tab ID
 * @param {Object} message - Message object
 * @returns {Promise<Object>} Response from content script
 */
function sendToContentScript(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

/**
 * Open new tab with SCE form
 * @param {string} url - URL to open
 * @returns {Promise<number>} Tab ID
 */
function openTab(url) {
  return new Promise((resolve, reject) => {
    chrome.tabs.create({ url, active: false }, (tab) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(tab.id);
      }
    });
  });
}

/**
 * Close tab
 * @param {number} tabId - Tab ID to close
 * @returns {Promise<void>}
 */
function closeTab(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.remove(tabId, () => {
      // Ignore errors if tab already closed
      resolve();
    });
  });
}

/**
 * Capture visible tab screenshot
 * @param {number} tabId - Tab ID
 * @returns {Promise<string>} Data URL of screenshot
 */
function captureScreenshot(tabId) {
  return new Promise((resolve, reject) => {
    chrome.tabs.captureVisibleTab(tabId, { format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(dataUrl);
      }
    });
  });
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
        console.warn(`Screenshot failed for ${address.full}:`, screenshotError);
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
 * @param {Function} progressCallback - Progress callback
 * @returns {Promise<Object>} Batch processing result
 */
export async function processRouteBatch(addresses, config = {}, progressCallback = null) {
  // Validate inputs
  if (!Array.isArray(addresses) || addresses.length === 0) {
    throw new Error('Addresses must be a non-empty array');
  }

  if (addresses.length > ROUTE_CONFIG.maxBatchSize) {
    throw new Error(`Batch size exceeds maximum of ${ROUTE_CONFIG.maxBatchSize} addresses`);
  }

  const finalConfig = { ...ROUTE_CONFIG, ...config };
  const batchId = generateBatchId();

  // Initialize batch state
  const batchState = {
    id: batchId,
    total: addresses.length,
    processed: 0,
    successful: 0,
    failed: 0,
    results: [],
    startTime: Date.now(),
    status: 'running',
    config: finalConfig
  };

  activeBatches.set(batchId, batchState);

  if (progressCallback) {
    progressCallback({
      type: 'batch_start',
      batchId: batchId,
      total: addresses.length,
      message: `Starting batch ${batchId}: ${addresses.length} addresses`
    });
  }

  try {
    // Process with concurrency control
    const maxConcurrent = finalConfig.maxConcurrentTabs;
    const results = [];
    let index = 0;

    // Process in chunks
    while (index < addresses.length) {
      const chunk = addresses.slice(index, index + maxConcurrent);
      index += chunk.length;

      // Process chunk in parallel
      const chunkPromises = chunk.map(async (address, chunkIndex) => {
        const globalIndex = index - chunk.length + chunkIndex;

        try {
          const result = await processRouteAddress(address, finalConfig, (update) => {
            // Update batch state
            if (update.type === 'complete') {
              batchState.successful++;
            } else if (update.type === 'error') {
              batchState.failed++;
            }

            batchState.processed++;

            // Forward to progress callback
            if (progressCallback) {
              progressCallback({
                ...update,
                batchId: batchId,
                current: batchState.processed,
                total: batchState.total,
                percent: Math.round((batchState.processed / batchState.total) * 100)
              });
            }
          });

          return result;

        } catch (error) {
          batchState.failed++;
          batchState.processed++;

          return {
            success: false,
            address: address.full,
            error: error.message,
            timestamp: new Date().toISOString()
          };
        }
      });

      // Wait for chunk to complete
      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);

      // Delay between chunks
      if (index < addresses.length) {
        await sleep(finalConfig.tabOpenDelay);
      }
    }

    // Finalize batch state
    batchState.results = results;
    batchState.status = 'complete';
    batchState.endTime = Date.now();
    batchState.duration = batchState.endTime - batchState.startTime;

    const summary = {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      duration: batchState.duration
    };

    if (progressCallback) {
      progressCallback({
        type: 'batch_complete',
        batchId: batchId,
        summary: summary,
        results: results,
        message: `Batch complete: ${summary.successful}/${summary.total} successful (${Math.round(summary.duration / 1000)}s)`
      });
    }

    return {
      batchId: batchId,
      summary: summary,
      results: results
    };

  } catch (error) {
    batchState.status = 'error';
    batchState.error = error.message;

    if (progressCallback) {
      progressCallback({
        type: 'batch_error',
        batchId: batchId,
        error: error.message,
        message: `❌ Batch error: ${error.message}`
      });
    }

    throw error;

  } finally {
    // Keep batch state for a short time, then cleanup
    setTimeout(() => {
      activeBatches.delete(batchId);
    }, 60000); // Keep for 1 minute
  }
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
