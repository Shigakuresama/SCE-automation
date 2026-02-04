/**
 * SCE Form Auto-Fill - Background Service Worker
 */

console.log('[SCE Auto-Fill] Background service worker loaded');

// Import route processor module
importScripts('modules/route-processor.js');

// Store active route batches
const routeBatches = new Map();

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'fillSCEForm',
    title: 'Fill SCE Form',
    contexts: ['page', 'selection'],
    documentUrlPatterns: [
      'https://sce.dsmcentral.com/*',
      'https://sce-trade-ally-community.my.site.com/*'
    ]
  });

  chrome.contextMenus.create({
    id: 'openSettings',
    title: '⚙️ Settings',
    contexts: ['page', 'selection'],
    documentUrlPatterns: [
      'https://sce.dsmcentral.com/*',
      'https://sce-trade-ally-community.my.site.com/*'
    ]
  });

  console.log('[SCE Auto-Fill] Context menu created');
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'fillSCEForm') {
    chrome.tabs.sendMessage(tab.id, { action: 'fillForm' });
  } else if (info.menuItemId === 'openSettings') {
    chrome.runtime.openOptionsPage();
  }
});

// Handle popup messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getConfig') {
    chrome.storage.sync.get('sceConfig', (result) => {
      sendResponse(result.sceConfig || {});
    });
    return true;
  }

  if (request.action === 'saveConfig') {
    chrome.storage.sync.set({ sceConfig: request.config }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  // Route processing actions
  if (request.action === 'processRouteBatch') {
    handleRouteBatch(request.addresses, request.config)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'getBatchStatus') {
    const status = SCERouteProcessor.getBatchStatus(request.batchId);
    sendResponse({ success: true, status });
    return true;
  }

  if (request.action === 'cancelBatch') {
    const cancelled = SCERouteProcessor.cancelRouteBatch(request.batchId);
    sendResponse({ success: cancelled });
    return true;
  }

  if (request.action === 'validateAddress') {
    const validation = SCERouteProcessor.validateRouteAddress(request.address);
    sendResponse({ success: true, validation });
    return true;
  }
});

/**
 * Handle route batch processing with progress updates
 * @param {Array<Object>} addresses - Array of address objects
 * @param {Object} config - Configuration options
 * @returns {Promise<Object>} Batch processing result
 */
async function handleRouteBatch(addresses, config = {}) {
  try {
    // Validate all addresses first
    const validationErrors = [];
    addresses.forEach((address, index) => {
      const validation = SCERouteProcessor.validateRouteAddress(address);
      if (!validation.valid) {
        validationErrors.push(`Address ${index + 1}: ${validation.errors.join(', ')}`);
      }
    });

    if (validationErrors.length > 0) {
      throw new Error(`Validation failed:\n${validationErrors.join('\n')}`);
    }

    // Process batch with progress callbacks
    const result = await SCERouteProcessor.processRouteBatch(addresses, config, (progress) => {
      // Broadcast progress to all extension contexts
      broadcastProgress(progress);

      // Store progress for popup retrieval
      if (progress.batchId) {
        const batch = routeBatches.get(progress.batchId);
        if (batch) {
          batch.lastProgress = progress;
        }
      }
    });

    return result;

  } catch (error) {
    console.error('[SCE Auto-Fill] Route batch error:', error);
    throw error;
  }
}

/**
 * Broadcast progress update to all extension contexts
 * @param {Object} progress - Progress update
 */
function broadcastProgress(progress) {
  // Send to active tabs
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (tab.url && (tab.url.includes('sce.dsmcentral.com') ||
                      tab.url.includes('sce-trade-ally-community.my.site.com'))) {
        chrome.tabs.sendMessage(tab.id, {
          action: 'routeProgress',
          progress: progress
        }).catch(() => {
          // Ignore errors for tabs that don't have content script loaded
        });
      }
    });
  });

  // Send to popup if open
  chrome.runtime.sendMessage({
    action: 'routeProgress',
    progress: progress
  }).catch(() => {
    // Popup may not be open, ignore error
  });
}

/**
 * Cleanup old batch data periodically
 */
setInterval(() => {
  const cleaned = SCERouteProcessor.cleanupOldBatches();
  if (cleaned > 0) {
    console.log(`[SCE Auto-Fill] Cleaned up ${cleaned} old batches`);
  }
}, 5 * 60 * 1000); // Every 5 minutes
