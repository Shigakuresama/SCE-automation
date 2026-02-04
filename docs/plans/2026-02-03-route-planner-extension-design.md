# Route Planner Utility - Chrome Extension Design

**Date:** 2026-02-03
**Status:** Design
**Author:** Claude Code

## Overview

Add a Route Planner utility to the SCE Chrome Extension that automates block canvassing workflow. The feature generates addresses from a range (or map clicks), processes them through SCE forms to capture homeowner data, and generates a 3x3 grid PDF for door-to-door canvassing.

## Problem Statement

Currently, canvassing a block requires:
1. Manually identifying house numbers on a street
2. Opening SCE forms for each address
3. Filling forms repeatedly
4. Manually recording name/phone for each qualified homeowner
5. Creating a canvassing sheet by hand

This is time-consuming and error-prone when handling 9+ houses per block.

## Goals

1. **Automate address generation** from street ranges (e.g., 1909-1925 W Martha Ln)
2. **Batch process** multiple addresses through SCE forms (3 at a time)
3. **Capture customer data** (name, phone) from Application Status page
4. **Generate 3x3 PDF** with customer info, age/notes fields for door visits
5. **Optional:** Visual map interface for clicking houses to add to route

## Non-Goals

- Real-time traffic routing (static ordering only)
- CRM or database integration
- Cross-session route persistence
- Automatic follow-ups or scheduling

## User Workflow

```
1. User opens extension → Route Planner tab
2. Enters address range (e.g., "1909-1925 W Martha Ln, Santa Ana, CA 92706")
   OR clicks houses on map
3. Extension generates list of addresses (9 houses)
4. User clicks "Generate & Process"
5. Extension opens 3 tabs, fills SCE forms for each address
6. Extension captures name/phone from Application Status page
7. Process repeats for remaining addresses (3 at a time)
8. Extension generates 3x3 grid PDF with all customer data
9. User prints PDF, goes door-to-door, fills in age/notes during visits
```

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│ Chrome Extension Popup                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────┐  ┌───────────────┐  ┌──────────────┐   │
│  │ Auto-Fill Tab │  │ Route Planner │  │  Settings    │   │
│  │  (existing)   │  │    Tab (new)  │  │   Tab        │   │
│  └───────────────┘  └───────────────┘  └──────────────┘   │
│                                                             │
│  Route Planner Tab Contents:                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Address Range Generator                             │   │
│  │ - Start/End address inputs                          │   │
│  │ - City, State, ZIP                                  │   │
│  │ - Side selector (both/odd/even)                     │   │
│  │ - "Generate & Process" button                       │   │
│  │ - "Use Map Instead" link                            │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Progress Display (during processing)                │   │
│  │ - Progress bar (X/9 completed)                      │   │
│  │ - Status list with checkmarks/X marks               │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ PDF Generation                                      │   │
│  │ - "Generate 3x3 Grid PDF" button (enabled when done)│
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Background Script (route-processor.js)                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  - Address generation logic                                 │
│  - Tab management (open/close batches of 3)                │
│  - Progress tracking                                        │
│  - Data collection from content scripts                    │
│  - PDF generation (jsPDF)                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Content Script (content.js - enhanced)                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  - Existing: Form filling logic                            │
│  - New: Detect Application Status page                     │
│  - New: Capture name, phone, address from DOM              │
│  - New: Send captured data to background script             │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Optional: Map View Module                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  - Leaflet.js integration (40KB)                            │
│  - OpenStreetMap tiles (free)                              │
│  - Nominatim reverse geocoding (free, 1 req/sec)           │
│  - Click-to-add address functionality                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Input: Address Range
  │
  ├─► Generate Addresses (local JS)
  │   └─► 1909, 1911, 1913, 1915, 1917, 1919, 1921, 1923, 1925
  │
  ├─► Batch Process (3 at a time)
  │   │
  │   ├─► Open Tab 1 → Fill Forms → Wait for App Status Page
  │   │   └─► Content Script Captures: {address, name, phone}
  │   │       └─► Send to Background
  │   │           └─► Store in routeData
  │   │
  │   ├─► Open Tab 2 → (same process)
  │   ├─► Open Tab 3 → (same process)
  │   │
  │   └─► Close Tabs 1-3 → Repeat for remaining addresses
  │
  ├─► All Addresses Processed
  │
  └─► Generate PDF (jsPDF)
      └─► Download: "w-martha-ln-2026-02-03-canvass.pdf"
