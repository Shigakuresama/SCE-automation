// Application Status section - captures customer data for route planner

/**
 * Fill/capture Application Status section
 * @param {Object} config - Configuration object
 * @param {Object} helpers - Helper functions from content.js
 * @returns {Promise<boolean>} Success status
 */
export async function fill(config, helpers) {
  const { log } = helpers;

  log('📋 Application Status - Capturing customer data...');

  try {
    // Capture customer data from the page
    const customerData = captureCustomerDataFromPage();

    if (customerData && (customerData.homeownerName || customerData.homeownerPhone)) {
      log(`  ✓ Captured: ${customerData.homeownerName || 'N/A'}, ${customerData.homeownerPhone || 'N/A'}`);

      // Send to background script for route planner
      chrome.runtime.sendMessage({
        action: 'addCaseToRoute',
        data: customerData
      }, (response) => {
        if (chrome.runtime.lastError) {
          log(`  ⚠️ Failed to send data to background: ${chrome.runtime.lastError.message}`);
        } else if (response && response.success) {
          log(`  ✓ Data sent to route planner successfully`);
        }
      });

      // Show info banner to user
      if (typeof globalThis.showInfo === 'function') {
        globalThis.showInfo('Customer data captured for route planner');
      }

      return true;
    } else {
      log('  ⚠️ No customer data found on page');
      return false;
    }
  } catch (error) {
    console.error('Error in Application Status section:', error);
    log('❌ Error capturing Application Status data:', error.message);

    // Notify user if showError available
    if (typeof globalThis.showError === 'function') {
      globalThis.showError('Failed to capture customer data', error.message);
    }

    return false;
  }
}

/**
 * Capture customer data from Application Status page
 * @returns {Object|null} Customer data object or null if not found
 */
function captureCustomerDataFromPage() {
  try {
    // Extract case ID from URL
    const url = new URL(window.location.href);
    const caseId = url.searchParams.get('caseId') || url.pathname.split('/').pop();

    // Try multiple selector patterns to find homeowner name
    let homeownerName = null;
    let homeownerPhone = null;
    let address = null;

    // Pattern 1: Look for homeowner name in readonly input fields
    const nameInput = document.querySelector('input[readonly*="name" i], input[aria-label*="name" i]');
    if (nameInput && nameInput.value) {
      homeownerName = nameInput.value.trim();
    }

    // Pattern 2: Look in text content for homeowner name section
    if (!homeownerName) {
      const labels = Array.from(document.querySelectorAll('mat-label'));
      const nameLabel = labels.find(l => l.textContent.includes('Homeowner Name') || l.textContent.includes('Customer Name'));
      if (nameLabel) {
        const formField = nameLabel.closest('mat-form-field');
        if (formField) {
          const input = formField.querySelector('input');
          if (input && input.value) {
            homeownerName = input.value.trim();
          } else {
            // Try to find displayed text
            const textDiv = formField.querySelector('.mat-input-element, [class*="display"]');
            if (textDiv) {
              homeownerName = textDiv.textContent?.trim() || null;
            }
          }
        }
      }
    }

    // Pattern 3: Search all input fields for name-like data
    if (!homeownerName) {
      const allInputs = Array.from(document.querySelectorAll('input[type="text"], input:not([type])'));
      for (const input of allInputs) {
        const value = input.value?.trim();
        const label = input.getAttribute('aria-label') || '';
        const placeholder = input.getAttribute('placeholder') || '';

        // Skip empty values
        if (!value || value.length < 2) continue;

        // Skip obvious non-name fields
        if (label.toLowerCase().includes('address') || label.toLowerCase().includes('zip') ||
            placeholder.toLowerCase().includes('address') || placeholder.toLowerCase().includes('zip')) {
          continue;
        }

        // Look for name-like patterns (2+ words, or capitalized)
        if (value.includes(' ') && value.length < 50 && !value.includes('\n')) {
          homeownerName = value;
          break;
        }
      }
    }

    // Try to find phone number
    const phoneInput = document.querySelector('input[type="tel"], input[aria-label*="phone" i], input[placeholder*="phone" i]');
    if (phoneInput && phoneInput.value) {
      homeownerPhone = phoneInput.value.trim();
    }

    // Fallback: look for phone pattern in all inputs
    if (!homeownerPhone) {
      const allInputs = Array.from(document.querySelectorAll('input'));
      for (const input of allInputs) {
        const value = input.value?.trim();
        if (value && /^\d{10}|\(\d{3}\)\s*\d{3}[-\s]?\d{4}/.test(value.replace(/\D/g, ''))) {
          homeownerPhone = value;
          break;
        }
      }
    }

    // Try to find address from page
    const addressInput = document.querySelector('input[aria-label*="address" i], input[placeholder*="address" i]');
    if (addressInput && addressInput.value) {
      address = addressInput.value.trim();
    }

    // Check if customer is qualified (not disqualified)
    const pageText = document.body.textContent || '';
    const isQualified = !pageText.toLowerCase().includes('not qualified') &&
                       !pageText.toLowerCase().includes('disqualified') &&
                       !pageText.toLowerCase().includes('ineligible');

    const customerData = {
      caseId,
      address,
      homeownerName,
      homeownerPhone,
      isQualified,
      capturedAt: new Date().toISOString()
    };

    // Only return if we found at least some data
    if (homeownerName || homeownerPhone || address) {
      return customerData;
    }

    return null;
  } catch (error) {
    console.error('Error capturing customer data:', error);
    return null;
  }
}
