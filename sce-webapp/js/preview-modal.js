/**
 * Preview Modal Component
 * Shows block preview before full route visualization
 */

export class PreviewModal {
  constructor() {
    this.modal = null;
    this.onShowFullRoute = null;
    this.onCancel = null;
  }

  /**
   * Show preview modal for a detected block
   * @param {Object} block - Block data from BlockDetector
   * @returns {Promise<boolean>} True if user wants to see full route
   */
  async show(block) {
    return new Promise((resolve) => {
      this._createModal(block);
      this.onShowFullRoute = () => {
        this.close();
        resolve(true);
      };
      this.onCancel = () => {
        this.close();
        resolve(false);
      };
    });
  }

  /**
   * Create modal DOM element
   * @private
   */
  _createModal(block) {
    const modal = document.createElement('div');
    modal.className = 'preview-modal-overlay';

    const first5 = block.addresses.slice(0, 5);
    const last5 = block.addresses.slice(-5);

    modal.innerHTML = `
      <div class="preview-modal">
        <div class="preview-modal-header">
          <h2>📍 Block Detected</h2>
          <button class="preview-modal-close" onclick="this.closest('.preview-modal-overlay').remove()">×</button>
        </div>

        <div class="preview-modal-body">
          <div class="preview-info">
            <p><strong>Location:</strong> ${this._formatLocation(block)}</p>
            <p><strong>Total Addresses:</strong> ${block.totalAddresses}</p>
            <p><strong>Estimated Time:</strong> ${block.estimatedTime}</p>
          </div>

          ${first5.length > 0 ? `
          <div class="preview-section">
            <h3>First ${Math.min(5, block.totalAddresses)}:</h3>
            <ul class="preview-list">
              ${first5.map((addr, i) => `<li>${addr.full || addr.display_name || `Address ${i+1}`}</li>`).join('')}
            </ul>
          </div>
          ` : ''}

          ${block.totalAddresses > 5 ? `
          <div class="preview-section">
            <h3>Last ${Math.min(5, block.totalAddresses)}:</h3>
            <ul class="preview-list">
              ${last5.map((addr, i) => `<li>${addr.full || addr.display_name || `Address ${block.totalAddresses-4+i}`}</li>`).join('')}
            </ul>
          </div>
          ` : ''}
        </div>

        <div class="preview-modal-footer">
          <button class="btn-secondary" id="previewCancel">Cancel</button>
          <button class="btn-primary" id="previewShowFull">Show Full Route</button>
        </div>
      </div>
    `;

    // Add to document
    document.body.appendChild(modal);

    // Setup event listeners
    modal.querySelector('#previewCancel').addEventListener('click', () => this.onCancel());
    modal.querySelector('#previewShowFull').addEventListener('click', () => this.onShowFullRoute());

    this.modal = modal;
  }

  /**
   * Format block location for display
   * @private
   */
  _formatLocation(block) {
    const streets = block.perimeterStreets?.map(s => s.name).filter(Boolean);
    if (streets.length >= 2) {
      return `${streets[0]} / ${streets[1]} area`;
    }
    return 'Block area';
  }

  /**
   * Close and remove modal
   */
  close() {
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }
  }
}

export default PreviewModal;
