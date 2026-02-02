# SCE Extension Tools

This directory contains helper scripts for generating and maintaining the SCE Auto-Fill extension.

## generate-options.cjs

Generates the options page (HTML/JS) from a recording JSON file.

### Usage

```bash
# Generate config for content.js
node sce-extension/tools/generate-options.cjs "Recording.json" --config-only

# Generate full options.html and options.js
node sce-extension/tools/generate-options.cjs "Recording.json"
```

### How it works

1. Reads a Playwright/Puppeteer recording JSON file
2. Extracts field information based on known field labels
3. Generates the options page with tabs for each section
4. Creates the load/save JavaScript logic automatically

### Adding new fields

To add a new field to the options page:

1. Open `generate-options.cjs`
2. Add an entry to the `FIELD_SCHEMA` object:

```javascript
'Your Field Label': {
  type: 'select',           // or 'text', 'hidden'
  id: 'yourFieldId',        // config key name
  default: 'Default Value',
  section: 'assessment',    // tab section
  label: 'Your Field Label',
  options: ['Option1', 'Option2']  // for select fields
},
```

3. Add the section to `SECTIONS` if it's new:

```javascript
'your-section': {
  name: 'Your Section',
  icon: '🎯',
  description: 'Section description'
},
```

4. Run the generator

### Field types

- `text` - Text input field
- `select` - Dropdown with options
- `hidden` - Not shown in UI, only in config

### Sections

Available sections (tabs):
- `customer-search` - Customer search defaults
- `customer-info` - Customer information
- `additional-info` - Additional customer & demographics
- `enrollment` - Enrollment information
- `household` - Household members
- `project` - Project information
- `trade-ally` - Trade ally / project contact
- `appointment` - Appointment contact attempts
- `appointments` - Scheduled appointments
- `assessment` - Assessment questionnaire & equipment
- `equipment` - Equipment information
- `basic-enrollment` - Basic enrollment equipment
- `bonus` - Bonus/adjustment measures
- `terms` - Terms and conditions
- `uploads` - File uploads
- `comments` - Review comments
- `status` - Application status
- `behavior` - Extension behavior settings
