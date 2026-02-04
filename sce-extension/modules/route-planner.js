/**
 * Route Planner Module
 * Handles UI logic, message handling, and progress tracking for the route planner tab
 */

// Import address generator functions
import { generateAddressRange } from './address-generator.js';
import { downloadCanvassPDF } from './pdf-generator.js';
import { parseSkipAddresses, showError, clearError, showStatusMessage, switchTab, sleep } from './route-planner-utils.js';
import { updateProgress, updateAddressStatus, renderAddressList, resetUI, handleMapToggle } from './route-planner-ui.js';
import { processAddressInTab, processBatch, processAddresses as processAddressesHandler } from './route-planner-handlers.js';

// State management
const state = {
  addresses: [],
  processedAddresses: [],
  isProcessing: false,
  currentBatch: 0,
  totalBatches: 0
};

// DOM elements cache
const elements = {};

/**
 * Initialize the route planner module
 */
export function init() {
  cacheElements();
  setupEventListeners();
  loadSettings();
}

/**
 * Cache DOM elements for performance
 */
function cacheElements() {
  elements.startAddress = document.getElementById('startAddress');
  elements.endAddress = document.getElementById('endAddress');
  elements.city = document.getElementById('city');
  elements.state = document.getElementById('state');
  elements.zip = document.getElementById('zip');
  elements.side = document.getElementById('side');
  elements.skip = document.getElementById('skip');
  elements.generateBtn = document.getElementById('generateBtn');
  elements.addressCount = document.getElementById('addressCount');
  elements.progressContainer = document.getElementById('progressContainer');
  elements.progressText = document.getElementById('progressText');
  elements.progressFill = document.getElementById('progressFill');
  elements.addressList = document.getElementById('addressList');
  elements.pdfSection = document.getElementById('pdfSection');
  elements.pdfReadyText = document.getElementById('pdfReadyText');
  elements.generatePdfBtn = document.getElementById('generatePdfBtn');
  elements.mapToggle = document.getElementById('mapToggle');
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Address input changes - update count
  const addressInputs = [elements.startAddress, elements.endAddress];
  addressInputs.forEach(input => {
    input.addEventListener('input', debounce(updateAddressCount, 300));
  });

  // Generate button
  elements.generateBtn.addEventListener('click', handleGenerate);

  // PDF button
  elements.generatePdfBtn.addEventListener('click', handleGeneratePDF);

  // Map toggle
  elements.mapToggle.addEventListener('click', handleMapToggle);

  // Tab switching (if tab manager exists)
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      switchTab(e.target.dataset.tab);
    });
  });
}

/**
 * Load saved settings
 */
function loadSettings() {
  chrome.storage.sync.get('routePlanner', (result) => {
    if (chrome.runtime.lastError) {
      console.error('[Route Planner] Failed to load settings:', chrome.runtime.lastError);
      showStatusMessage('⚠️ Could not load saved settings', 'warning');
      return;
    }

    if (result.routePlanner) {
      const settings = result.routePlanner;

      if (settings.city) elements.city.value = settings.city;
      if (settings.state) elements.state.value = settings.state;
      if (settings.zip) elements.zip.value = settings.zip;
      if (settings.side) elements.side.value = settings.side;
    }
  });
}

/**
 * Save current settings
 */
function saveSettings() {
  const settings = {
    city: elements.city.value,
    state: elements.state.value,
    zip: elements.zip.value,
    side: elements.side.value
  };

  chrome.storage.sync.set({ routePlanner: settings }, () => {
    if (chrome.runtime.lastError) {
      console.error('[Route Planner] Failed to save settings:', chrome.runtime.lastError);
      showStatusMessage('⚠️ Could not save settings', 'warning');
    }
  });
}

/**
 * Update address count display
 */
function updateAddressCount() {
  try {
    const start = elements.startAddress.value.trim();
    const end = elements.endAddress.value.trim();
    const side = elements.side.value;
    const skip = parseSkipAddresses(elements.skip.value);

    if (!start || !end) {
      elements.addressCount.textContent = '0';
      return;
    }

    // Use the imported generateAddressRange function
    const addresses = generateAddressRange(start, end, { side, skip });
    elements.addressCount.textContent = addresses.length;

    clearError(elements.startAddress);
    clearError(elements.endAddress);

  } catch (error) {
    // Silently fail on typing - user will see error on generate
  }
}

