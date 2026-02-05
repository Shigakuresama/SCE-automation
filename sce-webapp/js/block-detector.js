/**
 * Block Detector Module
 * Detects city blocks from a starting address and extracts perimeter addresses
 */

const PROXY_BASE_URL = 'http://localhost:3000';

export class BlockDetector {
  constructor(proxyUrl = PROXY_BASE_URL) {
    this.proxyUrl = proxyUrl;
  }

  /**
   * Detect block from a lat/lon coordinate
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @returns {Promise<Object>} Block data with perimeter addresses
   */
  async detectBlock(lat, lon) {
    // Query surrounding streets via Overpass
    const streets = await this._querySurroundingStreets(lat, lon);

    // Build block topology
    const block = this._buildBlockTopology(streets, lat, lon);

    // Try building polygons first, fallback to street ranges
    const addresses = await this._extractPerimeterAddresses(block);

    return {
      blockId: this._generateBlockId(block),
      center: { lat, lon },
      perimeterStreets: block.streets,
      addresses,
      totalAddresses: addresses.length,
      estimatedTime: this._calculateTime(addresses.length)
    };
  }

  /**
   * Query surrounding streets via Overpass API
   * @private
   */
  async _querySurroundingStreets(lat, lon) {
    const radius = 100; // meters
    const bbox = `${lat-radius},${lon-radius},${lat+radius},${lon+radius}`;

    const query = `
      [out:json][timeout:25];
      (
        way["highway"]["name"](${bbox});
      );
      out tags center;
    `;

    const response = await fetch(`${this.proxyUrl}/api/overpass`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: query,
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      throw new Error(`Overpass query failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.elements.map(el => ({
      id: el.id,
      name: el.tags.name,
      type: el.tags.highway,
      center: el.center || { lat: el.lat, lon: el.lon }
    }));
  }

  /**
   * Build block topology from intersecting streets
   * @private
   */
  _buildBlockTopology(streets, centerLat, centerLon) {
    // Find 4 streets that form the block perimeter
    const sorted = this._sortStreetsByDirection(streets, centerLat, centerLon);

    return {
      streets: [
        { ...sorted.north, side: 'north' },
        { ...sorted.east, side: 'east' },
        { ...sorted.south, side: 'south' },
        { ...sorted.west, side: 'west' }
      ],
      center: { lat: centerLat, lon: centerLon }
    };
  }

  /**
   * Sort streets by cardinal direction from center point
   * @private
   */
  _sortStreetsByDirection(streets, centerLat, centerLon) {
    const result = { north: null, south: null, east: null, west: null };

    streets.forEach(street => {
      const latDiff = street.center.lat - centerLat;
      const lonDiff = street.center.lon - centerLon;

      if (Math.abs(latDiff) > Math.abs(lonDiff)) {
        // North-South street
        if (latDiff > 0 && !result.north) result.north = street;
        else if (latDiff < 0 && !result.south) result.south = street;
      } else {
        // East-West street
        if (lonDiff > 0 && !result.east) result.east = street;
        else if (lonDiff < 0 && !result.west) result.west = street;
      }
    });

    return result;
  }

  /**
   * Extract perimeter addresses (hybrid: buildings → streets)
   * @private
   */
  async _extractPerimeterAddresses(block) {
    // Try building polygons first
    try {
      const buildingAddresses = await this._extractFromBuildings(block);
      if (buildingAddresses.length > 0) {
        return this._orderClockwise(block, buildingAddresses);
      }
    } catch (error) {
      console.warn('Building extraction failed, falling back to street ranges:', error.message);
    }

    // Fallback to street ranges
    const rangeAddresses = await this._extractFromStreetRanges(block);
    return this._orderClockwise(block, rangeAddresses);
  }

  /**
   * Extract addresses from building polygons
   * @private
   */
  async _extractFromBuildings(block) {
    const center = block.center;
    const radius = 100;

    const query = `
      [out:json][timeout:25];
      (
        way["building"]around ${center.lat},${center.lon},${radius};
      );
      out tags;
    `;

    const response = await fetch(`${this.proxyUrl}/api/overpass`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: query,
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      throw new Error(`Building query failed: ${response.statusText}`);
    }

    const data = await response.json();

    return data.elements
      .filter(el => el.tags && el.tags['addr:street'])
      .map(el => ({
        number: el.tags['addr:housenumber'],
        street: el.tags['addr:street'],
        lat: el.lat || el.center?.lat,
        lon: el.lon || el.center?.lon,
        full: `${el.tags['addr:housenumber']} ${el.tags['addr:street']}`
      }));
  }

  /**
   * Extract addresses from street address ranges
   * @private
   */
  async _extractFromStreetRanges(block) {
    // Use proxy bounds search for each street
    const allAddresses = [];

    for (const street of block.streets) {
      const response = await fetch(`${this.proxyUrl}/api/geocode/bounds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          southWest: { lat: street.center.lat - 0.001, lon: street.center.lon - 0.001 },
          northEast: { lat: street.center.lat + 0.001, lon: street.center.lon + 0.001 }
        }),
        signal: AbortSignal.timeout(30000)
      });

      if (response.ok) {
        const data = await response.json();
        allAddresses.push(...(data.data || []));
      }
    }

    return allAddresses;
  }

  /**
   * Order addresses clockwise around block
   * @private
   */
  _orderClockwise(block, addresses) {
    const center = block.center;

    return addresses.map((addr, idx) => {
      const angle = Math.atan2(addr.lon - center.lon, addr.lat - center.lat);
      return {
        ...addr,
        position: idx,
        angle: angle // in radians, -PI to PI
      };
    }).sort((a, b) => b.angle - a.angle); // Clockwise: descending angle
  }

  /**
   * Generate unique block ID
   * @private
   */
  _generateBlockId(block) {
    const center = block.center;
    return `block-${Math.floor(center.lat * 1000)}-${Math.floor(center.lon * 1000)}`;
  }

  /**
   * Calculate estimated walking time
   * @private
   */
  _calculateTime(addressCount) {
    const minutesPerAddress = 2; // 2 minutes per house
    const totalMinutes = addressCount * minutesPerAddress;

    if (totalMinutes < 60) {
      return `${totalMinutes} minutes`;
    }
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours} hours`;
  }
}

export default BlockDetector;
