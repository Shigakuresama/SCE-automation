# Block Perimeter Routing Design Document

**Date:** 2026-02-04
**Status:** Design Phase
**Goal:** Enable "round the block" canvassing with automatic SCE form processing and PDF generation

---

## Overview

Transform the Route Planner webapp to support **block perimeter routing** - walking around all four sides of a city block without crossing streets, with full SCE automation and multi-page PDF generation.

**Key Features:**
- Click map or enter address → detect entire block
- Extract all perimeter addresses in clockwise order
- Visual route confirmation before processing
- SCE form automation via userscript
- Capture customer names, phones, case numbers
- Multi-page PDF (9 addresses per page) with pre-filled data

---

## Architecture

### Block Detection Flow

```
User Action (click map or enter address)
    ↓
Geocode address → get lat/lon
    ↓
Query Overpass: "ways[highway] around 100m"
    ↓
Build block topology (4 intersecting streets)
    ↓
TRY: Query building polygons ["way"~"building"]
    ↓
  IF buildings found:
    → Calculate which face the block center
    → Extract addresses from building tags
    ↓
  ELSE (fallback):
    → Use street address ranges
    → Assume odd/even face the block
    ↓
Order addresses clockwise around perimeter
    ↓
Visualize on map + side panel list
```

### Data Structures

```javascript
{
  blockId: "unique-id",
  center: { lat, lon },
  perimeterStreets: [
    { name: "Violeta Ave", startAddr: "22300", endAddr: "22399", side: "north" },
    { name: "223rd St", startAddr: "22100", endAddr: "22199", side: "east" },
    { name: "Seine Ave", startAddr: "22300", endAddr: "22399", side: "south" },
    { name: "226th St", startAddr: "22200", endAddr: "22299", side: "west" }
  ],
  addresses: [
    { number: "22316", street: "Violeta Ave", lat, lon, position: 0 },
    { number: "22318", street: "Violeta Ave", lat, lon, position: 1 },
    // ... all perimeter addresses in clockwise order
  ],
  totalAddresses: 42,
  estimatedTime: "2 hours"
}
```

---

## UI Layout: Three-Panel Design

```
┌─────────────────────────────────────────────────────────────┐
│  🗺️ SCE Route Planner                        [Round Block]  │
├───────────────┬─────────────────────────┬───────────────────┤
│               │                         │                   │
│   MAP         │      ROUTE LIST         │   BLOCK INFO     │
│   (70%)       │      (20%)              │   (10%)           │
│               │                         │                   │
│  ┌─────────┐  │  ┌───────────────────┐ │  Block: ABC-123   │
│  │    1  ─┼──┼──│  1. 22316 Violeta  │ │  Total: 42 homes  │
│  │    2  ─┼──┼──│  2. 22318 Violeta  │ │  Est. time: 2hr  │
│  │    3  ─┼──┼──│  3. 22320 Violeta  │ │                   │
│  │    4  ─┼──┼──│  ...              │ │  Streets:         │
│  │         │  │  │                   │ │  • Violeta Ave   │
│  │  [map] │  │  │  42. 22202 Seine  │ │  • 223rd St      │
│  │         │  │  └───────────────────┘ │  • Seine Ave     │
│  └─────────┘  │  [Reorder enabled]     │  • 226th St      │
│               │                         │                   │
│  [Round Block]│  [Test 1 ▼ Test All ▼] │                   │
└───────────────┴─────────────────────────┴───────────────────┘
```

### Visual Features
- **Numbered markers** (1, 2, 3...) on map connected by polyline path
- **List syncs with map** - hover list item highlights marker
- **Clockwise indicator** - arrow showing route direction
- **Block perimeter highlighted** with distinct color

---

## User Workflow

### 1. Block Detection & Preview

```
User clicks "Round Block" or enters address
    ↓
System detects block, extracts addresses
    ↓
PREVIEW MODAL appears:
┌─────────────────────────────────────┐
│  Block Detected                     │
│                                     │
│  📍 Violeta Ave / 223rd St area     │
│                                     │
│  Total addresses: 42                │
│  Estimated time: 2 hours            │
│                                     │
│  First 5:                           │
│  • 22316 Violeta Ave                │
│  • 22318 Violeta Ave                │
│  • 22320 Violeta Ave                │
│  • 22322 Violeta Ave                │
│  • 22324 Violeta Ave                │
│                                     │
│  Last 5:                            │
│  • 22202 Seine Ave                  │
│  • 22204 Seine Ave                  │
│  • 22206 Seine Ave                  │
│  • 22208 Seine Ave                  │
│  • 22210 Seine Ave                  │
│                                     │
│  [Show Full Route]  [Cancel]        │
└─────────────────────────────────────┘
```

