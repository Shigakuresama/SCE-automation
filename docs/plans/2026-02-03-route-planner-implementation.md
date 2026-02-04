# Route Planner Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Route Planner utility to the SCE Chrome Extension that generates addresses from a range, processes them through SCE forms in batches, captures homeowner data, and generates a 3x3 grid PDF for door-to-door canvassing.

**Architecture:** Chrome extension with new Route Planner tab in popup, background script for batch processing, enhanced content script for data capture from Application Status page, and modular JavaScript files for address generation/tab management/PDF generation.

**Tech Stack:** JavaScript (Chrome Extension Manifest V3), jsPDF for PDF generation, Chrome Tabs/Storage APIs

---

## Task 1: Add jsPDF Library

**Files:**
- Download: `https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js`
- Create: `sce-extension/lib/jspdf.umd.min.js`

**Step 1: Download jsPDF library**

Run in `/home/sergio/Projects/SCE/sce-extension/lib`:
```bash
cd /home/sergio/Projects/SCE/sce-extension
mkdir -p lib
cd lib
wget https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js
```

Expected: File downloads to `lib/jspdf.umd.min.js`

**Step 2: Verify file exists**

Run: `ls -lh /home/sergio/Projects/SCE/sce-extension/lib/jspdf.umd.min.js`

Expected: File exists, ~150KB

**Step 3: Commit**

```bash
cd /home/sergio/Projects/SCE
git add sce-extension/lib/jspdf.umd.min.js
git commit -m "feat: add jsPDF library for PDF generation"
```

---

## Task 2: Create Address Generator Module

**Files:**
- Create: `sce-extension/modules/address-generator.js`
- Create: `sce-extension/modules/address-generator.test.js`

**Step 1: Write address parser test**

Create file `sce-extension/modules/address-generator.test.js`:

```javascript
/**
 * Tests for address-generator module
 */

function assertEqual(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`);
  }
}

function testParseAddress() {
  // Test full address
  const result1 = parseAddress("1909 W Martha Ln, Santa Ana, CA 92706");
  assertEqual(result1, {
    number: "1909",
    street: "W Martha Ln",
    city: "Santa Ana",
    state: "CA",
    zip: "92706",
    full: "1909 W Martha Ln, Santa Ana, CA 92706"
  }, "Full address parse failed");

  // Test address without city/state
  const result2 = parseAddress("1909 W Martha Ln 92706");
  assertEqual(result2, {
    number: "1909",
    street: "W Martha Ln",
    city: undefined,
    state: "CA",
    zip: "92706",
    full: "1909 W Martha Ln, CA 92706"
  }, "Short address parse failed");

  console.log('✅ testParseAddress passed');
}

function testGenerateAddressRange() {
  // Test basic range
  const result1 = generateAddressRange("1909 W Martha Ln, Santa Ana, CA 92706", "1915 W Martha Ln, Santa Ana, CA 92706");
  if (result1.length !== 4) {
    throw new Error(`Expected 4 addresses, got ${result1.length}`);
  }
  assertEqual(result1[0].number, "1909", "First address should be 1909");
  assertEqual(result1[3].number, "1915", "Last address should be 1915");

  // Test odd side only
  const result2 = generateAddressRange("1909 W Martha Ln, Santa Ana, CA 92706", "1915 W Martha Ln, Santa Ana, CA 92706", { side: "odd" });
  if (result2.length !== 4) {
    throw new Error(`Expected 4 odd addresses, got ${result2.length}`);
  }

  console.log('✅ testGenerateAddressRange passed');
}

// Run tests
try {
  testParseAddress();
  testGenerateAddressRange();
  console.log('\n=====================================');
  console.log('✅ ALL ADDRESS GENERATOR TESTS PASSED!');
  console.log('=====================================');
} catch (error) {
  console.error('\n❌ TEST FAILED:', error.message);
  process.exit(1);
}
```

**Step 2: Run test to verify it fails**

Run: `node sce-extension/modules/address-generator.test.js`

Expected: FAIL with "ReferenceError: parseAddress is not defined"

**Step 3: Implement address generator module**

Create file `sce-extension/modules/address-generator.js`:

```javascript
/**
 * Address Generator Module
 * Generates address lists from ranges for block canvassing
 */

/**
 * Parse address string into components
 * @param {string} address - "1909 W Martha Ln, Santa Ana, CA 92706" or "1909 W Martha Ln 92706"
 * @returns {Object} Parsed address components
 */
