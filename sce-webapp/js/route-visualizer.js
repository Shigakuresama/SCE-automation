/**
 * Route Visualizer Module
 * Visualizes block perimeter routes on Leaflet maps
 */

import { orderClockwise } from './address-ordering.js';

const MARKER_COLORS = [
  '#1976D2', '#4CAF50', '#FF9800', '#9C27B0', '#F44336',
  '#00BCD4', '#795548', '#607D8B', '#3F51B5'
];

export class RouteVisualizer {
  constructor(map) {
    this.map = map;
    this.markers = [];
    this.polylines = [];
    this.highlightLayer = null;
  }

  /**
   * Visualize a block route on the map
   * @param {Object} block - Block data with addresses
   * @returns {L.LayerGroup} Layer group with all visual elements
   */
  visualizeRoute(block) {
    const layerGroup = L.layerGroup();

    // Order addresses clockwise
    const orderedAddresses = orderClockwise(block.addresses, block.center);

    // Add polyline path connecting all addresses
    const polyline = this._createPolyline(orderedAddresses);
    this.polylines.push(polyline);
    layerGroup.addLayer(polyline);

    // Add numbered markers for each address
    orderedAddresses.forEach((addr, idx) => {
      const marker = this._createNumberedMarker(addr, idx + 1);
      this.markers.push(marker);
      layerGroup.addLayer(marker);
    });

    // Highlight block perimeter
    const perimeter = this._createPerimeterHighlight(block);
    layerGroup.addLayer(perimeter);

    layerGroup.addTo(this.map);
    return layerGroup;
  }

  /**
   * Create numbered marker for an address
   * @private
   */
  _createNumberedMarker(address, number) {
    const color = MARKER_COLORS[(number - 1) % MARKER_COLORS.length];

    const icon = L.divIcon({
      className: 'route-marker',
      html: `<div style="
        background: ${color};
        color: white;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 12px;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      ">${number}</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });

    const marker = L.marker([address.lat, address.lon], { icon });

    // Popup with address info
    const popupContent = `
      <div style="min-width: 150px">
        <strong>#${number}</strong><br>
        ${address.full || address.display_name || 'Unknown'}<br>
        <small>Position: ${number}</small>
      </div>
    `;
    marker.bindPopup(popupContent);

    return marker;
  }

  /**
   * Create polyline connecting all addresses
   * @private
   */
  _createPolyline(addresses) {
    const latLngs = addresses.map(addr => [addr.lat, addr.lon]);

    return L.polyline(latLngs, {
      color: '#1976D2',
      weight: 3,
      opacity: 0.7,
      dashArray: '10, 10'
    });
  }

  /**
   * Create perimeter highlight around block
   * @private
   */
  _createPerimeterHighlight(block) {
    // Create rectangle around block bounds
    const bounds = this._calculateBounds(block.addresses);

    return L.rectangle(bounds, {
      color: '#FF5722',
      weight: 2,
      fillColor: '#FF5722',
      fillOpacity: 0.1,
      interactive: false
    });
  }

  /**
   * Calculate bounding box for addresses
   * @private
   */
  _calculateBounds(addresses) {
    const lats = addresses.map(a => a.lat);
    const lons = addresses.map(a => a.lon);

    return [
      [Math.min(...lats), Math.min(...lons)],
      [Math.max(...lats), Math.max(...lons)]
    ];
  }

  /**
   * Highlight a specific address (for list sync)
   * @param {number} position - Address position to highlight
   */
  highlightAddress(position) {
    if (this.markers[position]) {
      const marker = this.markers[position];
      const icon = marker.getIcon();

      // Flash the marker
      marker.getElement()?.style.setProperty('animation', 'pulse 1s ease-in-out');
    }
  }

  /**
   * Clear all visual elements
   */
  clearRoute() {
    this.markers.forEach(marker => this.map.removeLayer(marker));
    this.polylines.forEach(line => this.map.removeLayer(line));

    this.markers = [];
    this.polylines = [];
  }

  /**
   * Get marker by position
   * @param {number} position - Address position
   * @returns {L.Marker} Marker at position
   */
  getMarker(position) {
    return this.markers[position];
  }
}

export default RouteVisualizer;
