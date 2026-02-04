/**
 * MapView - Interactive map for selecting addresses
 * Uses Leaflet.js for maps and Nominatim (OpenStreetMap) for geocoding
 */

const DEFAULT_CENTER = [33.8, -117.8]; // Orange County, SCE service area
const DEFAULT_ZOOM = 14;
const NOMINATIM_API = 'https://nominatim.openstreetmap.org/reverse';
const USER_AGENT = 'SCE-Route-Planner/1.0';

export class MapView {
  /**
   * @param {HTMLElement} container - DOM element to render map in
   * @param {Object} options - Configuration options
   * @param {Array<number>} options.center - Initial center [lat, lng]
   * @param {number} options.zoom - Initial zoom level
   */
  constructor(container, options = {}) {
    this.container = container;
    this.map = null;
    this.markers = [];
    this.onAddressSelect = null; // Callback for when address is selected

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
    const { lat, lng } = e.latlng;

    // Geocode the position
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
   * Geocode position using Nominatim reverse geocoding
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {Promise<Object|null>} Address object or null if failed
   */
  async geocodePosition(lat, lng) {
    try {
      const url = `${NOMINATIM_API}?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT
        }
      });

      if (!response.ok) {
        console.error('Geocoding failed:', response.status, response.statusText);
        return null;
      }

      const data = await response.json();

      if (!data.address) {
        console.error('No address found for position:', lat, lng);
        return null;
      }

      // Parse Nominatim response
      const addr = data.address;
      const number = addr.house_number || '';
      const street = addr.road || '';
      const city = addr.city || addr.town || addr.village || addr.county || '';
      let state = addr.state || '';
      const zip = addr.postcode || '';

      // Convert state name to 2-letter abbreviation if needed
      if (state.length > 2) {
        const stateMap = {
          'California': 'CA', 'Texas': 'TX', 'Florida': 'FL', 'New York': 'NY',
          'Pennsylvania': 'PA', 'Illinois': 'IL', 'Ohio': 'OH', 'Georgia': 'GA',
          'North Carolina': 'NC', 'Michigan': 'MI', 'New Jersey': 'NJ', 'Virginia': 'VA',
          'Washington': 'WA', 'Arizona': 'AZ', 'Massachusetts': 'MA', 'Tennessee': 'TN',
          'Indiana': 'IN', 'Missouri': 'MO', 'Maryland': 'MD', 'Wisconsin': 'WI',
          'Colorado': 'CO', 'Minnesota': 'MN', 'Alabama': 'AL', 'South Carolina': 'SC',
          'Louisiana': 'LA', 'Kentucky': 'KY', 'Oregon': 'OR', 'Oklahoma': 'OK',
          'Connecticut': 'CT', 'Utah': 'UT', 'Iowa': 'IA', 'Nevada': 'NV',
          'Arkansas': 'AR', 'Mississippi': 'MS', 'Kansas': 'KS', 'New Mexico': 'NM',
          'Nebraska': 'NE', 'West Virginia': 'WV', 'Idaho': 'ID', 'Hawaii': 'HI',
          'New Hampshire': 'NH', 'Maine': 'ME', 'Montana': 'MT', 'Rhode Island': 'RI',
          'Delaware': 'DE', 'South Dakota': 'SD', 'North Dakota': 'ND', 'Alaska': 'AK',
          'Vermont': 'VT', 'Wyoming': 'WY'
        };
        state = stateMap[state] || state;
      }

      // Build full address
      const fullParts = [number, street].filter(Boolean).join(' ');
      const cityStateZip = [[city, state].filter(Boolean).join(', '), zip].filter(Boolean).join(' ');
      const full = [fullParts, cityStateZip].filter(Boolean).join(', ');

      return {
        number,
        street,
        city,
        state,
        zip,
        full,
        raw: data
      };
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
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
   * Undo last marker
   */
  undoLastMarker() {
    if (this.markers.length > 0) {
      this.removeMarker(this.markers.length - 1);
    }
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
   * Clear all markers
   */
  clearMarkers() {
    for (const markerData of this.markers) {
      this.map.removeLayer(markerData.leafletMarker);
    }
    this.markers = [];
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
      this.map.remove();
      this.map = null;
    }
    this.markers = [];
  }
}