### 2. Route Review & Approval

```
User clicks "Show Full Route"
    ↓
Three-panel view appears with:
- Map with numbered markers and path
- Complete address list (reorderable)
- Block information panel
    ↓
User reviews route
    ↓
User can:
- Drag to reorder items
- Remove individual addresses
- Adjust batch size (1, 3, 5 at a time)
    ↓
User clicks "Test 1 Address" button
```

### 3. Test Single Address

```
Opens SCE form for first address only
    ↓
Userscript auto-fills form
    ↓
Waits for Application Status page
    ↓
Scrapes: Case #, Customer Name, Phone
    ↓
Sends data back to webapp
    ↓
RESULT MODAL:
┌─────────────────────────────────────┐
│  Test Successful!                   │
│                                     │
│  Address: 22316 Violeta Ave          │
│  Case #: 12345                      │
│  Customer: John Doe                 │
│  Phone: (555) 123-4567              │
│                                     │
│  ✓ Form filled correctly            │
│  ✓ Data captured                    │
│                                     │
│  [Process All 42 Addresses]          │
│  [Cancel]                           │
└─────────────────────────────────────┘
```

### 4. Batch Processing

```
User clicks "Process All"
    ↓
Queue processing begins:
    ↓
For each address:
  1. Open SCE form in new tab
  2. Userscript fills form
  3. Wait for Application Status
  4. Scrape customer data
  5. Send via postMessage to webapp
  6. Close tab
  7. Wait 2 seconds
  8. Repeat next address
    ↓
Progress bar updates after each
    ↓
When all complete:
  → Generate multi-page PDF
  → Show download button
```

---

## SCE Automation: Userscript

### File: `SCE-AutoFill.user.js`

```javascript
// ==UserScript==
// @name         SCE Route Planner AutoFill
// @namespace    http://localhost:8080
// @version      1.0
// @description  Auto-fill SCE forms and send customer data back to webapp
// @match        https://sce.dsmcentral.com/*
// @grant        window.close
// ==/UserScript==

(function() {
    'use strict';

    // Only run on SCE application pages
    if (!window.location.pathname.includes('/application')) return;

    let currentAddress = null;

    // Listen for messages from webapp
    window.addEventListener('message', (event) => {
        if (event.origin !== 'http://localhost:8080') return;

        const { type, data } = event.data;

        if (type === 'FILL_FORM') {
            currentAddress = data;
            fillSCEForm(data);
        }
    });

    function fillSCEForm(address) {
        // Use existing SCE auto-fill logic (adapted from content.js)
        // Fill customer info, project details, equipment
        // Click through sections

        pollForApplicationStatus();
    }

    function pollForApplicationStatus() {
        const checkInterval = setInterval(() => {
            const caseId = document.querySelector('.case-id')?.textContent;
            const customerName = document.querySelector('.customer-name')?.textContent;
            const phone = document.querySelector('.phone-number')?.textContent;

            if (caseId && customerName) {
                clearInterval(checkInterval);

                window.opener.postMessage({
                    type: 'ADDRESS_COMPLETE',
                    data: {
                        address: currentAddress,
                        caseId,
                        customerName,
                        phone,
                        status: document.querySelector('.status')?.textContent
                    }
                }, 'http://localhost:8080');

                setTimeout(() => window.close(), 500);
            }
        }, 500);

        setTimeout(() => clearInterval(checkInterval), 30000);
    }

    window.opener?.postMessage({ type: 'SCRIPT_READY' }, 'http://localhost:8080');
})();
```

### Webapp Integration

