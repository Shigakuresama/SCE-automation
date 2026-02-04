/**
 * MapView - Interactive map for selecting addresses
 * Uses Leaflet.js for maps and local proxy server for geocoding
 * Adapted from Chrome Extension for standalone webapp use
 */

const DEFAULT_CENTER = [33.8, -117.8]; // Orange County, SCE service area
const DEFAULT_ZOOM = 14;
const PROXY_BASE_URL = 'http://localhost:3000';

class MapView {
  /**
   * @param {HTMLElement|string} container - DOM element or ID to render map in
   * @param {Object} options - Configuration options
   * @param {Array<number>} options.center - Initial center [lat, lng]
   * @param {number} options.zoom - Initial zoom level
   * @param {string} options.proxyUrl - Proxy server URL (default: localhost:3000)
   * @param {Function} options.onAddressSelect - Callback when address is selected
   * @param {Function} options.onZoneSelect - Callback when zone is drawn with addresses
   */
  constructor(container, options = {}) {
    // Handle container as string ID or DOM element
    this.container = typeof container === 'string'
      ? document.getElementById(container)
      : container;

    if (!this.container) {
      throw new Error(`Map container not found: ${container}`);
    }

    this.map = null;
    this.markers = [];
    this.onAddressSelect = options.onAddressSelect || null;
    this.onZoneSelect = options.onZoneSelect || null;
    this.proxyUrl = options.proxyUrl || PROXY_BASE_URL;

    // Drawing mode state
    this.drawMode = null; // 'rectangle' or 'circle'
    this.drawLayer = null; // Current drawing shape
    this.drawnItems = null; // Layer group for drawn shapes

    // Rectangle drawing state
    this._rectangleStartPoint = null;
    this._rectangleMarker = null;

    // Circle drawing state
    this._circleCenter = null;
    this._circleMarker = null;
    this._circleRadiusLine = null;

    const center = options.center || DEFAULT_CENTER;
    const zoom = options.zoom || DEFAULT_ZOOM;

    this.init(center, zoom);
  }

  /**
   * Initialize the Leaflet map
   */
  init(center, zoom) {
    // Check if Leaflet is available
    if (typeof L === 'undefined') {
      throw new Error('Leaflet (L) is not loaded. Include Leaflet JS before using MapView.');
    }

    // Create map
    this.map = L.map(this.container).setView(center, zoom);

    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(this.map);

    // Handle map clicks
    this.map.on('click', (e) => this.handleMapClick(e));
  }

  /**
   * Handle map click events
   * @param {L.MouseEvent} e - Leaflet click event
   */
  async handleMapClick(e) {
    // If in drawing mode, don't handle as regular click
    if (this.isInDrawMode()) {
      return;
    }

    const { lat, lng } = e.latlng;

    // Geocode the position via proxy
    const address = await this.geocodePosition(lat, lng);

    if (address) {
      // Add marker
      this.addMarker({ lat, lng }, address);

      // Call callback if set
      if (this.onAddressSelect) {
        this.onAddressSelect(address);
      }
    }
  }

  /**
   * Geocode position using proxy server reverse geocoding
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {Promise<Object|null>} Address object or null if failed
   */
  async geocodePosition(lat, lng) {
    try {
      const url = `${this.proxyUrl}/api/reverse-geocode?lat=${lat}&lon=${lng}`;

      const response = await fetch(url, {
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });

      if (!response.ok) {
        console.error('[MapView] Geocoding failed:', response.status, response.statusText);
        return null;
      }

      const json = await response.json();

      if (!json.success || !json.data) {
        console.error('[MapView] No address found for position:', lat, lng);
        return null;
      }

      return json.data;

    } catch (error) {
      console.error('[MapView] Geocoding error:', error.message);

      // Dispatch error event
      this._dispatchError(error.name === 'AbortError'
        ? 'Geocoding request timed out. Is the proxy server running?'
        : 'Geocoding failed. Make sure proxy server is running on port 3000.'
      );

      return null;
    }
  }

  /**
   * Reverse geocode a position (alias for geocodePosition)
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @returns {Promise<Object|null>} Address object or null if failed
   */
  async reverseGeocode(lat, lon) {
    return this.geocodePosition(lat, lon);
  }

