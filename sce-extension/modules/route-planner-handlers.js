/**
 * SCE Route Planner Handlers Module
 * Processing and batch handling logic for route planner
 */

import { updateAddressStatus, updateProgress } from './route-planner-ui.js';
import { showStatusMessage, sleep } from './route-planner-utils.js';

/**
 * Process a single address by sending message to background script
 * @param {Object} address - Address object
 * @param {number} timeout - Timeout in milliseconds (default: 30000)
 * @returns {Promise<Object>} Processing result
 */
export async function processAddressInTab(address, timeout = 30000) {
  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      console.error(`[Route Planner] Message timeout for ${address.full} after ${timeout}ms`);
      resolve({
        success: false,
        error: `Message timeout after ${timeout}ms`
      });
    }, timeout);

    chrome.runtime.sendMessage({
      action: 'processRouteAddress',
      address: address
    }, (response) => {
      clearTimeout(timeoutId);

      if (chrome.runtime.lastError) {
        console.error(`[Route Planner] Message error for ${address.full}:`, chrome.runtime.lastError);
        resolve({
          success: false,
          error: chrome.runtime.lastError.message
        });
      } else if (!response) {
        console.error(`[Route Planner] No response for ${address.full}`);
        resolve({
          success: false,
          error: 'No response from background script'
        });
      } else if (!response.hasOwnProperty('success')) {
        console.error(`[Route Planner] Invalid response for ${address.full}:`, response);
        resolve({
          success: false,
          error: 'Invalid response from background script'
        });
      } else {
        resolve(response);
      }
    });
  });
}

/**
 * Process a batch of addresses
 * @param {Object} state - Route planner state
 * @param {Object} elements - DOM elements cache
 * @param {Array<Object>} batch - Batch of addresses to process
 * @returns {Promise<void>}
 */
export async function processBatch(state, elements, batch) {
  for (const address of batch) {
    if (!state.isProcessing) {
      break; // Cancelled
    }

    updateAddressStatus(address, 'processing');

    try {
      const result = await processAddressInTab(address);

      if (result.success) {
        updateAddressStatus(address, 'success', result.data);
        state.processedAddresses.push({
          ...address,
          ...result.data
        });
      } else {
        updateAddressStatus(address, 'error', null, result.error);
      }
    } catch (error) {
      updateAddressStatus(address, 'error', null, error.message);
    }
  }
}

/**
 * Process all addresses in batches
 * @param {Object} state - Route planner state
 * @param {Object} elements - DOM elements cache
 * @param {Array<Object>} addresses - Addresses to process
 * @returns {Promise<void>}
 */
export async function processAddresses(state, elements, addresses) {
  const batchSize = 3;

  state.isProcessing = true;
  state.processedAddresses = [];
  state.currentBatch = 0;
  state.totalBatches = Math.ceil(addresses.length / batchSize);

  elements.stopBtn.style.display = 'inline-block';
  elements.generateBtn.classList.remove('btn-primary');
  elements.generateBtn.classList.add('btn-secondary');
  elements.progressContainer.style.display = 'block';
  elements.addressList.style.display = 'block';

  for (let i = 0; i < addresses.length; i += batchSize) {
    if (!state.isProcessing) {
      break; // Cancelled
    }

    const batch = addresses.slice(i, i + batchSize);
    state.currentBatch = Math.floor(i / batchSize) + 1;

    updateProgress(i, addresses.length);

    // Process batch
    await processBatch(state, elements, batch);

    // Small delay between batches
    await sleep(500);
  }

  // Processing complete
  if (state.isProcessing) {
    updateProgress(addresses.length, addresses.length);
    showStatusMessage(`✅ Processed ${state.processedAddresses.length} addresses`, 'success');
    elements.pdfSection.style.display = 'block';
  } else {
    showStatusMessage('⏹️ Processing cancelled', 'error');
  }
}