/**
 * Parse skip addresses input
 */
 */
async function handleGenerate() {
  if (state.isProcessing) {
    // Cancel processing
    cancelProcessing();
    return;
  }

  // Validate inputs
  const validationError = validateInputs();
  if (validationError) {
    showError(validationError.field, validationError.message);
    return;
  }

  // Generate addresses
  try {
    const addresses = generateAddresses();
    state.addresses = addresses;
    state.processedAddresses = [];
    state.isProcessing = true;

    // Save settings
    saveSettings();

    // Update UI
    elements.generateBtn.textContent = '⏹️ Stop Processing';
    elements.generateBtn.classList.remove('btn-primary');
    elements.generateBtn.classList.add('btn-secondary');
    elements.progressContainer.style.display = 'block';
    elements.addressList.style.display = 'block';

    // Clear previous results
    renderAddressList(state.addresses, elements.addressList);

    // Start processing
    await processAddressesHandler(state, elements, addresses);

  } catch (error) {
    showStatusMessage(error.message, 'error');
    resetUI(elements);
  }
}

/**
 * Validate form inputs
 */
function validateInputs() {
  const start = elements.startAddress.value.trim();
  const end = elements.endAddress.value.trim();
  const city = elements.city.value.trim();
  const zip = elements.zip.value.trim();

  if (!start) {
    return { field: elements.startAddress, message: 'Enter a start address' };
  }

  if (!end) {
    return { field: elements.endAddress, message: 'Enter an end address' };
  }

  if (!city) {
    return { field: elements.city, message: 'Enter a city' };
  }

  if (!zip) {
    return { field: elements.zip, message: 'Enter a ZIP code' };
  }

  if (!/^\d{5}$/.test(zip)) {
    return { field: elements.zip, message: 'ZIP must be 5 digits' };
  }

  return null;
}

/**
 * Generate addresses from input range
 */
function generateAddresses() {
  const start = elements.startAddress.value.trim();
  const end = elements.endAddress.value.trim();
  const city = elements.city.value.trim();
  const state = elements.state.value;
  const zip = elements.zip.value.trim();
  const side = elements.side.value;
  const skip = parseSkipAddresses(elements.skip.value);

  // Build full addresses
  const startFull = `${start}, ${city}, ${state} ${zip}`;
  const endFull = `${end}, ${city}, ${state} ${zip}`;

  const addresses = generateAddressRange(startFull, endFull, { side, skip });

  if (addresses.length === 0) {
    throw new Error('No addresses generated. Check your address range.');
  }

  return addresses;
}

/**
 * Process all addresses
 */

}

/**
 * Handle PDF generation
 */
async function handleGeneratePDF() {
  if (state.processedAddresses.length === 0) {
    showStatusMessage('No addresses to generate PDF for', 'error');
    return;
  }

  const hasCustomerData = state.processedAddresses.some(addr => addr.name || addr.phone);
  if (!hasCustomerData) {
    showStatusMessage('⚠️ No customer data captured. PDF will have blank name/phone fields.', 'warning');
  }

  elements.generatePdfBtn.disabled = true;
  elements.generatePdfBtn.textContent = 'Generating...';

  try {
    const street = state.processedAddresses[0]?.street || 'route';
    const date = new Date().toISOString().split('T')[0];
    const filename = street.replace(/\s+/g, '-') + '-' + date + '-canvass.pdf';

    await downloadCanvassPDF(state.processedAddresses, filename);
    showStatusMessage('✅ PDF downloaded!', 'success');
  } catch (error) {
    console.error('[Route Planner] PDF generation error:', error);
    showStatusMessage('Error: ' + error.message, 'error');
  } finally {
    elements.generatePdfBtn.disabled = false;
    elements.generatePdfBtn.textContent = 'Generate 3×3 Grid PDF';
  }
}

/**
 * Cancel processing
 */
function cancelProcessing() {
  state.isProcessing = false;
  showStatusMessage('Cancelling...', 'error');
}

// Export for use in popup.js
if (typeof globalThis !== 'undefined') {
  Object.defineProperty(globalThis, 'RoutePlanner', {
    value: { init },
    writable: false,
    configurable: false,
    enumerable: false
  });
}
