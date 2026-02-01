# SCE Auto-Fill - Complete Setup Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (Chrome)                         │
│  ┌─────────────────┐         ┌─────────────────────────┐  │
│  │ SCE Extension   │ ←────→  │ Popup + Settings        │  │
│  │ (content.js)    │         │ (proxy status indicator) │  │
│  └─────────────────┘         └─────────────────────────┘  │
│             │                                              │
│             │ fetch('http://localhost:3000/api/property')  │
│             ▼                                              │
└─────────────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Local Proxy Server (localhost:3000)             │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ Express API │ ─→ │   Playwright │ ─→ │ Zillow/Redfin│  │
│  └─────────────┘    └──────────────┘    └──────────────┘  │
│           │                                                 │
│           ▼                                                 │
│  ┌──────────────────────────────────────────────────────┐ │
│  │              Local Cache (property-cache.json)       │ │
│  │              - 7 day TTL                             │ │
│  │              - Persistent storage                    │ │
│  └──────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Installation Steps

### 1. Install the Chrome Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select: `/home/sergio/Projects/SCE/playwright-automation/sce-extension/`

### 2. Start the Proxy Server

Open a terminal and run:

```bash
cd /home/sergio/Projects/SCE/playwright-automation/sce-proxy-server
npm start
```

You should see:
```
╔═══════════════════════════════════════════╗
║   SCE Proxy Server Running                ║
║   Local: http://localhost:3000            ║
║   Health: http://localhost:3000/api/health║
╚═══════════════════════════════════════════╝
```

### 3. Verify Connection

Click the extension icon - you should see:
- 🏠 Proxy: Connected (0 cached) - Green background

If you see "Disconnected", make sure the proxy server is running.

## Usage

1. Navigate to a SCE form page
2. Click "Fill Form" in the extension popup or banner
3. Property data (SqFt, Year Built) is automatically fetched from Zillow/Redfin
4. First search takes 3-5 seconds, subsequent uses are instant (cached)

## Configuration

Click "⚙️ Settings" in the extension to configure:
- Default address/zip for customer search
- Contact information
- Form defaults
- Fallback property values (used if proxy is offline)

## Proxy Server API

### Get Property Data
```bash
curl "http://localhost:3000/api/property?address=22216%20Seine&zip=90716"
```

### Health Check
```bash
curl http://localhost:3000/api/health
```

### View Cache
```bash
curl http://localhost:3000/api/cache
```

### Manual Cache Entry
```bash
curl -X POST http://localhost:3000/api/property/cache \
  -H "Content-Type: application/json" \
  -d '{"address":"22216 Seine","zip":"90716","sqFt":"1200","yearBuilt":"1970"}'
```

## Troubleshooting

### Extension shows "Proxy: Disconnected"
1. Make sure the proxy server is running (`npm start` in sce-proxy-server)
2. Check that port 3000 is not in use by another application
3. Look for errors in the proxy server terminal

### Property data not found
1. Verify the address/zip is correct
2. Check the proxy server logs - it will show scraping attempts
3. Try manually caching the property via the API
4. As fallback, set default values in extension settings

### First time setup - Playwright browsers
```bash
cd /home/sergio/Projects/SCE/playwright-automation/sce-proxy-server
npx playwright install chromium
```

## Files

```
sce-extension/
├── manifest.json          # Extension config (with localhost:3000 permission)
├── content.js             # Main automation logic
├── popup.html/js          # Extension popup (with proxy status)
├── options.html/js        # Settings page
└── banner.css             # Banner styles

sce-proxy-server/
├── package.json           # Dependencies (express, playwright, cors)
├── server.js              # Proxy server + scraping logic
├── property-cache.json    # Local cache (auto-created)
└── README.md              # Server documentation
```