  /**
   * Add a marker to the map
   * @param {Object} latlng - { lat, lng }
   * @param {Object} address - Address object
   */
  addMarker(latlng, address) {
    const marker = L.marker([latlng.lat, latlng.lng]);

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
    removeBtn.onclick = () => this.removeMarker(this.markers.length - 1);
    popupContent.appendChild(removeBtn);

    marker.bindPopup(popupContent);
    marker.addTo(this.map);

    // Store marker data
    this.markers.push({
      latlng,
      address,
      leafletMarker: marker
    });

    return marker;
  }

  /**
   * Remove marker by index
   * @param {number} index - Marker index
   */
  removeMarker(index) {
    if (index < 0 || index >= this.markers.length) {
      return;
    }

    const markerData = this.markers[index];
    this.map.removeLayer(markerData.leafletMarker);
    this.markers.splice(index, 1);
  }

  /**
   * Undo last marker
   */
  undoLastMarker() {
    if (this.markers.length > 0) {
      this.removeMarker(this.markers.length - 1);
    }
  }

  /**
   * Clear all markers
   */
  clearMarkers() {
    for (const markerData of this.markers) {
      this.map.removeLayer(markerData.leafletMarker);
    }
    this.markers = [];
  }

  /**
   * Clear all drawn shapes
   */
  clearDrawings() {
    if (this.drawnItems) {
      this.drawnItems.clearLayers();
      this.map.removeLayer(this.drawnItems);
      this.drawnItems = null;
    }
  }

  /**
   * Get selected addresses
   * @returns {Array<Object>} Array of address objects
   */
  getSelectedAddresses() {
    return this.markers.map(m => m.address);
  }

  /**
   * Pan to location
   * @param {Object} latlng - { lat, lng }
   */
  panTo(latlng) {
    this.map.panTo([latlng.lat, latlng.lng]);
  }

  /**
   * Invalidate map size (call after container resize)
   */
  invalidateSize() {
    this.map.invalidateSize();
  }

  /**
   * Clean up map resources
   */
  destroy() {
    if (this.map) {
      this.clearMarkers();
      this.clearDrawings();
      this.map.remove();
      this.map = null;
    }
    this.markers = [];
  }

  // ============================================
  // ADDRESS SEARCH
  // ============================================

  /**
   * Search for an address using proxy server forward geocoding
   * @param {string} query - Address query (e.g., "1909 W Martha Ln, Santa Ana, CA")
   * @returns {Promise<Object|null>} Result with lat, lon, display_name or null
   */
  async searchAddress(query) {
    if (!query || query.trim().length === 0) {
      return null;
    }

    try {
      const url = `${this.proxyUrl}/api/geocode?q=${encodeURIComponent(query.trim())}`;

      const response = await fetch(url, {
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });

      if (!response.ok) {
        console.error('[MapView] Address search failed:', response.status, response.statusText);
        return null;
      }

      const json = await response.json();

      if (!json.success || !json.data) {
        return null;
      }

      // Normalize response format
      return {
        lat: json.data.lat,
        lng: json.data.lon,
        lon: json.data.lon, // For compatibility
        display_name: json.data.display_name,
        address: json.data.address,
        raw: json.data.raw
      };

    } catch (error) {
      console.error('[MapView] Address search error:', error.message);

      this._dispatchError(error.name === 'AbortError'
        ? 'Search timed out. Is the proxy server running?'
        : 'Search failed. Make sure proxy server is running on port 3000.'
      );

      return null;
    }
  }

  /**
   * Search for an address and pan the map to it
   * @param {string} query - Address query
   * @returns {Promise<Object|null>} Result or null
   */
  async goToAddress(query) {
    const result = await this.searchAddress(query);

    if (result) {
      this.map.setView([result.lat, result.lng], 17);
      return result;
    }

    return null;
  }

  // ============================================
  // ZONE DRAWING
  // ============================================

  /**
   * Enable rectangle drawing mode
   */
  enableRectangleDraw() {
    this.disableDrawMode();

    this.drawMode = 'rectangle';

    // Change cursor
    this.container.style.cursor = 'crosshair';

    // Reset state
    this._rectangleStartPoint = null;
    this._rectangleMarker = null;

    // Add click handler for rectangle drawing
    this.map.on('click', this._handleRectangleClick, this);
    this.map.on('mousemove', this._handleRectangleMove, this);
  }