```

## Technical Specifications

### Address Generation Algorithm

```javascript
function generateAddressRange(start, end, options = {}) {
  // Parse "1909 W Martha Ln, Santa Ana, CA 92706"
  const startAddr = parseAddress(start);
  const endAddr = parseAddress(end);

  const startNum = parseInt(startAddr.number);
  const endNum = parseInt(endAddr.number);
  const step = startNum % 2 === 0 ? 2 : 1;

  const addresses = [];

  for (let num = startNum; num <= endNum; num += step) {
    // Filter by odd/even if specified
    if (options.side === 'odd' && num % 2 === 0) continue;
    if (options.side === 'even' && num % 2 !== 0) continue;

    addresses.push({
      number: String(num),
      street: startAddr.street,
      city: startAddr.city,
      state: startAddr.state,
      zip: startAddr.zip,
      full: `${num} ${startAddr.street}, ${startAddr.city || ''} ${startAddr.state || ''} ${startAddr.zip}`.trim()
    });
  }

  return addresses;
}
```

### Data Capture from SCE

Capture occurs on Application Status page:

```javascript
// In content.js
if (detectPage() === 'application-status') {
  const customerData = {
    address: getSCEAddress(),
    name: document.querySelector('[data-testid="homeowner-name"]')?.textContent?.trim(),
    phone: document.querySelector('[data-testid="phone-number"]')?.textContent?.trim(),
    qualified: !document.body.textContent.toLowerCase().includes('not qualified'),
    caseId: new URL(window.location.href).searchParams.get('caseId')
  };

  chrome.runtime.sendMessage({
    action: 'addCaseToRoute',
    data: customerData
  });
}
```

### PDF Generation

Using jsPDF library:

```javascript
import { jsPDF } from 'jspdf';