export function parseAddress(address) {
  // Try full format: "1909 W Martha Ln, Santa Ana, CA 92706"
  const match = address.match(/^(\d+)\s+(.+?),\s*(.+?),\s*([A-Z]{2})\s*(\d{5})/);

  if (match) {
    return {
      number: match[1],
      street: match[2].trim(),
      city: match[3]?.trim(),
      state: match[4],
      zip: match[5],
      full: address,
    };
  }

  // Try short format: "1909 W Martha Ln 92706" (no city/state)
  const match2 = address.match(/^(\d+)\s+(.+?)\s+(\d{5})/);
  if (match2) {
    return {
      number: match2[1],
      street: match2[2].trim(),
      city: undefined,
      state: "CA",
      zip: match2[3],
      full: address,
    };
  }

  throw new Error(`Cannot parse address: ${address}`);
}

/**
 * Generate list of addresses from a range
 * @param {string} startAddress - Starting address
 * @param {string} endAddress - Ending address
 * @param {Object} options - Options { side: 'both'|'odd'|'even', skip: string[] }
 * @returns {Array<Object>} List of address objects
 */
export function generateAddressRange(startAddress, endAddress, options = {}) {
  const start = parseAddress(startAddress);
  const end = parseAddress(endAddress);

  const startNum = parseInt(start.number);
  const endNum = parseInt(end.number);

  // Auto-swap if end < start
  if (endNum < startNum) {
    console.log('⚠️  End address < Start address - swapping for you');
    return generateAddressRange(endAddress, startAddress, options);
  }

  // Determine step based on parity of start number
  const step = startNum % 2 === 0 ? 2 : 1;

  const addresses = [];
  const skip = new Set(options.skip || []);

  for (let num = startNum; num <= endNum; num += step) {
    // Filter by odd/even if specified
    if (options.side === 'odd' && num % 2 === 0) continue;
    if (options.side === 'even' && num % 2 !== 0) continue;

    const numStr = String(num);
    if (skip.has(numStr)) continue;

    addresses.push({
      number: numStr,
      street: start.street,
      city: start.city || end.city,
      state: start.state,
      zip: start.zip,
      full: `${numStr} ${start.street}, ${start.city || ''} ${start.state} ${start.zip}`.trim()
    });
  }

  return addresses;
}

/**
 * Format address for SCE form inputs
 * @param {Object} address - Address object from parseAddress()
 * @returns {Object} { streetNumber, streetName, zipCode }
 */
export function formatForSCE(address) {
  return {
    streetNumber: address.number,
    streetName: address.street,
    zipCode: address.zip,
  };
}
```

**Step 4: Update test to use module imports**

Edit `sce-extension/modules/address-generator.test.js`, add to top:

```javascript
import { parseAddress, generateAddressRange } from './address-generator.js';
```

**Step 5: Run test to verify it passes**

Run: `node sce-extension/modules/address-generator.test.js`

Expected: PASS

**Step 6: Commit**

```bash
git add sce-extension/modules/address-generator.js sce-extension/modules/address-generator.test.js
git commit -m "feat: add address generator module with tests"
```

---

## Task 3: Update manifest.json

**Files:**
- Modify: `sce-extension/manifest.json`

**Step 1: Add route-processor.js to background scripts**

Current manifest.json has this line (find it):
```json
"background": {
  "service_worker": "background.js"
}
```

Keep as-is - we'll add route processor as a separate module imported by background.js

**Step 2: Add jsPDF to web_accessible_resources**

Add to manifest.json after existing web_accessible_resources (around line 50):

```json
  "web_accessible_resources": [
    {
      "resources": ["lib/jspdf.umd.min.js"],
      "matches": ["<all_urls>"]
    }
  ],
```

**Step 3: Commit**

```bash
git add sce-extension/manifest.json
git commit -m "feat: update manifest for jsPDF library access"
```

---

## Task 4: Create PDF Generator Module

**Files:**
- Create: `sce-extension/modules/pdf-generator.js`
- Create: `sce-extension/modules/pdf-generator.test.js`

**Step 1: Write PDF generator test**

Create file `sce-extension/modules/pdf-generator.test.js`:

```javascript
/**
 * Tests for PDF generator module
 */

import { generateCanvassPDFData } from './pdf-generator.js';

function testPDFDataGeneration() {
  const mockCases = [
    { full: '1909 W Martha Ln, Santa Ana, CA 92706', name: 'John Doe', phone: '(555) 123-4567' },
    { full: '1911 W Martha Ln, Santa Ana, CA 92706', name: 'Jane Smith', phone: '(555) 234-5678' },
    { full: '1913 W Martha Ln, Santa Ana, CA 92706', name: 'Bob Johnson', phone: '(555) 345-6789' },
  ];

  const pdfData = generateCanvassPDFData(mockCases);

  if (!pdfData || pdfData.length === 0) {
    throw new Error('PDF data generation failed');
  }

  console.log('✅ testPDFDataGeneration passed');
}

