/**
 * SCE Form Auto-Fill - Content Script
 * Runs on SCE pages to detect forms and fill them
 */

console.log('[SCE Auto-Fill] Content script loaded');

// ============================================
// CONFIG (loaded from storage)
// ============================================
let config = {
  address: '123 Main St', // Placeholder - configure in options
  zipCode: '90210', // Placeholder - configure in options
  firstName: 'John', // Placeholder - configure in options
  title: 'Outreach',
  phone: '5551234567', // Placeholder - configure in options
  preferredContactTime: '1:00PM - 3:30PM',
  language: 'English',
  ethnicity: 'Decline to state',
  householdUnits: '1',
  spaceOrUnit: '1',
  howDidYouHear: 'Contractor Outreach',
  masterMetered: 'Yes',
  buildingType: 'Residential',
  contractorName: 'Your Company', // Placeholder - configure in options
  attempt1Date: '', // Will be set dynamically
  attempt1Time: '2:00PM',
  attempt2Date: '', // Will be set dynamically
  attempt2Time: '3:00PM',
  appointmentEndTime: '',
  appointmentType: 'On-Site Appointment',
  appointmentStatus: 'Scheduled',
  gasProvider: 'SoCalGas',
  gasAccountNumber: '', // Placeholder - configure in options
  waterUtility: 'N/A',
  primaryApplicantAge: '44',
  permanentlyDisabled: 'No',
  veteran: 'No',
  nativeAmerican: 'No',
  incomeVerifiedDate: '', // Will be set dynamically
  autoFillPrompt: true,
  householdMembers: [
    { name: '', age: '' }
  ],
  customFieldMap: '{}',
  // Phase 3: Zillow data (will be scraped when needed)
  zillowSqFt: '',
  zillowYearBuilt: ''
};

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
    proxyAvailable = false;
    return false;
  }
}

