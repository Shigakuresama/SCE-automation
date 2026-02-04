/**
 * End-to-End Integration Tests for Route Planner
 * Tests the complete workflow from address generation to PDF
 */

import { generateAddressRange } from '../modules/address-generator.js';
import { readFileSync, existsSync } from 'fs';

/**
 * Test address generation workflow
 */
function testAddressGenerationWorkflow() {
  console.log('Testing address generation workflow...');

  // Test 1: Generate odd side addresses
  const startAddr = "1909 W Martha Ln, Santa Ana, CA 92706";
  const endAddr = "1925 W Martha Ln, Santa Ana, CA 92706";

  const addresses = generateAddressRange(startAddr, endAddr, { side: 'odd' });

  if (!Array.isArray(addresses)) {
    throw new Error('Expected array of addresses');
  }

  if (addresses.length === 0) {
    throw new Error('Expected at least one address');
  }

  if (addresses.length !== 9) {
    throw new Error(`Expected 9 addresses (odd side 1909-1925), got ${addresses.length}`);
  }

  // Verify all are odd numbers
  for (const addr of addresses) {
    const num = parseInt(addr.number);
    if (num % 2 === 0) {
      throw new Error(`Expected odd number, got ${num} for ${addr.full}`);
    }
  }

  // Verify required fields
  const requiredFields = ['number', 'street', 'city', 'state', 'zip', 'full'];
  const firstAddr = addresses[0];

  for (const field of requiredFields) {
    if (!firstAddr[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  console.log(`  ✓ Generated ${addresses.length} odd addresses from ${startAddr} to ${endAddr}`);
  console.log('✅ testAddressGenerationWorkflow passed');
}

/**
 * Test address validation
 */
function testAddressValidation() {
  console.log('Testing address validation...');

  // Test invalid address range - now auto-swaps
  const addresses = generateAddressRange("1909 W Martha Ln, Santa Ana, CA 92706", "1905 W Martha Ln, Santa Ana, CA 92706");
  if (!Array.isArray(addresses) || addresses.length === 0) {
    throw new Error('Expected addresses to be generated (auto-swapped)');
  }
  console.log('  ✓ Auto-corrects reversed range');

  // Test max limit
  const start = "1 Main St, Santa Ana, CA 92706";
  const end = "100 Main St, Santa Ana, CA 92706";

  const maxAddresses = generateAddressRange(start, end, { side: 'both' });

  if (maxAddresses.length > 50) {
    throw new Error(`Should max at 50 addresses, got ${maxAddresses.length}`);
  }

  console.log(`  ✓ Correctly limited to ${maxAddresses.length} addresses`);
  console.log('✅ testAddressValidation passed');
}

/**
 * Test street/ZIP consistency
 */
function testStreetZipConsistency() {
  console.log('Testing street/ZIP consistency...');

  try {
    generateAddressRange("1909 W Martha Ln, Santa Ana, CA 92706", "1925 W Oak St, Santa Ana, CA 92706");
    throw new Error('Should throw error for street mismatch');
  } catch (error) {
    if (!error.message.includes('Street name must match')) {
      throw new Error(`Expected "Street name must match" error, got: ${error.message}`);
    }
  }

  console.log('  ✓ Correctly rejected mismatched streets');
  console.log('✅ testStreetZipConsistency passed');
}

/**
 * Test PDF generation prerequisites
 */
function testPDFPrerequisites() {
  console.log('Testing PDF generation prerequisites...');

  // Verify jsPDF is accessible (will be available in browser context)
  if (typeof window !== 'undefined' && window.jspdf) {
    console.log('  ✓ jsPDF is available in window context');
  } else {
    console.log('  ⚠️  jsPDF not in current context (will be available in browser)');
  }

  // Verify PDF generator module exists
  const pdfPath = 'sce-extension/modules/pdf-generator.js';

  if (!existsSync(pdfPath)) {
    throw new Error(`PDF generator module not found: ${pdfPath}`);
  }

  const content = readFileSync(pdfPath, 'utf8');

  if (!content.includes('generateCanvassPDF')) {
    throw new Error('PDF generator missing generateCanvassPDF function');
  }

  if (!content.includes('downloadCanvassPDF')) {
    throw new Error('PDF generator missing downloadCanvassPDF function');
  }

  console.log('  ✓ PDF generator module has required functions');
  console.log('✅ testPDFPrerequisites passed');
}

/**
 * Run all integration tests
 */
function runTests() {
  console.log('=====================================');
  console.log('Route Planner Integration Tests');
  console.log('=====================================\n');

  try {
    testAddressGenerationWorkflow();
    testAddressValidation();
    testStreetZipConsistency();
    testPDFPrerequisites();

    console.log('\n=====================================');
    console.log('✅ ALL INTEGRATION TESTS PASSED!');
    console.log('=====================================');
    console.log('\n📝 Test Summary:');
    console.log('  - Address generation workflow: ✓');
    console.log('  - Validation: ✓');
    console.log('  - Street/ZIP consistency: ✓');
    console.log('  - PDF prerequisites: ✓');
    console.log('\nNote: Full end-to-end tests require browser context with Chrome APIs');
    return 0;
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
    return 1;
  }
}

// Run tests if executed directly
if (typeof window === 'undefined') {
  process.exit(runTests());
}

export { runTests };
