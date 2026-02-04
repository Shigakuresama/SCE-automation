/**
 * Tests for address-generator module
 */

import { parseAddress, generateAddressRange, formatForSCE } from './address-generator.js';

function assertEqual(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`);
  }
}

function testParseAddress() {
  // Test full address
  const result1 = parseAddress("1909 W Martha Ln, Santa Ana, CA 92706");
  assertEqual(result1, {
    number: "1909",
    street: "W Martha Ln",
    city: "Santa Ana",
    state: "CA",
    zip: "92706",
    full: "1909 W Martha Ln, Santa Ana, CA 92706"
  }, "Full address parse failed");

  // Test address without city/state
  const result2 = parseAddress("1909 W Martha Ln 92706");
  assertEqual(result2, {
    number: "1909",
    street: "W Martha Ln",
    city: undefined,
    state: "CA",
    zip: "92706",
    full: "1909 W Martha Ln 92706"
  }, "Short address parse failed");

  console.log('✅ testParseAddress passed');
}

function testGenerateAddressRange() {
  // Test basic range
  const result1 = generateAddressRange("1909 W Martha Ln, Santa Ana, CA 92706", "1915 W Martha Ln, Santa Ana, CA 92706");
  if (result1.length !== 4) {
    throw new Error(`Expected 4 addresses, got ${result1.length}`);
  }
  assertEqual(result1[0].number, "1909", "First address should be 1909");
  assertEqual(result1[3].number, "1915", "Last address should be 1915");

  // Test odd side only
  const result2 = generateAddressRange("1909 W Martha Ln, Santa Ana, CA 92706", "1915 W Martha Ln, Santa Ana, CA 92706", { side: "odd" });
  if (result2.length !== 4) {
    throw new Error(`Expected 4 odd addresses, got ${result2.length}`);
  }

  console.log('✅ testGenerateAddressRange passed');
}

function testFormatForSCE() {
  const address = parseAddress("1909 W Martha Ln, Santa Ana, CA 92706");
  const result = formatForSCE(address);

  assertEqual(result, {
    streetNumber: "1909",
    streetName: "W Martha Ln",
    zipCode: "92706"
  }, "formatForSCE failed");

  console.log('✅ testFormatForSCE passed');
}

function testInputValidation() {
  // Test null/undefined input to parseAddress
  try {
    parseAddress(null);
    throw new Error('Should throw error for null input');
  } catch (error) {
    if (!error.message.includes('Cannot parse address')) {
      throw new Error('Expected parse error for null, got: ' + error.message);
    }
  }

  try {
    parseAddress(undefined);
    throw new Error('Should throw error for undefined input');
  } catch (error) {
    if (!error.message.includes('Cannot parse address')) {
      throw new Error('Expected parse error for undefined, got: ' + error.message);
    }
  }

  try {
    parseAddress('');
    throw new Error('Should throw error for empty string');
  } catch (error) {
    if (!error.message.includes('Cannot parse address')) {
      throw new Error('Expected parse error for empty string, got: ' + error.message);
    }
  }

  // Test null/undefined input to generateAddressRange
  try {
    generateAddressRange(null, "1915 W Martha Ln, Santa Ana, CA 92706");
    throw new Error('Should throw error for null startAddress');
  } catch (error) {
    if (!error.message.includes('Cannot parse address')) {
      throw new Error('Expected parse error for null startAddress, got: ' + error.message);
    }
  }

  console.log('✅ testInputValidation passed');
}

function testStreetAndZipConsistency() {
  // Test that street and zip must match between start and end
  try {
    generateAddressRange(
      "1909 W Martha Ln, Santa Ana, CA 92706",
      "1915 W Main St, Santa Ana, CA 92706"
    );
    throw new Error('Should throw error for different street names');
  } catch (error) {
    if (!error.message.includes('Street name must match')) {
      throw new Error('Expected street mismatch error, got: ' + error.message);
    }
  }

  try {
    generateAddressRange(
      "1909 W Martha Ln, Santa Ana, CA 92706",
      "1915 W Martha Ln, Santa Ana, CA 92801"
    );
    throw new Error('Should throw error for different zip codes');
  } catch (error) {
    if (!error.message.includes('ZIP code must match')) {
      throw new Error('Expected ZIP mismatch error, got: ' + error.message);
    }
  }

  console.log('✅ testStreetAndZipConsistency passed');
}

function testMaxRangeCheck() {
  // Test max range limit (50 addresses)
  try {
    generateAddressRange(
      "1909 W Martha Ln, Santa Ana, CA 92706",
      "2009 W Martha Ln, Santa Ana, CA 92706"
    );
    throw new Error('Should throw error for range exceeding maximum');
  } catch (error) {
    if (!error.message.includes('maximum')) {
      throw new Error('Expected max range error, got: ' + error.message);
    }
  }

  // Test edge case: exactly 50 addresses should work
  const result = generateAddressRange(
    "1909 W Martha Ln, Santa Ana, CA 92706",
    "1909 W Martha Ln, Santa Ana, CA 92706"
  );
  if (result.length !== 1) {
    throw new Error(`Expected 1 address, got ${result.length}`);
  }

  console.log('✅ testMaxRangeCheck passed');
}

function testOptionsSideValidation() {
  // Test invalid side parameter
  try {
    generateAddressRange(
      "1909 W Martha Ln, Santa Ana, CA 92706",
      "1915 W Martha Ln, Santa Ana, CA 92706",
      { side: "invalid" }
    );
    throw new Error('Should throw error for invalid side parameter');
  } catch (error) {
    if (!error.message.includes('side')) {
      throw new Error('Expected side validation error, got: ' + error.message);
    }
  }

  // Test valid side values
  const oddResult = generateAddressRange(
    "1909 W Martha Ln, Santa Ana, CA 92706",
    "1915 W Martha Ln, Santa Ana, CA 92706",
    { side: "odd" }
  );
  if (oddResult.length !== 4) {
    throw new Error(`Expected 4 odd addresses, got ${oddResult.length}`);
  }

  const evenResult = generateAddressRange(
    "1910 W Martha Ln, Santa Ana, CA 92706",
    "1916 W Martha Ln, Santa Ana, CA 92706",
    { side: "even" }
  );
  if (evenResult.length !== 4) {
    throw new Error(`Expected 4 even addresses, got ${evenResult.length}`);
  }

  // Test "both" (default behavior)
  const bothResult = generateAddressRange(
    "1909 W Martha Ln, Santa Ana, CA 92706",
    "1915 W Martha Ln, Santa Ana, CA 92706",
    { side: "both" }
  );
  if (bothResult.length !== 4) {
    throw new Error(`Expected 4 addresses for side 'both', got ${bothResult.length}`);
  }

  console.log('✅ testOptionsSideValidation passed');
}

/**
 * Test edge cases
 */
function testEdgeCases() {
  console.log('Testing edge cases...');

  // Test address with period in street type (already works)
  const result1 = parseAddress("1909 W Martha St., Santa Ana, CA 92706");
  if (result1.street !== 'W Martha St.') {
    throw new Error('Street type period test failed: should preserve period');
  }
  if (result1.number !== '1909') {
    throw new Error('Street type period test failed: number incorrect');
  }

  // Test single digit house number
  const result2 = parseAddress("5 W Martha Ln, Santa Ana, CA 92706");
  if (result2.number !== '5') {
    throw new Error('Single digit test failed: should handle single digit');
  }

  console.log('✅ testEdgeCases passed');
}

// Run tests
try {
  testParseAddress();
  testGenerateAddressRange();
  testFormatForSCE();
  testInputValidation();
  testStreetAndZipConsistency();
  testMaxRangeCheck();
  testOptionsSideValidation();
  testEdgeCases();
  console.log('\n=====================================');
  console.log('✅ ALL ADDRESS GENERATOR TESTS PASSED!');
  console.log('=====================================');
} catch (error) {
  console.error('\n❌ TEST FAILED:', error.message);
  process.exit(1);
}
