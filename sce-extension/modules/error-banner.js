/**
 * SCE Error Banner Module
 * Provides user-visible error and warning banners
 */

/**
 * Show error banner at top of page
 * @param {string} message - Main error message
 * @param {string} details - Optional additional details
 */
export function showError(message, details = '') {
  // Remove existing banner
  const existing = document.getElementById('sce-error-banner');
  if (existing) existing.remove();

  const banner = document.createElement('div');
  banner.id = 'sce-error-banner';
  banner.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: #dc3545;
    color: white;
    padding: 12px 20px;
    z-index: 10000;
    font-family: sans-serif;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  `;

  banner.innerHTML = `
    <div>
      <strong>SCE Auto-Fill Error:</strong> ${escapeHtml(message)}
      ${details ? `<br><small>${escapeHtml(details)}</small>` : ''}
    </div>
    <button onclick="this.parentElement.remove()" style="background:white;color:#dc3545;border:none;padding:4px 12px;cursor:pointer;border-radius:3px;font-weight:bold;">Dismiss</button>
  `;

  document.body.appendChild(banner);

  // Auto-dismiss after 30 seconds
  setTimeout(() => {
    if (banner.parentElement) {
      banner.remove();
    }
  }, 30000);
}

/**
 * Show warning banner at top of page
 * @param {string} message - Warning message
 */
export function showWarning(message) {
  // Remove existing banner
  const existing = document.getElementById('sce-warning-banner');
  if (existing) existing.remove();

  const banner = document.createElement('div');
  banner.id = 'sce-warning-banner';
  banner.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: #ffc107;
    color: black;
    padding: 12px 20px;
    z-index: 10000;
    font-family: sans-serif;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  `;

  banner.innerHTML = `
    <div>
      <strong>SCE Auto-Fill Warning:</strong> ${escapeHtml(message)}
    </div>
    <button onclick="this.parentElement.remove()" style="background:black;color:#ffc107;border:none;padding:4px 12px;cursor:pointer;border-radius:3px;font-weight:bold;">Dismiss</button>
  `;

  document.body.appendChild(banner);

  // Auto-dismiss after 20 seconds
  setTimeout(() => {
    if (banner.parentElement) {
      banner.remove();
    }
  }, 20000);
}

/**
 * Show info banner (non-error, non-warning)
 * @param {string} message - Info message
 */
export function showInfo(message) {
  // Remove existing banner
  const existing = document.getElementById('sce-info-banner');
  if (existing) existing.remove();

  const banner = document.createElement('div');
  banner.id = 'sce-info-banner';
  banner.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: #17a2b8;
    color: white;
    padding: 12px 20px;
    z-index: 10000;
    font-family: sans-serif;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  `;

  banner.innerHTML = `
    <div>
      <strong>SCE Auto-Fill:</strong> ${escapeHtml(message)}
    </div>
    <button onclick="this.parentElement.remove()" style="background:white;color:#17a2b8;border:none;padding:4px 12px;cursor:pointer;border-radius:3px;font-weight:bold;">Dismiss</button>
  `;

  document.body.appendChild(banner);

  // Auto-dismiss after 10 seconds
  setTimeout(() => {
    if (banner.parentElement) {
      banner.remove();
    }
  }, 10000);
}

/**
 * Remove all banners
 */
export function clearAllBanners() {
  const banners = ['sce-error-banner', 'sce-warning-banner', 'sce-info-banner'];
  banners.forEach(id => {
    const banner = document.getElementById(id);
    if (banner) banner.remove();
  });
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Make functions available globally for non-module scripts
if (typeof globalThis !== 'undefined') {
  globalThis.showError = showError;
  globalThis.showWarning = showWarning;
  globalThis.showInfo = showInfo;
  globalThis.clearAllBanners = clearAllBanners;
}
