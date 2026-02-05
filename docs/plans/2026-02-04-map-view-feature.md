# Map View Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an interactive map view to the Route Planner that allows users to click houses to add addresses, making the end address field optional.

**Architecture:**
- Use Leaflet.js (lightweight, no API key required) for the embedded map
- Use Nominatim OpenStreetMap geocoding API (free, no key required) for reverse geocoding
- Add map selection mode toggle that makes end address optional
- Store map-selected addresses in state alongside range-generated addresses
- Reuse existing address processing pipeline

**Tech Stack:**
- Leaflet.js (CDN) - Interactive map rendering
- Nominatim API (OpenStreetMap) - Reverse geocoding (lat/lon -> address)
- Chrome Extension Manifest V3 - Existing infrastructure

---

## Task 1: Create Map Module Structure

**Files:**
- Create: `sce-extension/modules/map-view.js`
- Create: `sce-extension/modules/map-view.test.js`

**Step 1: Write the failing test**

Create `sce-extension/modules/map-view.test.js`:

```javascript
/**
 * Map View Module Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MapView } from './map-view.js';

describe('MapView', () => {
  let container;
  let mapView;

  beforeEach(() => {
    // Create mock container
    container = document.createElement('div');
    container.id = 'map-container';
    document.body.appendChild(container);

    // Mock Leaflet
    global.L = {
      map: vi.fn(() => ({
        setView: vi.fn(),
        on: vi.fn(),
        invalidateSize: vi.fn(),
        remove: vi.fn(),
      })),
      tileLayer: vi.fn(() => ({
        addTo: vi.fn(),
      })),
      marker: vi.fn(() => ({
        addTo: vi.fn(),
        bindPopup: vi.fn(),
        on: vi.fn(),
      })),
      Icon: vi.fn(),
      DivIcon: vi.fn(),
      circleMarker: vi.fn(() => ({
        addTo: vi.fn(),
        bindPopup: vi.fn(),
        on: vi.fn(),
        setStyle: vi.fn(),
      })),
      latLng: vi.fn((lat, lng) => ({ lat, lng })),
    };
  });

  afterEach(() => {
    if (mapView) {
      mapView.destroy();
    }
    document.body.removeChild(container);
  });

  describe('initialization', () => {
    it('should create map instance', () => {
      mapView = new MapView(container, {
        onAddressSelect: vi.fn(),
      });

      expect(global.L.map).toHaveBeenCalledWith(container);
    });

    it('should set default view to Southern California', () => {
      mapView = new MapView(container, {
        onAddressSelect: vi.fn(),
      });

      const mapInstance = global.L.map.mock.results[0].value;
      expect(mapInstance.setView).toHaveBeenCalledWith([33.8, -117.8], 14);
    });
  });

  describe('address selection', () => {
    it('should call onAddressSelect callback when marker is clicked', async () => {
      const onAddressSelect = vi.fn();
      mapView = new MapView(container, { onAddressSelect });

      const mockAddress = {
        number: '1909',
        street: 'W Martha Ln',
        city: 'Santa Ana',
        state: 'CA',
        zip: '92706',
        full: '1909 W Martha Ln, Santa Ana, CA 92706',
        lat: 33.75,
        lng: -117.85,
      };

      // Simulate geocoding result
      vi.spyOn(mapView, 'geocodePosition').mockResolvedValue(mockAddress);

      await mapView.handleMapClick({ lat: 33.75, lng: -117.85 });

      expect(onAddressSelect).toHaveBeenCalledWith(mockAddress);
    });

    it('should add marker for selected address', async () => {
      const onAddressSelect = vi.fn();
      mapView = new MapView(container, { onAddressSelect });

      const mockAddress = {
        number: '1909',
        street: 'W Martha Ln',
        city: 'Santa Ana',
        state: 'CA',
        zip: '92706',
        full: '1909 W Martha Ln, Santa Ana, CA 92706',
        lat: 33.75,
        lng: -117.85,
      };

      vi.spyOn(mapView, 'geocodePosition').mockResolvedValue(mockAddress);

      await mapView.handleMapClick({ lat: 33.75, lng: -117.85 });

      expect(global.L.circleMarker).toHaveBeenCalled();
    });

    it('should remove last added marker when undo is called', async () => {
      const onAddressSelect = vi.fn();
      mapView = new MapView(container, { onAddressSelect });

      const mockAddress = {
        number: '1909',
        street: 'W Martha Ln',
        city: 'Santa Ana',
        state: 'CA',
        zip: '92706',
        full: '1909 W Martha Ln, Santa Ana, CA 92706',
        lat: 33.75,
        lng: -117.85,
      };

      vi.spyOn(mapView, 'geocodePosition').mockResolvedValue(mockAddress);

      await mapView.handleMapClick({ lat: 33.75, lng: -117.85 });
      mapView.undoLastMarker();

      expect(mapView.markers.length).toBe(0);
    });
  });

  describe('geocoding', () => {
    it('should geocode position to address', async () => {
      mapView = new MapView(container, { onAddressSelect: vi.fn() });

      // Mock fetch response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          address: {
            house_number: '1909',
            road: 'W Martha Ln',
            city: 'Santa Ana',
            state: 'California',
            postcode: '92706',
          },
          lat: '33.75',
          lon: '-117.85',
        }),
      });

      const result = await mapView.geocodePosition(33.75, -117.85);

      expect(result).toEqual({
        number: '1909',
        street: 'W Martha Ln',
        city: 'Santa Ana',
        state: 'CA',
        zip: '92706',
        full: '1909 W Martha Ln, Santa Ana, CA 92706',
        lat: 33.75,
        lng: -117.85,
      });
    });

    it('should handle geocoding errors gracefully', async () => {
      mapView = new MapView(container, { onAddressSelect: vi.fn() });

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await mapView.geocodePosition(33.75, -117.85);

      expect(result).toBeNull();
    });
  });

  describe('clear', () => {
    it('should clear all markers', async () => {
      const onAddressSelect = vi.fn();
      mapView = new MapView(container, { onAddressSelect });

      const mockAddress = {
        number: '1909',
        street: 'W Martha Ln',
        city: 'Santa Ana',
        state: 'CA',
        zip: '92706',
        full: '1909 W Martha Ln, Santa Ana, CA 92706',
        lat: 33.75,
        lng: -117.85,
      };

      vi.spyOn(mapView, 'geocodePosition').mockResolvedValue(mockAddress);

      await mapView.handleMapClick({ lat: 33.75, lng: -117.85 });
      mapView.clearMarkers();

      expect(mapView.markers.length).toBe(0);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd sce-extension && npm test -- modules/map-view.test.js`
