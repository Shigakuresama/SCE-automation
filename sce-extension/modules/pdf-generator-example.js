/**
 * PDF Generator Module Usage Examples
 *
 * This file demonstrates how to use the pdf-generator module
 * in various contexts.
 */

// Example 1: Basic address parsing
// =================================

import { parseAddressFromFull } from './pdf-generator.js';

const address1 = '1909 W Martha Ln, Santa Ana, CA 92706';
const parsed1 = parseAddressFromFull(address1);

console.log('Example 1: Basic Address Parsing');
console.log('Input:', address1);
console.log('Parsed:', parsed1);
console.log('');

// Example 2: Parsing multiple addresses
// =======================================

const addresses = [
  '1909 W Martha Ln, Santa Ana, CA 92706',
  '1911 W Martha Ln, Santa Ana, CA 92706',
  '123 Main St, Los Angeles, CA 90001',
  '456 Oak Avenue' // incomplete address
];

console.log('Example 2: Multiple Address Parsing');
addresses.forEach(addr => {
  const parsed = parseAddressFromFull(addr);
  console.log(`${addr} -> ${parsed.number} ${parsed.street}, ${parsed.city}`);
});
console.log('');

// Example 3: Generate PDF with customer data
// ===========================================

import { generateCanvassPDF } from './pdf-generator.js';

const customerCases = [
  {
    address: '1909 W Martha Ln, Santa Ana, CA 92706',
    name: 'John Doe',
    phone: '(555) 123-4567',
    qualified: true
  },
  {
    address: '1911 W Martha Ln, Santa Ana, CA 92706',
    name: 'Jane Smith',
    phone: '(555) 234-5678',
    qualified: true
  },
  {
    address: '1913 W Martha Ln, Santa Ana, CA 92706',
    name: 'Robert Johnson',
    phone: '(555) 345-6789',
    qualified: false
  }
  // ... add up to 9 cases
];

try {
  console.log('Example 3: Generate PDF');
  const doc = generateCanvassPDF(customerCases);
  console.log('PDF document generated successfully');
  console.log('You can now call doc.save() or doc.output()');
  console.log('');
} catch (error) {
  console.error('Failed to generate PDF:', error.message);
  console.error('Make sure jsPDF library is loaded');
  console.log('');
}

// Example 4: Download PDF directly
// ==================================

import { downloadCanvassPDF } from './pdf-generator.js';

const routeData = [
  { address: '1909 W Martha Ln, Santa Ana, CA 92706', name: 'John Doe', phone: '(555) 123-4567' },
  { address: '1911 W Martha Ln, Santa Ana, CA 92706', name: 'Jane Smith', phone: '(555) 234-5678' },
  { address: '1913 W Martha Ln, Santa Ana, CA 92706', name: 'Robert Johnson', phone: '(555) 345-6789' },
  { address: '1915 W Martha Ln, Santa Ana, CA 92706', name: 'Maria Garcia', phone: '(555) 456-7890' },
  { address: '1917 W Martha Ln, Santa Ana, CA 92706', name: 'David Lee', phone: '(555) 567-8901' },
  { address: '1919 W Martha Ln, Santa Ana, CA 92706', name: 'Susan Miller', phone: '(555) 678-9012' },
  { address: '1921 W Martha Ln, Santa Ana, CA 92706', name: 'Michael Brown', phone: '(555) 789-0123' },
  { address: '1923 W Martha Ln, Santa Ana, CA 92706', name: 'Emily Davis', phone: '(555) 890-1234' },
  { address: '1925 W Martha Ln, Santa Ana, CA 92706', name: 'James Wilson', phone: '(555) 901-2345' }
];

// Auto-generated filename
downloadCanvassPDF(routeData)
  .then(filename => {
    console.log('Example 4a: Download with auto-generated filename');
    console.log('Downloaded:', filename);
    console.log('');
  })
  .catch(error => {
    console.error('Download failed:', error.message);
    console.log('');
  });

// Custom filename
downloadCanvassPDF(routeData, 'my-canvassing-route')
  .then(filename => {
    console.log('Example 4b: Download with custom filename');
    console.log('Downloaded:', filename);
    console.log('');
  })
  .catch(error => {
    console.error('Download failed:', error.message);
    console.log('');
  });

// Example 5: Custom PDF options
// ==============================

import { downloadCanvassPDF } from './pdf-generator.js';

const customOptions = {
  title: 'SCE Residential Canvassing - February 2026',
  orientation: 'landscape',
  format: 'letter'
};

downloadCanvassPDF(routeData, 'custom-route', customOptions)
  .then(filename => {
    console.log('Example 5: Custom PDF options');
    console.log('Downloaded:', filename);
    console.log('Options:', customOptions);
    console.log('');
  })
  .catch(error => {
    console.error('Download failed:', error.message);
    console.log('');
  });

// Example 6: Error handling
// ==========================

import { downloadCanvassPDF } from './pdf-generator.js';

console.log('Example 6: Error Handling');

// Empty array - should throw error
try {
  downloadCanvassPDF([]);
} catch (error) {
  console.log('Caught expected error for empty array:', error.message);
}

// Invalid address format - should still work
const invalidCase = [{ address: '', name: 'Test', phone: '555-0000' }];
downloadCanvassPDF(invalidCase, 'test-invalid')
  .then(filename => {
    console.log('Successfully handled invalid address:', filename);
  })
  .catch(error => {
    console.log('Error with invalid case:', error.message);
  });

// Example 7: Using in Chrome Extension
// ======================================

/*
In background.js or route-processor.js:

import { downloadCanvassPDF } from './modules/pdf-generator.js';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'downloadRoutePDF') {
    const cases = message.cases;
    const filename = message.filename || 'canvassing-route';

    downloadCanvassPDF(cases, filename)
      .then(actualFilename => {
        sendResponse({ success: true, filename: actualFilename });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });

    return true; // Keep message channel open for async response
  }
});

// From popup or content script:
chrome.runtime.sendMessage({
  action: 'downloadRoutePDF',
  cases: routeData,
  filename: 'my-route'
}, (response) => {
  if (response.success) {
    console.log('PDF downloaded:', response.filename);
  } else {
    console.error('Failed:', response.error);
  }
});
*/

console.log('Example 7: Chrome Extension integration (see code comments)');
console.log('');

// Example 8: Processing incomplete data
// ======================================

const incompleteCases = [
  { address: '1909 W Martha Ln', name: 'John Doe', phone: '' }, // Missing city/state/zip/phone
  { address: '', name: 'Jane Smith', phone: '(555) 234-5678' }, // Missing address
  { address: '1913 W Martha Ln, Santa Ana, CA 92706' } // Missing name and phone
];

console.log('Example 8: Handling incomplete data');
downloadCanvassPDF(incompleteCases, 'incomplete-data-route')
  .then(filename => {
    console.log('Successfully generated PDF with incomplete data:', filename);
    console.log('Module handles missing data gracefully');
  })
  .catch(error => {
    console.error('Error:', error.message);
  });
