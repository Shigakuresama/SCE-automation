# SCE Route Planner - Complete Usage Guide

## Quick Start

1. **Install Userscript** in Tampermonkey (one-time)
2. **Login to SCE** Trade Ally Community (one-time)
3. **Start Webapp:** `cd sce-webapp && python3 -m http.server 8080`
4. **Open:** http://localhost:8080

---

## Initial Setup

### Step 1: Install the Automation Userscript

The userscript enables automatic form filling on SCE pages.

1. Open **Chrome Extensions**: `chrome://extensions`
2. Find **Tampermonkey** and click "Details"
3. Enable Tampermonkey if not already enabled
4. Click **Tampermonkey icon** → "Create a new script"
5. Copy this entire file:
   ```
   sce-webapp/userscripts/SCE-AutoFill.user.js
   ```
6. Paste into the editor
7. Save (Ctrl+S)

### Step 2: Login to SCE

The automation needs valid SCE credentials.

Visit: `https://sce-trade-ally-community.my.site.com/tradeally/s/login/`

Enter your credentials and login.

**Note:** You only need to login once per session.

### Step 3: Allow Popups

The automation opens new tabs for each address.

1. In Chrome address bar, click the **popup blocker icon**
2. Select **"Always allow popups and redirects from localhost"**
3. Click **Done**

---

## Mode 1: Map View (Visual Selection)

**Best for:** Selecting specific houses, irregular blocks, visual targeting

### How to Use

1. Click the **"📍 Map View"** tab
2. **Search for an area:**
   - Enter address in search box (e.g., "1909 W Martha Ln, Santa Ana, CA")
   - Click **"🔍 Search"**
   - Map zooms to that location
3. **Select houses:**
   - Click directly on houses to select them
   - Selected houses show with markers
4. Review your selection in the "Selected Addresses" list
5. Click **"Process & Generate PDF"**

### Draw Tools (Rectangle & Circle)

**Rectangle Selection:**
1. Click **"▢ Draw Rectangle"**
2. Click 4 corners around the area you want
3. All houses inside are selected

**Circle Selection:**
1. Click **"○ Draw Circle"**
2. Click center point, then drag to desired radius
3. All houses inside circle are selected

**Undo/Clear:**
- Click **"↩ Undo"** to remove last selection
- Click **"🗑 Clear"** to clear all selections

---

## Mode 2: Address Range (Sequential)

**Best for:** Full blocks, numbered streets, regular address patterns

### How to Use

1. Click the **"🔢 Address Range"** tab
2. **Fill out the form:**

   | Field | Example | Description |
   |-------|---------|-------------|
   | Start Address | "1909 W Martha Ln" | First address in range |
   | End Address | "1925 W Martha Ln" | Last address in range |
   | City | "Santa Ana" | City name |
   | State | "CA" | Two-letter state code |
   | ZIP Code | "92706" | 5-digit ZIP code |
   | Side | "odd" | odd/even/both |
   | Skip Addresses | "1915, 1921" | Optional: exclude specific numbers |

3. Click **"Generate Addresses"**
4. Review the generated list
5. Click **"Process & Generate PDF"**

### Understanding the "Side" Option

- **"odd"** - Only odd-numbered addresses (1909, 1911, 1913...)
- **"even"** - Only even-numbered addresses (1910, 1912, 1914...)
- **"both"** - All addresses in range

### Skip Addresses

Use this to exclude houses you don't want to visit:
- Houses you've already visited
- Houses that don't exist
- Unsafe locations

---

## Mode 3: Block Routing (Perimeter Detection)

**Best for:** Canvassing entire blocks systematically, discovering all addresses

### How to Use

1. Click the **"🔄 Block Routing"** tab
2. Click **"🗺️ Round Block"**
3. **Click anywhere on the map** on a street within the block
4. The system detects:
   - All streets around that block
   - All address numbers on each street
   - Creates a complete address list
5. Review in the "Route" panel
6. Click **"Process All"** to process all addresses
7. PDF generates when complete!

### Block Routing Tips

- **Click in the middle** of a street for best detection
- **Preview before processing** - use "Test 1 Address" button
- The system automatically detects odd/even sides

---

## Processing Flow

### What Happens Automatically

1. **Browser opens tabs** for each address (up to 3 at a time)
2. **Each tab** navigates to SCE customer search
3. **Form fills** with street address and ZIP code
4. **Search executes** automatically
5. **Customer data captured:**
   - Customer name
   - Phone number
   - Case ID
   - Address
6. **Tab closes** automatically
7. **Progress updates** show: "Processing 3/9 (33%) - 1909 W Martha Ln"
8. **PDF auto-generates** with all captured data when complete!

### Progress Indicators

While processing:
- **Button disabled** - prevents double-clicking
- **Status message** - shows current progress
- **Progress counter** - shows "X/Y (percentage%)"