Expected: FAIL with "Cannot find module './map-view.js'"

**Step 3: Write minimal implementation**

Create `sce-extension/modules/map-view.js`:

```javascript
/**
 * SCE Route Planner Map View Module
 * Interactive map for selecting addresses by clicking
 */

// Nominatim API (OpenStreetMap) - Free, no API key required
const NOMINATIM_API = 'https://nominatim.openstreetmap.org/reverse';

// Default center (Southern California - SCE service area)
const DEFAULT_CENTER = [33.8, -117.8]; // Orange County area
const DEFAULT_ZOOM = 14;

// User-Agent required by Nominatim usage policy
const USER_AGENT = 'SCE-Route-Planner/1.0';

/**
 * Map View Class
 * Handles interactive map for address selection
 */
export class MapView {
  /**
   * @param {HTMLElement} container - Container element for the map
   * @param {Object} options - Configuration options
   * @param {Function} options.onAddressSelect - Callback when address is selected
   * @param {Function} options.onMarkerRemove - Callback when marker is removed
   * @param {Array<number>} options.center - Initial center [lat, lng]
   * @param {number} options.zoom - Initial zoom level
   */
  constructor(container, options = {}) {
    this.container = container;
    this.onAddressSelect = options.onAddressSelect || (() => {});
    this.onMarkerRemove = options.onMarkerRemove || (() => {});
    this.markers = [];
    this.map = null;
    this.tileLayer = null;

    this.init();
  }

  /**
   * Initialize the map
   */
  init() {
    // Check if Leaflet is loaded
    if (typeof L === 'undefined') {
      throw new Error('Leaflet (L) is not loaded. Include Leaflet JS/CSS before using MapView.');
    }

    // Create map instance
    this.map = L.map(this.container, {
      zoomControl: true,
      attributionControl: true,
    }).setView(options.center || DEFAULT_CENTER, options.zoom || DEFAULT_ZOOM);

    // Add OpenStreetMap tile layer (free, no API key)
    this.tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(this.map);

    // Add click handler
    this.map.on('click', (e) => {
      this.handleMapClick(e.latlng);
    });
  }

  /**
   * Handle map click - geocode and add marker
   * @param {Object} latlng - Leaflet latlng object { lat, lng }
   */
  async handleMapClick(latlng) {
    const { lat, lng } = latlng;

    // Show loading indicator
    this.showLoadingIndicator(latlng);

    try {
      // Reverse geocode to get address
      const address = await this.geocodePosition(lat, lng);

      if (!address) {
        this.showError('Could not find address at this location');
        return;
      }

      // Add marker
      this.addMarker(lat, lng, address);

      // Notify callback
      this.onAddressSelect(address);

    } catch (error) {
      console.error('[MapView] Geocoding error:', error);
      this.showError('Error: ' + error.message);
    } finally {
      this.hideLoadingIndicator();
    }
  }

  /**
   * Geocode position to address using Nominatim
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {Promise<Object|null>} Address object or null
   */
  async geocodePosition(lat, lng) {
    const url = `${NOMINATIM_API}?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT,
        },
      });

      if (!response.ok) {
        console.warn('[MapView] Geocoding failed:', response.status);
        return null;
      }

      const data = await response.json();

      if (!data || !data.address) {
        return null;
      }

      // Parse Nominatim response
      const addr = data.address;
      const number = addr.house_number || '';
      const street = this.formatStreet(addr);
      const city = addr.city || addr.town || addr.village || addr.county || '';
      const state = this.parseState(addr.state);
      const zip = addr.postcode || '';

      // Validate we have minimum required data
      if (!street) {
        return null;
      }

      return {
        number,
        street,
        city,
        state,
        zip,
        full: this.formatFullAddress(number, street, city, state, zip),
        lat,
        lng,
      };

    } catch (error) {
      console.error('[MapView] Geocoding error:', error);
      return null;
    }
  }

  /**
   * Format street name from Nominatim address
   * @param {Object} addr - Nominatim address object
   * @returns {string} Formatted street name
   */
  formatStreet(addr) {
    // Try different street fields
    if (addr.road) {
      return addr.road;
    }
    if (addr.street) {
      return addr.street;
    }
    if (addr.pedestrian) {
      return addr.pedestrian;
    }
    return '';
  }

  /**
   * Parse state from Nominatim response
   * @param {string} stateName - Full state name
   * @returns {string} Two-letter state code
   */
  parseState(stateName) {
    if (!stateName) return 'CA';

    // Common California variants
    if (stateName.toLowerCase().includes('california')) return 'CA';

    // Return full state name if not recognized
    return stateName;
  }

  /**
   * Format full address string
   * @param {string} number - House number
   * @param {string} street - Street name
   * @param {string} city - City
   * @param {string} state - State code
   * @param {string} zip - ZIP code
   * @returns {string} Full address
   */
  formatFullAddress(number, street, city, state, zip) {
    const parts = [];

    if (number) parts.push(number);
    if (street) parts.push(street);

    const streetPart = parts.join(' ');
    const cityPart = [city, state, zip].filter(Boolean).join(' ');

    if (cityPart) {
      return `${streetPart}, ${cityPart}`;
    }
    return streetPart;
  }

  /**
   * Add a marker to the map
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {Object} address - Address object
   */
  addMarker(lat, lng, address) {
    const marker = L.circleMarker([lat, lng], {
      radius: 8,
      fillColor: '#4CAF50',
      color: '#fff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.8,
    }).addTo(this.map);

    // Add popup with address (safe DOM construction - no innerHTML)
    const popupContent = document.createElement('div');
    popupContent.style.minWidth = '150px';

    const addressText = document.createElement('strong');
    addressText.textContent = address.full;
    popupContent.appendChild(addressText);

    popupContent.appendChild(document.createElement('br'));

    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.style.marginTop = '4px';
    removeBtn.style.padding = '2px 8px';
    removeBtn.style.fontSize = '11px';
    removeBtn.onclick = () => window.removeMapMarker(this.markers.length);
    popupContent.appendChild(removeBtn);

    marker.bindPopup(popupContent);
    marker.addressData = address;
    this.markers.push(marker);
  }

  /**
   * Remove the last added marker
   */
  undoLastMarker() {
    if (this.markers.length === 0) return;

    const marker = this.markers.pop();
    this.map.removeLayer(marker);

    if (marker.addressData) {
      this.onMarkerRemove(marker.addressData);
    }
  }

  /**
   * Remove a specific marker by index
   * @param {number} index - Marker index
   */
  removeMarker(index) {
    if (index < 0 || index >= this.markers.length) return;

    const marker = this.markers.splice(index, 1)[0];
    this.map.removeLayer(marker);

    if (marker.addressData) {
      this.onMarkerRemove(marker.addressData);
    }
  }

  /**
   * Clear all markers
   */
  clearMarkers() {
    this.markers.forEach(marker => {
      this.map.removeLayer(marker);
    });
    this.markers = [];
  }

  /**
   * Get all selected addresses
   * @returns {Array<Object>} Array of address objects
   */
  getSelectedAddresses() {
    return this.markers.map(m => m.addressData).filter(Boolean);
  }

  /**
   * Pan to a location
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {number} zoom - Zoom level
   */
  panTo(lat, lng, zoom = DEFAULT_ZOOM) {
    this.map.setView([lat, lng], zoom);
  }

  /**
   * Invalidate size (call after container resize)
   */
  invalidateSize() {
    if (this.map) {
      this.map.invalidateSize();
    }
  }

  /**
   * Show temporary loading indicator
   * @param {Object} latlng - Position
   */
  showLoadingIndicator(latlng) {
    // Could add a loading marker here
  }

  /**
   * Hide loading indicator
   */
  hideLoadingIndicator() {
    // Remove loading marker
  }

  /**
   * Show error message
   * @param {string} message - Error message
   */
  showError(message) {
    // Could show a toast notification here
    console.warn('[MapView]', message);
  }

  /**
   * Destroy the map and cleanup
   */
  destroy() {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    this.markers = [];
  }
}

