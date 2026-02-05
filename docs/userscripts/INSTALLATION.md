# SCE AutoFill Userscript - Installation Guide

This guide covers installing and configuring the SCE AutoFill Tampermonkey userscript for automated form processing.

## What is the Userscript?

The SCE AutoFill userscript enables the Route Planner webapp to automatically:
- Fill SCE application forms
- Navigate through form sections
- Capture customer data (name, phone, case number)
- Send data back to the webapp for PDF generation

## Prerequisites

1. **Modern web browser** (Chrome, Firefox, Edge, or Safari)
2. **Tampermonkey browser extension** (or Violentmonkey as alternative)
3. **SCE webapp** running on `http://localhost:8080`
4. **Proxy server** running on port 3000

## Installation Steps

### Step 1: Install Tampermonkey

#### Chrome / Edge:
1. Visit [Chrome Web Store](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfk)
2. Click "Add to Chrome" or "Add to Edge"
3. Confirm installation

#### Firefox:
1. Visit [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/)
2. Click "Add to Firefox"
3. Confirm installation

#### Safari:
1. Install [Tampermonkey for Safari](https://apps.apple.com/app/tampermonkey/id1482490089)
2. Open Safari Preferences > Extensions
3. Enable Tampermonkey

### Step 2: Install the SCE AutoFill Userscript

#### Option A: Direct Installation (Recommended)

1. Navigate to `http://localhost:8080`
2. Click on "SCE AutoFill Userscript" link in the app
3. Tampermonkey will open and ask to install the script
4. Review the script permissions
5. Click "Install"

#### Option B: Manual Installation

1. Open Tampermonkey dashboard (click extension icon)
2. Click the "+" tab to create a new script
3. Copy the contents of `sce-webapp/userscripts/SCE-AutoFill.user.js`
4. Paste into Tampermonkey editor
5. Press Ctrl+S (or Cmd+S) to save
6. Name it "SCE AutoFill"

### Step 3: Verify Installation

1. Visit [sce.dsmcentral.com](https://sce.dsmcentral.com)
2. Open browser console (F12)
3. You should see: `[SCE AutoFill] Script loaded`
4. The Tampermonkey icon should show a badge count of "1" (script is active)

## Configuration

### Allowed Websites

The userscript is configured to run on:
- `https://sce.dsmcentral.com/*`

### Communication

The userscript communicates with the webapp via:
- **From:** `http://localhost:8080`
- **Message types:** `FILL_FORM`, `ADDRESS_COMPLETE`, `SCRIPT_ERROR`, `SCRIPT_READY`

### Browser Settings

**Popup Blocker:** Ensure popups are allowed for SCE website
1. Chrome Settings > Privacy and security > Site settings > Pop-ups and redirects
2. Add `https://sce.dsmcentral.com` to "Allowed to send pop-ups"

**Cookies:** Ensure SCE website can store cookies
1. Browser Settings > Privacy and security > Cookies and other site data
2. Add `https://sce.dsmcentral.com` to "Allowed"

## Troubleshooting

### Script not running?

**Check 1:** Is Tampermonkey enabled?
- Look for the Tampermonkey icon in your browser toolbar
- Click it and ensure the script shows "ON"

**Check 2:** Are you on the correct SCE page?
- The script only runs on `sce.dsmcentral.com` URLs
- Check if you're on the application form page

**Check 3:** Browser console errors?
- Open DevTools (F12) and check for errors
- Look for `[SCE AutoFill]` log messages

### Forms not auto-filling?

**Check 1:** Is the webapp running?
- Navigate to `http://localhost:8080`
- Ensure the Route Planner is loaded

**Check 2:** Browser security blocking popups?
- Check if popup blocker is blocking the SCE tab
- Allow popups for SCE website

**Check 3:** postMessage communication failed?
- Check browser console for security errors
- Ensure both tabs are on the same origin

### Data not being captured?

**Check 1:** Did you click "Process All" or "Test One"?
- The webapp must initiate the process
- The script waits for a `FILL_FORM` message

**Check 2:** Is the form loading properly?
- Wait for the entire page to load
- Check for CAPTCHA or verification prompts

**Check 3:** Timeout errors?
- Slow connections may cause 30-second timeout
- Check browser console for timeout messages

## Development Mode

For development and testing, you can modify the script behavior:

### Test Data Mode

The script includes test data fallbacks for development:
```javascript
function scrapeCaseId() {
  // Returns test data if actual scraping fails
  return 'CASE-TEST123';
}
```

### Logging

Enable detailed logging in browser console:
```javascript
console.log('[SCE AutoFill] Processing address:', address);
```

## Uninstallation

To remove the userscript:

1. Open Tampermonkey dashboard
2. Find "SCE AutoFill" in your scripts list
3. Click the trash icon to delete
4. Confirm deletion

## Security Notes

- The userscript only communicates with `http://localhost:8080`
- All `postMessage` calls validate the origin
- No data is sent to external servers
- The script runs entirely in your browser

## Support

For issues or questions:
1. Check browser console for errors
2. Review this guide's troubleshooting section
3. Verify proxy server is running on port 3000
4. Check that SCE website is accessible

## Version History

- **1.0** (2026-02-04): Initial release
  - Basic form auto-fill
  - Customer data scraping
  - postMessage communication
  - PDF generation integration
