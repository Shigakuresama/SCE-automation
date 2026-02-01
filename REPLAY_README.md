# SCE Rebate Center - Replay Automation

This directory contains automation scripts for filling SCE Rebate Center forms based on JSON recordings.

## Files Created

### 1. `replay-recording.js` - Playwright Automation

Replay JSON recordings or fill forms with data programmatically.

```bash
# Replay a recording exactly as recorded
node replay-recording.js "/path/to/recording.json"

# Run in headless mode
node replay-recording.js "/path/to/recording.json" --headless

# Fill with custom data (smart form fill mode)
node replay-recording.js recording.json --data='{
  "address": "22029 Seine Ave",
  "zipCode": "90716",
  "contactPhone": "(562) 348-5375",
  "spaceOrUnit": "1",
  "householdUnits": "2"
}'
```

### 2. `sce-replay-helper.user.js` - Tampermonkey Script

Interactive form filling helper that runs in the browser.

**Installation:**
1. Install Tampermonkey extension for your browser
2. Open `sce-replay-helper.user.js` and copy its contents
3. Create a new Tampermonkey script and paste the code

**Usage:**
- Click the floating 📝 button (or press Alt+R) to open the replay panel
- Paste JSON data or select a preset
- Click "Fill Form" to automatically fill all fields

**Keyboard Shortcuts:**
- `Alt+R` - Open replay panel
- `Alt+S` - Save form
- `Alt+Shift+N` - Go to next incomplete section

**Console API:**
```javascript
// Fill form with data
SCEReplay.fill({
  contactPhone: "(562) 348-5375",
  contactEmail: "gmariaca38@gmail.com",
  spaceOrUnit: "1",
  householdUnits: "2"
});

// Navigate to section
SCEReplay.goToSection("Project Information");

// Fill individual field
SCEReplay.fillField("Contact Phone", "(562) 348-5375");
```

## Field Mappings

| JSON Key | Form Field |
|----------|------------|
| `streetAddress` | Street Address (search) |
| `zipCode` | Zip Code (search) |
| `mailingZip` | Mailing Zip |
| `contactPhone` | Contact Phone |
| `contactEmail` | Contact Email |
| `spaceOrUnit` | Space Or Unit |
| `householdUnits` | Household Units |
| `projectContactFirstName` | Project Contact First Name |
| `projectContactTitle` | Project Contact Title |
| `projectContactPhone` | Project Contact Phone |
| `howDidYouHear` | How did you hear about us |
| `language` | Language preference |

## Example Data

Based on the recording `Recording 1_31_2026 at 4_23_18 PM.json`:

```json
{
  "address": "22029 Seine Ave",
  "zipCode": "90716",
  "contactPhone": "(562) 348-5375",
  "contactEmail": "gmariaca38@gmail.com",
  "howDidYouHear": "Other",
  "language": "Spanish",
  "spaceOrUnit": "1",
  "householdUnits": "2",
  "projectContactFirstName": "Sergio",
  "projectContactTitle": "Outreach",
  "projectContactPhone": "7143912727"
}
```

## Workflow Summary

1. **Customer Search** - Enter address and zip to find customer
2. **Select Customer** - Choose from search results
3. **Select Program** - Click on available rebate program
4. **Customer Information** - Fill contact details
5. **Project Information** - Fill property details
6. **Enrollment Information** - Fill project contact details
7. **Submit** - Submit the application
