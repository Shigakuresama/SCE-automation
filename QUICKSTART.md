# Quick Start Guide

## Step 1: Install Dependencies

```bash
cd /home/sergio/Projects/SCE/playwright-automation
npm install
npm run install
```

## Step 2: Capture Your Login Session (One-Time)

```bash
node capture-session.js
```

1. Browser opens
2. Log in to SCE Rebate Center manually
3. Press Enter in terminal when done
4. Session saved to `./auth/`

## Step 3: Run Automation

### Option A: Quick Address Lookup

```bash
npm run autofill "1909 W Martha Ln, Santa Ana, CA 92706"
```

This:
- Scrapes Zillow for SqFt, Year Built
- Opens SCE Rebate Center
- Fills Project Information section
- Leaves browser open for review

### Option B: With Application ID

```bash
node autofill.js "1909 W Martha Ln, Santa Ana, CA 92706" 75114801
```

Also searches for the specific application after logging in.

### Option C: Full Case Workflow

1. Copy `example-case.json` and edit it:

```bash
cp example-case.json my-case.json
# Edit my-case.json with your data
```

2. Run full workflow:

```bash
npm run full my-case.json
```

---

## Keyboard Shortcuts During Automation

| Key | Action |
|-----|--------|
| `Ctrl+C` | Stop automation (closes browser) |

---

## Troubleshooting

### "Session expired"

Re-capture your session:
```bash
node capture-session.js
```

### Zillow not finding address

- Try different address format
- Check spelling
- Zillow may not have the property in their database

### Can't find specific fields

Field labels may have changed. Open an issue with:
- The field label you're trying to fill
- A screenshot of the form

---

## File Output

All scraped data saved to `./output/`:

```
output/
├── zillow_2026-01-29_12-30-00.json    # Raw Zillow data
├── autofill_2026-01-29_12-30-00.json  # Combined scrape + SCE data
└── completed_2026-01-29_12-30-00.json # Final case data
```

---

## Next Steps

1. ✅ Install dependencies
2. ✅ Capture session
3. ✅ Run test with example address
4. ✅ Create your first case file
5. ✅ Automate your workflow!
