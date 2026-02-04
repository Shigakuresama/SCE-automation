/**
 * Tests for map-view-ui module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MapViewUI } from './map-view-ui.js';

// Mock MapView class
class MockMapView {
  constructor() {
    this.markers = [];
  }

  undoLastMarker() {
    if (this.markers.length > 0) {
      this.markers.pop();
    }
  }

  clearMarkers() {
    this.markers = [];
  }

  removeMarker(index) {
    if (index >= 0 && index < this.markers.length) {
      this.markers.splice(index, 1);
    }
  }
}

describe('MapViewUI', () => {
  let container;
  let closeMapBtn;
  let undoMarkerBtn;
  let clearMarkersBtn;
  let selectedCount;
  let mapAddressesList;
  let mapView;
  let mapViewUI;

  beforeEach(() => {
    // Create container element
    container = document.createElement('div');
    container.id = 'mapViewContainer';
    container.classList.add('hidden'); // Map view is hidden by default

    // Create child elements using safe DOM methods
    closeMapBtn = document.createElement('button');
    closeMapBtn.id = 'closeMapBtn';
    closeMapBtn.textContent = '✕ Close Map';

    undoMarkerBtn = document.createElement('button');
    undoMarkerBtn.id = 'undoMarkerBtn';
    undoMarkerBtn.textContent = '↶ Undo Last';
    undoMarkerBtn.disabled = true; // Initially disabled

    clearMarkersBtn = document.createElement('button');
    clearMarkersBtn.id = 'clearMarkersBtn';
    clearMarkersBtn.textContent = 'Clear All';

    selectedCount = document.createElement('span');
    selectedCount.id = 'selectedCount';
    selectedCount.textContent = '0 selected';

    mapAddressesList = document.createElement('div');
    mapAddressesList.id = 'mapAddressesList';

    // Append elements to container
    container.appendChild(closeMapBtn);
    container.appendChild(undoMarkerBtn);
    container.appendChild(clearMarkersBtn);
    container.appendChild(selectedCount);
    container.appendChild(mapAddressesList);
    document.body.appendChild(container);

    // Create MapView mock
    mapView = new MockMapView();

    // Create MapViewUI instance
    mapViewUI = new MapViewUI(container, mapView);
  });

  afterEach(() => {
    if (mapViewUI) {
      mapViewUI.destroy();
    }
    document.body.removeChild(container);
  });

  describe('initialization', () => {
    it('should initialize with empty selected addresses', () => {
      expect(mapViewUI.getSelectedAddresses()).toEqual([]);
    });

    it('should cache DOM elements', () => {
      expect(mapViewUI.elements.closeBtn).toBeInstanceOf(HTMLElement);
      expect(mapViewUI.elements.undoBtn).toBeInstanceOf(HTMLElement);
      expect(mapViewUI.elements.clearBtn).toBeInstanceOf(HTMLElement);
      expect(mapViewUI.elements.selectedCount).toBeInstanceOf(HTMLElement);
      expect(mapViewUI.elements.addressesList).toBeInstanceOf(HTMLElement);
    });

    it('should be hidden by default', () => {
      expect(mapViewUI.isVisible()).toBe(false);
    });
  });

  describe('show/hide', () => {
    it('should show the UI', () => {
      mapViewUI.show();
      expect(mapViewUI.isVisible()).toBe(true);
    });

    it('should hide the UI', () => {
      mapViewUI.show();
      mapViewUI.hide();
      expect(mapViewUI.isVisible()).toBe(false);
    });
  });

  describe('address selection', () => {
    const testAddress = {
      number: '1909',
      street: 'W Martha Ln',
      city: 'Santa Ana',
      state: 'CA',
      zip: '92706',
      full: '1909 W Martha Ln, Santa Ana, CA 92706'
    };

    it('should add address to selection', () => {
      mapViewUI.onAddressSelect(testAddress);
      expect(mapViewUI.getSelectedAddresses()).toHaveLength(1);
      expect(mapViewUI.getSelectedAddresses()[0]).toEqual(testAddress);
    });

    it('should update count when address is selected', () => {
      mapViewUI.onAddressSelect(testAddress);
      expect(mapViewUI.elements.selectedCount.textContent).toBe('1 selected');
    });

    it('should render address in list', () => {
      mapViewUI.onAddressSelect(testAddress);
      const addressItems = mapViewUI.elements.addressesList.querySelectorAll('.map-address-item');
      expect(addressItems).toHaveLength(1);
      expect(addressItems[0].textContent).toContain('1909 W Martha Ln');
    });

    it('should enable undo button when address is selected', () => {
      expect(mapViewUI.elements.undoBtn.disabled).toBe(true);
      mapViewUI.onAddressSelect(testAddress);
      expect(mapViewUI.elements.undoBtn.disabled).toBe(false);
    });

    it('should call onAddressesChange callback when address is selected', () => {
      const onAddressesChange = vi.fn();
      const ui = new MapViewUI(container, mapView, { onAddressesChange });

      ui.onAddressSelect(testAddress);

      expect(onAddressesChange).toHaveBeenCalledTimes(1);
      expect(onAddressesChange).toHaveBeenCalledWith([testAddress]);
    });
  });

  describe('address removal', () => {
    const testAddress1 = {
      number: '1909',
      street: 'W Martha Ln',
      city: 'Santa Ana',
      state: 'CA',
      zip: '92706',
      full: '1909 W Martha Ln, Santa Ana, CA 92706'
    };

    const testAddress2 = {
      number: '1911',
      street: 'W Martha Ln',
      city: 'Santa Ana',
      state: 'CA',
      zip: '92706',
      full: '1911 W Martha Ln, Santa Ana, CA 92706'
    };

    beforeEach(() => {
      mapViewUI.onAddressSelect(testAddress1);
      mapViewUI.onAddressSelect(testAddress2);
    });

    it('should remove address from selection', () => {
      expect(mapViewUI.getSelectedAddresses()).toHaveLength(2);
      mapViewUI.onAddressRemove(testAddress1);
      expect(mapViewUI.getSelectedAddresses()).toHaveLength(1);
      expect(mapViewUI.getSelectedAddresses()[0]).toEqual(testAddress2);
    });

    it('should update count when address is removed', () => {
      mapViewUI.onAddressRemove(testAddress1);
      expect(mapViewUI.elements.selectedCount.textContent).toBe('1 selected');
    });

    it('should disable undo button when all addresses are removed', () => {
      mapViewUI.onAddressRemove(testAddress1);
      mapViewUI.onAddressRemove(testAddress2);
      expect(mapViewUI.elements.undoBtn.disabled).toBe(true);
    });

    it('should call onAddressesChange callback when address is removed', () => {
      const onAddressesChange = vi.fn();
      const ui = new MapViewUI(container, mapView, { onAddressesChange });

      ui.onAddressSelect(testAddress1);
      ui.onAddressSelect(testAddress2);
      onAddressesChange.mockClear();

      ui.onAddressRemove(testAddress1);

      expect(onAddressesChange).toHaveBeenCalledTimes(1);
      expect(onAddressesChange).toHaveBeenCalledWith([testAddress2]);
    });
  });

  describe('undo', () => {
    const testAddress = {
      number: '1909',
      street: 'W Martha Ln',
      city: 'Santa Ana',
      state: 'CA',
      zip: '92706',
      full: '1909 W Martha Ln, Santa Ana, CA 92706'
    };

    it('should undo last address selection', () => {
      mapViewUI.onAddressSelect(testAddress);
      expect(mapViewUI.getSelectedAddresses()).toHaveLength(1);

      mapViewUI.undoLast();
      expect(mapViewUI.getSelectedAddresses()).toHaveLength(0);
    });

    it('should call mapView.undoLastMarker', () => {
      const spy = vi.spyOn(mapView, 'undoLastMarker');
      mapViewUI.onAddressSelect(testAddress);
      mapViewUI.undoLast();
      expect(spy).toHaveBeenCalled();
    });

    it('should not throw when undoing with empty selection', () => {
      expect(() => mapViewUI.undoLast()).not.toThrow();
    });

    it('should call onAddressesChange callback when undo', () => {
      const onAddressesChange = vi.fn();
      const ui = new MapViewUI(container, mapView, { onAddressesChange });

      ui.onAddressSelect(testAddress);
      onAddressesChange.mockClear();

      ui.undoLast();

      expect(onAddressesChange).toHaveBeenCalledTimes(1);
      expect(onAddressesChange).toHaveBeenCalledWith([]);
    });
  });

  describe('clearAll', () => {
    const testAddress1 = {
      number: '1909',
      street: 'W Martha Ln',
      city: 'Santa Ana',
      state: 'CA',
      zip: '92706',
      full: '1909 W Martha Ln, Santa Ana, CA 92706'
    };

    const testAddress2 = {
      number: '1911',
      street: 'W Martha Ln',
      city: 'Santa Ana',
      state: 'CA',
      zip: '92706',
      full: '1911 W Martha Ln, Santa Ana, CA 92706'
    };

    beforeEach(() => {
      mapViewUI.onAddressSelect(testAddress1);
      mapViewUI.onAddressSelect(testAddress2);
    });

    it('should clear all selected addresses', () => {
      expect(mapViewUI.getSelectedAddresses()).toHaveLength(2);
      mapViewUI.clearAll();
      expect(mapViewUI.getSelectedAddresses()).toHaveLength(0);
    });

    it('should call mapView.clearMarkers', () => {
      const spy = vi.spyOn(mapView, 'clearMarkers');
      mapViewUI.clearAll();
      expect(spy).toHaveBeenCalled();
    });

    it('should update count to zero', () => {
      mapViewUI.clearAll();
      expect(mapViewUI.elements.selectedCount.textContent).toBe('0 selected');
    });

    it('should disable undo button', () => {
      mapViewUI.clearAll();
      expect(mapViewUI.elements.undoBtn.disabled).toBe(true);
    });

    it('should call onAddressesChange callback when cleared', () => {
      const onAddressesChange = vi.fn();
      const ui = new MapViewUI(container, mapView, { onAddressesChange });

      ui.onAddressSelect(testAddress1);
      ui.onAddressSelect(testAddress2);
      onAddressesChange.mockClear();

      ui.clearAll();

      expect(onAddressesChange).toHaveBeenCalledTimes(1);
      expect(onAddressesChange).toHaveBeenCalledWith([]);
    });
  });

  describe('removeAddressAt', () => {
    const testAddress1 = {
      number: '1909',
      street: 'W Martha Ln',
      city: 'Santa Ana',
      state: 'CA',
      zip: '92706',
      full: '1909 W Martha Ln, Santa Ana, CA 92706'
    };

    const testAddress2 = {
      number: '1911',
      street: 'W Martha Ln',
      city: 'Santa Ana',
      state: 'CA',
      zip: '92706',
      full: '1911 W Martha Ln, Santa Ana, CA 92706'
    };

    const testAddress3 = {
      number: '1913',
      street: 'W Martha Ln',
      city: 'Santa Ana',
      state: 'CA',
      zip: '92706',
      full: '1913 W Martha Ln, Santa Ana, CA 92706'
    };

    beforeEach(() => {
      mapViewUI.onAddressSelect(testAddress1);
      mapViewUI.onAddressSelect(testAddress2);
      mapViewUI.onAddressSelect(testAddress3);
    });

    it('should remove address at specific index', () => {
      expect(mapViewUI.getSelectedAddresses()).toHaveLength(3);
      mapViewUI.removeAddressAt(1);
      expect(mapViewUI.getSelectedAddresses()).toHaveLength(2);
      expect(mapViewUI.getSelectedAddresses()[0]).toEqual(testAddress1);
      expect(mapViewUI.getSelectedAddresses()[1]).toEqual(testAddress3);
    });

    it('should not throw for invalid index', () => {
      expect(() => mapViewUI.removeAddressAt(-1)).not.toThrow();
      expect(() => mapViewUI.removeAddressAt(999)).not.toThrow();
    });

    it('should call onAddressesChange callback when address removed at index', () => {
      const onAddressesChange = vi.fn();
      const ui = new MapViewUI(container, mapView, { onAddressesChange });

      ui.onAddressSelect(testAddress1);
      ui.onAddressSelect(testAddress2);
      ui.onAddressSelect(testAddress3);
      onAddressesChange.mockClear();

      ui.removeAddressAt(1);

      expect(onAddressesChange).toHaveBeenCalledTimes(1);
      const expected = [testAddress1, testAddress3];
      expect(onAddressesChange).toHaveBeenCalledWith(expected);
    });
  });

  describe('updateUI', () => {
    const testAddress = {
      number: '1909',
      street: 'W Martha Ln',
      city: 'Santa Ana',
      state: 'CA',
      zip: '92706',
      full: '1909 W Martha Ln, Santa Ana, CA 92706'
    };

    it('should update all UI elements', () => {
      mapViewUI.onAddressSelect(testAddress);
      expect(mapViewUI.elements.selectedCount.textContent).toBe('1 selected');
      expect(mapViewUI.elements.undoBtn.disabled).toBe(false);
    });
  });

  describe('setSelectedAddresses', () => {
    const testAddresses = [
      {
        number: '1909',
        street: 'W Martha Ln',
        city: 'Santa Ana',
        state: 'CA',
        zip: '92706',
        full: '1909 W Martha Ln, Santa Ana, CA 92706'
      },
      {
        number: '1911',
        street: 'W Martha Ln',
        city: 'Santa Ana',
        state: 'CA',
        zip: '92706',
        full: '1911 W Martha Ln, Santa Ana, CA 92706'
      }
    ];

    it('should set selected addresses', () => {
      mapViewUI.setSelectedAddresses(testAddresses);
      expect(mapViewUI.getSelectedAddresses()).toEqual(testAddresses);
    });

    it('should update UI when addresses are set', () => {
      mapViewUI.setSelectedAddresses(testAddresses);
      expect(mapViewUI.elements.selectedCount.textContent).toBe('2 selected');
    });
  });

  describe('destroy', () => {
    it('should clear references', () => {
      mapViewUI.destroy();
      expect(mapViewUI.container).toBe(null);
      expect(mapViewUI.mapView).toBe(null);
      expect(mapViewUI.elements).toBe(null);
    });
  });

  describe('renderAddressesList', () => {
    it('should show empty message when no addresses', () => {
      mapViewUI.renderAddressesList();
      const emptyMsg = mapViewUI.elements.addressesList.querySelector('.map-addresses-empty');
      expect(emptyMsg).not.toBeNull();
      expect(emptyMsg.textContent).toContain('Click on the map to add addresses');
    });

    it('should render addresses using safe DOM methods', () => {
      const dangerousAddress = {
        number: '1909',
        street: '<script>alert("xss")</script>W Martha Ln',
        city: 'Santa Ana',
        state: 'CA',
        zip: '92706',
        full: '<script>alert("xss")</script>1909 W Martha Ln, Santa Ana, CA 92706'
      };

      mapViewUI.onAddressSelect(dangerousAddress);
      const addressText = mapViewUI.elements.addressesList.textContent;
      expect(addressText).toContain('<script>');
      // Should not contain actual script tag in DOM structure
      expect(mapViewUI.elements.addressesList.querySelector('script')).toBeNull();
    });

    it('should create remove buttons for each address', () => {
      mapViewUI.onAddressSelect({
        number: '1909',
        street: 'W Martha Ln',
        city: 'Santa Ana',
        state: 'CA',
        zip: '92706',
        full: '1909 W Martha Ln, Santa Ana, CA 92706'
      });

      const removeBtn = mapViewUI.elements.addressesList.querySelector('.map-address-remove');
      expect(removeBtn).not.toBeNull();
      expect(removeBtn.textContent).toBe('✕');
    });
  });

  describe('event listeners', () => {
    it('should hide UI when close button is clicked', () => {
      mapViewUI.show();
      expect(mapViewUI.isVisible()).toBe(true);

      mapViewUI.elements.closeBtn.click();
      expect(mapViewUI.isVisible()).toBe(false);
    });

    it('should undo when undo button is clicked', () => {
      // Add an address first
      mapViewUI.onAddressSelect({
        number: '1909',
        street: 'W Martha Ln',
        city: 'Santa Ana',
        state: 'CA',
        zip: '92706',
        full: '1909 W Martha Ln, Santa Ana, CA 92706'
      });

      expect(mapViewUI.getSelectedAddresses()).toHaveLength(1);

      // Click undo button
      mapViewUI.elements.undoBtn.click();

      // Should have removed the address
      expect(mapViewUI.getSelectedAddresses()).toHaveLength(0);
    });

    it('should clear all when clear button is clicked', () => {
      mapViewUI.onAddressSelect({
        number: '1909',
        street: 'W Martha Ln',
        city: 'Santa Ana',
        state: 'CA',
        zip: '92706',
        full: '1909 W Martha Ln, Santa Ana, CA 92706'
      });

      expect(mapViewUI.getSelectedAddresses()).toHaveLength(1);

      mapViewUI.elements.clearBtn.click();

      expect(mapViewUI.getSelectedAddresses()).toHaveLength(0);
    });
  });
});
