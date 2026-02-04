/**
 * SCE Route Planner Utilities
 * Shared utility functions for route planner UI
 */

/**
 * Sleep utility
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Debounce function execution
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Show error styling on form element
 * @param {HTMLElement} element - Form element
 * @param {string} message - Error message
 */
export function showError(element, message) {
  element.classList.add('error');
  element.title = message;
  const errorDiv = element.parentElement.querySelector('.error-message');
  if (errorDiv) {
    errorDiv.textContent = message;
  }
}

/**
 * Clear error styling from form element
 * @param {HTMLElement} element - Form element
 */
export function clearError(element) {
  element.classList.remove('error');
  element.title = '';
  const errorDiv = element.parentElement.querySelector('.error-message');
  if (errorDiv) {
    errorDiv.textContent = '';
  }
}

/**
 * Show status message to user
 * @param {string} message - Message text
 * @param {string} type - Message type (success, error, warning, info)
 */
export function showStatusMessage(message, type = 'info') {
  const statusDiv = document.getElementById('status');
  if (!statusDiv) return;

  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;

  // Auto-hide success messages
  if (type === 'success') {
    setTimeout(() => {
      statusDiv.textContent = '';
      statusDiv.className = 'status';
    }, 3000);
  }
}

/**
 * Parse skip addresses from comma-separated string
 * @param {string} skipValue - Comma-separated address numbers to skip
 * @returns {Set<string>} Set of address numbers to skip
 */
export function parseSkipAddresses(skipValue) {
  if (!skipValue || !skipValue.trim()) {
    return new Set();
  }

  const addresses = skipValue
    .split(',')
    .map(a => a.trim())
    .filter(a => a.length > 0);

  return new Set(addresses);
}

/**
 * Switch to a different tab
 * @param {string} tabName - Tab name (autofill, routePlanner, settings)
 */
export function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.getElementById(`${tabName}Tab`)?.classList.add('active');

  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.style.display = 'none';
  });
  document.getElementById(`${tabName}Content`)?.style.display = 'block';

  // Initialize route planner when switching to it
  if (tabName === 'routePlanner') {
    window.initRoutePlanner?.();
  }
}