/**
 * Initialize map view for popup use
 * @param {HTMLElement} container - Map container
 * @param {Object} options - Options
 * @returns {MapView} MapView instance
 */
export function initMapView(container, options = {}) {
  return new MapView(container, options);
}
```

**Step 4: Run test to verify it passes**

Run: `cd sce-extension && npm test -- modules/map-view.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add sce-extension/modules/map-view.js sce-extension/modules/map-view.test.js
git commit -m "feat: add map view module with address selection"
```

---

## Task 2: Download Leaflet Library

**Files:**
- Create: `sce-extension/lib/leaflet.js`
- Create: `sce-extension/lib/leaflet.css`

**Step 1: Download Leaflet files**

Run: `cd sce-extension/lib && curl -o leaflet.css https://unpkg.com/leaflet@1.9.4/dist/leaflet.css && curl -o leaflet.js https://unpkg.com/leaflet@1.9.4/dist/leaflet.js`

**Step 2: Verify files exist**

Run: `ls -la sce-extension/lib/leaflet.*`

**Step 3: Commit**

```bash
git add sce-extension/lib/leaflet.css sce-extension/lib/leaflet.js
git commit -m "feat: add Leaflet library for map view"
```

---

## Task 3: Update Popup HTML for Map View

**Files:**
- Modify: `sce-extension/popup.html`

