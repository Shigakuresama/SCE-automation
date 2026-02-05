/**
 * Route List Component
 * Interactive list with map synchronization
 */

export class RouteList {
  constructor(container, options = {}) {
    this.container = container;
    this.onItemClick = options.onItemClick || null;
    this.addresses = [];
    this.activeIndex = -1;
  }

  /**
   * Render the route list
   * @param {Array<Object>} addresses - Ordered addresses
   */
  render(addresses) {
    this.addresses = addresses;
    this.container.innerHTML = '';

    if (addresses.length === 0) {
      this.container.innerHTML = '<p class="route-list-empty">No addresses in route</p>';
      return;
    }

    addresses.forEach((addr, idx) => {
      const item = this._createItem(addr, idx);
      this.container.appendChild(item);
    });
  }

  /**
   * Create a single route list item
   * @private
   */
  _createItem(address, index) {
    const item = document.createElement('div');
    item.className = 'route-item';
    item.dataset.index = index;

    const number = document.createElement('span');
    number.className = 'route-item-number';
    number.textContent = index + 1;

    const text = document.createTextNode(address.full || address.display_name || `Address ${index + 1}`);

    item.appendChild(number);
    item.appendChild(text);

    // Click handler
    item.addEventListener('click', () => {
      this.setActive(index);
      if (this.onItemClick) {
        this.onItemClick(address, index);
      }
    });

    // Hover handler for map sync
    item.addEventListener('mouseenter', () => {
      if (this.onItemClick) {
        this.onItemClick(address, index, true);
      }
    });

    return item;
  }

  /**
   * Set active item
   * @param {number} index - Index to activate
   */
  setActive(index) {
    const items = this.container.querySelectorAll('.route-item');
    items.forEach(item => item.classList.remove('active'));

    if (items[index]) {
      items[index].classList.add('active');
      items[index].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    this.activeIndex = index;
  }

  /**
   * Update single item (for SCE data updates)
   * @param {number} index - Item index
   * @param {Object} data - New data
   */
  updateItem(index, data) {
    const items = this.container.querySelectorAll('.route-item');
    const item = items[index];

    if (!item) return;

    const status = document.createElement('span');
    status.className = 'route-item-status';
    status.textContent = '✓';
    status.title = `${data.customerName} - ${data.phone}`;
    item.appendChild(status);
  }

  /**
   * Get all addresses
   */
  getAddresses() {
    return this.addresses;
  }

  /**
   * Clear the list
   */
  clear() {
    this.addresses = [];
    this.activeIndex = -1;
    this.container.innerHTML = '<p class="route-list-empty">No addresses in route</p>';
  }
}

export default RouteList;