```javascript
// In sce-webapp/js/sce-automation.js

let processingQueue = [];
let completedAddresses = [];

function processAddresses() {
    processingQueue = [...selectedAddresses];
    processNextAddress();
}

function processNextAddress() {
    if (processingQueue.length === 0) {
        generateMultiPagePDF(completedAddresses);
        return;
    }

    const address = processingQueue[0];
    const sceUrl = buildSCEUrl(address);

    const sceWindow = window.open(sceUrl, '_blank');

    setTimeout(() => {
        sceWindow.postMessage({
            type: 'FILL_FORM',
            data: address
        }, 'https://sce.dsmcentral.com');
    }, 1000);
}

window.addEventListener('message', (event) => {
    if (event.origin !== 'https://sce.dsmcentral.com') return;

    const { type, data } = event.data;

    if (type === 'ADDRESS_COMPLETE') {
        completedAddresses.push(data);
        processingQueue.shift();
        updateProgress();

        setTimeout(processNextAddress, 2000);
    }
});
```

---

## Multi-Page PDF Generation

### Enhanced Cell Design

Each PDF cell now includes:

**Pre-filled Data (from SCE):**
- ✅ Customer Name
- ✅ Phone Number
- ✅ Case Number
- ✅ Address (with route position)

**Fillable Fields:**
- Age
- Notes (lined)
- Checkboxes: Qualified, Interested, Scheduled

### Multi-Page Logic

```javascript
function generateMultiPagePDF(addresses) {
  const pageSize = 9;
  const totalPages = Math.ceil(addresses.length / pageSize);

  const doc = new jsPDF();

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) doc.addPage();

    const startIdx = page * pageSize;
    const endIdx = Math.min(startIdx + pageSize, addresses.length);
    const pageAddresses = addresses.slice(startIdx, endIdx);

    drawGridPage(doc, pageAddresses, page + 1, totalPages);
  }

  const blockId = currentBlock.id;
  const date = new Date().toISOString().split('T')[0];
  doc.save(`route-planner-${date}-block-${blockId}.pdf`);
}
```

### Filename Format
```
route-planner-2026-02-04-block-abc123.pdf
            └───────┬───────┘ └─┬────┘
                 Date        Block ID
```

---

## Error Handling & Edge Cases

| Scenario | Detection | Recovery | User Feedback |
|----------|-----------|----------|---------------|
| **Userscript not installed** | postMessage timeout | Show install modal | "Install SCE AutoFill userscript" |
| **SCE login required** | Detect login page | Pause, notify user | "Please log into SCE first" |
| **Form validation fails** | Error message on page | Log error, skip address | "Address 5 failed: [reason]" |
| **Customer data missing** | Status page without name | Flag as partial data | Mark cell with ⚠️ |
| **Tab closed by user** | Window 'close' event | Re-open tab | "Re-opening address 3..." |
| **SCE site down** | Connection timeout | Pause queue, retry | "SCE unavailable. Retry?" |
| **Block detection fails** | Overpass returns 0 | Fallback to street ranges | "Using street ranges for this block" |

### Progress Persistence

```javascript
const PROGRESS_KEY = 'routeplanner_progress';

function saveProgress() {
  Storage.set(PROGRESS_KEY, {
    blockId: currentBlock.id,
    completed: completedAddresses,
    remaining: processingQueue,
    timestamp: Date.now()
  });
}

function recoverProgress() {
  const saved = Storage.get(PROGRESS_KEY);
  if (saved && saved.blockId === currentBlock.id) {
    // Ask user: "Resume previous session? (12/42 complete)"
  }
}
```

---

## Testing Strategy

### Unit Tests
```javascript
describe('BlockDetector', () => {
  test('detects block from single address');
  test('extracts perimeter addresses from building polygons');
  test('falls back to street ranges when no buildings');
  test('orders addresses clockwise');
});

describe('AddressOrdering', () => {
  test('generates clockwise route around block');
  test('handles blocks with missing sides');
  test('deduplicates corner addresses');
});
```

### Manual Testing Checklist

**Block Perimeter Detection:**
- [ ] Click on map → block perimeter highlighted
- [ ] Enter address → correct block shown
- [ ] Addresses ordered correctly (clockwise)
- [ ] Map markers match list order
- [ ] Building polygons used when available
- [ ] Falls back to street ranges when needed

**SCE Automation:**
- [ ] Test 1 address → form fills correctly
- [ ] Customer data scraped and sent back
- [ ] PDF generated with pre-filled data
- [ ] Test 9 addresses → correct pagination
- [ ] Test 42 addresses → 5 page PDF