**Step 1: Add Leaflet CSS to popup**

Add to `<head>` section after existing styles (line ~80):

```html
<!-- Leaflet CSS -->
<link rel="stylesheet" href="lib/leaflet.css">
```

**Step 2: Add Leaflet JS before closing body**

Add before `</body>` tag (line ~500):

```html
<!-- Leaflet JS -->
<script src="lib/leaflet.js"></script>
```

**Step 3: Add map container and UI elements**

Replace the map-toggle div at line 448 with:

```html
<!-- Map Toggle -->
<div class="map-toggle" id="mapToggle">
  🗺️ Use Map View - Click houses to add
</div>

<!-- Map View Container (hidden by default) -->
<div id="mapViewContainer" class="map-view-container hidden">
  <div class="map-view-header">
    <span class="map-view-title">Click map to add addresses</span>
    <button class="btn-small" id="closeMapBtn">✕ Close Map</button>
  </div>

  <div class="map-view-controls">
    <button class="btn-small btn-secondary" id="undoMarkerBtn" disabled>↶ Undo Last</button>
    <button class="btn-small btn-secondary" id="clearMarkersBtn">Clear All</button>
    <span class="selected-count" id="selectedCount">0 selected</span>
  </div>

  <div id="map" class="map"></div>

  <div class="map-view-footer">
    <div class="map-addresses-list" id="mapAddressesList">
      <!-- Selected addresses will appear here -->
    </div>
  </div>
</div>
```

**Step 4: Add CSS styles for map view**

Add to existing `<style>` section (before closing `</style>`):

```css
/* Map View Styles */
.map-view-container {
  margin-top: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
}

.map-view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
}

.map-view-title {
  font-size: 13px;
  font-weight: 500;
  color: #333;
}

.map-view-controls {
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  background: #fafafa;
  border-bottom: 1px solid #e0e0e0;
}

.btn-small {
  padding: 4px 10px;
  font-size: 11px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-small:hover:not(:disabled) {
  background: #f0f0f0;
}

.btn-small:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.selected-count {
  margin-left: auto;
  font-size: 11px;
  color: #666;
  align-self: center;
}

.map {
  width: 100%;
  height: 300px;
  background: #e0e0e0;
}

.map-addresses-list {
  max-height: 120px;
  overflow-y: auto;
  padding: 8px;
}

.map-address-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  background: #f5f5f5;
  border-radius: 4px;
  margin-bottom: 4px;
  font-size: 11px;
}

.map-address-item:last-child {
  margin-bottom: 0;
}

.map-address-remove {
  color: #c62828;
  cursor: pointer;
  font-weight: bold;
  padding: 0 4px;
}

.map-address-remove:hover {
  color: #e53935;
}
```

**Step 5: Commit**

```bash
git add sce-extension/popup.html
git commit -m "feat: add map view UI container and styles"
```

---

## Task 4: Create Map View UI Module

**Files:**
- Create: `sce-extension/modules/map-view-ui.js`
- Create: `sce-extension/modules/map-view-ui.test.js`

**Step 1: Write the failing test**

Create `sce-extension/modules/map-view-ui.test.js`:

```javascript
/**
 * Map View UI Module Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MapViewUI } from './map-view-ui.js';

describe('MapViewUI', () => {
  let container;
  let mapContainer;
  let addressesListContainer;
  let ui;
  let mockMapView;

  beforeEach(() => {
    // Create DOM elements
    container = document.createElement('div');
    container.innerHTML = `
      <div id="mapViewContainer" class="hidden">
        <div id="map"></div>
        <button id="closeMapBtn"></button>
        <button id="undoMarkerBtn" disabled></button>
        <button id="clearMarkersBtn"></button>
        <span id="selectedCount"></span>
        <div id="mapAddressesList"></div>
      </div>
    `;
    document.body.appendChild(container);

    mapContainer = document.getElementById('map');
    addressesListContainer = document.getElementById('mapAddressesList');

    // Mock MapView
    mockMapView = {
      addMarker: vi.fn(),
      undoLastMarker: vi.fn(),
      clearMarkers: vi.fn(),
      removeMarker: vi.fn(),
      getSelectedAddresses: vi.fn(() => []),
      destroy: vi.fn(),
    };
  });

  afterEach(() => {
    if (ui) {
      ui.destroy();
    }
    document.body.removeChild(container);
  });

  describe('initialization', () => {
    it('should initialize with empty state', () => {
      ui = new MapViewUI(container, mockMapView);

      expect(ui.selectedAddresses).toEqual([]);
      expect(ui.isVisible()).toBe(false);
    });
  });

  describe('show/hide', () => {
    it('should show map view when show() is called', () => {
      ui = new MapViewUI(container, mockMapView);
      ui.show();

      expect(ui.isVisible()).toBe(true);
      expect(container.classList.contains('hidden')).toBe(false);
    });

    it('should hide map view when hide() is called', () => {
      ui = new MapViewUI(container, mockMapView);
      ui.show();
      ui.hide();

      expect(ui.isVisible()).toBe(false);
      expect(container.classList.contains('hidden')).toBe(true);
    });
  });

  describe('address selection', () => {
    it('should add address when onAddressSelect is called', () => {
      ui = new MapViewUI(container, mockMapView);

      const address = {
        number: '1909',
        street: 'W Martha Ln',
        city: 'Santa Ana',
        state: 'CA',
        zip: '92706',
        full: '1909 W Martha Ln, Santa Ana, CA 92706',
      };

      ui.onAddressSelect(address);

      expect(ui.selectedAddresses).toContain(address);
      expect(addressesListContainer.children.length).toBe(1);
    });

    it('should update selected count', () => {
      ui = new MapViewUI(container, mockMapView);

      const countSpan = document.getElementById('selectedCount');

      ui.onAddressSelect({
        number: '1909',
        street: 'W Martha Ln',
        city: 'Santa Ana',
        state: 'CA',
        zip: '92706',
        full: '1909 W Martha Ln, Santa Ana, CA 92706',
      });

      expect(countSpan.textContent).toBe('1 selected');
    });
  });

  describe('address removal', () => {
    it('should remove address when onAddressRemove is called', () => {
      ui = new MapViewUI(container, mockMapView);

      const address = {
        number: '1909',
        street: 'W Martha Ln',
        city: 'Santa Ana',
        state: 'CA',
        zip: '92706',
        full: '1909 W Martha Ln, Santa Ana, CA 92706',
      };

      ui.onAddressSelect(address);
      ui.onAddressRemove(address);

      expect(ui.selectedAddresses).not.toContain(address);
    });

    it('should clear all addresses when clearAll() is called', () => {
      ui = new MapViewUI(container, mockMapView);

      ui.onAddressSelect({
        number: '1909',
        street: 'W Martha Ln',
        city: 'Santa Ana',
        state: 'CA',
        zip: '92706',
        full: '1909 W Martha Ln, Santa Ana, CA 92706',
      });

      ui.clearAll();

      expect(ui.selectedAddresses).toEqual([]);
    });
  });

  describe('undo', () => {
    it('should undo last address', () => {
      ui = new MapViewUI(container, mockMapView);

      const addr1 = {
        number: '1909',
        street: 'W Martha Ln',
        city: 'Santa Ana',
        state: 'CA',
        zip: '92706',
        full: '1909 W Martha Ln, Santa Ana, CA 92706',
      };

      const addr2 = {
        number: '1911',
        street: 'W Martha Ln',
        city: 'Santa Ana',
        state: 'CA',
        zip: '92706',
        full: '1911 W Martha Ln, Santa Ana, CA 92706',
      };

      ui.onAddressSelect(addr1);
      ui.onAddressSelect(addr2);
      ui.undoLast();

      expect(ui.selectedAddresses).toEqual([addr1]);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd sce-extension && npm test -- modules/map-view-ui.test.js`
Expected: FAIL with "Cannot find module './map-view-ui.js'"

**Step 3: Write minimal implementation**

Create `sce-extension/modules/map-view-ui.js`:

```javascript
/**
 * SCE Route Planner Map View UI Module
 * Handles UI interactions for the map view
 */

/**
 * Map View UI Class
 * Manages the UI for map-based address selection
 */
export class MapViewUI {
  /**
   * @param {HTMLElement} container - Map view container element
   * @param {Object} mapView - MapView instance
   * @param {Object} options - Configuration options
   */
  constructor(container, mapView, options = {}) {
    this.container = container;
    this.mapView = mapView;
    this.selectedAddresses = [];
    this.onAddressesChange = options.onAddressesChange || (() => {});

    this.cacheElements();
    this.setupEventListeners();
  }

  /**
   * Cache DOM elements
   */
  cacheElements() {
    this.elements = {
      closeBtn: document.getElementById('closeMapBtn'),
      undoBtn: document.getElementById('undoMarkerBtn'),
      clearBtn: document.getElementById('clearMarkersBtn'),
      selectedCount: document.getElementById('selectedCount'),
      addressesList: document.getElementById('mapAddressesList'),
    };
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    if (this.elements.closeBtn) {
      this.elements.closeBtn.addEventListener('click', () => this.hide());
    }

    if (this.elements.undoBtn) {
      this.elements.undoBtn.addEventListener('click', () => this.undoLast());
    }

    if (this.elements.clearBtn) {
      this.elements.clearBtn.addEventListener('click', () => this.clearAll());
    }
  }

  /**
   * Show map view
   */
  show() {
    this.container.classList.remove('hidden');
    this.mapView.invalidateSize();
  }

  /**
   * Hide map view
   */
  hide() {
    this.container.classList.add('hidden');
  }

  /**
   * Check if map view is visible
   * @returns {boolean}
   */
  isVisible() {
    return !this.container.classList.contains('hidden');
  }

  /**
   * Handle address selection from map
   * @param {Object} address - Address object
   */
  onAddressSelect(address) {
    this.selectedAddresses.push(address);
    this.updateUI();
    this.onAddressesChange(this.selectedAddresses);
  }

  /**
   * Handle address removal
   * @param {Object} address - Address object to remove
   */
  onAddressRemove(address) {
    const index = this.selectedAddresses.findIndex(a => a.full === address.full);
    if (index !== -1) {
      this.selectedAddresses.splice(index, 1);
      this.updateUI();
      this.onAddressesChange(this.selectedAddresses);
    }
  }

  /**
   * Undo last selected address
   */
  undoLast() {
    if (this.selectedAddresses.length === 0) return;

    const lastAddress = this.selectedAddresses[this.selectedAddresses.length - 1];
    this.mapView.undoLastMarker();
    this.selectedAddresses.pop();
    this.updateUI();
    this.onAddressesChange(this.selectedAddresses);
  }

  /**
   * Clear all selected addresses
   */
  clearAll() {
    this.mapView.clearMarkers();
    this.selectedAddresses = [];
    this.updateUI();
    this.onAddressesChange(this.selectedAddresses);
  }

  /**
   * Remove address at specific index
   * @param {number} index - Index to remove
   */
  removeAddressAt(index) {
    if (index < 0 || index >= this.selectedAddresses.length) return;

    this.mapView.removeMarker(index);
    this.selectedAddresses.splice(index, 1);
    this.updateUI();
    this.onAddressesChange(this.selectedAddresses);
  }

  /**
   * Update UI elements
   */
  updateUI() {
    this.updateCount();
    this.updateUndoButton();
    this.renderAddressesList();
  }

  /**
   * Update selected count display
   */
  updateCount() {
    if (this.elements.selectedCount) {
      const count = this.selectedAddresses.length;
      this.elements.selectedCount.textContent = `${count} selected`;
    }
  }

  /**
   * Update undo button state
   */
  updateUndoButton() {
    if (this.elements.undoBtn) {
      this.elements.undoBtn.disabled = this.selectedAddresses.length === 0;
    }
  }

  /**
   * Render addresses list (safe DOM methods - no innerHTML)
   */
  renderAddressesList() {
    if (!this.elements.addressesList) return;

    // Clear existing content
    while (this.elements.addressesList.firstChild) {
      this.elements.addressesList.removeChild(this.elements.addressesList.firstChild);
    }

    if (this.selectedAddresses.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'map-addresses-empty';
      emptyMsg.textContent = 'Click on the map to add addresses';
      emptyMsg.style.cssText = 'text-align:center;color:#999;font-size:11px;padding:12px;';
      this.elements.addressesList.appendChild(emptyMsg);
      return;
    }

    this.selectedAddresses.forEach((address, index) => {
      const item = document.createElement('div');
      item.className = 'map-address-item';

      const indexSpan = document.createElement('span');
      indexSpan.textContent = `${index + 1}.`;

      const addressSpan = document.createElement('span');
      addressSpan.textContent = address.full;
      addressSpan.style.flex = '1';

      const removeBtn = document.createElement('span');
      removeBtn.className = 'map-address-remove';
      removeBtn.textContent = '✕';
      removeBtn.title = 'Remove this address';
      removeBtn.addEventListener('click', () => this.removeAddressAt(index));

      item.appendChild(indexSpan);
      item.appendChild(addressSpan);
      item.appendChild(removeBtn);
      this.elements.addressesList.appendChild(item);
    });
  }

  /**
   * Get selected addresses
   * @returns {Array<Object>}
   */
  getSelectedAddresses() {
    return [...this.selectedAddresses];
  }

  /**
   * Set selected addresses (for restoring state)
   * @param {Array<Object>} addresses - Addresses to set
   */
  setSelectedAddresses(addresses) {
    this.selectedAddresses = [...addresses];
    this.updateUI();
  }

  /**
   * Destroy and cleanup
   */
  destroy() {
    this.selectedAddresses = [];
    this.onAddressesChange = () => {};
  }
}

/**
 * Initialize map view UI
 * @param {HTMLElement} container - Map view container
 * @param {Object} mapView - MapView instance
 * @param {Object} options - Options
 * @returns {MapViewUI} MapViewUI instance
 */
export function initMapViewUI(container, mapView, options = {}) {
  return new MapViewUI(container, mapView, options);
}
```

**Step 4: Run test to verify it passes**

Run: `cd sce-extension && npm test -- modules/map-view-ui.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add sce-extension/modules/map-view-ui.js sce-extension/modules/map-view-ui.test.js
git commit -m "feat: add map view UI module"
```

---

## Task 5: Update Route Planner to Support Map Mode

**Files:**
- Modify: `sce-extension/modules/route-planner.js`

**Step 1: Add import for map modules**

At the top of `route-planner.js`, add:

```javascript
import { MapView } from './map-view.js';
import { MapViewUI } from './map-view-ui.js';
```

**Step 2: Add map mode state to state object**

Update the state object (around line 20):

```javascript
const state = {
  addresses: [],
  processedAddresses: [],
  isProcessing: false,
  currentBatch: 0,
  totalBatches: 0,
  mapMode: false,        // NEW: whether using map view
  mapView: null,         // NEW: MapView instance
  mapViewUI: null,       // NEW: MapViewUI instance
};
```

**Step 3: Add map container to elements cache**

Update `cacheElements()` function (around line 45):

