/**
 * Tests for address-generator module
 */

import { parseAddress, generateAddressRange } from './address-generator.js';

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

// Run tests
try {
  testParseAddress();
  testGenerateAddressRange();
  console.log('\n=====================================');
  console.log('✅ ALL ADDRESS GENERATOR TESTS PASSED!');
  console.log('=====================================');
} catch (error) {
  console.error('\n❌ TEST FAILED:', error.message);
  process.exit(1);
}