### Troubleshooting Processing

| Error | Meaning | Solution |
|-------|---------|----------|
| "Popup blocked" | Browser blocked popup | Allow popups for localhost |
| "Timeout" | SCE page too slow | Check internet, try again |
| "Authentication required" | Not logged in | Login to SCE first |
| "Script error" | Userscript problem | Check Tampermonkey |

---

## Your Generated PDF

### PDF Contents

Each address card in the PDF includes:

| Field | Source | Status |
|-------|--------|--------|
| Case Number | Auto-captured from SCE | ✅ Filled |
| Address | From your selection | ✅ Filled |
| Customer Name | Auto-captured from SCE | ✅ Filled |
| Phone Number | Auto-captured from SCE | ✅ Filled |
| Age | Manual field | ⬜ Fill by hand |
| Notes | Lined area | ⬜ Write by hand |
| Checkboxes | Qualified / Interested / Scheduled | ⬜ Check by hand |

### PDF Layout

- **3x3 grid** (9 addresses per page)
- **Professional format** for door-to-door canvassing
- **Fillable fields** for age and notes
- **Checkboxes** for qualification status

---

## Tips for Effective Use

### Before Starting

1. **Login to SCE first** - Saves time
2. **Allow popups** - Prevents blocking
3. **Start small** - Test with 3-5 addresses first
4. **Check credentials** - Ensure userscript installed

### During Selection

1. **Use Map View** for selective targeting (specific houses)
2. **Use Address Range** for full blocks (faster)
3. **Use Block Routing** for systematic canvassing
4. **Preview your selection** before processing

### During Processing

1. **Watch the progress** - "Processing 5/9 (55%)"
2. **Don't close browser** - let it complete
3. **Check status messages** - shows any errors
4. **Wait for PDF** - auto-generates at end

### After PDF Generated

1. **Print the PDF** - 3x3 grid fits on standard paper
2. **Use clipboard** - carry while canvassing
3. **Fill in fields** - add age, notes, check boxes as you go
4. **Save for records** - keep track of your progress

---

## Advanced Configuration

### Change Proxy Server URL

If your proxy runs on a different port:

```javascript
// In browser console:
localStorage.setItem('sce_proxy_url', 'http://localhost:3001');
location.reload();
```

### Change SCE URL

For different SCE environments:

```javascript
// In browser console:
localStorage.setItem('sce_base_url', 'https://sce-staging.dsmcentral.com');
location.reload();
```

### Clear Stored Credentials

To remove saved SCE credentials:

```javascript
// In browser console:
localStorage.removeItem('sce_username');
localStorage.removeItem('sce_password');
```

---

## Complete Workflow Example

### Scenario: Canvassing a Block

**Goal:** Visit all odd-numbered houses on the 1900-2000 block of W Martha Ln

**Steps:**

1. **Open webapp:** http://localhost:8080

2. **Select Address Range mode**

3. **Fill form:**
   - Start: "1909 W Martha Ln"
   - End: "2001 W Martha Ln"
   - City: "Santa Ana"
   - State: "CA"
   - ZIP: "92706"
   - Side: "odd"

4. **Click "Generate Addresses"**
   - Shows: "Generated 47 addresses"

5. **Click "Process & Generate PDF"**

6. **Wait for processing:**
   - "Processing 1/47 (2%) - 1909 W Martha Ln"
   - "Processing 2/47 (4%) - 1911 W Martha Ln"
   - ...continues...
   - "Processing 47/47 (100%) - 2001 W Martha Ln"
   - "All addresses processed! Generating PDF..."

7. **PDF downloads automatically**

8. **Print PDF** (3 pages, 9 addresses each)

9. **Go canvassing!**

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Escape | Close preview modal |
| Enter | Submit address range form (if focused) |

---

## File Locations

| File | Purpose |
|------|---------|
| `sce-webapp/index.html` | Main application |
| `sce-webapp/js/app.js` | Application logic |
| `sce-webapp/js/sce-automation.js` | Automation engine |
| `sce-webapp/userscripts/SCE-AutoFill.user.js` | Browser userscript |
| `sce-webapp/js/pdf-generator.js` | PDF generation |
| `sce-webapp/css/style.css` | Styling |

---

## Need Help?

### Common Issues

**Q: Nothing happens when I click "Process & Generate PDF"**
A: Install the userscript in Tampermonkey and allow popups.

**Q: Getting "Not logged in" errors**
A: Login to SCE Trade Ally Community first.

**Q: PDF has no customer names**
A: SCE didn't return data for those addresses. Try manually.

**Q: Processing takes too long**
A: Process in smaller batches (10-15 addresses).

**Q: ZIP code going to wrong field**
A: Make sure you have the latest userscript version (1.4+).

---

**Version:** 1.4
**Last Updated:** 2026-02-04
**Branch:** master