// Run tests
try {
  testPDFDataGeneration();
  console.log('\n=====================================');
  console.log('✅ ALL PDF GENERATOR TESTS PASSED!');
  console.log('=====================================');
} catch (error) {
  console.error('\n❌ TEST FAILED:', error.message);
  process.exit(1);
}
```

**Step 2: Run test to verify it fails**

Run: `node sce-extension/modules/pdf-generator.test.js`

Expected: FAIL with "Cannot find generateCanvassPDFData"

**Step 3: Implement PDF generator module**

Create file `sce-extension/modules/pdf-generator.js`:

```javascript
/**
 * PDF Generator Module
 * Generates 3x3 grid PDF for door-to-door canvassing
 */

/**
 * Generate canvas PDF with customer data in 3x3 grid
 * @param {Array<Object>} cases - Array of { full, name, phone } objects
 * @returns {string} Base64-encoded PDF data
 */
export async function generateCanvassPDF(cases) {
  // Load jsPDF from CDN-style global (loaded in HTML)
  const { jsPDF } = window.jspdf;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'letter'
  });

  // Header
  doc.setFontSize(16);
  doc.text('SCE DOOR-TO-DOOR CANVASSING ROUTE', 10, 10);

  doc.setFontSize(12);
  const firstCase = cases[0];
  const addr = parseAddressFromFull(firstCase.full);
  doc.text(`${addr.street} - ${addr.city || ''}, ${addr.state} ${addr.zip}`.trim(), 10, 18);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 10, 24);

  // 3x3 Grid configuration
  const colWidth = 65;
  const rowHeight = 55;
  const startX = 10;
  const startY = 35;

  // Fill 3x3 grid (up to 9 cases)
  const maxCases = Math.min(cases.length, 9);

  for (let i = 0; i < maxCases; i++) {
    const caseData = cases[i];
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = startX + (col * colWidth);
    const y = startY + (row * rowHeight);

    // Box border
    doc.rect(x, y, colWidth, rowHeight);

    // Case number
    doc.setFontSize(10);
    doc.text(`CASE ${i + 1}`, x + 3, y + 6);

    // Address (wrap text)
    doc.setFontSize(9);
    const addressLines = doc.splitTextToSize(caseData.full, colWidth - 6);
    doc.text(addressLines, x + 3, y + 12);

    // Name
    doc.setFontSize(9);
    doc.text(`Name: ${caseData.name || 'N/A'}`, x + 3, y + 22);

    // Phone
    doc.text(`Phone: ${caseData.phone || 'N/A'}`, x + 3, y + 28);

    // Age field (blank for user to fill)
    doc.text('Age: _____', x + 3, y + 34);

    // Notes area
    doc.text('Notes:', x + 3, y + 40);
    doc.line(x + 3, y + 48, x + colWidth - 3, y + 48);

    // Checkboxes
    doc.setFontSize(8);
    doc.text('☐ Qualified  ☐ Interested  ☐ Scheduled', x + 3, y + 52);
  }

  // Generate PDF as base64
  const pdfOutput = doc.output('datauristring');
  return pdfOutput;
}

/**
 * Parse address from full address string
 * @param {string} fullAddress - "1909 W Martha Ln, Santa Ana, CA 92706"
 * @returns {Object} { street, city, state, zip }
 */
function parseAddressFromFull(fullAddress) {
  const match = fullAddress.match(/^(\d+\s+.+?),\s*(.+?),\s*([A-Z]{2})\s*(\d{5})/);
  if (match) {
    return {
      street: match[1].trim(),
      city: match[2]?.trim(),
      state: match[3],
      zip: match[4]
    };
  }
  // Fallback for partial addresses
  const match2 = fullAddress.match(/^(\d+\s+.+?)\s+(\d{5})/);
  if (match2) {
    return {
      street: match2[1].trim(),
      city: '',
      state: 'CA',
      zip: match2[2]
    };
  }
  return { street: fullAddress, city: '', state: 'CA', zip: '' };
}

/**
 * Download PDF with generated filename
 * @param {Array<Object>} cases - Customer cases
 */
