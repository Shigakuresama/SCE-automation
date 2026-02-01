# SCE Rebate Center - Playwright Automation

Automated workflow for SCE Rebate Center with Zillow property data scraping.

## Setup

### 1. Install Node.js Dependencies

```bash
cd /home/sergio/Projects/SCE/playwright-automation
npm install
npm run install  # Install Chromium browser
```

### 2. Save Your SCE Login Session

**Option A: Use existing browser session (recommended)**

1. Log in to `https://sce.dsmcentral.com` in Chrome
2. Install the "EditThisCookie" extension
3. Export cookies to `auth/cookies.json`
4. Export localStorage to `auth/storage.json`

**Option B: Manual session capture**

```bash
node capture-session.js
```

Follow prompts to log in manually.

---

## Usage

### Quick Start: Auto-fill from Zillow Address

```bash
npm run autofill "1909 W Martha Ln, Santa Ana, CA 92706"
```

This will:
1. Search Zillow for the address
2. Extract SqFt, Year Built, Address
3. Open SCE Rebate Center
4. Fill in Project Information section

### Scrape Zillow Only

```bash
npm run scrape "1909 W Martha Ln, Santa Ana, CA 92706"
```

Returns JSON data without filling SCE.

### Full Workflow with Case Data

```bash
npm run full case-data.json
```

Where `case-data.json` contains:
```json
{
  "address": "1909 W Martha Ln, Santa Ana, CA 92706",
  "applicationId": "75114801",
  "household": [
    { "name": "John Doe", "age": 35, "relationship": "Owner" }
  ],
  "measures": [
    { "category": "HVAC", "product": "Central HVAC", "quantity": 1 }
  ]
}
```

---

## File Structure

```
playwright-automation/
├── package.json           # Node.js dependencies
├── scrape-zillow.js       # Zillow scraper only
├── autofill.js            # Zillow → SCE autofill
├── full-workflow.js       # Complete case workflow
├── capture-session.js     # Session capture helper
├── auth/                  # Login credentials (generated)
│   ├── cookies.json       # Browser cookies
│   └── storage.json       # LocalStorage data
├── config.js              # Configuration settings
└── output/                # Scraped data output
    └── {timestamp}.json
```

---

## Configuration

Edit `config.js` to customize:

```javascript
export const config = {
    // Browser settings
    headless: false,           // Set true for background mode
    slowMo: 100,               // Delay between actions (ms)

    // SCE settings
    sceBaseUrl: 'https://sce.dsmcentral.com/onsite',
    autoSave: true,
    saveDelay: 2000,

    // Zillow settings
    zillowBaseUrl: 'https://www.zillow.com',
    zillowTimeout: 10000,      // Max wait for page load

    // Field mappings
    fieldMappings: {
        sqFt: 'Total Sq.Ft.',
        yearBuilt: 'Year Built',
        address: 'Site Address'
    }
};
```

---

## Troubleshooting

### "Session expired" error

Your saved session has expired. Re-run:

```bash
node capture-session.js
```

### Zillow blocks the scraper

Zillow has anti-bot measures. Solutions:
- Use `slowMo: 500` to slow down actions
- Run in non-headless mode (`headless: false`)
- Use a residential proxy

### Can't find specific fields

Field labels may have changed. Add to `config.js`:

```javascript
customFields: {
    'Custom Field Name': 'Value'
}
```

---

## Advanced: Batch Processing

Process multiple addresses from a CSV file:

```bash
node batch-process.js addresses.csv
```

Format:
```csv
Address,ApplicationId,Household Members
"1909 W Martha Ln, Santa Ana, CA 92706",75114801,"John Doe|35|Owner"
"123 Main St, Anaheim, CA 92805",75114802,"Jane Smith|42|Tenant"
```

---

## Security Notes

- **Never commit** `auth/` folder to git
- Add `auth/` to `.gitignore`
- Cookies expire after ~30 days
- Use separate test account for automation
