/**
 * Address Ordering Module
 * Orders addresses in clockwise perimeter around a block
 */

/**
 * Order addresses clockwise around a block center
 * @param {Array<Object>} addresses - Array of addresses with lat/lon
 * @param {Object} center - Block center { lat, lon }
 * @returns {Array<Object>} Addresses with position field added
 */
export function orderClockwise(addresses, center) {
  return addresses.map((addr, idx) => {
    // Calculate angle from center to address
    // Math.atan2(y, x) returns angle in radians from -PI to PI
    // We want clockwise ordering, so we negate the result
    const latDiff = addr.lat - center.lat;
    const lonDiff = addr.lon - center.lon;
    const angle = Math.atan2(latDiff, lonDiff);

    return {
      ...addr,
      position: idx,
      angle: angle,
      // Add display position (1-based)
      displayPosition: idx + 1
    };
  }).sort((a, b) => {
    // Sort by angle descending for clockwise order
    // If angles are equal, sort by distance (closer first)
    if (Math.abs(a.angle - b.angle) < 0.001) {
      const distA = getDistance(center, a);
      const distB = getDistance(center, b);
      return distA - distB;
    }
    return b.angle - a.angle;
  }).map((addr, idx) => ({
    ...addr,
    position: idx,
    displayPosition: idx + 1
  }));
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 * @param {Object} coord1 - First coordinate { lat, lon }
 * @param {Object} coord2 - Second coordinate { lat, lon }
 * @returns {number} Distance in meters
 */
export function getDistance(coord1, coord2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = coord1.lat * Math.PI / 180;
  const φ2 = coord2.lat * Math.PI / 180;
  const Δφ = (coord2.lat - coord1.lat) * Math.PI / 180;
  const Δλ = (coord2.lon - coord1.lon) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

/**
 * Remove duplicate corner addresses
 * @param {Array<Object>} addresses - Ordered addresses
 * @returns {Array<Object>} Deduplicated addresses
 */
export function deduplicateCorners(addresses) {
  const seen = new Set();
  return addresses.filter(addr => {
    const key = `${addr.number}-${addr.street}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * Group addresses by street for list display
 * @param {Array<Object>} addresses - Ordered addresses
 * @returns {Object} Streets with their addresses
 */
export function groupByStreet(addresses) {
  const groups = {};

  addresses.forEach(addr => {
    const street = addr.street || 'Unknown';
    if (!groups[street]) {
      groups[street] = [];
    }
    groups[street].push(addr);
  });

  return groups;
}

export default { orderClockwise, getDistance, deduplicateCorners, groupByStreet };
