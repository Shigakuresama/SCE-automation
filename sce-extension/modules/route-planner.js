/**
 * Route Planner Module
 * Handles UI logic, message handling, and progress tracking for the route planner tab
 */

// Import address generator functions
import { generateAddressRange } from './address-generator.js';

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

  chrome.storage.sync.set({ routePlanner: settings });
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
function parseSkipAddresses(skipValue) {
  if (!skipValue || !skipValue.trim()) {
    return [];
  }
  return skipValue.split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

/**
 * Handle generate button click
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
    renderAddressList();

    // Start processing
    await processAddresses(addresses);

  } catch (error) {
    showStatusMessage(error.message, 'error');
    resetUI();
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
async function processAddresses(addresses) {
  const batchSize = 3;
  state.totalBatches = Math.ceil(addresses.length / batchSize);
  state.currentBatch = 0;

  for (let i = 0; i < addresses.length; i += batchSize) {
    if (!state.isProcessing) {
      break; // Cancelled
    }

    const batch = addresses.slice(i, i + batchSize);
    state.currentBatch = Math.floor(i / batchSize) + 1;

    updateProgress(i, addresses.length);

    // Process batch
    await processBatch(batch);

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

  resetUI();
}

/**
 * Process a batch of addresses
 */
async function processBatch(batch) {
  for (const address of batch) {
    if (!state.isProcessing) return;

    // Update status to processing
    updateAddressStatus(address.full, 'processing');

    try {
      // Send message to background script to open tab and fill form
      const result = await processAddressInTab(address);

      if (result.success) {
        state.processedAddresses.push({
          ...address,
          ...result.capturedData,
          status: 'complete'
        });
        updateAddressStatus(address.full, 'success', result.capturedData);
      } else {
        state.processedAddresses.push({
          ...address,
          status: 'error',
          error: result.error
        });
        updateAddressStatus(address.full, 'error', null, result.error);
      }

    } catch (error) {
      state.processedAddresses.push({
        ...address,
        status: 'error',
        error: error.message
      });
      updateAddressStatus(address.full, 'error', null, error.message);
    }
  }
}

/**
 * Process a single address in a new tab
 */
async function processAddressInTab(address) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      action: 'processRouteAddress',
      address: address
    }, (response) => {
      if (chrome.runtime.lastError) {
        resolve({
          success: false,
          error: chrome.runtime.lastError.message
        });
      } else {
        resolve(response || { success: false, error: 'No response' });
      }
    });
  });
}

/**
 * Update progress display
 */
function updateProgress(current, total) {
  const percent = Math.round((current / total) * 100);
  elements.progressText.textContent = `Processing: ${current}/${total}`;
  elements.progressFill.style.width = `${percent}%`;
}

/**
 * Update address status in the list
 */
function updateAddressStatus(address, status, customerData = null, error = null) {
  const item = document.querySelector(`[data-address="${address}"]`);
  if (!item) return;

  const icon = item.querySelector('.status-icon');
  const info = item.querySelector('.customer-info');

  // Update icon
  icon.className = `status-icon ${status}`;

  if (status === 'processing') {
    icon.innerHTML = '⏳';
    info.textContent = 'Processing...';
  } else if (status === 'success') {
    icon.innerHTML = '✅';
    if (customerData && customerData.name) {
      info.textContent = `${customerData.name} - ${customerData.phone || 'No phone'}`;
    } else {
      info.textContent = 'No customer data captured';
    }
  } else if (status === 'error') {
    icon.innerHTML = '❌';
    info.textContent = error || 'Failed to process';
  }
}

/**
 * Render the initial address list
 */
function renderAddressList() {
  elements.addressList.innerHTML = '';

  state.addresses.forEach(address => {
    const item = document.createElement('div');
    item.className = 'address-item';
    item.dataset.address = address.full;

    item.innerHTML = `
      <span class="status-icon pending">⏸️</span>
      <div class="address-text">
        <div>${address.full}</div>
        <div class="customer-info">Pending</div>
      </div>
    `;

    elements.addressList.appendChild(item);
  });
}

/**
 * Handle PDF generation
 */
async function handleGeneratePDF() {
  if (state.processedAddresses.length === 0) {
    showStatusMessage('No addresses to generate PDF for', 'error');
    return;
  }

  elements.generatePdfBtn.disabled = true;
  elements.generatePdfBtn.textContent = 'Generating...';

  try {
    // Send message to background script to generate PDF
    chrome.runtime.sendMessage({
      action: 'generateRoutePDF',
      addresses: state.processedAddresses
    }, (response) => {
      if (chrome.runtime.lastError) {
        showStatusMessage(`Error: ${chrome.runtime.lastError.message}`, 'error');
      } else if (response && response.success) {
        showStatusMessage('✅ PDF downloaded!', 'success');
      } else {
        showStatusMessage('Failed to generate PDF', 'error');
      }

      elements.generatePdfBtn.disabled = false;
      elements.generatePdfBtn.textContent = 'Generate 3×3 Grid PDF';
    });

  } catch (error) {
    showStatusMessage(`Error: ${error.message}`, 'error');
    elements.generatePdfBtn.disabled = false;
    elements.generatePdfBtn.textContent = 'Generate 3×3 Grid PDF';
  }
}

/**
 * Handle map toggle
 */
function handleMapToggle() {
  // Future: Switch to map view
  showStatusMessage('Map view coming soon!', 'success');
}

/**
 * Cancel processing
 */
function cancelProcessing() {
  state.isProcessing = false;
  showStatusMessage('Cancelling...', 'error');
}

/**
 * Reset UI to initial state
 */
function resetUI() {
  state.isProcessing = false;
  elements.generateBtn.textContent = `Generate & Process ${state.addresses.length} Houses`;
  elements.generateBtn.classList.remove('btn-secondary');
  elements.generateBtn.classList.add('btn-primary');
}

/**
 * Switch between tabs
 */
function switchTab(tabName) {
  // Hide all tabs
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });

  // Deactivate all buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  // Show selected tab
  const selectedTab = document.getElementById(`${tabName}-tab`);
  if (selectedTab) {
    selectedTab.classList.add('active');
  }

  // Activate button
  const activeBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
  if (activeBtn) {
    activeBtn.classList.add('active');
  }
}

/**
 * Show error on input field
 */
function showError(element, message) {
  element.classList.add('error');
  const errorDiv = document.getElementById(`${element.id}Error`);
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
  }
}

/**
 * Clear error from input field
 */
function clearError(element) {
  element.classList.remove('error');
  const errorDiv = document.getElementById(`${element.id}Error`);
  if (errorDiv) {
    errorDiv.textContent = '';
    errorDiv.style.display = 'none';
  }
}

/**
 * Show status message
 */
function showStatusMessage(message, type) {
  // Create status element if needed
  let statusDiv = document.getElementById('routeStatus');
  if (!statusDiv) {
    statusDiv = document.createElement('div');
    statusDiv.id = 'routeStatus';
    statusDiv.className = 'status';
    elements.addressList.parentNode.insertBefore(statusDiv, elements.addressList);
  }

  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;

  // Auto-hide after 3 seconds
  setTimeout(() => {
    statusDiv.className = 'status';
  }, 3000);
}

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Debounce utility
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
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