  /**
   * Enable circle drawing mode
   */
  enableCircleDraw() {
    this.disableDrawMode();

    this.drawMode = 'circle';

    // Change cursor
    this.container.style.cursor = 'crosshair';

    // Reset state
    this._circleCenter = null;
    this._circleMarker = null;
    this._circleRadiusLine = null;

    // Add click handler for circle drawing
    this.map.on('click', this._handleCircleClick, this);
    this.map.on('mousemove', this._handleCircleMove, this);
  }

  /**
   * Disable current draw mode
   */
  disableDrawMode() {
    if (!this.drawMode) {
      return;
    }

    // Remove event handlers
    if (this.drawMode === 'rectangle') {
      this.map.off('click', this._handleRectangleClick, this);
      this.map.off('mousemove', this._handleRectangleMove, this);

      if (this._rectangleMarker) {
        this.map.removeLayer(this._rectangleMarker);
        this._rectangleMarker = null;
      }
    } else if (this.drawMode === 'circle') {
      this.map.off('click', this._handleCircleClick, this);
      this.map.off('mousemove', this._handleCircleMove, this);

      if (this._circleMarker) {
        this.map.removeLayer(this._circleMarker);
        this._circleMarker = null;
      }
      if (this._circleRadiusLine) {
        this.map.removeLayer(this._circleRadiusLine);
        this._circleRadiusLine = null;
      }
    }

    // Reset cursor
    this.container.style.cursor = '';

    this.drawMode = null;
    this._rectangleStartPoint = null;
    this._circleCenter = null;
  }

  /**
   * Check if in draw mode
   */
  isInDrawMode() {
    return this.drawMode !== null;
  }

  /**
   * Get current draw mode
   */
  getDrawMode() {
    return this.drawMode;
  }

  /**
   * Handle rectangle click
   * @private
   */
  _handleRectangleClick(e) {
    if (!this._rectangleStartPoint) {
      // First click - set start point
      this._rectangleStartPoint = e.latlng;

      // Add a marker to show start point
      this._rectangleMarker = L.circleMarker(e.latlng, {
        radius: 5,
        color: '#2196F3',
        fillColor: '#2196F3',
        fillOpacity: 0.8
      }).addTo(this.map);

    } else {
      // Second click - complete rectangle
      const bounds = [this._rectangleStartPoint, e.latlng];
      const rectangle = L.rectangle(bounds, {
        color: '#2196F3',
        weight: 2,
        fillColor: '#2196F3',
        fillOpacity: 0.1
      }).addTo(this.map);

      // Add to drawn items
      if (!this.drawnItems) {
        this.drawnItems = L.layerGroup().addTo(this.map);
      }
      this.drawnItems.addLayer(rectangle);

      // Extract addresses in rectangle
      this._extractAddressesInRectangle(bounds);

      // Clean up and exit draw mode
      this.map.removeLayer(this._rectangleMarker);
      this._rectangleMarker = null;
      this._rectangleStartPoint = null;
      this.disableDrawMode();
    }
  }

  /**
   * Handle rectangle mouse move (show preview)
   * @private
   */
  _handleRectangleMove(e) {
    if (!this._rectangleStartPoint || !this._rectangleMarker) {
      return;
    }

    // Update marker position to show preview
    this._rectangleMarker.setLatLng(e.latlng);
  }

  /**
   * Handle circle click
   * @private
   */
  _handleCircleClick(e) {
    if (!this._circleCenter) {
      // First click - set center
      this._circleCenter = e.latlng;

      // Add a marker to show center
      this._circleMarker = L.circleMarker(e.latlng, {
        radius: 5,
        color: '#FF9800',
        fillColor: '#FF9800',
        fillOpacity: 0.8
      }).addTo(this.map);

    } else {
      // Second click - complete circle
      const radius = this._circleCenter.distanceTo(e.latlng);
      const circle = L.circle(this._circleCenter, {
        radius: radius,
        color: '#FF9800',
        weight: 2,
        fillColor: '#FF9800',
        fillOpacity: 0.1
      }).addTo(this.map);

      // Add to drawn items
      if (!this.drawnItems) {
        this.drawnItems = L.layerGroup().addTo(this.map);
      }
      this.drawnItems.addLayer(circle);

      // Extract addresses in circle
      this._extractAddressesInCircle(this._circleCenter, radius);

      // Clean up and exit draw mode
      this.map.removeLayer(this._circleMarker);
      if (this._circleRadiusLine) {
        this.map.removeLayer(this._circleRadiusLine);
      }
      this._circleMarker = null;
      this._circleRadiusLine = null;
      this._circleCenter = null;
      this.disableDrawMode();
    }
  }

