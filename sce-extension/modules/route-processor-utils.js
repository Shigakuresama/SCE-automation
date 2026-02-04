/**
 * SCE Route Processor Utilities
 * Shared utility functions for route processing
 */

/**
 * Generate unique batch ID
 * @returns {string} Unique batch identifier
 */
export function generateBatchId() {
  return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Sleep utility
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Send message to content script with timeout
 * @param {number} tabId - Tab ID
 * @param {Object} message - Message object
 * @param {number} timeout - Timeout in milliseconds (default: 30000)
 * @returns {Promise<Object>} Response from content script
 */
export function sendToContentScript(tabId, message, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Content script message timeout after ${timeout}ms`));
    }, timeout);

    chrome.tabs.sendMessage(tabId, message, (response) => {
      clearTimeout(timeoutId);

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
export function openTab(url) {
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
 * Close tab with error logging
 * @param {number} tabId - Tab ID to close
 * @returns {Promise<void>}
 */
export function closeTab(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.remove(tabId, () => {
      if (chrome.runtime.lastError) {
        // Only ignore "tab not found" errors, log everything else
        const msg = chrome.runtime.lastError.message;
        if (!msg.includes('No tab with id')) {
          console.warn(`[Route Processor] Failed to close tab ${tabId}:`, msg);
        }
      }
      // Always resolve to avoid blocking cleanup
      resolve();
    });
  });
}

/**
 * Capture visible tab screenshot
 * @param {number} tabId - Tab ID
 * @returns {Promise<string>} Data URL of screenshot
 */
export function captureScreenshot(tabId) {
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