```javascript
function cacheElements() {
  elements.startAddress = document.getElementById('startAddress');
  elements.endAddress = document.getElementById('endAddress');
  elements.city = document.getElementById('city');
  elements.state = document.getElementById('state');
  elements.zip = document.getElementById('zip');
  elements.side = document.getElementById('side');
  elements.skip = document.getElementById('skip');
  elements.generateBtn = document.getElementById('generateBtn');
  elements.addressCount = document.getElementById('addressCount');
  elements.progressContainer = document.getElementById('progressContainer');
  elements.progressText = document.getElementById('progressText');
  elements.progressFill = document.getElementById('progressFill');
  elements.addressList = document.getElementById('addressList');
  elements.pdfSection = document.getElementById('pdfSection');
  elements.pdfReadyText = document.getElementById('pdfReadyText');
  elements.generatePdfBtn = document.getElementById('generatePdfBtn');
  elements.mapToggle = document.getElementById('mapToggle');
  elements.mapViewContainer = document.getElementById('mapViewContainer');  // NEW
  elements.mapElement = document.getElementById('map');                    // NEW
}
```

**Step 4: Replace handleMapToggle with real implementation**

Find `handleMapToggle` event listener and replace with actual implementation. Add after `setupEventListeners()` function:

```javascript
/**
 * Handle map toggle button click
 */
function handleMapToggle() {
  const mapContainer = elements.mapViewContainer;
  const mapElement = elements.mapElement;

  if (!mapContainer || !mapElement) {
    showStatusMessage('Map container not found', 'error');
    return;
  }

  // Toggle map mode
  state.mapMode = !state.mapMode;

  if (state.mapMode) {
    // Show map, make end address optional
    mapContainer.classList.remove('hidden');
    elements.mapToggle.textContent = '📝 Use Address Range Instead';
    elements.endAddress.placeholder = 'Optional: enter end address';
    elements.generateBtn.textContent = 'Process Selected Addresses';

    // Initialize map if not already
    if (!state.mapView) {
      state.mapView = new MapView(mapElement, {
        onAddressSelect: (address) => {
          if (state.mapViewUI) {
            state.mapViewUI.onAddressSelect(address);
          }
        },
        onMarkerRemove: (address) => {
          if (state.mapViewUI) {
            state.mapViewUI.onAddressRemove(address);
          }
        },
      });

      state.mapViewUI = new MapViewUI(mapContainer, state.mapView, {
        onAddressesChange: (addresses) => {
          updateAddressCount();
        },
      });
    } else {
      state.mapViewUI.show();
    }

  } else {
    // Hide map, require end address again
    mapContainer.classList.add('hidden');
    elements.mapToggle.textContent = '🗺️ Use Map View - Click houses to add';
    elements.endAddress.placeholder = '1925 W Martha Ln';
    elements.generateBtn.textContent = 'Generate & Process X Houses';

    if (state.mapViewUI) {
      state.mapViewUI.hide();
    }
  }
}
```

**Step 5: Update validateInputs to make end address optional in map mode**

Find the `validateInputs()` function and modify the end address check:

```javascript
function validateInputs() {
  const start = elements.startAddress.value.trim();
  const end = elements.endAddress.value.trim();
  const city = elements.city.value.trim();
  const zip = elements.zip.value.trim();

  if (!start) {
    return { field: elements.startAddress, message: 'Enter a start address (or use map view)' };
  }

  // Only require end address if NOT in map mode
  if (!state.mapMode && !end) {
    return { field: elements.endAddress, message: 'Enter an end address (or use map view)' };
  }

  if (!city) {
    return { field: elements.city, message: 'Enter a city' };
  }

  if (!zip) {
    return { field: elements.zip, message: 'Enter a ZIP code' };
  }

  if (!/^\d{5}$/.test(zip)) {
    return { field: elements.zip, message: 'ZIP must be 5 digits' };
  }

  return null;
}
```

**Step 6: Update updateAddressCount to include map addresses**

Modify `updateAddressCount()` function:

```javascript
function updateAddressCount() {
  try {
    const countSpan = elements.addressCount;

    // In map mode, show selected addresses count
    if (state.mapMode && state.mapViewUI) {
      const count = state.mapViewUI.getSelectedAddresses().length;
      countSpan.textContent = count;
      clearError(elements.startAddress);
      clearError(elements.endAddress);
      return;
    }

    // Original range-based logic
    const start = elements.startAddress.value.trim();
    const end = elements.endAddress.value.trim();
    const side = elements.side.value;
    const skip = parseSkipAddresses(elements.skip.value);

    if (!start || !end) {
      countSpan.textContent = '0';
      return;
    }

    const addresses = generateAddressRange(start, end, { side, skip });
    countSpan.textContent = addresses.length;

    clearError(elements.startAddress);
    clearError(elements.endAddress);

  } catch (error) {
    // Silently fail on typing
  }
}
```

**Step 7: Update generateAddresses to use map addresses when in map mode**

Modify `generateAddresses()` function:

```javascript
function generateAddresses() {
  const start = elements.startAddress.value.trim();
  const end = elements.endAddress.value.trim();
  const city = elements.city.value.trim();
  const stateValue = elements.state.value;
  const zip = elements.zip.value.trim();
  const side = elements.side.value;
  const skip = parseSkipAddresses(elements.skip.value);

  // In map mode, use selected addresses from map
  if (state.mapMode && state.mapViewUI) {
    const mapAddresses = state.mapViewUI.getSelectedAddresses();

    if (mapAddresses.length === 0) {
      throw new Error('Click on the map to select at least one address');
    }

    return mapAddresses;
  }

  // Original range-based generation
  const startFull = `${start}, ${city}, ${stateValue} ${zip}`;
  const endFull = `${end}, ${city}, ${stateValue} ${zip}`;

  const addresses = generateAddressRange(startFull, endFull, { side, skip });

  if (addresses.length === 0) {
    throw new Error('No addresses generated. Check your address range.');
  }

  return addresses;
}
```