  /**
   * Handle circle mouse move (show preview)
   * @private
   */
  _handleCircleMove(e) {
    if (!this._circleCenter || !this._circleMarker) {
      return;
    }

    // Show radius line
    if (this._circleRadiusLine) {
      this._circleRadiusLine.setLatLngs([this._circleCenter, e.latlng]);
    } else {
      this._circleRadiusLine = L.polyline([this._circleCenter, e.latlng], {
        color: '#FF9800',
        weight: 1,
        dashArray: '5, 10'
      }).addTo(this.map);
    }
  }

  /**
   * Extract addresses within a rectangle bounds
   * Uses proxy server to find addresses in the area
   * @private
   */
  async _extractAddressesInRectangle(bounds) {
    const southWest = bounds[0];
    const northEast = bounds[1];

    try {
      const url = `${this.proxyUrl}/api/geocode/bounds`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          southWest: { lat: southWest.lat, lon: southWest.lng },
          northEast: { lat: northEast.lat, lon: northEast.lng }
        }),
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) {
        console.error('[MapView] Failed to extract addresses:', response.status);
        this._dispatchError('Failed to extract addresses. Check proxy server.');
        return;
      }

      const json = await response.json();

      if (!json.success) {
        console.error('[MapView] API error:', json.error);
        this._dispatchError('API error: ' + (json.error || 'Unknown'));
        return;
      }

      // Add addresses as markers
      const addresses = json.data || [];
      for (const address of addresses) {
        if (address.number && address.street) {
          this.addMarker({ lat: address.lat, lng: address.lon }, address);
        }
      }

      // Call callback if set, or show error if no results
      if (addresses.length > 0) {
        if (this.onZoneSelect) {
          this.onZoneSelect(addresses);
        }
      } else {
        // Try expanding the search area slightly (2x in each direction)
        await this._tryExpandedSearch(bounds, 'rectangle');
      }

    } catch (error) {
      console.error('[MapView] Error extracting addresses:', error.message);
      this._dispatchError(error.name === 'AbortError'
        ? 'Request timed out. Try a smaller area.'
        : 'Failed to extract addresses. Is the proxy server running?'
      );
    }
  }

  /**
   * Extract addresses within a circle
   * @private
   */
  async _extractAddressesInCircle(center, radius) {
    // Approximate bounding box for the circle
    const latDelta = (radius / 111000);
    const lngDelta = (radius / (111000 * Math.cos(center.lat * Math.PI / 180)));

    const southWest = L.latLng(center.lat - latDelta, center.lng - lngDelta);
    const northEast = L.latLng(center.lat + latDelta, center.lng + lngDelta);

    try {
      const url = `${this.proxyUrl}/api/geocode/bounds`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          southWest: { lat: southWest.lat, lon: southWest.lng },
          northEast: { lat: northEast.lat, lon: northEast.lng }
        }),
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) {
        console.error('[MapView] Failed to extract addresses:', response.status);
        this._dispatchError('Failed to extract addresses. Check proxy server.');
        return;
      }

      const json = await response.json();

      if (!json.success) {
        console.error('[MapView] API error:', json.error);
        this._dispatchError('API error: ' + (json.error || 'Unknown'));
        return;
      }

      // Parse and filter by actual distance
      const addresses = [];
      for (const address of json.data || []) {
        const distance = center.distanceTo(L.latLng(address.lat, address.lon));

        // Only include if within circle radius
        if (distance <= radius) {
          if (address.number && address.street) {
            addresses.push(address);
            this.addMarker({ lat: address.lat, lng: address.lon }, address);
          }
        }
      }

      // Call callback if set, or try expanded search if no results
      if (addresses.length > 0) {
        if (this.onZoneSelect) {
          this.onZoneSelect(addresses);
        }
      } else {
        // Try expanding the search
        await this._tryExpandedCircleSearch(center, radius);
      }

    } catch (error) {
      console.error('[MapView] Error extracting addresses:', error.message);
      this._dispatchError(error.name === 'AbortError'
        ? 'Request timed out. Try a smaller area.'
        : 'Failed to extract addresses. Is the proxy server running?'
      );
    }
  }

  /**
   * Try expanded search for rectangle
   * @private
   */
  async _tryExpandedSearch(originalBounds, shape) {
    const southWest = originalBounds[0];
    const northEast = originalBounds[1];

    console.log('[MapView] No addresses found, expanding search area...');
    const latDelta = (northEast.lat - southWest.lat) * 2;
    const lonDelta = (northEast.lng - southWest.lng) * 2;

    const expandedSW = {
      lat: Math.max(0, southWest.lat - latDelta),
      lon: southWest.lng - lonDelta
    };
    const expandedNE = {
      lat: northEast.lat + latDelta,
      lon: northEast.lng + lonDelta
    };

    try {
      const url = `${this.proxyUrl}/api/geocode/bounds`;

      const expandedResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          southWest: expandedSW,
          northEast: expandedNE
        }),
        signal: AbortSignal.timeout(15000) // 15 second timeout
      });

      if (expandedResponse.ok) {
        const expandedJson = await expandedResponse.json();
        if (expandedJson.success && expandedJson.data && expandedJson.data.length > 0) {
          const expandedAddresses = expandedJson.data;
          for (const address of expandedAddresses) {
            if (address.number && address.street) {
              this.addMarker({ lat: address.lat, lng: address.lon }, address);
            }
          }
          if (this.onZoneSelect) {
            this.onZoneSelect(expandedAddresses);
          }
          this._dispatchError(`Expanded search area and found ${expandedAddresses.length} nearby addresses.`);
          return;
        }
      }

      // Still no results
      this._dispatchError('No addresses found in this area. Try drawing a larger zone or a different location.');

    } catch (error) {
      console.error('[MapView] Expanded search error:', error.message);
      this._dispatchError('Failed to extract addresses. Is the proxy server running?');
    }
  }

  /**
   * Try expanded search for circle
   * @private
   */
  async _tryExpandedCircleSearch(center, radius) {
    console.log('[MapView] No addresses in circle, expanding area...');
    const expandedRadius = radius * 1.5;
    const latDelta = (expandedRadius / 111000);
    const lngDelta = (expandedRadius / (111000 * Math.cos(center.lat * Math.PI / 180)));

    const expandedSW = {
      lat: Math.max(0, center.lat - latDelta),
      lon: center.lng - lngDelta
    };
    const expandedNE = {
      lat: center.lat + latDelta,
      lon: center.lng + lngDelta
    };

    try {
      const url = `${this.proxyUrl}/api/geocode/bounds`;

      const expandedResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          southWest: expandedSW,
          northEast: expandedNE
        }),
        signal: AbortSignal.timeout(15000)
      });

      if (expandedResponse.ok) {
        const expandedJson = await expandedResponse.json();
        if (expandedJson.success && expandedJson.data && expandedJson.data.length > 0) {
          // Re-filter by distance from center
          const expandedAddresses = [];
          for (const address of expandedJson.data) {
            const distance = center.distanceTo(L.latLng(address.lat, address.lon));
            if (distance <= radius) {
              if (address.number && address.street) {
                expandedAddresses.push(address);
                this.addMarker({ lat: address.lat, lng: address.lon }, address);
              }
            }
          }

          if (expandedAddresses.length > 0) {
            if (this.onZoneSelect) {
              this.onZoneSelect(expandedAddresses);
            }
            this._dispatchError(`Expanded search and found ${expandedAddresses.length} nearby addresses.`);
            return;
          }
        }
      }

      // Still no results
      this._dispatchError('No addresses found in this area. Try drawing a larger circle or a different location.');

    } catch (error) {
      console.error('[MapView] Expanded circle search error:', error.message);
      this._dispatchError('Failed to extract addresses. Is the proxy server running?');
    }
  }

  /**
   * Dispatch error event
   * @private
   */
  _dispatchError(message) {
    const event = new CustomEvent('mapError', {
      detail: { message },
      bubbles: true
    });
    this.container.dispatchEvent(event);
  }
}

// ES6 module export
export { MapView, DEFAULT_CENTER, DEFAULT_ZOOM, PROXY_BASE_URL };
export default MapView;
