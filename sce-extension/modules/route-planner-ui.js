/**
 * SCE Route Planner UI Module
 * UI rendering and update functions for route planner
 */

import { showStatusMessage } from './route-planner-utils.js';

/**
 * Update progress display
 * @param {number} current - Current progress
 * @param {number} total - Total items
 */
export function updateProgress(current, total) {
  const progressDiv = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  const progressPercent = document.getElementById('progressPercent');

  if (!progressDiv) return;

  const percent = Math.round((current / total) * 100);
  progressDiv.style.width = `${percent}%`;
  progressDiv.textContent = `${percent}%`;

  if (progressText) {
    progressText.textContent = `${current}/${total} addresses processed`;
  }

  if (progressPercent) {
    progressPercent.textContent = `${percent}%`;
  }
}

/**
 * Update status of an address in the list
 * @param {Object|string} address - Address object or full address string
 * @param {string} status - Status (pending, processing, success, error)
 * @param {Object} customerData - Customer data (optional)
 * @param {string} error - Error message (optional)
 */
export function updateAddressStatus(address, status, customerData = null, error = null) {
  const addressFull = typeof address === 'string' ? address : address.full;
  const listItem = document.querySelector(`[data-address="${addressFull}"]`);

  if (!listItem) return;

  const icon = listItem.querySelector('.status-icon');
  const info = listItem.querySelector('.customer-info');

  if (!icon || !info) return;

  // Update icon
  icon.className = `status-icon ${status}`;

  if (status === 'processing') {
    icon.textContent = '⏳';
    info.textContent = 'Processing...';
  } else if (status === 'success') {
    icon.textContent = '✅';
    if (customerData && customerData.name) {
      // Use textContent to prevent XSS from customer data
      info.textContent = `${customerData.name} - ${customerData.phone || 'No phone'}`;
    } else {
      info.textContent = 'No customer data captured';
    }
  } else if (status === 'error') {
    icon.textContent = '❌';
    info.textContent = error || 'Failed to process';
  }
}

/**
 * Render the initial address list
 * @param {Array<Object>} addresses - Array of address objects
 * @param {HTMLElement} container - Container element to render into
 */
export function renderAddressList(addresses, container) {
  container.innerHTML = '';

  addresses.forEach(address => {
    const item = document.createElement('div');
    item.className = 'address-item';
    item.dataset.address = address.full;

    // Create icon (safe - controlled content)
    const icon = document.createElement('span');
    icon.className = 'status-icon pending';
    icon.textContent = '⏸️';
    item.appendChild(icon);

    // Create address text container
    const textDiv = document.createElement('div');
    textDiv.className = 'address-text';

    // Address div (use textContent to prevent XSS)
    const addrDiv = document.createElement('div');
    addrDiv.textContent = address.full;
    textDiv.appendChild(addrDiv);

    // Customer info div
    const infoDiv = document.createElement('div');
    infoDiv.className = 'customer-info';
    infoDiv.textContent = 'Pending';
    textDiv.appendChild(infoDiv);

    item.appendChild(textDiv);
    container.appendChild(item);
  });
}

/**
 * Reset UI after processing
 * @param {Object} elements - DOM elements cache
 */
export function resetUI(elements) {
  if (elements.stopBtn) {
    elements.stopBtn.style.display = 'none';
  }
  if (elements.generatePdfBtn) {
    elements.generatePdfBtn.disabled = true;
    elements.generatePdfBtn.textContent = 'Generate 3×3 Grid PDF';
  }
  if (elements.progressBar) {
    elements.progressBar.style.width = '0%';
  }
  if (elements.progressText) {
    elements.progressText.textContent = '';
  }
}

/**
 * Handle map toggle (placeholder for future implementation)
 */
export function handleMapToggle() {
  showStatusMessage('Map view coming soon!', 'success');
}