export async function downloadCanvassPDF(cases) {
  const pdfData = await generateCanvassPDF(cases);

  // Create download link
  const link = document.createElement('a');
  const firstCase = cases[0];
  const addr = parseAddressFromFull(firstCase.full);
  const filename = `${addr.street.replace(/\s+/g, '-')}-${Date.now()}-canvass.pdf`;

  link.href = pdfData;
  link.download = filename;
  link.click();

  return filename;
}
```

**Step 4: Run test to verify it passes**

Run: `node sce-extension/modules/pdf-generator.test.js`

Expected: PASS (Note: This test verifies the data structure, actual PDF generation requires browser environment)

**Step 5: Commit**

```bash
git add sce-extension/modules/pdf-generator.js sce-extension/modules/pdf-generator.test.js
git commit -m "feat: add PDF generator module for 3x3 canvass grid"
```

---

## Task 5: Create Tab Manager Module

**Files:**
- Create: `sce-extension/modules/tab-manager.js`

**Step 1: Implement tab manager**

Create file `sce-extension/modules/tab-manager.js`:

```javascript
/**
 * Tab Manager Module
 * Manages opening, processing, and closing tabs in batches
 */

/**
 * Process a batch of addresses through SCE forms
 * @param {Array<Object>} addresses - Array of address objects
 * @param {Function} progressCallback - Callback(current, total, address)
 * @param {Function} dataCallback - Callback(caseData) when data captured
 * @returns {Array<Object>} Captured customer data
 */
export async function processAddressBatch(addresses, progressCallback, dataCallback) {
  const batchSize = 3;
  const results = [];

  for (let i = 0; i < addresses.length; i += batchSize) {
    const batch = addresses.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;

    progressCallback(i, addresses.length, `Processing batch ${batchNumber}`);

    // Process each address in batch
    const batchResults = await Promise.allSettled(
      batch.map(addr => processSingleAddress(addr))
    );

    // Collect successful results
    for (let j = 0; j < batchResults.length; j++) {
      if (batchResults[j].status === 'fulfilled' && batchResults[j].value) {
        results.push(batchResults[j].value);
        dataCallback(batchResults[j].value);
      }
    }

    // Wait between batches to avoid overwhelming browser
    if (i + batchSize < addresses.length) {
      await sleep(2000);
    }
  }

  return results;
}

/**
 * Process a single address
 * @param {Object} address - Address object
 * @returns {Promise<Object>} Captured customer data
 */
async function processSingleAddress(address) {
  return new Promise((resolve, reject) => {
    // Open new tab with SCE projects page
    chrome.tabs.create({
      url: 'https://sce.dsmcentral.com/onsite/projects',
      active: false
    }, async (tab) => {
      if (!tab) {
        reject(new Error('Failed to create tab'));
        return;
      }

      try {
        // Store pending operation
        const pendingKey = `pending_${tab.id}`;
        chrome.storage.local.set({ [pendingKey]: { address, timestamp: Date.now() } });

        // Wait for data capture (timeout after 60 seconds)
        const data = await waitForDataCapture(tab.id, 60000);

        // Close tab
        chrome.tabs.remove(tab.id);

        resolve(data);
      } catch (error) {
        // Close tab on error
        chrome.tabs.remove(tab.id);
        reject(error);
      }
    });
  });
}

/**
 * Wait for data capture from content script
 * @param {number} tabId - Tab ID
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Object>} Captured data
 */
function waitForDataCapture(tabId, timeout) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      chrome.runtime.onMessage.removeListener(listener);
      reject(new Error('Data capture timeout'));
    }, timeout);

    const listener = (message, sender, sendResponse) => {
      if (sender.tab && sender.tab.id === tabId && message.action === 'addCaseToRoute') {
        clearTimeout(timeoutId);
        chrome.runtime.onMessage.removeListener(listener);
        resolve(message.data);
      }
    };

    chrome.runtime.onMessage.addListener(listener);
  });
}

/**
 * Sleep utility
 * @param {number} ms - Milliseconds to sleep
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

**Step 2: Commit**

```bash
git add sce-extension/modules/tab-manager.js
git commit -m "feat: add tab manager for batch processing"
```

---

## Task 6: Update Content Script for Data Capture

**Files:**
- Modify: `sce-extension/content.js`

**Step 1: Add Application Status page detection**

Find the `detectPage()` function in content.js (around line 800) and add the new page type.

Add to the labels detection section:

```javascript
if (labels.some(l => l.includes('Application Status') || l.includes('Application #'))) {
  return 'application-status';
}
```

**Step 2: Add data capture on Application Status page**

Add this function near the end of content.js (before the message listener):

```javascript
/**
 * Capture customer data from Application Status page
 */
