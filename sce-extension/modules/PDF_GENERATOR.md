# PDF Generator Module

## Overview

The PDF Generator module (`pdf-generator.js`) creates 3x3 grid PDF documents for door-to-door canvassing. It uses the jsPDF library to generate professional-looking canvassing sheets with customer information.

## Functions

### `parseAddressFromFull(fullAddress)`

Parses a full address string into its components.

**Parameters:**
- `fullAddress` (string): Full address like "1909 W Martha Ln, Santa Ana, CA 92706"

**Returns:** Object with parsed components:
```javascript
{
  number: '1909',        // House number
  street: 'W Martha Ln', // Street name
  city: 'Santa Ana',     // City
  state: 'CA',          // State abbreviation
  zip: '92706',         // ZIP code
  full: '1909 W Martha Ln, Santa Ana, CA 92706' // Original
}
```

**Example:**
```javascript
import { parseAddressFromFull } from './modules/pdf-generator.js';

const addr = parseAddressFromFull('1909 W Martha Ln, Santa Ana, CA 92706');
console.log(addr.street); // "W Martha Ln"
console.log(addr.zip);    // "92706"
```

### `generateCanvassPDF(cases, options)`

Generates a 3x3 grid PDF document for canvassing.

**Parameters:**
- `cases` (Array<Object>): Array of case data objects, each containing:
  - `address` (string): Full address
  - `name` (string): Customer name
  - `phone` (string): Phone number
  - `qualified` (boolean, optional): Whether customer is qualified

- `options` (Object, optional): Configuration options
  - `title` (string): Document title (default: "SCE DOOR-TO-DOOR CANVASSING ROUTE")
  - `orientation` (string): Page orientation - 'landscape' or 'portrait' (default: 'landscape')
  - `format` (string): Page format (default: 'letter')

**Returns:** jsPDF document instance

**Example:**
```javascript
import { generateCanvassPDF } from './modules/pdf-generator.js';

const cases = [
  {
    address: '1909 W Martha Ln, Santa Ana, CA 92706',
    name: 'John Doe',
    phone: '(555) 123-4567',
    qualified: true
  },
  // ... up to 9 cases
];

const doc = generateCanvassPDF(cases);
// Further customization or saving can be done here
```

### `downloadCanvassPDF(cases, filename, options)`

Generates and downloads a PDF document.

**Parameters:**
- `cases` (Array<Object>): Array of case data (same as `generateCanvassPDF`)
- `filename` (string): Desired filename without .pdf extension (auto-generated if not provided)
- `options` (Object, optional): Configuration options (same as `generateCanvassPDF`)

**Returns:** Promise that resolves to the actual filename used

**Example:**
```javascript
import { downloadCanvassPDF } from './modules/pdf-generator.js';

const cases = [ /* ... case data ... */ ];

// Auto-generated filename: "w-martha-ln-2026-02-03-canvass.pdf"
await downloadCanvassPDF(cases);

// Custom filename
await downloadCanvassPDF(cases, 'my-route-123');
// Downloads: "my-route-123.pdf"
```

## PDF Layout

The generated PDF contains:

### Header
- Document title
- Street/location information
- Generation date
- Instructions

### 3x3 Grid (9 cards per page)
Each card shows:
- Case number (1-9)
- Full address (number, street, city, state, ZIP)
- Customer name
- Phone number
- Blank age field (for manual entry)
- Lined notes area (3 lines)
- Checkboxes: Qualified, Interested, Scheduled

### Footer
- Generation credit

## Usage in Chrome Extension

### Background Script
```javascript
// In background.js or route-processor.js
import { downloadCanvassPDF } from './modules/pdf-generator.js';

// After collecting all case data
const routeData = [
  { address: '1909 W Martha Ln, Santa Ana, CA 92706', name: 'John Doe', phone: '(555) 123-4567' },
  // ... more cases
];

await downloadCanvassPDF(routeData, 'w-martha-ln-canvass');
```

### Content Script (not recommended - use background script)
```javascript
// Content scripts have limited access to jsPDF
// Better to send data to background script:
chrome.runtime.sendMessage({
  action: 'generatePDF',
  cases: routeData
});
```

## Testing

Run the test suite:

```bash
# From project root
node sce-extension/modules/pdf-generator.test.js

# Or with explicit require
node -e "require('./sce-extension/modules/pdf-generator.test.js');"
```

### Test Coverage

The test suite validates:
- Address parsing from various formats
- Handling of incomplete addresses
- Edge cases (empty strings, missing components)
- PDF generation (requires browser context)

## Dependencies

- **jsPDF**: PDF generation library (loaded via `lib/jspdf.umd.min.js`)
  - Available globally as `window.jspdf.jsPDF`

## Error Handling

The module throws errors for:
- Missing jsPDF library
- Empty or invalid cases array
- PDF generation failures

Always wrap calls in try-catch:

```javascript
try {
  await downloadCanvassPDF(cases, filename);
} catch (error) {
  console.error('PDF generation failed:', error);
  // Show error to user
}
```

## Browser Compatibility

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support (with jsPDF polyfill if needed)

## File Size

- Module: ~9KB (unminified)
- Test file: ~6.5KB
- Generated PDF: ~50-100KB (9 cases)

## Future Enhancements

Potential improvements:
- Multi-page support (10+ cases)
- Customizable card layout
- QR codes per address
- Mini-map integration
- Fillable form fields
- Custom fonts and branding
- CSV export fallback
