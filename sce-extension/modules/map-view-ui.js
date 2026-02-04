/**
 * MapViewUI - UI management for Map View feature
 * Handles address list display, count updates, and user interactions
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
    this.onAddressesChange = options.onAddressesChange || (() => {});

    this.selectedAddresses = [];
    this.elements = null;

    this.cacheElements();
    this.setupEventListeners();
  }

  /**
   * Cache DOM elements
   */
  cacheElements() {
    this.elements = {
      closeBtn: this.container.querySelector('#closeMapBtn'),
      undoBtn: this.container.querySelector('#undoMarkerBtn'),
      clearBtn: this.container.querySelector('#clearMarkersBtn'),
      selectedCount: this.container.querySelector('#selectedCount'),
      addressesList: this.container.querySelector('#mapAddressesList'),
    };

    // Validate required elements
    const missing = [];
    for (const [key, element] of Object.entries(this.elements)) {
      if (!element) {
        missing.push(key);
      }
    }

    if (missing.length > 0) {
      throw new Error(`MapViewUI: Missing required DOM elements: ${missing.join(', ')}`);
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Close button
    if (this.elements.closeBtn) {
      this.elements.closeBtn.addEventListener('click', () => this.hide());
    }

    // Undo button
    if (this.elements.undoBtn) {
      this.elements.undoBtn.addEventListener('click', () => this.undoLast());
    }

    // Clear button
    if (this.elements.clearBtn) {
      this.elements.clearBtn.addEventListener('click', () => this.clearAll());
    }
  }

  /**
   * Show the map view UI
   */
  show() {
    this.container.classList.remove('hidden');
  }

  /**
   * Hide the map view UI
   */
  hide() {
    this.container.classList.add('hidden');
  }

  /**
   * Check if UI is visible
   * @returns {boolean}
   */
  isVisible() {
    return !this.container.classList.contains('hidden');
  }

  /**
   * Handle address selection from map click
   * @param {Object} address - Address object
   */
  onAddressSelect(address) {
    if (!address) {
      return;
    }

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
    if (this.selectedAddresses.length === 0) {
      return;
    }

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
    if (index < 0 || index >= this.selectedAddresses.length) {
      return;
    }

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
   * Render the addresses list using safe DOM methods
   * IMPORTANT: No innerHTML - use createElement/textContent/appendChild
   */
  renderAddressesList() {
    const list = this.elements.addressesList;
    if (!list) {
      return;
    }

    // Clear existing content safely
    while (list.firstChild) {
      list.removeChild(list.firstChild);
    }

    // Show empty message if no addresses
    if (this.selectedAddresses.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'map-addresses-empty';
      emptyMsg.textContent = 'Click on the map to add addresses';
      emptyMsg.style.cssText = 'text-align:center;color:#999;font-size:11px;padding:12px;';
      list.appendChild(emptyMsg);
      return;
    }

    // Render each address
    this.selectedAddresses.forEach((address, index) => {
      const item = document.createElement('div');
      item.className = 'map-address-item';
      item.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:6px;padding:6px;background:#f9f9f9;border-radius:4px;font-size:11px;';

      // Address text
      const addressText = document.createElement('span');
      addressText.className = 'map-address-text';
      addressText.textContent = address.full;
      addressText.style.cssText = 'flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
      item.appendChild(addressText);

      // Remove button
      const removeBtn = document.createElement('button');
      removeBtn.className = 'map-address-remove';
      removeBtn.textContent = '✕';
      removeBtn.style.cssText = 'color:#c62828;cursor:pointer;font-weight:bold;padding:0 4px;border:none;background:none;font-size:14px;';
      removeBtn.onclick = () => this.removeAddressAt(index);
      item.appendChild(removeBtn);

      list.appendChild(item);
    });
  }

  /**
   * Get selected addresses
   * @returns {Array<Object>} Array of address objects
   */
  getSelectedAddresses() {
    return [...this.selectedAddresses];
  }

  /**
   * Set selected addresses
   * @param {Array<Object>} addresses - Array of address objects
   */
  setSelectedAddresses(addresses) {
    this.selectedAddresses = Array.isArray(addresses) ? [...addresses] : [];
    this.updateUI();
  }

  /**
   * Clean up event listeners and references
   */
  destroy() {
    // Clear references
    this.container = null;
    this.mapView = null;
    this.elements = null;
    this.selectedAddresses = null;
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