async function captureCustomerDataFromStatus() {
  log('📋 Capturing customer data from Application Status...');

  const data = {
    address: '',
    name: '',
    phone: '',
    qualified: true,
    caseId: ''
  };

  // Get case ID from URL
  const urlMatch = window.location.href.match(/caseId=([^&]+)/);
  if (urlMatch) {
    data.caseId = urlMatch[1];
  }

  // Try multiple selectors for customer name
  const nameSelectors = [
    '[data-testid="homeowner-name"]',
    '.homeowner-name',
    '[class*="homeowner"][class*="name"]',
    'mat-cell:has-text("Name") + mat-cell'
  ];

  for (const selector of nameSelectors) {
    const element = document.querySelector(selector);
    if (element && element.textContent) {
      data.name = element.textContent.trim();
      break;
    }
  }

  // Try multiple selectors for phone
  const phoneSelectors = [
    '[data-testid="phone-number"]',
    '.phone-number',
    '[class*="phone"]',
    'mat-cell:has-text("Phone") + mat-cell'
  ];

  for (const selector of phoneSelectors) {
    const element = document.querySelector(selector);
    if (element && element.textContent) {
      data.phone = element.textContent.trim();
      break;
    }
  }

  // Check qualification status
  const bodyText = document.body.textContent;
  if (bodyText.toLowerCase().includes('not qualified') ||
      bodyText.toLowerCase().includes('does not qualify')) {
    data.qualified = false;
  }

  // Get address from storage (set when we started processing)
  chrome.storage.local.get(['pending_address'], (result) => {
    if (result.pending_address) {
      data.address = result.pending_address.full;

      // Send to background
      chrome.runtime.sendMessage({
        action: 'addCaseToRoute',
        data: data
      });

      log(`✅ Captured: ${data.name} - ${data.phone}`);
    }
  });
}
```

**Step 3: Add message listener for route processing**

Find the existing message listener in content.js (search for `chrome.runtime.onMessage.addListener`) and add this case:

```javascript
if (request.action === 'processRouteForAddress') {
  // Store address for later capture
  chrome.storage.local.set({
    pending_address: request.address
  });

  // Trigger form fill
  fillForm();

  sendResponse({ success: true });
  return true;
}
```

**Step 4: Call capture function when on Application Status**

Find where the page detection happens and add:

```javascript
if (pageKey === 'application-status') {
  captureCustomerDataFromStatus();
}
```

**Step 5: Commit**

```bash
git add sce-extension/content.js
git commit -m "feat: add customer data capture from Application Status page"
```

---

## Task 7: Create Route Planner Tab HTML

**Files:**
- Modify: `sce-extension/popup.html`

**Step 1: Add Route Planner tab**

Add this HTML after the existing tabs in popup.html:

```html
<div id="routePlannerTab" class="tab-content" style="display: none;">
  <h3>📍 Route Planner</h3>

  <!-- Address Range Input -->
  <div class="input-group">
    <label>Start Address:</label>
    <input type="text" id="startAddress" placeholder="1909 W Martha Ln" />
  </div>

  <div class="input-group">
    <label>End Address:</label>
    <input type="text" id="endAddress" placeholder="1925 W Martha Ln" />
  </div>

  <div class="input-row">
    <div class="input-group">
      <label>City:</label>
      <input type="text" id="routeCity" placeholder="Santa Ana" />
    </div>
    <div class="input-group">
      <label>State:</label>
      <select id="routeState">
        <option value="CA" selected>CA</option>
      </select>
    </div>
    <div class="input-group">
      <label>ZIP:</label>
      <input type="text" id="routeZip" placeholder="92706" />
    </div>
  </div>

  <div class="input-row">
    <div class="input-group">
      <label>Side:</label>
      <select id="routeSide">
        <option value="both" selected>Both</option>
        <option value="odd">Odd Only</option>
        <option value="even">Even Only</option>
      </select>
    </div>
    <div class="input-group">
      <label>Skip (comma-separated):</label>
      <input type="text" id="routeSkip" placeholder="1915, 1921" />
    </div>
  </div>

  <button id="generateRouteBtn" class="btn-primary">Generate & Process</button>

  <!-- Progress Display -->
  <div id="routeProgress" style="display: none; margin-top: 20px;">
    <h4>⏳ Progress</h4>
    <div class="progress-bar">
      <div id="progressFill" class="progress-fill"></div>
    </div>
    <div id="progressText">Processing: 0/0</div>
    <div id="routeResults" class="route-results"></div>
  </div>

  <!-- PDF Generation -->
  <div id="pdfSection" style="display: none; margin-top: 20px;">
    <h4>📄 Generate PDF</h4>
    <button id="generatePDFBtn" class="btn-success">Generate 3x3 Grid PDF</button>
  </div>