function generateCanvassPDF(cases) {
  const doc = new jsPDF('landscape', 'mm', 'letter');

  // Header
  doc.setFontSize(16);
  doc.text('SCE DOOR-TO-DOOR CANVASSING ROUTE', 10, 10);
  doc.setFontSize(12);
  doc.text(`${cases[0].street} - ${cases[0].city}, ${cases[0].state} ${cases[0].zip}`, 10, 18);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 10, 24);

  // 3x3 Grid
  const colWidth = 65;
  const rowHeight = 55;
  const startX = 10;
  const startY = 35;

  cases.forEach((caseData, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const x = startX + (col * colWidth);
    const y = startY + (row * rowHeight);

    // Box border
    doc.rect(x, y, colWidth, rowHeight);

    // Case number
    doc.setFontSize(10);
    doc.text(`CASE ${index + 1}`, x + 3, y + 6);

    // Address
    doc.setFontSize(9);
    const addressLines = doc.splitTextToSize(caseData.full, colWidth - 6);
    doc.text(addressLines, x + 3, y + 12);

    // Name
    doc.text(`Name: ${caseData.name || 'N/A'}`, x + 3, y + 22);

    // Phone
    doc.text(`Phone: ${caseData.phone || 'N/A'}`, x + 3, y + 28);

    // Age field (blank for user to fill)
    doc.text('Age: _____', x + 3, y + 34);

    // Notes area
    doc.text('Notes:', x + 3, y + 40);
    doc.line(x + 3, y + 48, x + colWidth - 3, y + 48);

    // Checkboxes
    doc.text('☐ Qualified  ☐ Interested  ☐ Scheduled', x + 3, y + 52);
  });

  doc.save(`${cases[0].street.replace(/\s+/g, '-')}-${Date.now()}-canvass.pdf`);
}
```

### Tab Management

Process 3 addresses at a time to avoid browser limits:

```javascript
async function processAddresses(addresses) {
  const batchSize = 3;

  for (let i = 0; i < addresses.length; i += batchSize) {
    const batch = addresses.slice(i, i + batchSize);
    const tabs = [];

    // Open batch
    for (const addr of batch) {
      const tab = await chrome.tabs.create({
        url: 'https://sce.dsmcentral.com/onsite/projects',
        active: false
      });
      tabs.push(tab);

      // Trigger form fill
      chrome.tabs.sendMessage(tab.id, {
        action: 'fillForm',
        address: addr
      });
    }

    // Wait for all to complete
    await Promise.all(tabs.map(tab =>
      waitForCapture(tab.id)
    ));

    // Close batch
    await Promise.all(tabs.map(tab =>
      chrome.tabs.remove(tab.id)
    ));
  }
}
```

## UI Mockup

### Route Planner Tab

```
┌─────────────────────────────────────────────────────────────┐
│ [Auto-Fill] [Route Planner] [⚙️]                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📍 Generate Route from Address Range                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  Start Address: [1909 W Martha Ln                 ] │   │
│  │  End Address:   [1925 W Martha Ln                 ] │   │
│  │                                                     │   │
│  │  City:  [Santa Ana                              ] │   │
│  │  State: [CA▼]  ZIP: [92706                        ] │   │
│  │                                                     │   │
│  │  Side: [Both ▼]   Skip: [1915, 1921              ] │   │
│  │                                                     │   │
│  │  ┌──────────────────────────────────────────────┐  │   │
│  │  │ 🗺️  Use Map View - Click houses to add     │  │   │
│  │  └──────────────────────────────────────────────┘  │   │
│  │                                                     │   │
│  │              [Generate & Process 9 Houses]        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ⏳ Progress                                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Processing: ████████░░ 8/9                          │   │
│  │                                                     │   │
│  │ ✅ 1909 W Martha Ln - John Doe - (555) 123-4567   │   │
│  │ ✅ 1911 W Martha Ln - Jane Smith - (555) 234-5678 │   │
│  │ ⏳ 1913 W Martha Ln - Processing...                │   │
│  │ ⏸️ 1915 W Martha Ln - Pending                      │   │
│  │ ⏸️ 1917 W Martha Ln - Pending                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  📄 Ready to Generate PDF                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              [Generate 3x3 Grid PDF]               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Map View (Optional)

