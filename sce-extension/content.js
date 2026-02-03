/**
 * SCE Form Auto-Fill - Content Script
 * Runs on SCE pages to detect forms and fill them
 */

import { SectionLoader } from './modules/loader.js';
import { showError, showWarning, showInfo } from './modules/error-banner.js';

console.log('[SCE Auto-Fill] Content script loaded');

// ============================================
// CONFIG (loaded from storage)
// ============================================
let config = {
  // Customer Search
  address: '22216 Seine',
  zipCode: '90716',

  // Customer Information
  firstName: 'Sergio',
  lastName: 'Correa',
  phone: '7143912727',
  email: 'scm.energysavings@gmail.com',

  // Additional Customer Information
  title: 'Outreach',
  preferredContactTime: '1:00PM - 3:30PM',
  language: 'English',
  ethnicity: 'Hispanic/Latino',
  householdUnits: '1',
  spaceOrUnit: '1',
  howDidYouHear: 'Contractor Outreach',
  masterMetered: 'Yes',
  buildingType: 'Residential',
  homeownerStatus: 'Renter/Tenant',
  gasProvider: 'SoCalGas',
  gasAccountNumber: '1',
  waterUtility: 'N/A',
  incomeVerifiedDate: '01/31/2026',

  // Demographics
  primaryApplicantAge: '44',
  permanentlyDisabled: 'No',
  veteran: 'No',
  nativeAmerican: 'No',

  // Enrollment Information
  incomeVerificationType: 'PRISM code',
  plus4Zip: '',

  // Household Members
  householdMembersCount: '1',
  relationToApplicant: 'Applicant',

  // Project Information
  zillowSqFt: '',
  zillowYearBuilt: '',
  projectSpaceOrUnit: '1',

  // Trade Ally Information
  projectFirstName: 'Sergio',
  projectLastName: 'Correa',
  projectTitle: 'Outreach',
  projectPhone: '7143912727',
  projectEmail: 'scm.energysavings@gmail.com',

  // Appointment Contact
  attempt1Date: '01/30/2026',
  attempt1Time: '2:00PM',
  attempt2Date: '01/31/2026',
  attempt2Time: '3:00PM',

  // Appointments
  contractorName: 'Sergio Correa',
  appointmentDate: '01/30/2026',
  appointmentStatus: 'Scheduled',
  appointmentType: 'On-Site Appointment',
  appointmentStartTime: '2:00PM',
  appointmentEndTime: '',

  // Assessment/Equipment
  hvacSystemType: 'Natural Gas',
  hasRoomAC: 'Yes - Room AC',
  hasEvapCooler: 'No',
  refrigeratorCount: '1',
  fridge1Year: '2022',
  hasFreezer: 'No',
  waterHeaterFuel: 'Natural Gas',
  waterHeaterSize: '40 Gal',
  hasDishwasher: 'No',
  hasClothesWasher: 'No',
  hasClothesDryer: 'Electric',
  clothesDryerType: 'Electric',

  // Equipment Information
  equipmentToInstall: 'None',
  equipmentBrand: '',
  equipmentModel: '',

  // Basic Enrollment Equipment
  measureType: 'Basic',
  equipmentQuantity: '1',

  // Bonus Measures
  bonusMeasureType: 'None',
  adjustmentNotes: '',

  // Terms
  electronicAcceptance: 'I Agree',
  priorIncentive: 'No',

  // Uploads
  autoUploadDocs: 'false',

  // Comments
  reviewComment: '',

  // Status
  autoAcceptLead: 'true',
  finalStatus: 'Accepted',

  // Behavior
  autoFillPrompt: true,
  customFieldMap: '{}'
};

// ============================================
// STOP CONTROL
// ============================================
let isStopped = false;
let stopButton = null;

/**
 * Stop the form filling process
 */
function stopFormFilling() {
  isStopped = true;
  log('⏹️ Form filling stopped by user');

  // Update banner to show stopped state
  const banner = document.getElementById('sce-autofill-banner');
  if (banner) {
    banner.classList.remove('sce-filling');
    banner.classList.add('sce-stopped');
    banner.querySelector('.sce-banner-text').textContent = '⏹️ Stopped';

    // Show error banner with message
    showError('Process Stopped', 'Form filling was stopped by the user');
  }

  // Hide stop button
  if (stopButton) {
    stopButton.style.display = 'none';
  }

  // Re-enable other buttons
  const fillAllBtn = document.getElementById('sce-fill-all-btn');
  const fillSectionBtn = document.getElementById('sce-fill-section-btn');
  if (fillAllBtn) {
    fillAllBtn.disabled = false;
    fillAllBtn.style.opacity = '1';
    fillAllBtn.style.pointerEvents = 'auto';
  }
  if (fillSectionBtn) {
    fillSectionBtn.disabled = false;
    fillSectionBtn.style.opacity = '1';
    fillSectionBtn.style.pointerEvents = 'auto';
  }
}

/**
 * Check if process was stopped and throw if so
 * @throws {Error} If process was stopped
 */
function checkStopped() {
  if (isStopped) {
    throw new Error('Process was stopped by user');
  }
}

/**
 * Create and show the stop button
 */
function showStopButton() {
  // Remove existing stop button
  if (stopButton) {
    stopButton.remove();
  }

  stopButton = document.createElement('button');
  stopButton.id = 'sce-stop-btn';
  stopButton.className = 'sce-btn sce-btn-stop';
  stopButton.textContent = '⏹ Stop';
  stopButton.onclick = stopFormFilling;

  // Add to banner
  const banner = document.getElementById('sce-autofill-banner');
  if (banner) {
    const content = banner.querySelector('.sce-banner-content');
    if (content) {
      content.appendChild(stopButton);
    }
  }
}

/**
 * Hide the stop button
 */
function hideStopButton() {
  if (stopButton) {
    stopButton.style.display = 'none';
  }
}

/**
 * Reset the stop state (allow restart)
 */
function resetStopState() {
  isStopped = false;
  const banner = document.getElementById('sce-autofill-banner');
  if (banner) {
    banner.classList.remove('sce-stopped');
  }
}

// ============================================
// CONFIG LOADING (async with Promise to prevent race conditions)
// ============================================
let configLoadPromise = null;

function loadConfig() {
  if (!configLoadPromise) {
    configLoadPromise = new Promise((resolve) => {
      chrome.storage.sync.get('sceConfig', (result) => {
        if (result.sceConfig) {
          config = { ...config, ...result.sceConfig };
          console.log('[SCE Auto-Fill] Config loaded:', config);
        }
        resolve(config);
      });
    });
  }
  return configLoadPromise;
}

// Listen for config updates
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.sceConfig) {
    config = { ...config, ...changes.sceConfig.newValue };
    console.log('[SCE Auto-Fill] Config updated:', config);
  }
});

// ============================================
// UTILITIES
// ============================================
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Check if a field is already filled with a valid value
// skipIfFilled = true: skip if already filled (for dropdowns/preferences)
// skipIfFilled = false: always fill (for property data, contact info)
function isFieldAlreadyFilled(input, expectedValue, skipIfFilled = true) {
  if (!input) return false;
  if (!skipIfFilled) return false; // Always fill if skipIfFilled is false

  // For readonly/disabled fields, consider them "already filled"
  if (input.readOnly || input.disabled) return true;

  // Check Angular form state classes
  const formField = input.closest('mat-form-field');
  if (formField) {
    const isTouchedAndDirty = formField.classList.contains('ng-touched') && formField.classList.contains('ng-dirty');
    const isValid = formField.classList.contains('ng-valid');

    if (isTouchedAndDirty && isValid) {
      const currentValue = input.value?.trim() || input.textContent?.trim() || '';
      // If it has a meaningful value (more than 1 char for text inputs), consider it filled
      if (currentValue.length > 1) {
        return true;
      }
    }
  }

  // Direct value check for selects
  const currentValue = input.value?.trim() || '';
  if (currentValue && expectedValue && currentValue === expectedValue.trim()) {
    return true;
  }

  return false;
}

function log(msg, ...args) {
  console.log(`%c[SCE Auto-Fill] ${msg}`, 'color: #4CAF50; font-weight: bold', ...args);
}

// ============================================
// PROPERTY DATA FETCHER (Proxy Server Integration)
// ============================================
let zillowData = {
  sqFt: null,
  yearBuilt: null,
  lastAddress: null,
  source: null
};

const PROXY_URL = 'http://localhost:3000';
let proxyAvailable = null; // null = unknown, true = available, false = unavailable
let proxyLastCheckedAt = 0;
const PROXY_STATUS_TTL_MS = 30000; // 30s for successful checks
const PROXY_FAILURE_RETRY_MS = 5000; // 5s for failed checks (retry faster)

