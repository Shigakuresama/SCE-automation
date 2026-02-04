/**
 * SCE Route Processor Batch Module
 * Batch processing logic for route planner
 */

import { generateBatchId, sleep } from './route-processor-utils.js';

// Re-export ROUTE_CONFIG for use in batch processing
export const ROUTE_CONFIG = {
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
export const activeBatches = new Map();

/**
 * Process batch of addresses with concurrency control
 * @param {Array<Object>} addresses - Array of address objects
 * @param {Object} config - Configuration options
 * @param {Function} progressCallback - Progress callback
 * @param {Function} processAddressFn - Function to process single address
 * @returns {Promise<Object>} Batch processing result
 */
export async function processRouteBatch(addresses, config = {}, progressCallback = null, processAddressFn = null) {
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
    config: finalConfig,
    cleanupId: null
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
      // Check if batch was cancelled
      const currentBatch = activeBatches.get(batchId);
      if (!currentBatch || currentBatch.status === 'cancelled') {
        console.log(`[Route Processor] Batch ${batchId} cancelled`);
        break;
      }

      const chunk = addresses.slice(index, index + maxConcurrent);
      index += chunk.length;

      // Process chunk in parallel
      const chunkPromises = chunk.map(async (address, chunkIndex) => {
        const globalIndex = index - chunk.length + chunkIndex;

        // Check cancellation before each address
        const checkBatch = activeBatches.get(batchId);
        if (!checkBatch || checkBatch.status === 'cancelled') {
          return {
            success: false,
            address: address.full,
            error: 'Cancelled',
            timestamp: new Date().toISOString()
          };
        }

        try {
          const result = await processAddressFn(address, finalConfig, (update) => {
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
    // Store cleanup timeout ID so we can cancel if needed
    const cleanupId = setTimeout(() => {
      activeBatches.delete(batchId);
      console.log(`[Route Processor] Cleaned up batch ${batchId}`);
    }, 60000); // Keep for 1 minute

    if (batchState) {
      batchState.cleanupId = cleanupId;
    }
  }
}
