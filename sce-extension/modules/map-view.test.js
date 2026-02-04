/**
 * Tests for map-view module
 */

// Mock Leaflet before importing the module
global.L = class Leaflet {
  static map() {
    return new LeafletMap();
  }

  static tileLayer(url, options) {
    return new LeafletTileLayer();
  }

  static marker(latlng, options) {
    return new LeafletMarker(latlng, options);
  }

  static popup(options) {
    return new LeafletPopup();
  }
};

class LeafletMap {
  constructor() {
    this._eventHandlers = {};
    this._layers = [];
  }

  setView(center, zoom) {
    // Leaflet accepts [lat, lng] arrays for center
    this._view = {
      center: Array.isArray(center)
        ? { lat: center[0], lng: center[1] }
        : center,
      zoom
    };
    return this;
  }

  addLayer(layer) {
    this._layers.push(layer);
    return this;
  }

  removeLayer(layer) {
    const idx = this._layers.indexOf(layer);
    if (idx > -1) {
      this._layers.splice(idx, 1);
    }
    return this;
  }

  on(event, handler) {
    this._eventHandlers[event] = handler;
    return this;
  }

  off(event) {
    delete this._eventHandlers[event];
    return this;
  }

  panTo(latlng) {
    // Leaflet accepts both [lat, lng] arrays and {lat, lng} objects
    // Store as object for consistency in tests
    this._view = {
      ...this._view,
      center: Array.isArray(latlng)
        ? { lat: latlng[0], lng: latlng[1] }
        : latlng
    };
    return this;
  }

  invalidateSize() {
    // Mock implementation
    return this;
  }

  remove() {
    // Mock implementation
  }

  // Test helpers
  simulateClick(latlng) {
    if (this._eventHandlers.click) {
      this._eventHandlers.click({ latlng });
    }
  }

  getLayers() {
    return [...this._layers];
  }
}

class LeafletTileLayer {
  addTo(map) {
    map.addLayer(this);
    return this;
  }
}

class LeafletMarker {
  constructor(latlng, options) {
    this._latlng = latlng;
    this._options = options;
    this._popup = null;
  }

  bindPopup(content) {
    this._popup = content;
    return this;
  }

  addTo(map) {
    map.addLayer(this);
    return this;
  }

  getLatLng() {
    return this._latlng;
  }

  getPopup() {
    return this._popup;
  }
}

class LeafletPopup {
  constructor(options) {
    this._options = options;
  }
}

// Mock fetch API for geocoding
let mockFetchResponse = null;
global.fetch = async function(url, options) {
  return mockFetchResponse || {
    ok: true,
    json: async () => ({
      address: {
        house_number: '1909',
        road: 'W Martha Ln',
        city: 'Santa Ana',
        county: 'Orange County',
        state: 'California',
        postcode: '92706',
        country_code: 'us'
      },
      display_name: '1909, W Martha Ln, Santa Ana, Orange County, California, 92706, United States'
    })
  };
};

// Set up window object for browser simulation
if (typeof global.window === 'undefined') {
  global.window = {
    removeMapMarker: null
  };
}