async function checkProxyStatus(force = false) {
  const now = Date.now();
  // If cached as available, use full TTL. If unavailable, retry more frequently.
  const cacheTime = proxyAvailable === false ? PROXY_FAILURE_RETRY_MS : PROXY_STATUS_TTL_MS;
  if (!force && proxyAvailable !== null && (now - proxyLastCheckedAt) < cacheTime) {
    return proxyAvailable;
  }
  proxyLastCheckedAt = now;

  try {
    const response = await fetch(`${PROXY_URL}/api/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000)
    });
    proxyAvailable = response.ok;
    return proxyAvailable;
  } catch (err) {
    log(`  ⚠️ Proxy health check failed: ${err.name} - ${err.message}`);
    showWarning(`Proxy server health check failed: ${err.name}`);
    proxyAvailable = false;
    return false;
  }
}

async function fetchPropertyDataFromProxy(address, zipCode) {
  // Use actual customer address if available from the page
  const actualAddress = window.sceCustomerAddress || '';
  let searchAddress = `${address}, ${zipCode}`.trim();

  // If we have the actual customer address from the page, use that instead
  if (actualAddress && actualAddress.includes(',')) {
    searchAddress = actualAddress;
    log(`  🏠 Using actual customer address from page`);
  }

  log(`  🏠 Fetching property data for: ${searchAddress}`);

  // Parse address and zip from the search address
  let searchAddr = address;
  let searchZip = zipCode;
  if (actualAddress && actualAddress.includes(',')) {
    const parts = actualAddress.split(',').map(p => p.trim());
    searchAddr = parts[0] || address;
    searchZip = parts[parts.length - 1] || zipCode;
  }

  // Check cache first
  if (zillowData.lastAddress === searchAddress && zillowData.sqFt) {
    log(`  ✓ Using cached property data (${zillowData.source})`);
    return zillowData;
  }

  // Check if proxy is available
  const proxyOk = await checkProxyStatus();
  if (!proxyOk) {
    log(`  ⚠️ Proxy server not available - using config values`);
    return {
      sqFt: config.zillowSqFt || '1200',
      yearBuilt: config.zillowYearBuilt || '1970',
      lastAddress: searchAddress,
      source: 'config'
    };
  }

  try {
    const response = await fetch(`${PROXY_URL}/api/property?address=${encodeURIComponent(searchAddr)}&zip=${encodeURIComponent(searchZip)}`);

    if (response.ok) {
      const result = await response.json();
      zillowData = {
        sqFt: result.data?.sqFt || config.zillowSqFt || '1200',
        yearBuilt: result.data?.yearBuilt || config.zillowYearBuilt || '1970',
        lastAddress: searchAddress,
        source: result.source || 'proxy'
      };
      log(`  ✓ Property data found (${zillowData.source}): ${zillowData.sqFt} sqft, ${zillowData.yearBuilt}`);
      return zillowData;
    } else {
      log(`  ⚠️ Proxy returned ${response.status} - using config values`);
      showWarning(`Property data unavailable (HTTP ${response.status}). Using configured values.`);
    }
  } catch (err) {
    log(`  ⚠️ Proxy fetch failed: ${err.message}`);
    showError('Failed to fetch property data', err.message);
  }

  // Fallback to config values
  zillowData = {
    sqFt: config.zillowSqFt || '1200',
    yearBuilt: config.zillowYearBuilt || '1970',
    lastAddress: searchAddress,
    source: 'config'
  };
  return zillowData;
}

// ============================================
// ANGULAR STABILITY WAITER (Enhanced)
// ============================================
async function waitForAngularStability(timeoutMs = 5000) {
  const startTime = Date.now();
  let lastChangeTime = Date.now();
  let lastHtmlLength = document.body.innerHTML.length;

  while (Date.now() - startTime < timeoutMs) {
    // Check for spinners
    const spinners = document.querySelectorAll('mat-progress-spinner, .mat-progress-spinner, [role="progressbar"], .spinner, [class*="spinner"], [class*="loading"]');
    const visibleSpinners = Array.from(spinners).filter(s => {
      const rect = s.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });

    // Check for DOM stability (no changes for 500ms)
    const currentHtmlLength = document.body.innerHTML.length;
    if (currentHtmlLength !== lastHtmlLength) {
      lastChangeTime = Date.now();
      lastHtmlLength = currentHtmlLength;
    }

    if (visibleSpinners.length === 0 && (Date.now() - lastChangeTime) > 500) {
      return true;
    }
    await sleep(100);
  }
  return false;
}

// ============================================
// FIELD FINDERS (Enhanced based on SCE Angular patterns)
// ============================================
// Enhanced selectors based on SCE Angular Material structure
const fieldSelectors = {
  textInput: 'mat-form-field input.mat-input-element, mat-form-field input.mat-input',
  select: 'mat-form-field mat-select',
  option: 'mat-option',
  label: 'mat-form-field mat-label',
  formField: 'mat-form-field'
};

function findInputByMatLabel(labelText) {
  // Try exact match first, then includes
  const labels = Array.from(document.querySelectorAll(fieldSelectors.label));
  let label = labels.find(l => l.textContent.trim() === labelText);
  if (!label) {
    label = labels.find(l => l.textContent.includes(labelText));
  }
  if (!label) return null;

  const formField = label.closest('mat-form-field');
  if (!formField) return null;

  // Try multiple input selector patterns
  return formField.querySelector('input.mat-input-element')
    || formField.querySelector('input.mat-input')
    || formField.querySelector('input');
}

async function setInputValue(input, value, fieldName, skipIfFilled = true) {
  if (!input) return false;

  // Check if field is already filled with the expected value (respecting skipIfFilled)
  if (isFieldAlreadyFilled(input, value, skipIfFilled)) {
    log(`  ⊙ ${fieldName}: already filled with "${input.value}"`);
    return true;
  }

  // Scroll into view if needed
  input.scrollIntoView({ behavior: 'smooth', block: 'center' });
  await sleep(100);

  // Focus with click for Angular to register
  input.focus();
  input.click();
  await sleep(150);

  // Clear existing value
  input.value = '';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await sleep(50);

  // Set value using native setter for Angular to detect
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  nativeInputValueSetter.call(input, value);

  // Trigger comprehensive events for Angular change detection
  input.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: value.charAt(value.length - 1) || 'x' }));
  input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));

  // Wait for Angular to process
  await sleep(300);

  // Verify and retry if needed
  if (input.value === value) {
    log(`  ✓ ${fieldName}: "${value}"`);
    return true;
  }

  log(`  ⚠️ Retry for ${fieldName} (current: "${input.value}")`);
  // Retry with direct assignment
  await sleep(200);
  input.focus();
  input.value = value;
  input.dispatchEvent(new InputEvent('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
  await sleep(200);

  if (input.value === value) {
    log(`  ✓ ${fieldName}: "${value}" (retry)`);
    return true;
  }

  log(`  ❌ Failed to set ${fieldName}: expected "${value}", got "${input.value}"`);
  return false;
}

async function selectDropdown(labelText, optionText) {
  // Validate optionText before proceeding
  if (!optionText || optionText.trim() === '') {
    log(`  ⚠️ Skipping dropdown "${labelText}" - no option text provided`);
    return false;
  }

  log(`  📋 Selecting: ${labelText} → ${optionText}`);

  // Find label - try exact match first, then partial
  const labels = Array.from(document.querySelectorAll('mat-label'));
  let label = labels.find(l => l.textContent.trim() === labelText);
  if (!label) {
    label = labels.find(l => l.textContent.includes(labelText));
  }
  if (!label) {
    log(`  ⚠️ Label not found: ${labelText}`);
    return false;
  }

  const formField = label.closest('mat-form-field');
  if (!formField) {
    log(`  ⚠️ No mat-form-field found for: ${labelText}`);
    return false;
  }

  // Try multiple selector patterns for mat-select
  let matSelect = formField.querySelector('mat-select');
  if (!matSelect) {
    // Try finding select in the element
    matSelect = formField.querySelector('select');
  }
  if (!matSelect) {
    log(`  ⚠️ No mat-select found for: ${labelText}`);
    return false;
  }

  // Check if already has the correct value
  const currentValueDiv = matSelect.querySelector('.mat-select-value-text');
  const currentValue = currentValueDiv?.textContent?.trim() || '';
  if (currentValue.toLowerCase() === optionText.toLowerCase() ||
      currentValue === optionText ||
      (formField.classList.contains('ng-touched') && formField.classList.contains('ng-dirty'))) {
    log(`  ⊙ ${labelText}: already set to "${currentValue}"`);
    return true;
  }

  // Scroll into view and click
  matSelect.scrollIntoView({ behavior: 'smooth', block: 'center' });
  await sleep(100);

  // Click select to open dropdown
  matSelect.click();
  await sleep(400);

  // Wait for options to render (reduced from 800 to 400)
  await waitForAngularStability(2000);

  // Find matching option - try exact match first (case-insensitive)
  const options = Array.from(document.querySelectorAll('mat-option'));
  log(`  → Found ${options.length} options`);

  let match = options.find(o => {
    const text = o.textContent?.trim() || '';
    return text === optionText || text.toLowerCase() === optionText.toLowerCase();
  });

  // Fallback to partial match
  if (!match) {
    match = options.find(o => {
      const text = o.textContent?.trim() || '';
      const searchVal = String(optionText).toLowerCase();
      return text.toLowerCase().includes(searchVal);
    });
  }

  // Fallback: fuzzy match for time formats (e.g., "1:00PM" vs "1:00 PM")
  if (!match && optionText.includes(':')) {
    const baseTime = optionText.replace(/\s/g, '');
    match = options.find(o => {
      const text = o.textContent?.replace(/\s/g, '') || '';
      return text.toLowerCase().includes(baseTime.toLowerCase());
    });
  }

  if (match) {
    match.scrollIntoView({ behavior: 'smooth', block: 'center' });
    match.click();
    log(`  ✓ ${labelText}: ${optionText}`);
    await sleep(300);
    return true;
  } else {
    log(`  ⚠️ Option not found: ${optionText}`);
    log(`     Available: ${options.map(o => o.textContent?.trim()).filter(Boolean).slice(0, 5).join(' | ')}`);
    // Close dropdown if no match
    matSelect.click();
    await sleep(200);
    return false;
  }
}

function findInputByLabelText(labelText) {
  const labels = Array.from(document.querySelectorAll('mat-label'));
  const normalized = normalizeLabel(labelText);
  const label = labels.find(l => normalizeLabel(l.textContent) === normalized)
    || labels.find(l => normalizeLabel(l.textContent).includes(normalized));
  if (!label) return null;
  const formField = label.closest('mat-form-field');
  if (!formField) return null;
  return formField.querySelector('input.mat-input-element')
    || formField.querySelector('input.mat-input')
    || formField.querySelector('input');
}

async function fillFieldByLabel(labelText, value) {
  if (!value && value !== 0) return false;

  try {
    const input = findInputByLabelText(labelText);
    if (input) {
      return await setInputValue(input, value, labelText);
    }
    // Try dropdown as fallback
    const result = await selectDropdown(labelText, value);
    return result;
  } catch (err) {
    log(`  ⚠️ Error filling field "${labelText}": ${err.message}`);
    return false;
  }
}

function parseCustomFieldMap() {
  if (!config.customFieldMap) return {};
  try {
    const data = JSON.parse(config.customFieldMap);
    // Reject arrays explicitly (typeof array === 'object' is true)
    if (Array.isArray(data)) {
      log(`  ⚠️ Custom field map must be an object, not an array`);
      showWarning('Custom Field Map must be an object, not an array. Using default fields.');
      return {};
    }
    // Reject non-objects
    if (!data || typeof data !== 'object') {
      showWarning('Custom Field Map must be a valid object. Using default fields.');
      return {};
    }
    // Protect against prototype pollution - create safe object
    const safe = Object.create(null);
    for (const [key, value] of Object.entries(data)) {
      // Only accept string keys and primitive values
      if (typeof key === 'string' && !key.startsWith('__proto__') &&
          (typeof value === 'string' || typeof value === 'number' || value === null || value === undefined)) {
        safe[key] = value;
      }
    }
    return safe;
  } catch (err) {
    log(`  ⚠️ Invalid custom field map JSON: ${err.message}`);
    showWarning(`Invalid Custom Field Map: ${err.message}. Using default fields.`);
    return {};
  }
}

async function fillCustomFieldsForSection(sectionTitle) {
  const map = parseCustomFieldMap();
  const sectionMap = map[sectionTitle] || map[normalizeLabel(sectionTitle)] || null;
  if (!sectionMap || typeof sectionMap !== 'object') return;
  log(`📋 Filling custom fields for ${sectionTitle}...`);
  for (const [label, value] of Object.entries(sectionMap)) {
    await sleep(300);
    const ok = await fillFieldByLabel(label, value);
    if (!ok) {
      log(`  ⚠️ Could not fill custom field "${label}" with value "${value}"`);
    }
  }
}

// ============================================
// SIDEBAR SECTION HELPERS
// ============================================
function normalizeLabel(text) {
  return (globalThis.SCEAutoFillUtils?.normalizeLabel || ((val) => String(val || '').trim()))(text);
}

function getSidebarSectionItems() {
  return Array.from(document.querySelectorAll('.sections-menu-item'));
}

function getActiveSectionTitle() {
  const active = document.querySelector('.sections-menu-item.active .sections-menu-item__title');
  return active?.textContent?.trim() || '';
}

// Get all available section titles from sidebar (in order)
function getAvailableSectionTitles() {
  const items = getSidebarSectionItems();
  return items.map(item => {
    const titleEl = item.querySelector('.sections-menu-item__title');
    return titleEl?.textContent?.trim() || '';
  }).filter(Boolean);
}

// Find the index of the current active section in the sidebar
function getActiveSectionIndex() {
  const items = getSidebarSectionItems();
  return items.findIndex(item => item.classList.contains('active'));
}

// Get the next section title after the current one
function getNextSectionTitle() {
  const items = getSidebarSectionItems();
  const activeIndex = getActiveSectionIndex();

  // Find the next incomplete section after the current one
  for (let i = activeIndex + 1; i < items.length; i++) {
    const item = items[i];
    const statusIndicator = item.querySelector('.sections-menu-item__status-indicator');

    // Skip sections that are already completed (check_circle icon)
    const isCompleted = statusIndicator?.querySelector('mat-icon[fonticon="check_circle"], mat-icon:contains("check_circle")');
    const hasCheckIcon = statusIndicator?.textContent?.includes('check_circle');

    if (!isCompleted && !hasCheckIcon) {
      const titleEl = item.querySelector('.sections-menu-item__title');
      return titleEl?.textContent?.trim() || '';
    }
  }

  return null; // No more incomplete sections
}

function goToSectionTitle(title) {
  const targetTitle = normalizeLabel(title);
  const items = getSidebarSectionItems();
  const item = items.find((el) => {
    const text = el.querySelector('.sections-menu-item__title')?.textContent || '';
    return normalizeLabel(text) === targetTitle;
  });

  if (!item) {
    log(`  ⚠️ Section not found in sidebar: ${title}`);
    return false;
  }

  item.click();
  return true;
}

function keyToSectionTitle(key) {
  // Use utils function if available, otherwise fallback to empty string
  return globalThis.SCEAutoFillUtils?.keyToSectionTitle
    ? globalThis.SCEAutoFillUtils.keyToSectionTitle(key)
    : '';
}

// ============================================
// PAGE DETECTION (Sidebar-based - more reliable)
// ============================================
function detectCurrentPage() {
  // PRIORITY 1: Use sidebar active state (most reliable)
  const activeTitle = getActiveSectionTitle();
  if (activeTitle) {
    log(`  📍 Sidebar active: ${activeTitle}`);
    return globalThis.SCEAutoFillUtils?.sectionTitleToKey
      ? globalThis.SCEAutoFillUtils.sectionTitleToKey(activeTitle)
      : 'unknown';
  }

  const url = window.location.href;

  // Direct URL pattern matching (more reliable)
  const urlPatterns = {
    '/customer-search': 'customer-search',
    '/programs?siteId=': 'programs',
    'creating=true': 'programs',
    '/measure-info/': 'measure-info',
    '/summary-info/': 'summary-info',
    '/equipment-info/': 'equipment-info',
    '/assessment/': 'assessment'
  };

  for (const [pattern, page] of Object.entries(urlPatterns)) {
    if (url.includes(pattern)) return page;
  }

  // Fallback: mat-label content detection with enhanced patterns
  const labels = Array.from(document.querySelectorAll('mat-label')).map(l => l.textContent.trim());

  if (labels.some(l => l.includes('Customer Name') && !l.includes('Homeowner'))) return 'customer-information';
  if (labels.some(l => l.includes('How did you hear') || l.includes('Preferred Contact Time'))) return 'additional-customer-info';
  if (labels.some(l => l.includes('Project Contact First Name') || l.includes('Trade Ally'))) return 'trade-ally-information';
  if (labels.some(l => l.includes('Space Or Unit')) && labels.some(l => l.includes('Year Built'))) return 'project-information';
  if (labels.some(l => l.includes('Attempt 1 Date'))) return 'appointment-contact';
  if (labels.some(l => l.includes('Primary Applicant Age'))) return 'assessment-questionnaire';
  if (labels.some(l => l.includes('Site Contact First Name'))) return 'site-contact-information';
  if (labels.some(l => l.includes('Homeowner First Name'))) return 'homeowner-information';

  return 'unknown';
}

// ============================================
// CUSTOMER SEARCH (Initial Page)
// ============================================
async function fillCustomerSearch(address, zipCode) {
  log('🔍 Filling Customer Search...');
  await sleep(1000);

  // Store search address for Zillow lookup (will be updated with actual customer address later)
  window.sceCustomerAddress = `${address}, ${zipCode}`;

  // Find Street Address field (by placeholder or aria-label)
  let addressInput = document.querySelector('input[placeholder*="Street Address" i], input[aria-label*="Street Address" i]');
  if (!addressInput) {
    // Try by mat-label
    const labels = Array.from(document.querySelectorAll('mat-label'));
    const addrLabel = labels.find(l => l.textContent.includes('Street Address'));
    if (addrLabel) {
      const formField = addrLabel.closest('mat-form-field');
      addressInput = formField?.querySelector('input');
    }
  }

  if (addressInput) {
    await setInputValue(addressInput, address, 'Street Address');
  } else {
    log('  ⚠️ Address field not found');
    return false;
  }

  await sleep(300);

  // Find Zip Code field (second Site Zip Code - use exact match)
  let zipInput = document.querySelector('input[placeholder="Site Zip Code"], input[aria-label*="Zip Code" i]');
  if (!zipInput) {
    // Try by mat-label
    const labels = Array.from(document.querySelectorAll('mat-label'));
    const zipLabel = labels.find(l => l.textContent.includes('Site Zip Code'));
    if (zipLabel) {
      const formField = zipLabel.closest('mat-form-field');
      zipInput = formField?.querySelector('input');
    }
  }

  if (zipInput) {
    await setInputValue(zipInput, zipCode, 'Zip Code');
  } else {
    log('  ⚠️ Zip Code field not found');
  }

  await sleep(500);

  // Click Search button
  let searchBtn = document.querySelector('.customer-search-button, button.search-btn');
  if (!searchBtn) {
    // Try by text content
    const allBtns = Array.from(document.querySelectorAll('button'));
    searchBtn = allBtns.find(b => b.textContent.includes('Search'));
  }
  if (searchBtn) {
    searchBtn.click();
    log('  ✓ Clicked Search');
  } else {
    log('  ⚠️ Search button not found');
  }

  // Wait for results and click Select Customer
  await sleep(3000);
  let selectBtn = document.querySelector('.customer-continue-button');
  if (!selectBtn) {
    const allBtns = Array.from(document.querySelectorAll('button'));
    selectBtn = allBtns.find(b => b.textContent.includes('Select Customer'));
  }
  if (selectBtn) {
    selectBtn.click();
    log('  ✓ Clicked Select Customer');
  }

  // Wait for programs page and click first program
  await sleep(3000);
  const programBtn = document.querySelector('app-assessment-programs button, app-assessment-item button');
  if (programBtn) {
    programBtn.click();
    log('  ✓ Clicked Program button');
  }

  // After navigation to Customer Information page, extract the actual customer address
  // This will be used for property data lookup
  await sleep(2000);
  await extractCustomerAddress();

  return true;
}

// Extract actual customer address from the Customer Information page
async function extractCustomerAddress() {
  log('  🔍 Extracting customer address for property lookup...');

  // Try to find the address fields on Customer Information page
  const addressLabel = Array.from(document.querySelectorAll('mat-label')).find(l => l.textContent.includes('Street Address'));
  const zipLabel = Array.from(document.querySelectorAll('mat-label')).find(l => l.textContent.includes('Zip Code'));

  let customerAddress = '';
  let customerZip = '';

  if (addressLabel) {
    const formField = addressLabel.closest('mat-form-field');
    if (formField) {
      const input = formField.querySelector('input');
      if (input && input.value) {
        customerAddress = input.value.trim();
      }
    }
  }

  if (zipLabel) {
    const formField = zipLabel.closest('mat-form-field');
    if (formField) {
      const input = formField.querySelector('input');
      if (input && input.value) {
        customerZip = input.value.trim();
      }
    }
  }

  // Update config with actual customer address for property lookup
  if (customerAddress) {
    config.address = customerAddress;
    window.sceCustomerAddress = customerAddress;
    log(`  ✓ Customer address: ${customerAddress}`);
  }

  if (customerZip) {
    config.zipCode = customerZip;
    log(`  ✓ Customer zip: ${customerZip}`);
  }

  // Store combined address for Zillow lookup
  if (customerAddress && customerZip) {
    window.sceCustomerAddress = `${customerAddress}, ${customerZip}`;
    log(`  ✓ Stored for property lookup: ${window.sceCustomerAddress}`);
  }
}

// ============================================
// FORM FILLERS
// ============================================
async function fillCustomerInfo() {
  log('📋 Filling Customer Information...');
  await sleep(1000);

  // Wait for Angular stability before reading fields
  await waitForAngularStability(2000);

  // First, extract the actual customer address for property lookup
  await extractCustomerAddress();

  const nameInput = findInputByMatLabel('Customer Name');
  const customerName = nameInput?.value || '';

  // Store customer name globally for Phase 3 Homeowner fields
  if (customerName) {
    window.sceCustomerName = customerName;
    log(`  Customer Name: "${customerName}" (stored for Homeowner fields)`);
  } else {
    log('  ⚠️ Customer Name not found or empty');
  }

  // Extract Plus 4 from Mailing Zip field (format: XXXXX-XXXX)
  // Store globally for use in Enrollment Information
  const mailingZipInput = findInputByMatLabel('Mailing Zip') ||
                          findInputByMatLabel('Zip Code');
  if (mailingZipInput && mailingZipInput.value) {
    const zipValue = mailingZipInput.value.trim();
    if (zipValue.includes('-')) {
      const parts = zipValue.split('-');
      if (parts.length === 2 && parts[1].length === 4) {
        window.scePlus4Zip = parts[1];
        log(`  📋 Extracted Plus 4 from Mailing Zip: ${window.scePlus4Zip}`);
      }
    }
    // Also store the full mailing zip value
    window.sceMailingZip = zipValue;
    log(`  📋 Mailing Zip: ${zipValue}`);
  }

  // Copy Alternate Phone → Contact Phone (try multiple label variations)
  let altPhoneInput = findInputByMatLabel('Alternate Phone');
  if (!altPhoneInput?.value) {
    altPhoneInput = findInputByMatLabel('Phone');
  }
  if (!altPhoneInput?.value) {
    altPhoneInput = findInputByMatLabel('Mobile');
  }
  if (altPhoneInput?.value) {
    const contactPhoneInput = findInputByMatLabel('Contact Phone');
    if (contactPhoneInput) {
      await setInputValue(contactPhoneInput, altPhoneInput.value, 'Contact Phone');
      log(`  ✓ Copied Alternate Phone to Contact Phone: ${altPhoneInput.value}`);
    }
  } else {
    log('  ⚠️ Alternate Phone not found or empty');
  }

  // Use config email if provided, otherwise generate from customer name
  const emailToUse = config.email || '';
  if (emailToUse) {
    const emailInput = findInputByMatLabel('Contact Email');
    if (emailInput) {
      await setInputValue(emailInput, emailToUse, 'Contact Email');
      log(`  ✓ Filled Contact Email: ${emailToUse}`);
    }
  } else if (customerName) {
    const email = generateEmail(customerName);
    const emailInput = findInputByMatLabel('Contact Email');
    if (emailInput) {
      await setInputValue(emailInput, email, 'Contact Email');
      log(`  ✓ Generated Contact Email: ${email}`);
    }
  }

  // Fill Contact First/Last Name from config if available
  if (config.firstName) {
    const firstNameInput = findInputByMatLabel('Contact First Name');
    if (firstNameInput) await setInputValue(firstNameInput, config.firstName, 'Contact First Name');
  }
  if (config.lastName) {
    const lastNameInput = findInputByMatLabel('Contact Last Name');
    if (lastNameInput) await setInputValue(lastNameInput, config.lastName, 'Contact Last Name');
  }

  log('✅ Customer Information filled!');
}

function generateEmail(name) {
  const patterns = [
    (f, l, d) => `${f.toLowerCase()}.${l.toLowerCase()}${d}@gmail.com`,
    (f, l, d) => `${l.toLowerCase()}.${f.toLowerCase()}${d}@gmail.com`,
    (f, l, d) => `${f.toLowerCase()}${l.toLowerCase()}${d}@gmail.com`,
  ];

  const parts = name.trim().split(/\s+/);
  const first = parts[0] || 'user';
  const last = parts.slice(1).join('') || 'name';

  const digits = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  const pattern = patterns[Math.floor(Math.random() * patterns.length)];
  return pattern(first, last, digits);
}

async function fillAdditionalCustomerInfo() {
  log('📋 Filling Additional Customer Information (Phase 3)...');
  await sleep(1200);

  const selections = {
    'How did you hear about the program?': config.howDidYouHear,
    'Preferred Contact Time': config.preferredContactTime,
    'Preferred Correspondence Language': config.language,
    'Household Spoken Language': config.language,
    'Household Units': config.householdUnits,
    'Master Metered': config.masterMetered,
    'Building Type': config.buildingType,
    'Homeowner or Renter/Tenant': 'Renter/Tenant',  // Always Renter/Tenant
    'Gas Provider': config.gasProvider,
    'Water Utility': config.waterUtility
  };

  // Demographic fields (also on this page now)
  const demographicSelections = {
    'Primary Applicant Age': config.primaryApplicantAge,
    'Ethnicity': config.ethnicity,
    'Are there permanently disabled household members?': config.permanentlyDisabled,
    'Veteran': config.veteran,
    'Native American': config.nativeAmerican
  };

  // Wait for Angular stability before filling
  await waitForAngularStability(3000);

  for (const [label, value] of Object.entries(selections)) {
    await sleep(400); // Increased for better Angular stability
    const result = await selectDropdown(label, value);
    if (!result) {
      log(`  ⚠️ Skipped: ${label}`);
    }
  }

  // Fill demographic fields (now on this page too)
  for (const [label, value] of Object.entries(demographicSelections)) {
    await sleep(400);

    // Primary Applicant Age is a text input, not a dropdown
    if (label === 'Primary Applicant Age') {
      const ageLabel = Array.from(document.querySelectorAll('mat-label')).find(l =>
        l.textContent.includes('Primary Applicant Age') || l.textContent.includes('Applicant Age')
      );
      if (ageLabel) {
        const formField = ageLabel.closest('mat-form-field');
        if (formField) {
          const input = formField.querySelector('input');
          if (input) {
            await setInputValue(input, value, label);
            log(`  ✓ Filled ${label}: ${value}`);
            continue;
          }
        }
      }
    }

    // Ethnicity might need different label matching
    if (label === 'Ethnicity') {
      const ethnicityLabel = Array.from(document.querySelectorAll('mat-label')).find(l =>
        l.textContent.includes('Ethnicity') || l.textContent.includes('ethnicity')
      );
      if (ethnicityLabel) {
        // Check if it's a dropdown or text input
        const formField = ethnicityLabel.closest('mat-form-field');
        if (formField) {
          const select = formField.querySelector('mat-select');
          if (select) {
            const result = await selectDropdown('Ethnicity', value);
            if (result) {
              log(`  ✓ Filled Ethnicity: ${value}`);
              continue;
            }
          } else {
            const input = formField.querySelector('input');
            if (input) {
              await setInputValue(input, value, 'Ethnicity');
              log(`  ✓ Filled Ethnicity: ${value}`);
              continue;
            }
          }
        }
      }
    }

    // Try as dropdown for other fields
    const result = await selectDropdown(label, value);
    if (!result) {
      log(`  ⚠️ Skipped: ${label}`);
    }
  }

  // Fill Water Utility (text input, not dropdown)
  const waterUtilityLabel = Array.from(document.querySelectorAll('mat-label')).find(l => l.textContent.includes('Water Utility'));
  if (waterUtilityLabel) {
    const formField = waterUtilityLabel.closest('mat-form-field');
    if (formField) {
      const input = formField.querySelector('input');
      if (input && !input.readOnly && !input.disabled) {
        await setInputValue(input, config.waterUtility || 'N/A', 'Water Utility', false);
      }
    }
  }

  // Fill Space Or Unit
  await sleep(500);
  const spaceLabel = Array.from(document.querySelectorAll('mat-label')).find(l => l.textContent.includes('Space Or Unit'));
  if (spaceLabel) {
    const formField = spaceLabel.closest('mat-form-field');
    if (formField) {
      const input = formField.querySelector('input');
      if (input) {
        await setInputValue(input, config.spaceOrUnit, 'Space Or Unit');
      }
    }
  }

  // Fill Gas Account Number
  const gasAccountLabel = Array.from(document.querySelectorAll('mat-label')).find(l => l.textContent.includes('Gas Account'));
  if (gasAccountLabel) {
    const formField = gasAccountLabel.closest('mat-form-field');
    if (formField) {
      const input = formField.querySelector('input');
      if (input) {
        await setInputValue(input, config.gasAccountNumber, 'Gas Account Number');
      }
    }
  }

  // Fill Homeowner First Name (from customer name stored earlier)
  if (window.sceCustomerName) {
    const nameParts = window.sceCustomerName.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    if (firstName) {
      const homeownerFirstLabel = Array.from(document.querySelectorAll('mat-label')).find(l => l.textContent.includes('Homeowner First Name'));
      if (homeownerFirstLabel) {
        const formField = homeownerFirstLabel.closest('mat-form-field');
        if (formField) {
          const input = formField.querySelector('input');
          if (input) {
            await setInputValue(input, firstName, 'Homeowner First Name');
          }
        }
      }
    }

    if (lastName) {
      const homeownerLastLabel = Array.from(document.querySelectorAll('mat-label')).find(l => l.textContent.includes('Homeowner Last Name'));
      if (homeownerLastLabel) {
        const formField = homeownerLastLabel.closest('mat-form-field');
        if (formField) {
          const input = formField.querySelector('input');
          if (input) {
            await setInputValue(input, lastName, 'Homeowner Last Name');
          }
        }
      }
    }
  }

  // Fill Income Verified Date
  const incomeDateLabel = Array.from(document.querySelectorAll('mat-label')).find(l => l.textContent.includes('Income Verified'));
  if (incomeDateLabel) {
    const formField = incomeDateLabel.closest('mat-form-field');
    if (formField) {
      const input = formField.querySelector('input');
      if (input) {
        await setInputValue(input, config.incomeVerifiedDate, 'Income Verified Date');
      }
    }
  }

  log('✅ Additional Customer Information filled!');
}

async function fillProjectInformation() {
  // Use lazy-loaded section module with helpers
  const helpers = {
    log,
    sleep,
    setInputValue,
    fetchPropertyDataFromProxy
  };
  return SectionLoader.fillSection('project', config, helpers);
}

async function fillTradeAllyInformation() {
  log('📋 Filling Trade Ally Information...');
  await sleep(2000);

  // Wait for Angular stability
  await waitForAngularStability();

  // Try by label first - enhanced with multiple label variations
  const labels = Array.from(document.querySelectorAll('mat-label'));
  const fieldMap = [
    { labels: ['Project Contact First Name', 'Contact First Name', 'First Name'], value: config.firstName, name: 'Project Contact First Name' },
    { labels: ['Project Contact Last Name', 'Contact Last Name', 'Last Name'], value: config.lastName || 'Correa', name: 'Project Contact Last Name' },
    { labels: ['Project Contact Title', 'Contact Title', 'Title'], value: config.title, name: 'Project Contact Title' },
    { labels: ['Project Contact Phone', 'Contact Phone', 'Phone Number'], value: config.phone, name: 'Project Contact Phone' },
  ];

  let filledCount = 0;
  for (const fieldDef of fieldMap) {
    let foundLabel = null;

    // Try each label variation
    for (const labelVariation of fieldDef.labels) {
      foundLabel = labels.find(l => {
        const text = l.textContent.trim();
        return text === labelVariation || text.includes(labelVariation);
      });
      if (foundLabel) break;
    }

    if (foundLabel) {
      const formField = foundLabel.closest('mat-form-field');
      if (formField) {
        const input = formField.querySelector('input');
        if (input && !input.readOnly && !input.disabled) {
          const success = await setInputValue(input, fieldDef.value, fieldDef.name);
          if (success) filledCount++;
          await sleep(400);
        }
      }
    } else {
      log(`  ⚠️ Label not found for: ${fieldDef.name} (tried: ${fieldDef.labels.join(', ')})`);
    }
  }

  // Only fill email if explicitly set in config (don't change default)
  if (config.email) {
    const emailLabel = labels.find(l => l.textContent.includes('Email'));
    if (emailLabel) {
      const formField = emailLabel.closest('mat-form-field');
      if (formField) {
        const input = formField.querySelector('input');
        if (input && !input.readOnly && !input.disabled) {
          await setInputValue(input, config.email, 'Project Contact Email');
        }
      }
    }
  }

  // Save form
  await sleep(800);
  const saveBtn = document.querySelector('button mat-icon[fonticon="backup"], mat-icon[fonticon="backup"], button:has(mat-icon[fonticon="backup"])');
  if (saveBtn) {
    const btn = saveBtn.tagName === 'BUTTON' ? saveBtn : saveBtn.closest('button');
    if (btn) {
      btn.click();
      log('💾 Form saved');
    }
  }

  log('✅ Trade Ally Information filled!');
}

// ============================================
// APPOINTMENT CONTACT SECTION
// ============================================
async function fillAppointmentContact() {
  log('📋 Filling Appointment Contact...');
  await sleep(1500);

  // Attempt 1 Date
  const dateLabel = Array.from(document.querySelectorAll('mat-label')).find(l => l.textContent.includes('Attempt 1 Date'));
  if (dateLabel) {
    const formField = dateLabel.closest('mat-form-field');
    if (formField) {
      const input = formField.querySelector('input');
      if (input) {
        await setInputValue(input, config.attempt1Date, 'Attempt 1 Date');
      }
    }
  }

  // Attempt 1 Time (dropdown)
  await selectDropdown('Attempt 1 Time', config.attempt1Time);

  // Attempt 2 Date (if exists)
  const date2Label = Array.from(document.querySelectorAll('mat-label')).find(l => l.textContent.includes('Attempt 2 Date'));
  if (date2Label) {
    const formField = date2Label.closest('mat-form-field');
    if (formField) {
      const input = formField.querySelector('input');
      if (input) {
        await setInputValue(input, config.attempt2Date, 'Attempt 2 Date');
      }
    }
  }

  // Attempt 2 Time (dropdown)
  const time2Label = Array.from(document.querySelectorAll('mat-label')).find(l => l.textContent.includes('Attempt 2 Time'));
  if (time2Label) {
    await selectDropdown('Attempt 2 Time', config.attempt2Time);
  }

  log('✅ Appointment Contact filled!');
}

// ============================================
// ASSESSMENT QUESTIONNAIRE (Phase 3)
// ============================================
async function fillAssessmentQuestionnaire() {
  log('📋 Filling Assessment Questionnaire / Equipment Information...');
  await sleep(2000);
  await waitForAngularStability(3000);

  // Log all available labels on this page for debugging
  const allLabels = Array.from(document.querySelectorAll('mat-label')).map(l => l.textContent.trim());
  log(`  🔍 Found ${allLabels.length} labels on page`);

  // Equipment fields from config
  const equipmentFields = {
    'Is the existing central heating system': config.hvacSystemType,
    'Does the home have a Room air conditioner': config.hasRoomAC,
    'Does the home have an evaporative cooler': config.hasEvapCooler,
    'How many refrigerators': config.refrigeratorCount,
    'Existing Refrigerator Equipment 1 Manufacturer Year': config.fridge1Year,
    'Does the home have a stand-alone freezer': config.hasFreezer,
    'What is the fuel type of the water heater': config.waterHeaterFuel,
    'Water Heater Size': config.waterHeaterSize,
    'Does the home have a dishwasher': config.hasDishwasher,
    'Does the home have a clothes washer': config.hasClothesWasher,
    'Does the home have a clothes dryer': config.hasClothesDryer
  };

  // Fill each equipment field if the label exists
  for (const [label, value] of Object.entries(equipmentFields)) {
    if (value) {
      await sleep(400); // Increased for better Angular stability
      const result = await selectDropdown(label, value);
      if (!result) {
        // Try as text input if dropdown fails
        const labelEl = Array.from(document.querySelectorAll('mat-label')).find(l => l.textContent.includes(label));
        if (labelEl) {
          const formField = labelEl.closest('mat-form-field');
          if (formField) {
            const input = formField.querySelector('input');
            if (input) {
              await setInputValue(input, value, label);
            }
          }
        }
      }
    }
  }

  // Fill Dryer Type separately (if clothes dryer was set)
  if (config.hasClothesDryer && config.hasClothesDryer !== 'None') {
    await sleep(400);
    await selectDropdown('Dryer Type', config.clothesDryerType);
  }

  // Fill Equipment to be Installed (if configured)
  if (config.equipmentToInstall && config.equipmentToInstall !== 'None') {
    await sleep(400);
    await selectDropdown('Equipment to be Installed', config.equipmentToInstall);
  }

  // Fill Equipment Brand and Model if provided
  if (config.equipmentBrand) {
    await sleep(400);
    const brandLabel = Array.from(document.querySelectorAll('mat-label')).find(l => l.textContent.includes('Brand') || l.textContent.includes('Manufacturer'));
    if (brandLabel) {
      const formField = brandLabel.closest('mat-form-field');
      if (formField) {
        const input = formField.querySelector('input');
        if (input) {
          await setInputValue(input, config.equipmentBrand, 'Equipment Brand');
        }
      }
    }
  }

  if (config.equipmentModel) {
    await sleep(400);
    const modelLabel = Array.from(document.querySelectorAll('mat-label')).find(l => l.textContent.includes('Model'));
    if (modelLabel) {
      const formField = modelLabel.closest('mat-form-field');
      if (formField) {
        const input = formField.querySelector('input');
        if (input) {
          await setInputValue(input, config.equipmentModel, 'Equipment Model');
        }
      }
    }
  }

  log('✅ Assessment Questionnaire / Equipment filled!');
}

// ============================================
// HOUSEHOLD MEMBERS (Measure Info page)
// ============================================
async function fillHouseholdMembers() {
  log('📋 Filling Household Members (Measure Info)...');
  await sleep(2000);

  // Wait for Angular stability
  await waitForAngularStability(3000);

  // Get primary applicant info from customer name stored earlier or config
  const customerName = window.sceCustomerName || '';
  const primaryAge = config.primaryApplicantAge || '44';

  // Split name into first and last
  let firstName = '';
  let lastName = '';
  if (customerName) {
    const nameParts = customerName.trim().split(/\s+/);
    firstName = nameParts[0] || '';
    lastName = nameParts.slice(1).join(' ') || '';
  }

  // If no customer name, use config values
  if (!firstName) firstName = config.firstName || 'John';
  if (!lastName) lastName = config.lastName || 'Correa';

  // Step 1: Find and click the measure button (div.measure__btns mat-icon)
  // Based on recording: xpath//html/body/app-root/app-layouts/div/div/section/div/app-estimated/div[1]/div[1]/app-estimated-measure/div/div/div[3]/div/button[2]/span/mat-icon
  const measureBtn = (() => {
    // Try multiple approaches to find the measure add button
    // Approach 1: Look in app-estimated-measure div, div[3]/div/button[2]
    const measureContainer = document.querySelector('app-estimated-measure');
    if (measureContainer) {
      // Look for div with class containing "measure" and "btn"
      const measureDivs = measureContainer.querySelectorAll('div[class*="measure"], div[class*="btn"]');
      for (const div of measureDivs) {
        const buttons = div.querySelectorAll('button');
        if (buttons.length >= 2) {
          // Second button is the add button
          const icon = buttons[1].querySelector('mat-icon');
          if (icon && icon.textContent.trim().toLowerCase() === 'add') {
            log('  📍 Found measure add button via container');
            return buttons[1];
          }
        }
      }
    }

    // Approach 2: Look for any button with "add" icon in the page
    const allButtons = Array.from(document.querySelectorAll('button'));
    for (const btn of allButtons) {
      const icon = btn.querySelector('mat-icon');
      if (icon && icon.textContent.trim().toLowerCase() === 'add') {
        // Make sure it's not in the dialog overlay
        const overlay = btn.closest('div.cdk-overlay-container');
        if (!overlay) {
          log('  📍 Found measure add button via icon search');
          return btn;
        }
      }
    }

    return null;
  })();

  if (measureBtn) {
    measureBtn.click();
    log('  ✓ Clicked Measure Add button');
    await sleep(1500);
  } else {
    log('  ⚠️ Measure Add button not found - trying to find dialog directly');
    // Try to proceed anyway - dialog might already be open
  }

  // Step 2: Click on a checkbox to select the measure (in dialog)
  await sleep(500);
  // Look for checkbox in the dialog overlay
  const dialog = document.querySelector('div.cdk-overlay-container app-estimated-measure-products, app-estimated-measure-products');
  if (dialog) {
    log('  📍 Found products dialog');
    // Find the first checkbox
    const checkbox = dialog.querySelector('mat-checkbox');
    if (checkbox) {
      // Click on the label > div (as per recording)
      const labelDiv = checkbox.querySelector('label > div');
      if (labelDiv) {
        labelDiv.click();
        log('  ✓ Clicked measure checkbox');
      } else {
        // Fallback: click the checkbox label
        const label = checkbox.querySelector('label');
        if (label) label.click();
        log('  ✓ Clicked measure checkbox (fallback)');
      }
      await sleep(500);
    }
  }

  // Step 3: Click "Add & Continue" button (in dialog)
  await sleep(500);
  const addContinueBtn = (() => {
    // Look in the dialog first
    if (dialog) {
      const btn = dialog.querySelector('button');
      if (btn && (btn.textContent.includes('Add & Continue') || btn.textContent.includes('Add and Continue'))) {
        return btn;
      }
    }
    // Fallback: search globally
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.find(b => b.textContent.includes('Add & Continue') || b.textContent.includes('Add and Continue'));
  })();

  if (addContinueBtn) {
    addContinueBtn.click();
    log('  ✓ Clicked Add & Continue');
    await sleep(1500);
  } else {
    log('  ⚠️ Add & Continue button not found');
  }

  // Step 4: Fill Name of Household Member (use full name)
  await sleep(500);
  const fullName = `${firstName} ${lastName}`.trim();
  const nameLabel = Array.from(document.querySelectorAll('mat-label')).find(l =>
    l.textContent.includes('Name of Household Member') ||
    l.textContent.includes('Household Member Name')
  );
  if (nameLabel) {
    const formField = nameLabel.closest('mat-form-field');
    if (formField) {
      const input = formField.querySelector('input');
      if (input) {
        await setInputValue(input, fullName, 'Name of Household Member');
        log(`  ✓ Filled Name: ${fullName}`);
      }
    }
  }

  // Step 5: Select "Applicant" for Relation to Applicant
  await sleep(500);
  const relationResult = await selectDropdown('Relation to Applicant', 'Applicant');
  if (relationResult) {
    log('  ✓ Selected Relation: Applicant');
  }

  // Step 6: Fill Household Member Age (same as primary applicant)
  await sleep(500);
  const ageLabel = Array.from(document.querySelectorAll('mat-label')).find(l =>
    l.textContent.includes('Household Member Age') ||
    l.textContent.includes('Member Age')
  );
  if (ageLabel) {
    const formField = ageLabel.closest('mat-form-field');
    if (formField) {
      const input = formField.querySelector('input');
      if (input) {
        await setInputValue(input, primaryAge, 'Household Member Age');
        log(`  ✓ Filled Age: ${primaryAge}`);
      }
    }
  }

  log('✅ Household Members filled!');
}

// ============================================
// APPOINTMENTS SECTION - CREATE NEW APPOINTMENT
// ============================================
async function createAppointment() {
  log('📋 Creating new Appointment...');
  await sleep(1500);

  // Click the "+" button to add new appointment
  const addBtn = (() => {
    const iconMatches = Array.from(document.querySelectorAll('button mat-icon, mat-icon, i.material-icons'));
    const icon = iconMatches.find((el) => (el.textContent || '').trim().toLowerCase() === 'add');
    if (icon) return icon.closest('button') || icon;
    const textButton = Array.from(document.querySelectorAll('button')).find((btn) => {
      const text = btn.textContent.trim().toLowerCase();
      return text === 'add' || text.includes('add appointment') || text === '+';
    });
    return textButton || null;
  })();

  if (addBtn) {
    addBtn.click();
    log('  ✓ Clicked add appointment button');
    await sleep(1000);
  } else {
    log('  ⚠️ Add button not found');
    return false;
  }

  // Select contractor from dropdown (search by typing)
  await sleep(500);
  const contractorLabel = Array.from(document.querySelectorAll('mat-label')).find(l => l.textContent.includes('Contractor'));
  if (contractorLabel) {
    const formField = contractorLabel.closest('mat-form-field');
    if (formField) {
      const matSelect = formField.querySelector('mat-select');
      if (matSelect) {
        matSelect.click();
        await sleep(500);

        // Type in search box
        const searchInput = document.querySelector('input[aria-label="dropdown search"], input[placeholder*="search" i]');
        if (searchInput) {
          searchInput.value = config.contractorName.substring(0, 5);  // Type first 5 chars to search
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
          searchInput.dispatchEvent(new Event('change', { bubbles: true }));
          await sleep(800);

          // Select the first matching option
          const options = Array.from(document.querySelectorAll('mat-option'));
          const match = options.find(o => o.textContent && o.textContent.toLowerCase().includes(config.contractorName.toLowerCase()));
          if (match) {
            match.click();
            log(`  ✓ Selected contractor: ${config.contractorName}`);
          } else if (options.length > 0) {
            options[0].click();
            log(`  ✓ Selected first contractor option`);
          }
        }
        await sleep(400);
      }
    }
  }

  // Set Appointment Date (using date picker)
  const dateLabel = Array.from(document.querySelectorAll('mat-label')).find(l => l.textContent.includes('Appointment Date'));
  if (dateLabel) {
    const formField = dateLabel.closest('mat-form-field');
    if (formField) {
      const dateToggle = formField.querySelector('mat-datepicker-toggle button, button[aria-label*="Open calendar" i], button[aria-label*="calendar" i]');
      if (dateToggle) {
        dateToggle.click();
        await sleep(500);

        // Click today or first available day in calendar
        const todayBtn = document.querySelector('mat-calendar-body td:not(.mat-calendar-body-disabled) div');
        if (todayBtn) {
          todayBtn.click();
          log(`  ✓ Selected appointment date`);
        }
        await sleep(400);
      } else {
        // No date picker, try direct input
        const input = formField.querySelector('input');
        if (input) {
          await setInputValue(input, config.attempt1Date, 'Appointment Date');
        }
      }
    }
  }

  // Set Appointment Status to "Scheduled"
  await selectDropdown('Appointment Status', config.appointmentStatus);

  // Set Appointment Type (may already be set, but try to set it)
  await selectDropdown('Appointment Type', config.appointmentType);

  // Set Start Time
  await selectDropdown('Start Time', config.attempt1Time);

  // Set End Time (use config if provided, else +1 hour)
  const endTime = config.appointmentEndTime
    || (globalThis.SCEAutoFillUtils?.addHoursToTime
      ? globalThis.SCEAutoFillUtils.addHoursToTime(config.attempt1Time, 1)
      : config.attempt2Time);
  if (endTime) {
    await selectDropdown('End Time', endTime);
  }

  log('✅ Appointment created!');
  return true;
}

// ============================================
// ENROLLMENT INFORMATION
// ============================================
async function fillEnrollmentInformation() {
  log('📋 Filling Enrollment Information...');
  await sleep(1500);

  // Wait for Angular stability
  await waitForAngularStability(3000);

  // Fill Income Verified Date
  const incomeDateLabel = Array.from(document.querySelectorAll('mat-label')).find(l => l.textContent.includes('Income Verified'));
  if (incomeDateLabel) {
    const formField = incomeDateLabel.closest('mat-form-field');
    if (formField) {
      const input = formField.querySelector('input');
      if (input && config.incomeVerifiedDate) {
        await setInputValue(input, config.incomeVerifiedDate, 'Income Verified Date');
      }
    }
  }

  // Select "PRISM code" for Income Verification Type (always)
  await sleep(500);
  const result = await selectDropdown('Income Verification Type', 'PRISM code');
  if (result) {
    log('  ✓ Selected PRISM code for Income Verification Type');
  }
  await sleep(800);

  // Get Plus 4 from:
  // 1. Global variable (extracted from Mailing Zip on Customer Info page)
  // 2. Config override
  let plus4Zip = config.plus4Zip || window.scePlus4Zip || '';

  // If still no plus4Zip, try to find Mailing Zip field on current page
  if (!plus4Zip) {
    // Look for any readonly/disabled zip field with ZIP+4 format
    const allInputs = Array.from(document.querySelectorAll('input, textarea'));
    for (const input of allInputs) {
      const value = (input.value || '').trim();
      if (value.match(/^\d{5}-\d{4}$/)) {
        const parts = value.split('-');
        if (parts.length === 2 && parts[1].length === 4) {
          plus4Zip = parts[1];
          log(`  📋 Found Plus 4 from readonly field: ${plus4Zip}`);
          break;
        }
      }
    }
  }

  // Final fallback: use last 4 of regular zip (NOT ideal, but ensures something is filled)
  if (!plus4Zip && config.zipCode) {
    // Only use as fallback if zipCode is 5 digits
    if (config.zipCode.length === 5) {
      plus4Zip = config.zipCode.slice(-4);
      log(`  📋 Using last 4 of zip as fallback: ${plus4Zip}`);
    }
  }

  if (plus4Zip) {
    log(`  📋 Filling Plus 4 zip: ${plus4Zip}`);
    // Find and fill "Enter Plus 4" field
    const plus4Label = Array.from(document.querySelectorAll('mat-label')).find(l =>
      l.textContent.includes('Plus 4') ||
      l.textContent.includes('Enter Plus') ||
      l.textContent.includes('Plus-4') ||
      l.textContent.includes('Plus 4')
    );
    if (plus4Label) {
      const formField = plus4Label.closest('mat-form-field');
      if (formField) {
        const input = formField.querySelector('input');
        if (input) {
          await setInputValue(input, plus4Zip, 'Enter Plus 4');
          log(`  ✓ Filled Plus 4: ${plus4Zip}`);
          await sleep(500);
        }
      }
    } else {
      log('  ⚠️ Plus 4 field label not found');
    }

    // Click the sync save button (mat-icon="backup")
    await sleep(300);
    const syncSaveBtn = document.querySelector('button mat-icon[fonticon="backup"], mat-icon[fonticon="backup"], button:has(mat-icon[fonticon="backup"])');
    if (syncSaveBtn) {
      const btn = syncSaveBtn.tagName === 'BUTTON' ? syncSaveBtn : syncSaveBtn.closest('button');
      if (btn) {
        btn.click();
        log('  ✓ Clicked sync save button');
        await sleep(800);
      }
    }
  } else {
    log('  ⚠️ No Plus 4 zip available to fill');
  }

  log('✅ Enrollment Information filled!');
}

// ============================================
// SUMMARY INFO (Project Information/Summary)
// ============================================
async function fillSummaryInfo() {
  log('📋 Filling Summary Info (Project Information)...');
  await sleep(1500);

  // Wait for Angular stability
  await waitForAngularStability(2000);

  // Fill the appointment date (from config.attempt1Date)
  if (config.attempt1Date) {
    // Look for date field with calendar icon
    const dateLabels = Array.from(document.querySelectorAll('mat-label'));
    const dateLabel = dateLabels.find(l => l.textContent.includes('Date') && !l.textContent.includes('Income'));

    if (dateLabel) {
      const formField = dateLabel.closest('mat-form-field');
      if (formField) {
        // Try clicking the date picker toggle
        const dateToggle = formField.querySelector('mat-datepicker-toggle button, button[aria-label*="Open calendar" i], button[aria-label*="calendar" i]');
        if (dateToggle) {
          dateToggle.click();
          log('  ✓ Opened date picker');
          await sleep(500);

          // Try to find and click the specific date from config
          // Parse the attempt1Date (format: MM/DD/YYYY or similar)
          const dateParts = config.attempt1Date.split('/');
          const targetDay = parseInt(dateParts[1] || '01', 10);

          // Look for calendar with days
          const calendarDays = Array.from(document.querySelectorAll('mat-calendar-body td:not(.mat-calendar-body-disabled) div'));
          if (calendarDays.length > 0) {
            // Try to find the day matching our date
            const targetDayEl = calendarDays.find(el => {
              const dayText = el.textContent.trim();
              return parseInt(dayText, 10) === targetDay;
            });

            if (targetDayEl) {
              targetDayEl.click();
              log(`  ✓ Selected date: ${config.attempt1Date}`);
            } else {
              // Click the first available day as fallback
              calendarDays[0].click();
              log(`  ✓ Selected first available day`);
            }
          } else {
            // Fallback: type the date directly
            const input = formField.querySelector('input');
            if (input) {
              await setInputValue(input, config.attempt1Date, 'Date');
            }
          }
          await sleep(400);
        } else {
          // No date picker, try direct input
          const input = formField.querySelector('input');
          if (input) {
            await setInputValue(input, config.attempt1Date, 'Date');
          }
        }
      }
    }
  }

  // Fill Electronic Acceptance Terms (from config)
  await sleep(300);
  if (config.electronicAcceptance) {
    await selectDropdown('Electronic Acceptance Terms', config.electronicAcceptance);
  }

  // Fill "Did you receive incentive..." (from config)
  await sleep(300);
  if (config.priorIncentive) {
    await selectDropdown('Did you receive', config.priorIncentive);
  }

  log('✅ Summary Info filled!');
}

// ============================================
// APPLICATION STATUS - ACCEPT LEAD
// ============================================
async function acceptLead() {
  log('📋 Application Status...');

  // Check if auto-accept is enabled
  if (config.autoAcceptLead !== 'true' && config.autoAcceptLead !== true) {
    log('  ⊙ Auto-accept disabled, skipping status change');
    return;
  }

  await sleep(1500);

  // Use the finalStatus from config
  const targetStatus = config.finalStatus || 'Accepted';
  log(`  → Setting status to: ${targetStatus}`);

  // Find and click the status dropdown
  const statusDropdown = document.querySelector('mat-select[role="listbox"]');
  if (statusDropdown) {
    statusDropdown.click();
    await sleep(500);

    // Find and click the target status option
    const options = Array.from(document.querySelectorAll('mat-option'));
    const targetOption = options.find(o => o.textContent && o.textContent.includes(targetStatus));

    if (targetOption) {
      targetOption.click();
      log(`  ✓ Changed status to: ${targetStatus}`);
    } else {
      log(`  ⚠️ "${targetStatus}" option not found, trying "Accepted"`);
      const acceptedOption = options.find(o => o.textContent && o.textContent.includes('Accepted'));
      if (acceptedOption) {
        acceptedOption.click();
        log('  ✓ Changed status to: Accepted');
      } else {
        log('  ⚠️ Accepted option not found');
      }
    }
  } else {
    log('  ⚠️ Status dropdown not found');
  }

  log('✅ Application Status updated!');
}

async function clickNext(expectedPageKey) {
  log(`➡️ Next → ${expectedPageKey}`);

  // Certain pages are NOT in the sidebar and must be reached via Next button
  const nonSidebarPages = ['measure-info', 'summary-info', 'application-status'];

  const sectionTitle = keyToSectionTitle(expectedPageKey) || expectedPageKey;
  const availableSections = getAvailableSectionTitles();
  log(`  📋 Available sections: ${availableSections.join(', ')}`);

  // PRIORITY 1: For non-sidebar pages, use Next button immediately
  if (nonSidebarPages.includes(expectedPageKey)) {
    const nextBtn = findNextButton();
    if (nextBtn) {
      nextBtn.click();
      log(`  ✓ Clicked Next button for non-sidebar page`);
      return waitForPage(expectedPageKey, 8000);
    } else {
      log(`  ⚠️ Next button not found for ${expectedPageKey}`);
    }
  }

  // PRIORITY 2: Try to find and click the section in sidebar
  if (sectionTitle && goToSectionTitle(sectionTitle)) {
    log(`  ✓ Clicked sidebar: ${sectionTitle}`);
    return waitForPage(expectedPageKey, 8000);
  }

  // FALLBACK: If expected section not found, try clicking the next incomplete section in sidebar
  const nextSectionTitle = getNextSectionTitle();
  if (nextSectionTitle) {
    log(`  📋 Expected section "${sectionTitle}" not found, trying next available: "${nextSectionTitle}"`);
    if (goToSectionTitle(nextSectionTitle)) {
      log(`  ✓ Clicked sidebar: ${nextSectionTitle}`);
      // Map the section title back to a key for waiting
      const nextKey = globalThis.SCEAutoFillUtils?.sectionTitleToKey
        ? globalThis.SCEAutoFillUtils.sectionTitleToKey(nextSectionTitle)
        : expectedPageKey;
      return waitForPage(nextKey, 8000);
    }
  }

  // PRIORITY 3: Try clicking the "Next" button (form submit)
  const nextBtn = findNextButton();
  if (nextBtn) {
    nextBtn.click();
    log(`  ✓ Clicked Next button`);
    return waitForPage(expectedPageKey, 8000);
  }

  log(`  ❌ Navigation failed: could not find "${sectionTitle}" in sidebar or Next button`);
  return false;
}

function findNextButton() {
  // Pattern 1: Submit button with > text
  let btn = document.querySelector('button[type="submit"]');
  if (btn) return btn;

  // Pattern 2: Button with > in text content
  btn = Array.from(document.querySelectorAll('button, mat-button')).find(b => {
    const text = b.textContent.trim();
    return text === '>' || text.includes('>') || text.toLowerCase().includes('next');
  });
  if (btn) return btn;

  // Pattern 3: Button with mat-icon containing arrow
  const icon = Array.from(document.querySelectorAll('button mat-icon, button i.material-icons, button i.fa')).find(icon => {
    const iconText = icon.textContent.trim();
    return iconText === 'arrow_forward' || iconText === 'chevron_right' || iconText === '>';
  });
  if (icon) return icon.closest('button');

  return null;
}

async function waitForPage(expectedPage, timeoutMs = 15000) {
  const startTime = Date.now();
  const checkInterval = 100;
  let lastPage = detectCurrentPage();
  let pageStableCount = 0;

  log(`  ⏳ Waiting for page: ${expectedPage} (timeout: ${timeoutMs}ms)`);

  while (Date.now() - startTime < timeoutMs) {
    const currentPage = detectCurrentPage();

    // Count consecutive detections of the expected page
    if (currentPage === expectedPage) {
      pageStableCount++;
      // Need 3 consecutive detections to be sure
      if (pageStableCount >= 3) {
        await waitForAngularStability(5000);
        log(`  ✓ Arrived at ${expectedPage}`);
        await sleep(500);
        return true;
      }
    } else {
      pageStableCount = 0;
      lastPage = currentPage;
    }

    await sleep(checkInterval);
  }

  log(`  ⚠️ Timeout waiting for ${expectedPage}. Current: ${lastPage}`);
  return false;
}

// ============================================
// MAIN AUTOMATION
// ============================================

// Fill only the current section (for testing individual sections)
async function runFillCurrentSectionOnly(banner) {
  log('🚀 Filling current section only...');

  // Detect current section
  const currentPage = detectCurrentPage();
  const activeTitle = getActiveSectionTitle();

  log(`   📋 Current section: ${activeTitle} (${currentPage})`);

  // Get workflow array (reference existing workflow in runFillForm)
  const workflow = [
    { key: 'customer-search', name: 'Customer Search', action: fillCustomerSearch },
    { key: 'customer-information', name: 'Customer Information', action: fillCustomerInfo },
    { key: 'additional-customer-info', name: 'Additional Customer Information', action: fillAdditionalCustomerInfo },
    { key: 'enrollment-information', name: 'Enrollment Information', action: fillEnrollmentInformation },
    { key: 'project-information', name: 'Project Information', action: fillProjectInformation },
    { key: 'trade-ally-information', name: 'Trade Ally Information', action: fillTradeAllyInformation },
    { key: 'appointment-contact', name: 'Appointment Contact', action: fillAppointmentContact },
    { key: 'appointments', name: 'Appointments', action: fillCustomFieldsOnly },
    { key: 'assessment-questionnaire', name: 'Assessment Questionnaire', action: fillAssessmentQuestionnaire },
    { key: 'equipment-information', name: 'Equipment Information', action: fillCustomFieldsOnly },
    { key: 'basic-enrollment-equipment', name: 'Basic Enrollment Equipment', action: fillCustomFieldsOnly },
    { key: 'bonus-adjustment-measures', name: 'Bonus/Adjustment Measures', action: fillCustomFieldsOnly },
    { key: 'review-terms', name: 'Review Terms and Conditions', action: fillCustomFieldsOnly },
    { key: 'file-uploads', name: 'File Uploads', action: fillCustomFieldsOnly },
    { key: 'review-comments', name: 'Review Comments', action: fillCustomFieldsOnly },
    { key: 'measure-info', name: 'Measure Info', action: fillMeasureInfoPhase },
    { key: 'summary-info', name: 'Summary Info', action: fillSummaryInfo },
    { key: 'application-status', name: 'Application Status', action: acceptLead }
  ];

  // Find matching workflow entry
  const step = workflow.find(s => s.key === currentPage);

  if (!step) {
    log('  ⚠️ Section not supported for single-fill');
    updateBannerButtonError(banner, 'Section not supported');
    return;
  }

  // Wait for Angular stability
  await waitForAngularStability(3000);

  // Check if stopped before executing
  checkStopped();

  // Execute the fill action for this section only
  try {
    if (step.action === fillCustomFieldsOnly) {
      const sectionTitle = step.name || activeTitle;
      await fillCustomFieldsForSection(sectionTitle);
    } else if (step.action === fillMeasureInfoPhase) {
      await fillHouseholdMembers();
      await createAppointment();
    } else if (step.action === fillCustomerSearch) {
      await fillCustomerSearch(config.address, config.zipCode);
    } else {
      await step.action();
    }

    // Check again after main action
    checkStopped();

    // Also fill custom fields for this section
    const sectionTitle = step.name || activeTitle;
    if (step.action !== fillCustomFieldsOnly && step.action !== fillCustomerSearch) {
      await fillCustomFieldsForSection(sectionTitle);
    }

    // Show success
    log(`✅ ${activeTitle} filled!`);
    updateBannerButtonSuccess(banner);
  } catch (err) {
    // Re-throw if it's a stop error so it propagates to the top level
    if (err.message === 'Process was stopped by user') {
      throw err;
    }
    log(`  ⚠️ Error: ${err.message}`);
    updateBannerButtonError(banner, err.message);
  } finally {
    // Remove filling state from banner
    banner?.classList.remove('sce-filling');
  }
}

async function runFillForm() {
  log('🚀 Starting SCE Form Auto-Fill...');
  log('   📋 This will fill ALL sections in the sidebar...');

  // Ensure config is loaded before proceeding
  await loadConfig();

  // Complete workflow: go through ALL sections in order
  // Section order in sidebar (may vary by program):
  const workflow = [
    { key: 'customer-search', name: 'Customer Search', action: fillCustomerSearch },
    { key: 'customer-information', name: 'Customer Information', action: fillCustomerInfo },
    { key: 'additional-customer-info', name: 'Additional Customer Information', action: fillAdditionalCustomerInfo },
    { key: 'enrollment-information', name: 'Enrollment Information', action: fillEnrollmentInformation },
    { key: 'project-information', name: 'Project Information', action: fillProjectInformation },
    { key: 'trade-ally-information', name: 'Trade Ally Information', action: fillTradeAllyInformation },
    { key: 'appointment-contact', name: 'Appointment Contact', action: fillAppointmentContact },
    { key: 'appointments', name: 'Appointments', action: fillCustomFieldsOnly },
    { key: 'assessment-questionnaire', name: 'Assessment Questionnaire', action: fillAssessmentQuestionnaire },
    { key: 'equipment-information', name: 'Equipment Information', action: fillCustomFieldsOnly },
    { key: 'basic-enrollment-equipment', name: 'Basic Enrollment Equipment', action: fillCustomFieldsOnly },
    { key: 'bonus-adjustment-measures', name: 'Bonus/Adjustment Measures', action: fillCustomFieldsOnly },
    { key: 'review-terms', name: 'Review Terms and Conditions', action: fillCustomFieldsOnly },
    { key: 'file-uploads', name: 'File Uploads', action: fillCustomFieldsOnly },
    { key: 'review-comments', name: 'Review Comments', action: fillCustomFieldsOnly },
    { key: 'measure-info', name: 'Measure Info', action: fillMeasureInfoPhase },
    { key: 'summary-info', name: 'Summary Info', action: fillSummaryInfo },
    { key: 'application-status', name: 'Application Status', action: acceptLead }
  ];

  // Find where to start in the workflow based on current page
  const currentPage = detectCurrentPage();
  const activeSection = getActiveSectionTitle();
  log(`   Current page: ${currentPage}`);
  log(`   📍 Sidebar active: ${activeSection}`);

  // ALWAYS START FROM BEGINNING to ensure all sections are filled
  // This prevents skipping sections when user is mid-form
  let startIndex = 0;

  log(`   ▶️ Starting from: ${workflow[startIndex].name} (beginning)`);

  // Execute workflow from start index
  for (let i = startIndex; i < workflow.length; i++) {
    // Check if user stopped the process
    checkStopped();

    const step = workflow[i];
    log(`\n📌 [${i + 1}/${workflow.length}] ${step.name}`);

    // Navigate to this section if not already there
    const activePage = detectCurrentPage();
    if (activePage !== step.key) {
      const sectionTitle = keyToSectionTitle(step.key);
      if (sectionTitle && goToSectionTitle(sectionTitle)) {
        log(`  ✓ Navigated to: ${sectionTitle}`);
        await sleep(1000);
        // Check again after navigation
        checkStopped();
      } else if (step.key === 'customer-search') {
        log(`  ✓ Starting fresh from Customer Search`);
      } else if (step.key === 'measure-info' || step.key === 'summary-info' || step.key === 'application-status') {
        // These are non-sidebar pages, use Next button to reach them
        const nextBtn = findNextButton();
        if (nextBtn) {
          nextBtn.click();
          log(`  ✓ Clicked Next button to reach ${step.name}`);
          await waitForPage(step.key, 8000);
          // Check again after navigation
          checkStopped();
        }
      }
    }

    // Wait for page stability
    await waitForAngularStability(4000);

    // Check again before executing action
    checkStopped();

    // Execute the action for this step
    try {
      if (step.action === fillCustomFieldsOnly) {
        const sectionTitle = keyToSectionTitle(step.key) || step.name;
        await fillCustomFieldsForSection(sectionTitle);
      } else if (step.action === fillMeasureInfoPhase) {
        // Measure Info: fill household members and create appointment
        await fillHouseholdMembers();
        await createAppointment();
      } else {
        await step.action();
      }
    } catch (err) {
      // Re-throw if it's a stop error so it propagates to the top level
      if (err.message === 'Process was stopped by user') {
        throw err;
      }
      log(`  ⚠️ Error in ${step.name}: ${err.message}`);
      showError(`Error in ${step.name}`, err.message);
    }

    // Check if stopped during action execution
    checkStopped();

    // Fill custom fields for this section
    const sectionTitle = keyToSectionTitle(step.key) || step.name;
    if (step.action !== fillCustomFieldsOnly) {
      await fillCustomFieldsForSection(sectionTitle);
    }

    // Don't navigate after the last step
    if (i < workflow.length - 1) {
      const nextStep = workflow[i + 1];
      log(`   ➡️ Moving to: ${nextStep.name}`);

      // Try to navigate to next section
      const nextSectionTitle = keyToSectionTitle(nextStep.key);
      if (nextSectionTitle && goToSectionTitle(nextSectionTitle)) {
        log(`  ✓ Clicked sidebar: ${nextSectionTitle}`);
        await sleep(1000);
      } else {
        // Use Next button for non-sidebar pages
        const nextBtn = findNextButton();
        if (nextBtn) {
          nextBtn.click();
          log(`  ✓ Clicked Next button`);
          await sleep(1500);
        } else {
          log(`  ⚠️ No navigation method found for ${nextStep.name}`);
        }
      }
    }
  }

  log('\n✅ Auto-Fill complete! All sections processed.');
}

// Helper for sections that only need custom field filling
async function fillCustomFieldsOnly() {
  // This is handled in the main workflow
}

// Helper for Measure Info phase (Household Members + Appointment)
async function fillMeasureInfoPhase() {
  log('📋 Filling Measure Info (Household Members + Appointment)...');
  await sleep(1500);
  await waitForAngularStability(2000);

  await fillHouseholdMembers();
  await createAppointment();

  log('✅ Measure Info filled!');
}

// ============================================
// BANNER
// ============================================
function showBanner() {
  // Remove existing banner
  const existing = document.getElementById('sce-autofill-banner');
  if (existing) existing.remove();

  const activeTitle = getActiveSectionTitle();
  const sectionBtnText = activeTitle ? `Fill: ${activeTitle}` : 'Fill: Current Page';

  const banner = document.createElement('div');
  banner.id = 'sce-autofill-banner';
  banner.innerHTML = `
    <div class="sce-banner-content">
      <span class="sce-banner-text">📋 SCE Form Detected</span>
      <button id="sce-fill-all-btn" class="sce-btn sce-btn-primary">Fill All Sections</button>
      <button id="sce-fill-section-btn" class="sce-btn sce-btn-secondary">${sectionBtnText}</button>
      <button id="sce-stop-btn" class="sce-btn sce-btn-stop" style="display: none;">⏹ Stop</button>
      <button id="sce-dismiss-btn" class="sce-btn sce-btn-tertiary">✕</button>
    </div>
  `;
  document.body.appendChild(banner);

  // Store reference to stop button
  stopButton = document.getElementById('sce-stop-btn');

  // Attach event listeners
  document.getElementById('sce-fill-all-btn').addEventListener('click', () => {
    resetStopState();
    banner.classList.add('sce-filling');
    showStopButton();
    runFillForm().then(() => {
      banner.classList.add('sce-success');
      banner.querySelector('.sce-banner-text').textContent = '✅ Form Filled!';
      hideStopButton();
      setTimeout(() => banner.remove(), 3000);
    }).catch((err) => {
      if (err.message === 'Process was stopped by user') {
        // Already handled by stopFormFilling
      } else {
        banner.querySelector('.sce-banner-text').textContent = '❌ Error';
        updateBannerButtonError(banner, err.message);
      }
      hideStopButton();
    });
  });

  document.getElementById('sce-fill-section-btn').addEventListener('click', () => {
    resetStopState();
    banner.classList.add('sce-filling');
    showStopButton();
    runFillCurrentSectionOnly(banner).then(() => {
      // Banner stays visible, button shows success briefly
      hideStopButton();
    }).catch((err) => {
      if (err.message === 'Process was stopped by user') {
        // Already handled by stopFormFilling
      } else {
        updateBannerButtonError(banner, err.message);
      }
      hideStopButton();
    });
  });

  document.getElementById('sce-dismiss-btn').addEventListener('click', () => {
    banner.remove();
  });
}

// ============================================
// SECTION BUTTON HELPERS
// ============================================

// Update the section button text based on current active section
function updateSectionButton(banner) {
  const btn = banner?.querySelector('#sce-fill-section-btn');
  if (!btn) return;

  const activeTitle = getActiveSectionTitle();
  if (activeTitle) {
    btn.textContent = `Fill: ${activeTitle}`;
    btn.disabled = false;
  } else {
    btn.textContent = 'Fill: Current Page';
  }
}

// Show temporary success message on section button
function updateBannerButtonSuccess(banner) {
  const btn = banner?.querySelector('#sce-fill-section-btn');
  if (!btn) return;

  const originalText = btn.textContent;
  btn.textContent = '✅ Filled!';
  btn.classList.add('sce-success');

  setTimeout(() => {
    btn.textContent = originalText;
    btn.classList.remove('sce-success');
    updateSectionButton(banner); // Refresh to current section
  }, 2000);
}

// Helper to show error on banner
function updateBannerButtonError(banner, _message) {
  const btn = banner?.querySelector('#sce-fill-section-btn');
  if (!btn) return;

  btn.textContent = `⚠️ Error`;
  btn.classList.add('sce-error');

  setTimeout(() => {
    btn.classList.remove('sce-error');
    updateSectionButton(banner);
  }, 3000);
}

// ============================================
// SIDEBAR SECTION OBSERVER
// ============================================

// Global observer reference so we can disconnect if needed
let sidebarObserver = null;
let sidebarObserverRetryTimer = null;
let lastActiveSection = null; // Cache to avoid unnecessary updates

// Update the banner's section button text based on current active section
function handleSidebarChange() {
  const currentSection = getActiveSectionTitle();

  // Only update if the active section actually changed
  if (currentSection === lastActiveSection) return;
  lastActiveSection = currentSection;

  const banner = document.getElementById('sce-autofill-banner');
  if (banner) {
    updateSectionButton(banner);
  }
}

// Set up MutationObserver to watch for sidebar section changes
function setupSidebarObserver() {
  // If already set up, don't create another
  if (sidebarObserver) {
    return;
  }

  const sidebar = document.querySelector('.sections-menu');

  if (!sidebar) {
    // Sidebar not ready - retry after delay (handles async Angular rendering)
    if (!sidebarObserverRetryTimer) {
      sidebarObserverRetryTimer = setTimeout(() => {
        sidebarObserverRetryTimer = null;
        setupSidebarObserver();
      }, 500);
    }
    return;
  }

  // Set up MutationObserver to watch for class changes on sidebar items
  sidebarObserver = new MutationObserver((mutations) => {
    try {
      // Check if any mutation is relevant (sidebar item class change)
      const hasRelevantChange = mutations.some(mutation =>
        mutation.type === 'attributes' &&
        mutation.attributeName === 'class' &&
        mutation.target.classList?.contains('sections-menu-item')
      );

      if (hasRelevantChange) {
        handleSidebarChange();
      }
    } catch (err) {
      log('  ⚠️ Sidebar observer error: ' + err.message);
      showWarning('Sidebar observer error: ' + err.message);
    }
  });

  // Observe the sidebar for attribute changes on its descendants
  sidebarObserver.observe(sidebar, {
    attributes: true,
    subtree: true,
    attributeFilter: ['class']
  });

  log('  👀 Sidebar observer active - watching for section changes');
}

// ============================================
// PAGE LOAD DETECTION
// ============================================
function initOnPageLoad() {
  const page = detectCurrentPage();
  log(`Page detected: ${page}`);

  // Set up sidebar observer on all SCE pages
  // This ensures the section button updates when user clicks sidebar
  setupSidebarObserver();

  // Show banner on form pages
  if (['customer-search', 'customer-information', 'additional-customer-info', 'enrollment-information',
       'project-information', 'trade-ally-information', 'appointment-contact', 'assessment-questionnaire',
       'measure-info', 'summary-info', 'application-status'].includes(page)) {
    if (config.autoFillPrompt) {
      setTimeout(showBanner, 1500);
    }
  }
}

// Run on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initOnPageLoad);
} else {
  initOnPageLoad();
}

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'fillForm') {
    runFillForm().then(() => sendResponse({ success: true }));
    return true;
  }
  if (request.action === 'detectPage') {
    sendResponse({ page: detectCurrentPage(), sectionTitle: getActiveSectionTitle() });
    return true;
  }
});