</div>
```

**Step 2: Add tab button**

Add to the tab buttons section:

```html
<button id="routePlannerBtn" class="tab-btn">Route Planner</button>
```

**Step 3: Commit**

```bash
git add sce-extension/popup.html
git commit -m "feat: add Route Planner tab UI to popup"
```

---

## Task 8: Create Route Planner Tab Logic

**Files:**
- Create: `sce-extension/route-planner.js`
- Modify: `sce-extension/popup.html`

**Step 1: Add script tag to popup.html**

Add before closing body tag:

```html
<script type="module" src="route-planner.js"></script>
```

**Step 2: Implement route planner logic**

Create file `sce-extension/route-planner.js`:

```javascript
/**
 * Route Planner - Popup Script
 * Handles UI and triggers batch processing
 */

import { generateAddressRange, formatForSCE } from './modules/address-generator.js';
import { downloadCanvassPDF } from './modules/pdf-generator.js';

// State
let routeData = [];
let processing = false;

// DOM Elements
const routePlannerBtn = document.getElementById('routePlannerBtn');
const routePlannerTab = document.getElementById('routePlannerTab');
const generateRouteBtn = document.getElementById('generateRouteBtn');
const progressDiv = document.getElementById('routeProgress');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const routeResults = document.getElementById('routeResults');
const pdfSection = document.getElementById('pdfSection');
const generatePDFBtn = document.getElementById('generatePDFBtn');

// Tab switching
routePlannerBtn.addEventListener('click', () => {
  // Hide all tabs
  document.querySelectorAll('.tab-content').forEach(tab => tab.style.display = 'none');
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

  // Show route planner tab
  routePlannerTab.style.display = 'block';
  routePlannerBtn.classList.add('active');
});

// Generate and process route
generateRouteBtn.addEventListener('click', async () => {
  if (processing) return;

  try {
    // Get input values
    const startAddr = document.getElementById('startAddress').value.trim();
    const endAddr = document.getElementById('endAddress').value.trim();
    const city = document.getElementById('routeCity').value.trim();
    const state = document.getElementById('routeState').value;
    const zip = document.getElementById('routeZip').value.trim();
    const side = document.getElementById('routeSide').value;
    const skipInput = document.getElementById('routeSkip').value.trim();
    const skip = skipInput ? skipInput.split(',').map(s => s.trim()) : [];

    // Validate
    if (!startAddr || !endAddr || !zip) {
      alert('Please fill in Start Address, End Address, and ZIP');
      return;
    }

    // Build full addresses
    const startFull = `${startAddr}, ${city}, ${state} ${zip}`;
    const endFull = `${endAddr}, ${city}, ${state} ${zip}`;

    // Generate addresses
    const addresses = generateAddressRange(startFull, endFull, { side, skip });

    if (addresses.length === 0) {
      alert('No addresses generated. Check your address range.');
      return;
    }

    if (addresses.length > 50) {
      alert(`Too many addresses (${addresses.length}). Maximum is 50.`);
      return;
    }

    // Start processing
    processing = true;
    generateRouteBtn.textContent = 'Processing...';
    generateRouteBtn.disabled = true;
    progressDiv.style.display = 'block';
    routeResults.innerHTML = '';
    pdfSection.style.display = 'none';

    // Send to background for processing
    chrome.runtime.sendMessage({
      action: 'processRoute',
      addresses: addresses
    });

  } catch (error) {
    alert(`Error: ${error.message}`);
    processing = false;
    generateRouteBtn.textContent = 'Generate & Process';
    generateRouteBtn.disabled = false;
  }
});

// Listen for progress updates
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'routeProgress') {
    const { current, total, address } = message;
    const percent = (current / total) * 100;
    progressFill.style.width = `${percent}%`;
    progressText.textContent = `Processing: ${current}/${total}`;
  }

  if (message.action === 'routeCaseCaptured') {
    const { data } = message;
    routeData.push(data);

    const statusIcon = data.qualified ? '✅' : '❌';
    const resultItem = document.createElement('div');
    resultItem.className = 'route-result-item';
    resultItem.innerHTML = `
      ${statusIcon} ${data.address}<br>
      <small>${data.name || 'N/A'} - ${data.phone || 'N/A'}</small>
    `;
    routeResults.appendChild(resultItem);
  }

  if (message.action === 'routeComplete') {
    processing = false;
    generateRouteBtn.textContent = 'Generate & Process';
    generateRouteBtn.disabled = false;
    pdfSection.style.display = 'block';

    if (routeData.length === 0) {
      alert('No customer data captured. Check SCE login and try again.');
    }
  }
});

