# Route Planner Documentation

## Overview

The Route Planner is a Chrome Extension utility that automates block canvassing workflow for SCE Rebate Center operations. It generates addresses from a range (or map clicks), processes them through SCE forms to capture homeowner data, and generates a 3x3 grid PDF for door-to-door canvassing.

## Features

- **Address Generation**: Generate sequential addresses from a range (e.g., 1909-1925 W Martha Ln)
- **Batch Processing**: Process multiple addresses through SCE forms (3 at a time)
- **Data Capture**: Automatically capture customer name and phone from Application Status page
- **PDF Generation**: Generate professional 3x3 grid PDF with fillable fields for canvassing
- **Map View** (Optional): Visual interface for clicking houses to add to route

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│ Chrome Extension Popup                                      │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌───────────────┐  ┌──────────────┐   │
│  │ Auto-Fill Tab │  │ Route Planner │  │  Settings    │   │
│  │  (existing)   │  │    Tab (new)  │  │   Tab        │   │
│  └───────────────┘  └───────────────┘  └──────────────┘   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Background Script (route-processor.js)                      │
├─────────────────────────────────────────────────────────────┤
│  - Address generation logic                                 │
│  - Tab management (open/close batches of 3)                │
│  - Progress tracking                                        │
│  - Data collection from content scripts                    │
│  - PDF generation (jsPDF)                                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Content Script (content.js - enhanced)                     │
├─────────────────────────────────────────────────────────────┤
│  - Existing: Form filling logic                            │
│  - New: Detect Application Status page                     │
│  - New: Capture name, phone, address from DOM              │
│  - New: Send captured data to background script             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Optional: Map View Module                                   │
├─────────────────────────────────────────────────────────────┤
│  - Leaflet.js integration (40KB)                            │
│  - OpenStreetMap tiles (free)                              │
│  - Nominatim reverse geocoding (free, 1 req/sec)           │
│  - Click-to-add address functionality                       │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

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
  │       └─► Send to Background
  │           └─► Store in routeData
  │
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

## File Structure

```
sce-extension/
├── manifest.json           # Add route-processor.js to web_accessible_resources
├── popup.html              # Contains Route Planner tab UI
├── popup.js                # Tab switching and route planner interactions
├── content.js              # Enhanced with data capture on App Status page
├── route-processor.js      # Background route logic (planned)
├── lib/
│   └── jspdf.umd.min.js    # PDF generation library
├── modules/
│   ├── address-generator.js   # Address range generation logic
│   ├── tab-manager.js         # Batch tab management (planned)
│   └── pdf-generator.js       # 3x3 grid PDF generation (planned)
└── sections/
    └── project.js          # Project section form filling
```

## Dependencies

| Library | Purpose | Size | License | API Key Required |
|---------|---------|------|---------|------------------|
| **jsPDF** | PDF generation | ~150KB | MIT | No |
| **Leaflet.js** (optional) | Map display | ~40KB | BSD-2-Clause | No |
| **Nominatim** (optional) | Reverse geocoding | - | ODbL | No (1 req/sec) |

All dependencies are free and open-source. No API keys required.

## Usage

### Via Extension Popup

1. Open the extension popup
2. Click the "Route Planner" tab
3. Fill in the address range form:
   - **Start Address**: e.g., "1909 W Martha Ln"
   - **End Address**: e.g., "1925 W Martha Ln"
   - **City**: e.g., "Santa Ana"
   - **State**: e.g., "CA"
   - **ZIP**: e.g., "92706"
   - **Side**: Both, Odd Only, or Even Only
   - **Skip**: Comma-separated numbers to exclude
4. Click "Generate & Process X Houses"
5. Extension opens tabs, fills forms, captures data
6. When complete, click "Generate 3x3 Grid PDF"
7. Print PDF and go door-to-door

### Address Generation

The address generator creates sequential addresses based on the range:

```javascript
// Input: 1909-1925 W Martha Ln
// Output: [1909, 1911, 1913, 1915, 1917, 1919, 1921, 1923, 1925]

// Options:
// - Side: "odd" → only odd numbers
// - Side: "even" → only even numbers
// - Side: "both" → all numbers
// - Skip: [1915, 1921] → exclude these numbers
```

### PDF Output

The generated PDF contains:
- **Header**: Route name, date, location
- **3x3 Grid**: 9 customer cards per page
  - Case number
  - Full address
  - Customer name (pre-filled)
  - Phone number (pre-filled)
  - **Fillable Age field**
  - **Notes area** (lined)
  - **Checkboxes**: Qualified, Interested, Scheduled

## Technical Specifications

### Address Generation Algorithm

```javascript
function generateAddressRange(start, end, options = {}) {
  // Parse "1909 W Martha Ln, Santa Ana, CA 92706"
  const startAddr = parseAddress(start);
  const endAddr = parseAddress(end);

  const startNum = parseInt(startAddr.number);
  const endNum = parseInt(endAddr.number);
  const step = 2; // Always increment by 2 for same side

  const addresses = [];

  for (let num = startNum; num <= endNum; num += step) {
    // Filter by odd/even if specified
    if (options.side === 'odd' && num % 2 === 0) continue;
    if (options.side === 'even' && num % 2 !== 0) continue;

    // Skip specific addresses
    if (options.skip?.includes(num)) continue;

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

- **Address generation**: Instant (client-side math)
- **Batch processing**: ~30-60 seconds per 3 addresses
- **9 addresses total**: ~5-10 minutes
- **PDF generation**: <1 second
- **Memory**: Minimal (data for 9 cases ≈ 5KB)

## Testing Strategy

### Unit Tests
- Address generation logic
- Address parsing edge cases
- PDF layout rendering

### Integration Tests
- End-to-end flow with test addresses
- Tab management (open/close)
- Data capture from mock SCE pages

### Manual Testing
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

- Generate 9 addresses from range in <1 second
- Process all 9 through SCE forms without manual intervention
- Capture correct name/phone for 95%+ of qualified addresses
- Generate readable 3x3 PDF with all customer data
- Complete full workflow (9 addresses) in <10 minutes
- No browser crashes or memory leaks during batch processing

## Related Documentation

- [Extension Design Plan](/home/sergio/Projects/SCE-route-planner/docs/plans/2026-02-03-route-planner-extension-design.md)
- [Route Builder Implementation Plan](/home/sergio/Projects/SCE-route-planner/docs/plans/2026-02-02-route-builder.md)
- [Main CLAUDE.md](/home/sergio/Projects/SCE-route-planner/CLAUDE.md)
- [Extension Setup](/home/sergio/Projects/SCE-route-planner/sce-extension/SETUP.md)