**Error Recovery:**
- [ ] Close SCE tab mid-process → re-opens
- [ ] Network error → pause and retry
- [ ] Page refresh → progress restored
- [ ] Missing customer data → marked with warning

---

## Implementation Phases

### Phase 1: Block Perimeter (Foundation)
**Goal:** Detect blocks and extract perimeter addresses

1. Create `sce-webapp/js/block-detector.js`
2. Implement Overpass query for surrounding streets
3. Build block topology (4 intersecting streets)
4. Query building polygons (primary)
5. Fallback to street address ranges (secondary)
6. Implement clockwise ordering algorithm
7. Add numbered map markers with polylines

**Deliverable:** User can click map and see block perimeter with all addresses

### Phase 2: User Workflow
**Goal:** Approval flow and route visualization

1. Create preview modal component
2. Build three-panel layout (map + list + info)
3. Implement map-list synchronization
4. Add reorder capability to list
5. Create "Test 1 Address" button
6. Build progress tracking UI
7. Add batch size selector (1, 3, 5)

**Deliverable:** Complete route review workflow before SCE automation

### Phase 3: SCE Integration
**Goal:** Automate SCE form processing

1. Create `SCE-AutoFill.user.js` from content.js
2. Add postMessage communication layer
3. Implement queue processing logic
4. Add pause/resume/skip controls
5. Build error detection and recovery
6. Create progress persistence (localStorage)
7. Add userscript installation flow

**Deliverable:** End-to-end SCE automation with data capture

### Phase 4: PDF Enhancement
**Goal:** Multi-page PDF with pre-filled customer data

1. Modify PDFGenerator for multi-page support
2. Add SCE customer data to cells
3. Include case numbers and status
4. Implement page numbering (X of Y)
5. Handle partial data (missing fields)
6. Add filename with block ID and date
7. Create download preview

**Deliverable:** Complete PDF output ready for canvassing

---

## File Structure

```
sce-webapp/
├── index.html (modified - add Round Block button, three-panel layout)
├── css/
│   └── style.css (modified - add panel styles, modal styles)
├── js/
│   ├── app.js (modified - add SCE automation, block routing)
│   ├── map-view.js (modified - add block visualization)
│   ├── block-detector.js (NEW - block detection, perimeter extraction)
│   ├── address-ordering.js (NEW - clockwise algorithm)
│   ├── sce-automation.js (NEW - queue processing, postMessage)
│   ├── pdf-generator.js (modified - multi-page, pre-filled data)
│   ├── route-visualizer.js (NEW - map markers, polylines, sync)
│   ├── address-generator.js (existing)
│   └── storage.js (existing)
└── userscripts/
    └── SCE-AutoFill.user.js (NEW - Tampermonkey script)
```

---

## Dependencies

**Existing:**
- Leaflet.js (maps)
- jsPDF (PDF generation)
- OpenStreetMap (map tiles)

**New:**
- None (uses existing Overpass/Nominatim via proxy)

**External:**
- Tampermonkey or Violentmonkey (userscript manager)
- SCE website (form targets)

---

## Success Criteria

1. ✅ User can click any address and see the entire block perimeter
2. ✅ All addresses on block perimeter are extracted
3. ✅ Addresses shown in clockwise walking order
4. ✅ Map markers numbered and connected with path lines
5. ✅ Preview modal shows sample addresses before full view
6. ✅ "Test 1 Address" works end-to-end
7. ✅ SCE forms auto-fill correctly
8. ✅ Customer names, phones, case numbers captured
9. ✅ Multi-page PDF generated (9 addresses per page)
10. ✅ PDF has pre-filled customer data

---

## Open Questions

1. **Corner address handling:** Should corner addresses appear once or twice? (Currently: once)
2. **Block detection radius:** 100m may be too small/large for some areas (configurable?)
3. **Batch processing speed:** 2 second delay may need adjustment
4. **Progress indicator:** Show percentage or "X of Y"?
5. **Failed addresses:** How to handle in final PDF? (Include with warning? Skip entirely?)

---

## References

- Existing: `sce-extension/content.js` - SCE form filling logic
- Existing: `sce-extension/modules/map-view.js` - Map visualization
- Existing: `sce-proxy-server/server.js` - Overpass/Nominatim endpoints
- Overpass QL: https://wiki.openstreetmap.org/wiki/Overpass_API
- Tampermonkey: https://www.tampermonkey.net/
