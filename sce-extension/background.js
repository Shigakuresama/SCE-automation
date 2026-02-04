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

  // Process single route address (from popup)
  if (request.action === 'processRouteAddress') {
    handleSingleRouteAddress(request.address)
      .then(result => sendResponse({ success: true, ...result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  // Generate PDF from processed addresses (from popup)
  if (request.action === 'generateRoutePDF') {
    handlePDFGeneration(request.addresses)
      .then(result => sendResponse({ success: true, ...result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
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

// ============================================
// SINGLE ADDRESS PROCESSING
// ============================================

/**
 * Handle processing of a single route address from popup
 * @param {Object} address - Address object { number, street, city, state, zip, full }
 * @returns {Promise<Object>} Processing result
 */
async function handleSingleRouteAddress(address) {
  try {
    // Open new tab with SCE form
    const tabId = await openTab('https://sce.dsmcentral.com/onsite/projects');

    // Wait for tab to load
    await sleep(3000);

    // Send fill form message to content script
    const fillResult = await sendToContentScript(tabId, {
      action: 'fillForm',
      address: address.full,
      zipCode: address.zip
    });

    if (!fillResult || !fillResult.success) {
      await closeTab(tabId);
      return {
        success: false,
        capturedData: null,
        error: fillResult?.error || 'Failed to fill form'
      };
    }

    // Wait for data capture
    await sleep(5000);

    // Try to capture customer data from the page
    const capturedData = await captureCustomerData(tabId, address);

    // Close the tab
    await closeTab(tabId);

    return {
      success: true,
      capturedData: capturedData
    };

  } catch (error) {
    console.error('[SCE Auto-Fill] Single address processing error:', error);
    return {
      success: false,
      capturedData: null,
      error: error.message
    };
  }
}

/**
 * Capture customer data from a tab
 * @param {number} tabId - Tab ID
 * @param {Object} address - Address object
 * @returns {Promise<Object>} Captured customer data
 */
async function captureCustomerData(tabId, address) {
  try {
    const response = await sendToContentScript(tabId, {
      action: 'captureCustomerData',
      address: address.full
    });

    if (response && response.success) {
      return response.data;
    }

    return {
      name: null,
      phone: null,
      qualified: false
    };

  } catch (error) {
    console.warn('[SCE Auto-Fill] Could not capture customer data:', error);
    return {
      name: null,
      phone: null,
      qualified: false
    };
  }
}

// ============================================
// PDF GENERATION
// ============================================

/**
 * Handle PDF generation from processed addresses
 * @param {Array<Object>} addresses - Array of processed address objects
 * @returns {Promise<Object>} PDF generation result
 */
async function handlePDFGeneration(addresses) {
  try {
    // Import jsPDF library
    const jsPDF = await importJSPLibrary();

    if (!jsPDF) {
      throw new Error('jsPDF library not available');
    }

    // Generate PDF using the pdf-generator module
    const pdfData = SCERouteProcessor.generateRoutePDF(addresses);

    // Create download
    chrome.downloads.download({
      url: pdfData.dataUrl,
      filename: pdfData.filename,
      saveAs: true
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error('[SCE Auto-Fill] PDF download error:', chrome.runtime.lastError);
      } else {
        console.log(`[SCE Auto-Fill] PDF download started: ${downloadId}`);
      }
    });

    return {
      success: true,
      filename: pdfData.filename
    };

  } catch (error) {
    console.error('[SCE Auto-Fill] PDF generation error:', error);
    throw error;
  }
}

/**
 * Dynamically import jsPDF library
 * @returns {Promise<Object>} jsPDF constructor
 */
async function importJSPLibrary() {
  return new Promise((resolve) => {
    // Try to load from web accessible resource
    fetch(chrome.runtime.getURL('lib/jspdf.umd.min.js'))
      .then(response => response.text())
      .then(code => {
        // Execute the code in a clean context
        const script = document.createElement('script');
        script.textContent = code;
        document.head.appendChild(script);

        // jsPDF should now be available globally
        if (typeof window.jspdf !== 'undefined') {
          resolve(window.jspdf.jsPDF);
        } else {
          resolve(null);
        }

        document.head.removeChild(script);
      })
      .catch(() => resolve(null));
  });
}
