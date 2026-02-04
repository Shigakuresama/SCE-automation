/**
 * Address Generator Module
 * Generates address lists from ranges for block canvassing
 */

/**
 * Parse address string into components
 * @param {string} address - "1909 W Martha Ln, Santa Ana, CA 92706" or "1909 W Martha Ln 92706"
 * @returns {Object} Parsed address components
 */
export function parseAddress(address) {
  // Try full format: "1909 W Martha Ln, Santa Ana, CA 92706"
  const match = address.match(/^(\d+)\s+(.+?),\s*(.+?),\s*([A-Z]{2})\s*(\d{5})/);

  if (match) {
    return {
      number: match[1],
      street: match[2].trim(),
      city: match[3]?.trim(),
      state: match[4],
      zip: match[5],
      full: address,
    };
  }

  // Try short format: "1909 W Martha Ln 92706" (no city/state)
  const match2 = address.match(/^(\d+)\s+(.+?)\s+(\d{5})/);
  if (match2) {
    return {
      number: match2[1],
      street: match2[2].trim(),
      city: undefined,
      state: "CA",
      zip: match2[3],
      full: address,
    };
  }

  throw new Error(`Cannot parse address: ${address}`);
}

/**
 * Generate list of addresses from a range
 * @param {string} startAddress - Starting address
 * @param {string} endAddress - Ending address
 * @param {Object} options - Options { side: 'both'|'odd'|'even', skip: string[] }
 * @returns {Array<Object>} List of address objects
 */
export function generateAddressRange(startAddress, endAddress, options = {}) {
  const start = parseAddress(startAddress);
  const end = parseAddress(endAddress);

  const startNum = parseInt(start.number);
  const endNum = parseInt(end.number);

  // Auto-swap if end < start
  if (endNum < startNum) {
    console.log('⚠️  End address < Start address - swapping for you');
    return generateAddressRange(endAddress, startAddress, options);
  }

  // Determine step - always step by 2 to maintain street parity
  const step = 2;

  const addresses = [];
  const skip = new Set(options.skip || []);

  for (let num = startNum; num <= endNum; num += step) {
    // Filter by odd/even if specified
    if (options.side === 'odd' && num % 2 === 0) continue;
    if (options.side === 'even' && num % 2 !== 0) continue;

    const numStr = String(num);
    if (skip.has(numStr)) continue;

    addresses.push({
      number: numStr,
      street: start.street,
      city: start.city || end.city,
      state: start.state,
      zip: start.zip,
      full: `${numStr} ${start.street}, ${start.city || ''} ${start.state} ${start.zip}`.trim()
    });
  }

  return addresses;
}

/**
 * Format address for SCE form inputs
 * @param {Object} address - Address object from parseAddress()
 * @returns {Object} { streetNumber, streetName, zipCode }
 */
export function formatForSCE(address) {
  return {
    streetNumber: address.number,
    streetName: address.street,
    zipCode: address.zip,
  };
}
