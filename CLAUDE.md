# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SCE (Southern California Edison) Rebate Center automation system. Three main components work together:

1. **Chrome Extension** (`sce-extension/`) - MV3 extension for auto-filling Angular-based forms at sce.dsmcentral.com
2. **Proxy Server** (`sce-proxy-server/`) - Node.js/Express server that scrapes Zillow/Redfin property data
3. **MCP Server** (`sce-mcp-server/`) - TypeScript MCP server for programmatic automation via Claude Code
4. **Playwright Automation** (`playwright-automation/`) - Standalone Playwright scripts for batch processing

## Common Commands

### Chrome Extension

```bash
# Run utils tests (validates SECTION_MAP and time calculations)
node sce-extension/utils.test.js

# Generate options page from Playwright recording JSON
node sce-extension/tools/generate-options.cjs "Recording.json"
node sce-extension/tools/generate-options.cjs "Recording.json" --config-only
```

Load extension in Chrome:
1. Navigate to `chrome://extensions/`
2. Enable Developer Mode
3. Click "Load unpacked" and select `sce-extension/` directory

### Proxy Server

```bash
cd sce-proxy-server
npm install
npm start          # Port 3000
npm run dev        # Auto-reload with --watch
```

### MCP Server

```bash
cd sce-mcp-server
npm install
npm run build      # Compile TypeScript
npm run watch      # Compile on changes
npm run dev        # Build and run

# Individual tools
npm run route      # Build optimized route from addresses
npm run visit      # Record field visit data
npm run record     # Capture form interaction flow
npm run automate   # Run full automation
```

### Playwright Automation

```bash
cd playwright-automation
npm install
npm run install    # Install Chromium browser

# Workflows
npm run autofill "1909 W Martha Ln, Santa Ana, CA 92706"
npm run scrape "1909 W Martha Ln, Santa Ana, CA 92706"
npm run full case-data.json

# Cache management
npm run cache-stats
npm run cache-list
npm run cache-clear
```

### Root-level Commands

```bash
npm test           # Run extension utils tests
```

## Architecture

### Data Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   MCP/Playwright│────▶│  Proxy Server   │────▶│   Chrome        │
│   Automation    │     │  (Port 3000)    │     │   Extension     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                              │                          │
                              ▼                          ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │   Zillow/       │     │   SCE Forms     │
                        │   DuckDuckGo    │     │   (Angular)     │
                        └─────────────────┘     └─────────────────┘
```

### Extension Architecture

**Script Loading Order** (critical - defined in `manifest.json:27`):
1. `utils.js` - Defines `SCEAutoFillUtils` global
2. `content.js` - Main form filling logic, depends on utils

**Key Extension Files**:
- `utils.js:3` - `SECTION_MAP` - 18 section title → key mappings
- `content.js:42` - `runFillForm()` - Main entry point
- `content.js:125` - `getActiveSectionTitle()` - Sidebar detection via `.sections-menu-item.active`
- `content.js:140` - `goToSectionTitle()` - Sidebar navigation
- `content.js:175` - `clickNext()` - Next button with sidebar fallback
- `content.js:330` - `fillAssessmentQuestionnaire()` - Equipment dropdowns

**Section Navigation Pattern**:
- **Sidebar sections**: Customer Info, Additional Info, Enrollment, Household, Project, Trade Ally, Assessment, Equipment, Basic Enrollment, Bonus, Terms, Uploads, Comments, Status
- **Next button pages**: Customer Search, Appointment Contact, Appointments, Measure Info, Summary Info

### Angular Material Form Interaction

The target site uses Angular Material. Event sequences must follow this pattern:

```javascript
// Text inputs - requires input + change events
element.focus();
element.value = newValue;
element.dispatchEvent(new Event('input', { bubbles: true }));
element.dispatchEvent(new Event('change', { bubbles: true }));
element.blur();

// Select dropdowns (mat-select) - requires click + DOM polling
const trigger = panel.querySelector('.mat-select-trigger');
trigger.click();
// Wait for overlay, then find option
const option = [...panel.querySelectorAll('.mat-option')]
  .find(opt => opt.textContent.trim() === value);
option.click();
```

### Proxy Server Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /proxy/status` | Health check |
| `GET /proxy/scrape?address=...&zipCode=...` | Scrape property data via DuckDuckGo |

The proxy uses DuckDuckGo HTML search (avoids CAPTCHA) and aggregates data from Zillow/Redfin results. Runs with `headless: false` because DuckDuckGo detects headless browsers.

### MCP Server Tools

| Tool | Purpose |
|------|---------|
| `scrape_property` | Get sqft/year built from Zillow |
| `check_eligibility` | Validate rebate eligibility rules |
| `create_application` | Start new SCE application |
| `fill_customer_info` | Fill customer/enrollment sections |
| `fill_project_info` | Fill project with Zillow data |
| `schedule_appointment` | Create appointment with time calc |
| `upload_document` | Upload photos/documents |
| `build_route` | Optimize visit order from addresses |

## Key Implementation Details

### Time Format Handling

Appointment times use 12-hour format (e.g., "2:00PM"). End times are calculated via `SCEAutoFillUtils.addHoursToTime()` which handles:
- AM/PM rollover at noon/midnight
- Format variations ("2PM", "2:00pm", "2:00 pm")
- Edge cases: 11:59PM + 1hr = 12:59AM

### Property Cache

Proxy server maintains `property-cache.json` with 7-day TTL. Cache key: `${address.toLowerCase().trim()},${zipCode.trim()}`

### Extension Configuration

No environment files. Configuration stored in Chrome extension sync storage via `chrome.storage.sync`. Default values are hardcoded in `content.js` config object and can be overridden via the options page (18 tabs matching the 18 form sections).

### Generator Tool

`tools/generate-options.cjs` parses Playwright recording JSON and auto-generates:
- `options.html` - 18-tab configuration UI
- `options.js` - Form handling
- Config snippets for `content.js`

To add new fields, edit `FIELD_SCHEMA` in `generate-options.cjs` then regenerate.

## Testing

```bash
# Extension utilities
node sce-extension/utils.test.js

# MCP server unit tests
npm run test:unit  # vitest
```

## Troubleshooting

### Extension not filling
1. Check console for "SCE Auto-Fill" logs
2. Verify proxy running: `curl http://localhost:3000/proxy/status`
3. Check sidebar detection: `document.querySelector('.sections-menu-item.active .sections-menu-item__title')`
4. Verify config: `chrome.storage.sync.get(null, console.log)`

### Proxy connection refused
```bash
lsof -i :3000
kill -9 <PID>
cd sce-proxy-server && npm start
```

### Playwright browser issues
```bash
cd playwright-automation
npx playwright install chromium
```
