/**
 * Application Status Section Tests
 * Tests for customer data capture from Application Status page
 */

// Import the function to test
import { captureCustomerDataFromPage } from './application-status.js';

/**
 * Mock DOM environment for testing
 */
function setupMockDOM(html) {
  // Create a mock document if not available
  if (typeof document === 'undefined') {
    global.document = {
      querySelector: () => null,
      querySelectorAll: () => [],
      body: { textContent: html }
    };
    global.window = { location: { href: 'https://sce.dsmcentral.com/status?caseId=12345' } };
  }

  document.body.innerHTML = html;
}

/**
 * Test customer data capture with complete data
 */
function testCaptureCompleteData() {
  console.log('Testing capture with complete data...');

  const mockHTML = `
    <input readonly="true" aria-label="Homeowner Name" value="John Doe">
    <input type="tel" aria-label="Phone" value="(555) 123-4567">
    <input aria-label="Address" value="1909 W Martha Ln, Santa Ana, CA 92706">
  `;

  setupMockDOM(mockHTML);

  // Mock URL
  Object.defineProperty(window, 'location', {
    value: { href: 'https://sce.dsmcentral.com/status?caseId=12345', searchParams: new URLSearchParams({ caseId: '12345' }) }
  });

  const result = captureCustomerDataFromPage();

  if (!result) {
    throw new Error('Expected data but got null');
  }

  if (result.homeownerName !== 'John Doe') {
    throw new Error(`Expected name "John Doe", got "${result.homeownerName}"`);
  }

  if (result.homeownerPhone !== '(555) 123-4567') {
    throw new Error(`Expected phone "(555) 123-4567", got "${result.homeownerPhone}"`);
  }

  if (result.caseId !== '12345') {
    throw new Error(`Expected caseId "12345", got "${result.caseId}"`);
  }

  console.log('✅ testCaptureCompleteData passed');
}

/**
 * Test capture with missing fields
 */
function testCaptureMissingFields() {
  console.log('Testing capture with missing fields...');

  const mockHTML = `
    <div>Some page content</div>
  `;

  setupMockDOM(mockHTML);

  // Mock URL
  Object.defineProperty(window, 'location', {
    value: { href: 'https://sce.dsmcentral.com/status?caseId=67890', searchParams: new URLSearchParams({ caseId: '67890' }) }
  });

  const result = captureCustomerDataFromPage();

  // Should return null when no data found
  if (result !== null) {
    throw new Error('Expected null for missing data, but got result');
  }

  console.log('✅ testCaptureMissingFields passed');
}

/**
 * Test capture with partial data
 */
function testCapturePartialData() {
  console.log('Testing capture with partial data...');

  const mockHTML = `
    <input readonly="true" aria-label="Homeowner Name" value="Jane Smith">
    <div>Customer is qualified</div>
  `;

  setupMockDOM(mockHTML);

  // Mock URL
  Object.defineProperty(window, 'location', {
    value: { href: 'https://sce.dsmcentral.com/status?caseId=11111', searchParams: new URLSearchParams({ caseId: '11111' }) }
  });

  const result = captureCustomerDataFromPage();

  if (!result) {
    throw new Error('Expected partial data but got null');
  }

  if (result.homeownerName !== 'Jane Smith') {
    throw new Error(`Expected name "Jane Smith", got "${result.homeownerName}"`);
  }

  if (result.homeownerPhone !== null) {
    throw new Error(`Expected null phone, got "${result.homeownerPhone}"`);
  }

  if (!result.isQualified) {
    throw new Error('Expected customer to be qualified');
  }

  console.log('✅ testCapturePartialData passed');
}

/**
 * Test capture with disqualification
 */
function testCaptureDisqualified() {
  console.log('Testing capture with disqualification...');

  const mockHTML = `
    <input readonly="true" aria-label="Homeowner Name" value="Bob Johnson">
    <div>This customer is not qualified</div>
  `;

  setupMockDOM(mockHTML);

  const result = captureCustomerDataFromPage();

  if (result && result.isQualified) {
    throw new Error('Expected customer to be not qualified');
  }

  console.log('✅ testCaptureDisqualified passed');
}

/**
 * Run all tests
 */
function runTests() {
  console.log('=====================================');
  console.log('Application Status Tests');
  console.log('=====================================\n');

  try {
    testCaptureCompleteData();
    testCaptureMissingFields();
    testCapturePartialData();
    testCaptureDisqualified();

    console.log('\n=====================================');
    console.log('✅ ALL APPLICATION STATUS TESTS PASSED!');
    console.log('=====================================');
    return 0;
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    return 1;
  }
}

// Run tests if executed directly
if (typeof window === 'undefined') {
  process.exit(runTests());
}

export { runTests };