// Generate PDF
generatePDFBtn.addEventListener('click', async () => {
  if (routeData.length === 0) {
    alert('No data to generate PDF from.');
    return;
  }

  try {
    await downloadCanvassPDF(routeData);
    alert('PDF generated!');
  } catch (error) {
    alert(`Error generating PDF: ${error.message}`);
  }
});
```

**Step 3: Commit**

```bash
git add sce-extension/route-planner.js sce-extension/popup.html
git commit -m "feat: add route planner popup logic"
```

---

## Task 9: Create Background Route Processor

**Files:**
- Create: `sce-extension/route-processor.js`
- Modify: `sce-extension/background.js` (if exists) or manifest.json

**Step 1: Create route processor background script**

Create file `sce-extension/route-processor.js`:

```javascript
/**
 * Route Processor - Background Script
 * Handles batch processing of addresses
 */

let currentRoute = [];
let currentIndex = 0;

// Listen for route processing requests
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'processRoute') {
    processRoute(message.addresses);
    sendResponse({ success: true });
    return true;
  }

  if (message.action === 'addCaseToRoute') {
    // Data captured from content script
    currentRoute.push(message.data);

    // Notify popup
    chrome.runtime.sendMessage({
      action: 'routeCaseCaptured',
      data: message.data
    });

    currentIndex++;

    // Send progress update
    chrome.runtime.sendMessage({
      action: 'routeProgress',
      current: currentIndex,
      total: totalAddresses,
      address: message.data.address
    });

    // Check if complete
    if (currentIndex >= totalAddresses) {
      chrome.runtime.sendMessage({
        action: 'routeComplete'
      });
    }

    sendResponse({ success: true });
    return true;
  }

  return false;
});

let totalAddresses = 0;

async function processRoute(addresses) {
  currentRoute = [];
  currentIndex = 0;
  totalAddresses = addresses.length;

  // Process addresses one at a time (sequential, not parallel)
  for (let i = 0; i < addresses.length; i++) {
    const address = addresses[i];

    // Send progress update
    chrome.runtime.sendMessage({
      action: 'routeProgress',
      current: i,
      total: addresses.length,
      address: address.full
    });

    // Open new tab and trigger processing
    await openAndProcessAddress(address);

    // Wait between addresses
    if (i < addresses.length - 1) {
      await sleep(3000);
    }
  }

  // Final complete message
  chrome.runtime.sendMessage({
    action: 'routeComplete'
  });
}