```
┌─────────────────────────────────────────────────────────────┐
│ [← Back to Range Input]                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │                 🗺️  OpenStreetMap                  │   │
│  │                                                     │   │
│  │   ①  ←───── click to add                          │   │
│  │                                                     │   │
│  │   ②  ③                                             │   │
│  │                                                     │   │
│  │   Click houses on the map to add them to route     │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Selected Addresses (4)                                     │
│  ① 1909 W Martha Ln        [Remove]                       │
│  ② 1911 W Martha Ln        [Remove]                       │
│  ③ 102 Oak St              [Remove]                       │
│  ④ 1901 Main St            [Remove]                       │
│                                                             │
│  [Clear All]           [Process These Addresses] →         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3x3 PDF Output

```
┌──────────────────────────────────────────────────────────────────┐
│          SCE DOOR-TO-DOOR CANVASSING ROUTE                      │
│          W Martha Ln - Santa Ana, CA 92706                      │
│          Generated: February 3, 2026                            │
├──────────────────┬──────────────────┬───────────────────────────┤
│ CASE 1           │ CASE 2           │ CASE 3                   │
│                  │                  │                          │
│ 1909 W Martha Ln │ 1911 W Martha Ln │ 1913 W Martha Ln         │
│ Santa Ana, CA    │ Santa Ana, CA    │ Santa Ana, CA            │
│ 92706            │ 92706            │ 92706                    │
│                  │                  │                          │
│ Name: John       │ Name: Jane       │ Name: Robert             │
│       Doe        │       Smith       │       Johnson            │
│                  │                  │                          │
│ Phone:           │ Phone:           │ Phone:                   │
│ (555) 123-4567   │ (555) 234-5678   │ (555) 345-6789           │
│                  │                  │                          │
│ Age: _____       │ Age: _____       │ Age: _____               │
│                  │                  │                          │
│ Notes:           │ Notes:           │ Notes:                   │
│ _____________    │ _____________    │ _____________            │
│ _____________    │ _____________    │ _____________            │
│ _____________    │ _____________    │ _____________            │
│                  │                  │                          │
│ ☐ Qualified      │ ☐ Qualified      │ ☐ Qualified              │
│ ☐ Interested     │ ☐ Interested     │ ☐ Interested             │
│ ☐ Scheduled      │ ☐ Scheduled      │ ☐ Scheduled              │
├──────────────────┼──────────────────┼───────────────────────────┤
│ CASE 4           │ CASE 5           │ CASE 6                   │
│ 1915 W Martha Ln │ 1917 W Martha Ln │ 1919 W Martha Ln         │
│ ...              │ ...              │ ...                      │
├──────────────────┼──────────────────┼───────────────────────────┤
│ CASE 7           │ CASE 8           │ CASE 9                   │
│ 1921 W Martha Ln │ 1923 W Martha Ln │ 1925 W Martha Ln         │
│ ...              │ ...              │ ...                      │
└──────────────────┴──────────────────┴───────────────────────────┘
```

## Dependencies

| Library | Purpose | Size | License | API Key Required |
|---------|---------|------|---------|------------------|
| **jsPDF** | PDF generation | ~150KB | MIT | ❌ No |
| **Leaflet.js** (optional) | Map display | ~40KB | BSD-2-Clause | ❌ No |
| **Nominatim** (optional) | Reverse geocoding | - | ODbL | ❌ No (1 req/sec) |

All dependencies are free and open-source. No API keys required.

## File Structure

```
sce-extension/
├── manifest.json           (updated: add route-processor.js)
├── popup.html              (updated: add Route Planner tab)
├── popup.js                (updated: add tab switching)
├── content.js              (updated: add data capture on App Status)
├── route-processor.js      (new: background route logic)
├── lib/
│   └── jspdf.umd.min.js    (new: PDF generation library)
├── modules/
│   ├── address-generator.js   (new: address range logic)
│   ├── tab-manager.js         (new: batch tab management)
│   └── pdf-generator.js       (new: 3x3 grid PDF generation)
└── options.html            (updated: add route planner settings)
```

## Error Handling

| Scenario | Detection | User Experience |
|----------|-----------|-----------------|
| Invalid address format | Regex parse fails | Red border, error message: "Enter full address: Street, City, State ZIP" |
| End address < Start | Compare numbers | Auto-swap with toast: "Swapped addresses for you" |
| Too many addresses | Count > 50 | Warning: "Max 50 addresses. Consider splitting into multiple routes." |
| Tab blocked | Chrome tab limit error | Retry after 1s, show "Waiting for browser..." |
| Form fill timeout | 30s no response | Mark as failed, continue with next, show in red |
| No name/phone found | Empty selectors | Show "Partial data - missing name/phone" in results |
| PDF generation fails | jsPDF exception | Show error, offer CSV download as fallback |

## Performance Considerations

- **Address generation:** Instant (client-side math)
- **Batch processing:** ~30-60 seconds per 3 addresses
- **9 addresses total:** ~5-10 minutes
- **PDF generation:** <1 second
- **Memory:** Minimal (data for 9 cases ≈ 5KB)

## Testing Strategy

1. **Unit Tests**
   - Address generation logic
   - Address parsing edge cases
   - PDF layout rendering

2. **Integration Tests**
   - End-to-end flow with test addresses
   - Tab management (open/close)
   - Data capture from mock SCE pages

3. **Manual Testing**
   - Real SCE forms with valid credentials
   - Map view clicking (if implemented)
   - PDF print quality

## Future Enhancements (Out of Scope)

- Real-time traffic routing via Google Maps API
- Route persistence across browser sessions
- Export to CRM systems
- Automatic follow-up reminders
- Team collaboration features

## Success Criteria

- ✅ Generate 9 addresses from range in <1 second
- ✅ Process all 9 through SCE forms without manual intervention
- ✅ Capture correct name/phone for 95%+ of qualified addresses
- ✅ Generate readable 3x3 PDF with all customer data
- ✅ Complete full workflow (9 addresses) in <10 minutes
- ✅ No browser crashes or memory leaks during batch processing