async function fetchPropertyDataFromProxy(address, zipCode) {
  const searchAddress = `${address}, ${zipCode}`.trim();
  log(`  🏠 Fetching property data for: ${searchAddress}`);

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
    const response = await fetch(`${PROXY_URL}/api/property?address=${encodeURIComponent(address)}&zip=${encodeURIComponent(zipCode)}`);

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
    }
  } catch (err) {
    log(`  ⚠️ Proxy fetch failed: ${err.message}`);
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

async function setInputValue(input, value, fieldName) {
  if (!input) return false;

  // Scroll into view if needed
  input.scrollIntoView({ behavior: 'smooth', block: 'center' });
  await sleep(150);

  // Focus with click for Angular to register
  input.focus();
  input.click();
  await sleep(200);

  // Clear existing value
  input.value = '';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await sleep(100);

  // Set value using native setter for Angular to detect
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  nativeInputValueSetter.call(input, value);

  // Trigger comprehensive events for Angular change detection
  input.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: value.charAt(value.length - 1) || 'x' }));
  input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
  input.dispatchEvent(new FocusEvent('focus', { bubbles: true }));

  // Wait for Angular to process
  await sleep(400);

  // Verify and retry if needed
  if (input.value === value) {
    log(`  ✓ ${fieldName}: "${value}"`);
    return true;
  }

  log(`  ⚠️ Retry for ${fieldName} (current: "${input.value}")`);
  // Retry with direct assignment
  await sleep(300);
  input.focus();
  input.value = value;
  input.dispatchEvent(new InputEvent('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
  await sleep(300);

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

  // Scroll into view and click
  matSelect.scrollIntoView({ behavior: 'smooth', block: 'center' });
  await sleep(200);

  // Click select to open dropdown - try multiple methods
  matSelect.click();
  await sleep(800);

  // Wait for options to render
  await waitForAngularStability(3000);

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
    await sleep(600);
    return true;
  } else {
    log(`  ⚠️ Option not found: ${optionText}`);
    log(`     Available: ${options.map(o => o.textContent?.trim()).filter(Boolean).slice(0, 5).join(' | ')}`);
    // Close dropdown if no match
    matSelect.click();
    await sleep(400);
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
      return {};
    }
    // Reject non-objects
    if (!data || typeof data !== 'object') {
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
// PAGE DETECTION (Enhanced with SCE URL routing patterns)
// ============================================
function detectCurrentPage() {
  const activeTitle = getActiveSectionTitle();
  if (activeTitle) {
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
    '/summary-info/': 'application-status',
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

  // Store address for Zillow lookup
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

  return true;
}

// ============================================
// FORM FILLERS
// ============================================
async function fillCustomerInfo() {
  log('📋 Filling Customer Information...');
  await sleep(1000);

  const nameInput = findInputByMatLabel('Customer Name');
  const customerName = nameInput?.value || '';

  // Store customer name globally for Phase 3 Homeowner fields
  if (customerName) {
    window.sceCustomerName = customerName;
    log(`  Customer Name: "${customerName}" (stored for Homeowner fields)`);
  } else {
    log('  ⚠️ Customer Name not found or empty');
  }

  // Copy Alternate Phone → Contact Phone
  const altPhoneInput = findInputByMatLabel('Alternate Phone');
  if (altPhoneInput?.value) {
    const contactPhoneInput = findInputByMatLabel('Contact Phone');
    if (contactPhoneInput) {
      await setInputValue(contactPhoneInput, altPhoneInput.value, 'Contact Phone');
    }
  }

  // Generate email from customer name
  if (customerName) {
    const email = generateEmail(customerName);
    const emailInput = findInputByMatLabel('Contact Email');
    if (emailInput) {
      await setInputValue(emailInput, email, 'Contact Email');
    }

    // Fill Contact First/Last Name
    const nameParts = customerName.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    if (firstName) {
      const firstNameInput = findInputByMatLabel('Contact First Name');
      if (firstNameInput) await setInputValue(firstNameInput, firstName, 'Contact First Name');
    }
    if (lastName) {
      const lastNameInput = findInputByMatLabel('Contact Last Name');
      if (lastNameInput) await setInputValue(lastNameInput, lastName, 'Contact Last Name');
    }
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
  await sleep(1500);

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

  // Wait for Angular stability before filling
  await waitForAngularStability();

  for (const [label, value] of Object.entries(selections)) {
    await sleep(400); // Extra delay between fields
    const result = await selectDropdown(label, value);
    if (!result) {
      log(`  ⚠️ Skipped: ${label}`);
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
  log('📋 Filling Project Information (Phase 3)...');
  await sleep(1000);

  // Get property data from proxy (with fallback to config)
  const propertyData = await fetchPropertyDataFromProxy(
    config.address,
    config.zipCode
  );

  // Space Or Unit (on this page too)
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

  // Fill Total Sq.Ft. from property data
  const sqFtLabel = Array.from(document.querySelectorAll('mat-label')).find(l => l.textContent.includes('Total Sq') || l.textContent.includes('Square Foot'));
  if (sqFtLabel) {
    const formField = sqFtLabel.closest('mat-form-field');
    if (formField) {
      const input = formField.querySelector('input');
      if (input) {
        const sqFtValue = propertyData.sqFt || '1200';
        await setInputValue(input, sqFtValue, 'Total Sq.Ft.');
      }
    }
  }

  // Fill Year Built from property data
  const yearLabel = Array.from(document.querySelectorAll('mat-label')).find(l => l.textContent.includes('Year Built'));
  if (yearLabel) {
    const formField = yearLabel.closest('mat-form-field');
    if (formField) {
      const input = formField.querySelector('input');
      if (input) {
        const yearValue = propertyData.yearBuilt || '1970';
        await setInputValue(input, yearValue, 'Year Built');
      }
    }
  }

  log('✅ Project Information filled!');
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
    { labels: ['Project Contact Last Name', 'Contact Last Name', 'Last Name'], value: 'Corp', name: 'Project Contact Last Name' }, // Default last name
    { labels: ['Project Contact Title', 'Contact Title', 'Title'], value: config.title, name: 'Project Contact Title' },
    { labels: ['Project Contact Phone', 'Contact Phone', 'Phone Number'], value: config.phone, name: 'Project Contact Phone' },
    { labels: ['Project Contact Email', 'Contact Email', 'Email'], value: 'sergiocorp@example.com', name: 'Project Contact Email' }
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

  // Fallback: fill first N editable inputs if we didn't find enough by label
  if (filledCount < 2) {
    log('   🔄 Using fallback: filling first editable inputs...');
    const allInputs = Array.from(document.querySelectorAll('input[type="text"], input:not([type])'));
    const values = [
      { value: config.firstName, name: 'First Name (fallback)' },
      { value: 'Corp', name: 'Last Name (fallback)' },
      { value: config.title, name: 'Title (fallback)' },
      { value: config.phone, name: 'Phone (fallback)' }
    ];

    let filled = 0;
    for (const input of allInputs) {
      if (filled >= values.length) break;
      const rect = input.getBoundingClientRect();
      const isVisible = rect.width > 0 && rect.height > 0;
      const isEditable = !input.readOnly && !input.disabled && !input.value;

      if (isVisible && isEditable) {
        const success = await setInputValue(input, values[filled].value, values[filled].name);
        if (success) filled++;
        await sleep(400);
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
  log('📋 Filling Assessment Questionnaire (Phase 3)...');
  await sleep(1500);

  // Primary Applicant Age
  const ageLabel = Array.from(document.querySelectorAll('mat-label')).find(l => l.textContent.includes('Primary Applicant Age'));
  if (ageLabel) {
    const formField = ageLabel.closest('mat-form-field');
    if (formField) {
      const input = formField.querySelector('input');
      if (input) {
        await setInputValue(input, config.primaryApplicantAge, 'Primary Applicant Age');
      }
    }
  }

  // Ethnicity
  await selectDropdown('Ethnicity', config.ethnicity);

  // Permanently Disabled
  await selectDropdown('Permanently Disabled', config.permanentlyDisabled);

  // Veteran
  await selectDropdown('Veteran', config.veteran);

  // Native American
  await selectDropdown('Native American', config.nativeAmerican);

  log('✅ Assessment Questionnaire filled!');
}

// ============================================
// HOUSEHOLD MEMBERS
// ============================================
async function fillHouseholdMembers() {
  log('📋 Filling Household Members...');
  await sleep(1500);

  const members = Array.isArray(config.householdMembers) ? config.householdMembers : [];
  if (members.length === 0) {
    log('  ⚠️ No household members configured');
    return;
  }

  for (const member of members) {
    if (!member || (!member.name && !member.age)) continue;
    if (member.name) {
      await fillFieldByLabel('Name of Household Member', member.name);
    }
    if (member.age) {
      await fillFieldByLabel('Household Member Age', member.age);
    }

    const addContinueBtn = Array.from(document.querySelectorAll('button'))
      .find(b => b.textContent.includes('Add & Continue'));
    if (addContinueBtn) {
      addContinueBtn.click();
      await sleep(800);
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
// APPLICATION STATUS - ACCEPT LEAD
// ============================================
async function acceptLead() {
  log('📋 Accepting Lead...');
  await sleep(1500);

  // Find and click the status dropdown (Lead Assigned -> Accepted)
  const statusDropdown = document.querySelector('mat-select[role="listbox"]');
  if (statusDropdown) {
    statusDropdown.click();
    await sleep(500);

    // Find and click "Accepted" option
    const options = Array.from(document.querySelectorAll('mat-option'));
    const acceptedOption = options.find(o => o.textContent && o.textContent.includes('Accepted'));

    if (acceptedOption) {
      acceptedOption.click();
      log('  ✓ Changed status to: Accepted');
    } else {
      log('  ⚠️ Accepted option not found');
    }
  } else {
    log('  ⚠️ Status dropdown not found');
  }

  log('✅ Lead accepted!');
}

async function clickNext(expectedPage) {
  log(`➡️ Next → ${expectedPage}`);

  const allButtons = Array.from(document.querySelectorAll('button, mat-button'));
  const nextBtn = allButtons.find(b => {
    const text = b.textContent.trim();
    return text.includes('>') || text.toLowerCase().includes('next');
  });

  if (!nextBtn) {
    log('⚠️ Next button not found, trying sidebar navigation');
    const sectionTitle = keyToSectionTitle(expectedPage) || expectedPage;
    if (sectionTitle && goToSectionTitle(sectionTitle)) {
      return waitForPage(expectedPage, 8000);
    }
    log(`  ❌ Navigation failed: could not find Next button or sidebar section "${expectedPage}"`);
    return false;
  }

  nextBtn.click();

  return waitForPage(expectedPage, 8000);
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
async function runFillForm() {
  log('🚀 Starting SCE Form Auto-Fill...');

  // Ensure config is loaded before proceeding
  await loadConfig();

  const currentPage = detectCurrentPage();
  log(`   Current page: ${currentPage}`);

  switch (currentPage) {
    case 'application-status':
      await acceptLead();
      break;

    case 'measure-info':
      // On measure-info page, create appointment
      await createAppointment();
      break;

    case 'appointment-contact':
      await fillAppointmentContact();
      await fillCustomFieldsForSection('Appointment Contact');
      await clickNext('assessment-questionnaire');
      await fillAssessmentQuestionnaire();
      await clickNext('measure-info');
      break;

    case 'assessment-questionnaire':
      await fillAssessmentQuestionnaire();
      await fillCustomFieldsForSection('Assessment Questionnaire');
      await clickNext('measure-info');
      break;

    case 'customer-search':
      await fillCustomerSearch(config.address, config.zipCode);
      // Wait for Customer Information page
      await waitForPage('customer-information', 15000);
      await fillCustomerInfo();
      await fillCustomFieldsForSection('Customer Information');
      await clickNext('additional-customer-info');
      await fillAdditionalCustomerInfo();
      await fillCustomFieldsForSection('Additional Customer Information');
      await clickNext('enrollment-information');
      await clickNext('project-information');
      await fillProjectInformation();
      await fillCustomFieldsForSection('Project Information');
      await clickNext('trade-ally-information');
      await fillTradeAllyInformation();
      await fillCustomFieldsForSection('Trade Ally Information');
      break;

    case 'customer-information':
      await fillCustomerInfo();
      await fillCustomFieldsForSection('Customer Information');
      await clickNext('additional-customer-info');
      await fillAdditionalCustomerInfo();
      await clickNext('enrollment-information');
      await clickNext('project-information');
      await fillProjectInformation();
      await clickNext('trade-ally-information');
      await fillTradeAllyInformation();
      break;

    case 'additional-customer-info':
      await fillAdditionalCustomerInfo();
      await fillCustomFieldsForSection('Additional Customer Information');
      await clickNext('enrollment-information');
      await clickNext('project-information');
      await fillProjectInformation();
      await clickNext('trade-ally-information');
      await fillTradeAllyInformation();
      break;

    case 'enrollment-information':
      await fillCustomFieldsForSection('Enrollment Information');
      await clickNext('project-information');
      await fillProjectInformation();
      await clickNext('trade-ally-information');
      await fillTradeAllyInformation();
      break;

    case 'household-members':
      await fillHouseholdMembers();
      await clickNext('project-information');
      break;

    case 'project-information':
      await fillProjectInformation();
      await fillCustomFieldsForSection('Project Information');
      await clickNext('trade-ally-information');
      await fillTradeAllyInformation();
      break;

    case 'trade-ally-information':
      await fillTradeAllyInformation();
      await fillCustomFieldsForSection('Trade Ally Information');
      break;

    case 'equipment-information':
    case 'basic-enrollment-equipment':
    case 'bonus-adjustment-measures':
    case 'review-terms':
    case 'file-uploads':
    case 'review-comments': {
      const sectionTitle = keyToSectionTitle(currentPage) || getActiveSectionTitle() || currentPage;
      await fillCustomFieldsForSection(sectionTitle);
      break;
    }

    default:
      log('⚠️ Page not recognized for auto-fill');
  }

  log('✅ Auto-Fill complete!');
}

// ============================================
// BANNER
// ============================================
function showBanner() {
  // Remove existing banner
  const existing = document.getElementById('sce-autofill-banner');
  if (existing) existing.remove();

  const banner = document.createElement('div');
  banner.id = 'sce-autofill-banner';
  banner.innerHTML = `
    <div class="sce-banner-content">
      <span class="sce-banner-text">📋 SCE Form Detected</span>
      <button id="sce-fill-btn" class="sce-btn sce-btn-primary">Fill Form</button>
      <button id="sce-dismiss-btn" class="sce-btn sce-btn-secondary">✕</button>
    </div>
  `;
  document.body.appendChild(banner);

  document.getElementById('sce-fill-btn').addEventListener('click', () => {
    banner.classList.add('sce-filling');
    runFillForm().then(() => {
      banner.classList.add('sce-success');
      banner.querySelector('.sce-banner-text').textContent = '✅ Form Filled!';
      setTimeout(() => banner.remove(), 3000);
    });
  });

  document.getElementById('sce-dismiss-btn').addEventListener('click', () => {
    banner.remove();
  });
}

// ============================================
// PAGE LOAD DETECTION
// ============================================
function initOnPageLoad() {
  const page = detectCurrentPage();
  log(`Page detected: ${page}`);

  // Show banner on form pages
  if (['customer-search', 'customer-information', 'additional-customer-info', 'enrollment-information',
       'project-information', 'trade-ally-information', 'appointment-contact', 'assessment-questionnaire',
       'measure-info', 'application-status'].includes(page)) {
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
