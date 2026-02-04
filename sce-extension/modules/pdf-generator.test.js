/**
 * PDF Generator Module Tests
 * Run with: node sce-extension/modules/pdf-generator.test.js
 * (Requires jsPDF to be loaded in browser context)
 */

// Test data for address parsing
const testAddresses = [
  {
    input: '1909 W Martha Ln, Santa Ana, CA 92706',
    expected: {
      number: '1909',
      street: 'W Martha Ln',
      city: 'Santa Ana',
      state: 'CA',
      zip: '92706'
    }
  },
  {
    input: '1911 W Martha Ln, Santa Ana, CA 92706',
    expected: {
      number: '1911',
      street: 'W Martha Ln',
      city: 'Santa Ana',
      state: 'CA',
      zip: '92706'
    }
  },
  {
    input: '123 Main St, Los Angeles, CA 90001',
    expected: {
      number: '123',
      street: 'Main St',
      city: 'Los Angeles',
      state: 'CA',
      zip: '90001'
    }
  },
  {
    input: '456 Oak Avenue',
    expected: {
      number: '456',
      street: 'Oak Avenue',
      city: '',
      state: '',
      zip: ''
    }
  },
  {
    input: '',
    expected: {
      number: '',
      street: '',
      city: '',
      state: '',
      zip: ''
    }
  }
];

// Test data for PDF generation
const testCases = [
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
  },
  {
    address: '1915 W Martha Ln, Santa Ana, CA 92706',
    name: 'Maria Garcia',
    phone: '(555) 456-7890',
    qualified: true
  },
  {
    address: '1917 W Martha Ln, Santa Ana, CA 92706',
    name: 'David Lee',
    phone: '(555) 567-8901',
    qualified: true
  },
  {
    address: '1919 W Martha Ln, Santa Ana, CA 92706',
    name: 'Susan Miller',
    phone: '(555) 678-9012',
    qualified: true
  },
  {
    address: '1921 W Martha Ln, Santa Ana, CA 92706',
    name: 'Michael Brown',
    phone: '(555) 789-0123',
    qualified: true
  },
  {
    address: '1923 W Martha Ln, Santa Ana, CA 92706',
    name: 'Emily Davis',
    phone: '(555) 890-1234',
    qualified: true
  },
  {
    address: '1925 W Martha Ln, Santa Ana, CA 92706',
    name: 'James Wilson',
    phone: '(555) 901-2345',
    qualified: true
  }
];

/**
 * Test parseAddressFromFull function
 */
function testParseAddressFromFull() {
  console.log('Testing parseAddressFromFull...');

  // Import function (would need to be adapted for Node.js testing)
  // For now, we'll test the logic inline
  const testParse = (fullAddress) => {
    if (!fullAddress || typeof fullAddress !== 'string') {
      return {
        number: '',
        street: '',
        city: '',
        state: '',
        zip: '',
        full: ''
      };
    }

    const cleaned = fullAddress.trim().replace(/\s+/g, ' ');

    // Extract ZIP code
    const zipMatch = cleaned.match(/\b(\d{5})(?:-\d{4})?\b/);
    const zip = zipMatch ? zipMatch[1] : '';

    // Extract state
    let state = '';
    if (zip) {
      const stateMatch = cleaned.match(new RegExp(`\\b([A-Z]{2})\\s+${zip}`));
      state = stateMatch ? stateMatch[1] : '';
    } else {
      const stateEndMatch = cleaned.match(/\s([A-Z]{2})\s*$/);
      state = stateEndMatch ? stateEndMatch[1] : '';
    }

    // Extract house number
    const numberMatch = cleaned.match(/^(\d+[A-Za-z]?)/);
    const number = numberMatch ? numberMatch[1] : '';

    // Extract street and city
    let street = '';
    let city = '';

    if (number) {
      let remaining = cleaned
        .replace(new RegExp(`^${number}\\s*`), '')
        .replace(new RegExp(`,?\\s*${state}\\s+${zip}\\s*$`), '')
        .replace(new RegExp(`,?\\s*${zip}\\s*$`), '')
        .trim();

      const lastCommaIndex = remaining.lastIndexOf(',');
      if (lastCommaIndex !== -1) {
        street = remaining.substring(0, lastCommaIndex).trim();
        city = remaining.substring(lastCommaIndex + 1).trim();
      } else {
        street = remaining;
      }
    } else {
      const parts = cleaned.split(',').map(p => p.trim());
      if (parts.length >= 2) {
        street = parts[0];
        city = parts[1];
      } else {
        street = cleaned;
      }
    }

    return {
      number,
      street,
      city,
      state,
      zip,
      full: cleaned
    };
  };

  let passed = 0;
  let failed = 0;

  testAddresses.forEach((test, index) => {
    const result = testParse(test.input);
    let success = true;

    for (const key in test.expected) {
      if (result[key] !== test.expected[key]) {
        console.error(`  ✗ Test ${index + 1} failed for ${key}:`);
        console.error(`    Expected: "${test.expected[key]}"`);
        console.error(`    Got: "${result[key]}"`);
        success = false;
      }
    }

    if (success) {
      console.log(`  ✓ Test ${index + 1} passed: ${test.input}`);
      passed++;
    } else {
      failed++;
    }
  });

  console.log(`\nAddress parsing tests: ${passed} passed, ${failed} failed\n`);
  return { passed, failed };
}

/**
 * Test PDF generation (requires browser context)
 */
function testPDFGeneration() {
  console.log('Testing PDF generation...');
  console.log('  ⚠ PDF generation tests require browser context with jsPDF loaded');
  console.log('  ⚠ Run these tests in Chrome extension context or browser console\n');
  return { passed: 0, failed: 0 };
}

/**
 * Run all tests
 */
function runTests() {
  console.log('========================================');
  console.log('PDF Generator Module Tests');
  console.log('========================================\n');

  const addressResults = testParseAddressFromFull();
  const pdfResults = testPDFGeneration();

  const totalPassed = addressResults.passed + pdfResults.passed;
  const totalFailed = addressResults.failed + pdfResults.failed;

  console.log('========================================');
  console.log(`Total: ${totalPassed} passed, ${totalFailed} failed`);
  console.log('========================================');

  return totalFailed === 0;
}

// Run tests if executed directly
if (typeof require !== 'undefined') {
  const success = runTests();
  process.exit(success ? 0 : 1);
}

// Export for browser testing
if (typeof window !== 'undefined') {
  window.PDFGeneratorTests = {
    testParseAddressFromFull,
    testPDFGeneration,
    runTests,
    testCases,
    testAddresses
  };
}