**Step 8: Add global function for popup marker removal**

Add at the end of the file before the export:

```javascript
// Global function for Leaflet popup buttons
if (typeof globalThis !== 'undefined') {
  globalThis.removeMapMarker = (index) => {
    if (state.mapViewUI) {
      state.mapViewUI.removeAddressAt(index);
    }
  };
}
```

**Step 9: Commit**

```bash
git add sce-extension/modules/route-planner.js
git commit -m "feat: integrate map view into route planner"
```

---

## Task 6: Update Manifest Version

**Files:**
- Modify: `sce-extension/manifest.json`

**Step 1: Update version**

```json
{
  "manifest_version": 3,
  "name": "SCE Form Auto-Fill",
  "version": "1.1.0",
  ...
}
```

**Step 2: Commit**

```bash
git add sce-extension/manifest.json
git commit -m "feat: bump version to 1.1.0 for map view feature"
```

---

## Task 7: Documentation

**Files:**
- Modify: `CLAUDE.md`
- Create: `sce-extension/docs/MAP_VIEW.md`

**Step 1: Create map view documentation**

Create `sce-extension/docs/MAP_VIEW.md`:

```markdown
# Map View Feature

## Overview

The Map View feature allows users to select addresses by clicking on an interactive map instead of manually entering address ranges.

## Usage

### Enabling Map View

1. Open the extension popup
2. Navigate to the "Route Planner" tab
3. Click the "🗺️ Use Map View - Click houses to add" button

### Selecting Addresses

1. The map will appear centered on Southern California (Orange County)
2. Navigate to your target area using mouse drag and scroll wheel
3. Click on houses/locations to add them to your route
4. The address will be reverse-geocoded and added to your list

### Managing Selected Addresses

- **Undo Last**: Removes the most recently added address
- **Clear All**: Removes all selected addresses
- **Remove Individual**: Click the ✕ button next to any address

### Processing

Click "Process X Houses" where X is your selected count.

## Technical Details

- **Map Library**: Leaflet.js v1.9.4 (local files in lib/)
- **Geocoding**: Nominatim (OpenStreetMap) - free, no API key
- **Rate Limit**: 1 request per second

## Troubleshooting

- Map doesn't appear: Check that lib/leaflet.js and lib/leaflet.css exist
- Geocoding fails: Check internet connection and Nominatim availability
```

**Step 2: Update CLAUDE.md**

Add to the "Route Planner" section:

```markdown
### Route Planner (Extension Feature)

**NEW: Map View Feature**

The Route Planner now supports two modes for address selection:

1. **Address Range Mode** (original): Enter start/end addresses to generate a sequential range
2. **Map View Mode** (new): Click houses on an interactive map to select addresses

**Map View Usage:**
- Click "🗺️ Use Map View" button to toggle map mode
- Click on the map to add addresses
- End address becomes optional in map mode

**See Also:** `sce-extension/docs/MAP_VIEW.md` for complete documentation
```

**Step 3: Commit**

```bash
git add CLAUDE.md sce-extension/docs/MAP_VIEW.md
git commit -m "docs: add map view feature documentation"
```

---

## Task 8: Manual Testing

**Files:**
- Test: Manual testing in browser

**Step 1: Load extension in Chrome**

1. Navigate to `chrome://extensions/`
2. Enable Developer Mode
3. Click "Load unpacked" and select `sce-extension/` directory

**Step 2: Test basic map view flow**

1. Open extension popup
2. Click "Route Planner" tab
3. Click "Use Map View"
4. Verify map loads
5. Click on a location in Orange County
6. Verify address appears in list
7. Click "Undo Last"
8. Verify address is removed
9. Click "Use Address Range Instead"
10. Verify map hides and end address is required again

**Step 3: Test processing flow**

1. In map mode, select 3 addresses
2. Click "Process 3 Houses"
3. Verify tabs open and forms are filled

**Step 4: Create testing notes**

Create `sce-extension/docs/TESTING_NOTES.md` with test results.

**Step 5: Commit**

```bash
git add sce-extension/docs/TESTING_NOTES.md
git commit -m "test: document manual testing results"
```

---

## Summary

After completing all tasks, the Route Planner will have:

1. **Map View Module** (`map-view.js`): Leaflet-based interactive map
2. **Map View UI Module** (`map-view-ui.js`): UI management for map selections
3. **Updated Route Planner**: Integration of map mode with existing logic
4. **Map Mode Toggle**: Easy switching between range and map modes
5. **Optional End Address**: When in map mode, end address is not required
6. **Complete Documentation**: User guide and technical docs

**Key Files Modified/Created:**
- `sce-extension/modules/map-view.js` (new)
- `sce-extension/modules/map-view-ui.js` (new)
- `sce-extension/modules/route-planner.js` (modified)
- `sce-extension/popup.html` (modified)
- `sce-extension/lib/leaflet.js` (new)
- `sce-extension/lib/leaflet.css` (new)
- `sce-extension/manifest.json` (modified)
- `sce-extension/docs/MAP_VIEW.md` (new)