// Set up document mock for Node.js testing
if (typeof global.document === 'undefined') {
  global.HTMLElement = class HTMLElement {
    constructor(tagName = 'DIV') {
      this.tagName = tagName.toUpperCase();
      this.style = {};
      this._textContent = '';
      this._innerHTML = '';
      this._children = [];
    }
    querySelector(selector) {
      // Simple selector matching for tag names
      const tagName = selector.replace(/[>#\.]/g, '').toUpperCase();
      return this._children.find(c => c.tagName === tagName) || null;
    }
    appendChild(child) {
      this._children.push(child);
    }
    get textContent() {
      // Include own textContent plus all descendants' textContent
      let result = this._textContent;
      for (const child of this._children) {
        result += child.textContent || '';
      }
      return result;
    }
    set textContent(value) {
      this._textContent = String(value);
    }
    get innerHTML() {
      // Return what would be the actual innerHTML (empty if we only used textContent)
      return this._innerHTML;
    }
    set innerHTML(value) {
      this._innerHTML = String(value);
    }
    get children() {
      return this._children;
    }
  };

  global.document = {
    createElement: (tag) => {
      return new global.HTMLElement(tag);
    }
  };
}

import { MapView } from './map-view.js';

function assertEqual(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// Test 1: Initialization
function testInitialization() {
  console.log('Testing initialization...');

  const container = document.createElement('div');
  const mapView = new MapView(container);

  assert(mapView.map !== null, 'Map should be initialized');
  assert(mapView.markers.length === 0, 'Should start with no markers');
  assert('onAddressSelect' in mapView, 'Should have onAddressSelect callback property');

  console.log('✅ testInitialization passed');
}

// Test 2: Address selection callback
async function testAddressSelection() {
  console.log('Testing address selection...');

  const container = document.createElement('div');
  const mapView = new MapView(container);

  let selectedAddress = null;
  mapView.onAddressSelect = (address) => {
    selectedAddress = address;
  };

  // Simulate map click at position [33.8, -117.8]
  const testLat = 33.8;
  const testLng = -117.8;
  mapView.map.simulateClick({ lat: testLat, lng: testLng });

  // Wait for async geocoding
  await new Promise(resolve => setTimeout(resolve, 100));

  assert(selectedAddress !== null, 'Address should be selected after click');
  assertEqual(selectedAddress.full, '1909 W Martha Ln, Santa Ana, CA 92706', 'Address should match geocoded result');

  console.log('✅ testAddressSelection passed');
}

// Test 3: Geocoding with fetch
async function testGeocoding() {
  console.log('Testing geocoding...');

  const container = document.createElement('div');
  const mapView = new MapView(container);

  // Test successful geocoding
  const address = await mapView.geocodePosition(33.8, -117.8);

  assert(address !== null, 'Geocoding should return an address');
  assertEqual(address.full, '1909 W Martha Ln, Santa Ana, CA 92706', 'Geocoded address should match');

  // Test failed geocoding
  mockFetchResponse = {
    ok: false,
    status: 404
  };

  const failedAddress = await mapView.geocodePosition(33.8, -117.8);
  assert(failedAddress === null, 'Failed geocoding should return null');

  // Reset mock
  mockFetchResponse = null;

  console.log('✅ testGeocoding passed');
}

// Test 4: Marker management
function testMarkerManagement() {
  console.log('Testing marker management...');

  const container = document.createElement('div');
  const mapView = new MapView(container);

  // Add marker
  const address = {
    number: '1909',
    street: 'W Martha Ln',
    city: 'Santa Ana',
    state: 'CA',
    zip: '92706',
    full: '1909 W Martha Ln, Santa Ana, CA 92706'
  };
  const latlng = { lat: 33.8, lng: -117.8 };

  mapView.addMarker(latlng, address);

  assert(mapView.markers.length === 1, 'Should have 1 marker');
  assert(mapView.map.getLayers().length === 2, 'Map should have tile layer + marker');

  // Test marker properties
  const marker = mapView.markers[0];
  assertEqual(marker.address, address, 'Marker should store address');
  assertEqual(marker.latlng, latlng, 'Marker should store latlng');

  // Remove marker
  mapView.removeMarker(0);
  assert(mapView.markers.length === 0, 'Should have 0 markers after removal');

  // Test undo
  mapView.addMarker(latlng, address);
  mapView.addMarker({ lat: 33.81, lng: -117.81 }, { ...address, number: '1911' });
  assert(mapView.markers.length === 2, 'Should have 2 markers');

  mapView.undoLastMarker();
  assert(mapView.markers.length === 1, 'Should have 1 marker after undo');

  // Test clear all
  mapView.clearMarkers();
  assert(mapView.markers.length === 0, 'Should have 0 markers after clear');

  console.log('✅ testMarkerManagement passed');
}

// Test 5: Get selected addresses
function testGetSelectedAddresses() {
  console.log('Testing getSelectedAddresses...');

  const container = document.createElement('div');
  const mapView = new MapView(container);

  const address1 = {
    number: '1909',
    street: 'W Martha Ln',
    city: 'Santa Ana',
    state: 'CA',
    zip: '92706',
    full: '1909 W Martha Ln, Santa Ana, CA 92706'
  };
  const address2 = {
    number: '1911',
    street: 'W Martha Ln',
    city: 'Santa Ana',
    state: 'CA',
    zip: '92706',
    full: '1911 W Martha Ln, Santa Ana, CA 92706'
  };

  mapView.addMarker({ lat: 33.8, lng: -117.8 }, address1);
  mapView.addMarker({ lat: 33.81, lng: -117.81 }, address2);

  const selected = mapView.getSelectedAddresses();
  assertEqual(selected, [address1, address2], 'Should return all marker addresses');

  console.log('✅ testGetSelectedAddresses passed');
}

// Test 6: Pan to location
function testPanTo() {
  console.log('Testing panTo...');

  const container = document.createElement('div');
  const mapView = new MapView(container);

  const latlng = { lat: 34.0, lng: -118.0 };
  mapView.panTo(latlng);

  assertEqual(mapView.map._view.center, latlng, 'Map should pan to location');

  console.log('✅ testPanTo passed');
}

// Test 7: Invalidate size
function testInvalidateSize() {
  console.log('Testing invalidateSize...');

  const container = document.createElement('div');
  const mapView = new MapView(container);

  // Should not throw
  mapView.invalidateSize();

  console.log('✅ testInvalidateSize passed');
}

// Test 8: Destroy
function testDestroy() {
  console.log('Testing destroy...');

  const container = document.createElement('div');
  const mapView = new MapView(container);

  mapView.addMarker({ lat: 33.8, lng: -117.8 }, {
    number: '1909',
    street: 'W Martha Ln',
    city: 'Santa Ana',
    state: 'CA',
    zip: '92706',
    full: '1909 W Martha Ln, Santa Ana, CA 92706'
  });

  // Should not throw
  mapView.destroy();

  assert(mapView.map === null, 'Map should be null after destroy');
  assert(mapView.markers.length === 0, 'Markers should be cleared after destroy');

  console.log('✅ testDestroy passed');
}

// Test 9: Safe DOM construction
function testSafeDOMConstruction() {
  console.log('Testing safe DOM construction...');

  const container = document.createElement('div');
  const mapView = new MapView(container);

  const address = {
    number: '1909',
    street: 'W Martha Ln',
    city: 'Santa Ana',
    state: 'CA',
    zip: '92706',
    full: '1909 W Martha Ln, Santa Ana, CA 92706'
  };

  mapView.addMarker({ lat: 33.8, lng: -117.8 }, address);

  const marker = mapView.markers[0];
  const popupContent = marker.leafletMarker.getPopup();

  assert(popupContent instanceof HTMLElement, 'Popup content should be an HTMLElement');
  assert(popupContent.tagName === 'DIV', 'Popup content should be a div');

  // Check that it has the expected children (not using innerHTML)
  const hasStrong = popupContent.querySelector('strong');
  const hasButton = popupContent.querySelector('button');

  assert(hasStrong !== null, 'Popup should have a strong element');
  assert(hasButton !== null, 'Popup should have a button element');
  assert(hasStrong.textContent.includes('1909 W Martha Ln'), 'Strong element should contain address');

  // Verify no innerHTML was used (check for script injection safety)
  const dangerousAddress = {
    number: '1909',
    street: 'W Martha Ln',
    city: 'Santa Ana',
    state: 'CA',
    zip: '92706',
    full: '<script>alert("xss")</script>1909 W Martha Ln'
  };

  mapView.addMarker({ lat: 33.81, lng: -117.81 }, dangerousAddress);
  const dangerousMarker = mapView.markers[1];
  const dangerousPopup = dangerousMarker.leafletMarker.getPopup();

  // The script tag should be text content, not executed
  assert(!dangerousPopup.innerHTML.includes('<script>'), 'Should not contain raw script tags');
  assert(dangerousPopup.textContent.includes('<script>'), 'Dangerous content should be escaped as text');

  console.log('✅ testSafeDOMConstruction passed');
}

// Test 10: Error handling
function testErrorHandling() {
  console.log('Testing error handling...');

  const container = document.createElement('div');
  const mapView = new MapView(container);

  // Test removing non-existent marker (should not throw)
  mapView.removeMarker(999);

  // Test undo with no markers (should not throw)
  mapView.undoLastMarker();

  // Test clear with no markers (should not throw)
  mapView.clearMarkers();

  console.log('✅ testErrorHandling passed');
}

// Run all tests
async function runTests() {
  try {
    testInitialization();
    await testAddressSelection();
    await testGeocoding();
    testMarkerManagement();
    testGetSelectedAddresses();
    testPanTo();
    testInvalidateSize();
    testDestroy();
    testSafeDOMConstruction();
    testErrorHandling();

    console.log('\n=====================================');
    console.log('✅ ALL MAP VIEW TESTS PASSED!');
    console.log('=====================================');
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runTests();