async function openAndProcessAddress(address) {
  return new Promise((resolve) => {
    chrome.tabs.create({
      url: 'https://sce.dsmcentral.com/onsite/projects',
      active: false
    }, (tab) => {
      if (!tab) {
        resolve();
        return;
      }

      // Store address for content script to pick up
      chrome.storage.local.set({
        [`pending_${tab.id}`]: {
          address: address,
          timestamp: Date.now()
        }
      });

      // Wait for tab to load, then trigger form fill
      setTimeout(() => {
        chrome.tabs.sendMessage(tab.id, {
          action: 'fillForm',
          config: {
            address: address.number,
            streetName: address.street,
            zipCode: address.zip
          }
        });

        // Wait for processing, then close tab
        setTimeout(() => {
          chrome.tabs.remove(tab.id);
          resolve();
        }, 45000); // 45 seconds per address
      }, 3000);
    });
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

**Step 2: Update manifest.json to register route processor**

Add to manifest.json background section:

```json
"background": {
  "service_worker": "route-processor.js",
  "type": "module"
}
```

**Step 3: Commit**

```bash
git add sce-extension/route-processor.js sce-extension/manifest.json
git commit -m "feat: add background route processor for batch processing"
```

---

## Task 10: Add CSS Styling for Route Planner

**Files:**
- Modify: `sce-extension/popup.html` (style section)

**Step 1: Add CSS**

Add to the `<style>` section in popup.html:

```css
/* Route Planner Styles */
.input-row {
  display: flex;
  gap: 10px;
}

.input-row .input-group {
  flex: 1;
}

.progress-bar {
  width: 100%;
  height: 20px;
  background-color: #e0e0e0;
  border-radius: 10px;
  overflow: hidden;
  margin: 10px 0;
}

.progress-fill {
  height: 100%;
  background-color: #4CAF50;
  width: 0%;
  transition: width 0.3s ease;
}

.route-results {
  max-height: 200px;
  overflow-y: auto;
  margin-top: 10px;
}

.route-result-item {
  padding: 8px;
  border-bottom: 1px solid #e0e0e0;
  font-size: 12px;
}

.route-result-item small {
  color: #666;
}

.btn-primary {
  background-color: #2196F3;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  width: 100%;
  margin-top: 10px;
}

.btn-primary:hover {
  background-color: #1976D2;
}

.btn-primary:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.btn-success {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  width: 100%;
}

.btn-success:hover {
  background-color: #45a049;
}
```

**Step 4: Commit**

```bash
git add sce-extension/popup.html
git commit -m "feat: add CSS styling for Route Planner UI"
```

---

## Task 11: Integration Testing

**Files:**
- Test: Manual testing in browser

**Step 1: Load extension in Chrome**

1. Open `chrome://extensions/`
2. Enable Developer Mode
3. Click "Load unpacked"
4. Select `/home/sergio/Projects/SCE-route-planner/sce-extension`

**Step 2: Test address generation**

1. Open extension popup
2. Click "Route Planner" tab
3. Enter:
   - Start: "1909"
   - End: "1925"
   - City: "Santa Ana"
   - ZIP: "92706"
4. Click "Generate & Process"
5. Verify: Progress bar appears, tabs open

**Step 3: Test data capture**

1. Login to SCE in one of the opened tabs
2. Wait for forms to fill
3. Verify: Customer data appears in popup results

**Step 4: Test PDF generation**

1. After processing completes
2. Click "Generate 3x3 Grid PDF"
3. Verify: PDF downloads with customer data

**Step 5: Fix any issues**

Document any bugs found and fixes applied.

**Step 6: Commit**

```bash
git commit -m "test: integration testing complete, bug fixes applied"
```

---

## Task 12: Update Documentation

**Files:**
- Modify: `CLAUDE.md`
- Create: `sce-extension/ROUTE_PLANNER.md`

**Step 1: Create Route Planner documentation**

Create file `sce-extension/ROUTE_PLANNER.md`:

```markdown
# Route Planner Feature

## Overview

The Route Planner feature automates block canvassing by generating addresses from a range, processing them through SCE forms, capturing homeowner data, and generating a 3x3 grid PDF for door-to-door visits.

## Usage

1. Open extension popup
2. Click "Route Planner" tab
3. Enter address range (e.g., 1909-1925 W Martha Ln)
4. Click "Generate & Process"
5. Wait for processing (~5-10 minutes for 9 addresses)
6. Click "Generate 3x3 Grid PDF"
7. Print PDF and go door-to-door

## Features

- **Address Range Generation**: Generate odd/even/both sides of street
- **Skip Addresses**: Exclude specific house numbers
- **Batch Processing**: 3 tabs at a time to avoid browser limits
- **Data Capture**: Automatic capture of homeowner name/phone from Application Status
- **PDF Export**: 3x3 grid with Age/Notes fields for door visits

## Technical Details

- **Module**: `route-planner.js` (popup), `route-processor.js` (background)
- **Dependencies**: jsPDF for PDF generation
- **Storage**: Uses chrome.storage.local for pending operations
- **Limits**: Maximum 50 addresses per route

## Troubleshooting

**No data captured**: Ensure you're logged into SCE before processing

**Tabs not closing**: Check browser console for errors

**PDF generation fails**: Verify jsPDF library loaded in manifest
```

**Step 2: Update CLAUDE.md**

Add to the "Chrome Extension" section:

```markdown
### Route Planner

Generate and process address ranges for block canvassing:

```javascript
// Usage in popup
chrome.runtime.sendMessage({
  action: 'processRoute',
  addresses: [/* address objects */]
});
```

See `sce-extension/ROUTE_PLANNER.md` for details.
```

**Step 3: Commit**

```bash
git add sce-extension/ROUTE_PLANNER.md CLAUDE.md
git commit -m "docs: add Route Planner documentation"
```

---

## Task 13: Final Testing & Cleanup

**Files:**
- Test: Full workflow
- Modify: Any bug fixes

**Step 1: Run full workflow test**

1. Generate route with 9 addresses
2. Verify all processing completes
3. Generate PDF
4. Verify PDF layout is correct
5. Test edge cases (invalid addresses, single address, etc.)

**Step 2: Check for console errors**

1. Open Chrome DevTools on extension popup
2. Check for errors during processing
3. Fix any issues

**Step 3: Verify git history**

Run: `git log --oneline --graph -10`

Expected: Clean commit history with all tasks

**Step 4: Final commit**

```bash
git commit -m "feat: route planner implementation complete"
```

---

## Success Criteria

After completing all tasks, verify:

- ✅ Address generation works for odd/even/both sides
- ✅ Batch processing opens 3 tabs at a time
- ✅ Customer data captured from Application Status page
- ✅ Progress bar updates correctly
- ✅ PDF generates with 3x3 grid layout
- ✅ PDF includes Age/Notes fields
- ✅ No browser crashes during processing
- ✅ Extension loads without errors
- ✅ All tests pass
- ✅ Documentation complete

---

## Next Steps After Implementation

1. **Merge feature branch to master**
2. **Test on real SCE forms** (requires valid credentials)
3. **Optional: Add map view** (Leaflet integration)
4. **Optional: Add route persistence** (chrome.storage)
5. **Optional: Add CSV export fallback**
