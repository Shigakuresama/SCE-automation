/**
 * SCE Auto-Fill - Popup Script
 */

const pageInfo = document.getElementById('pageInfo');
const fillBtn = document.getElementById('fillBtn');
const settingsBtn = document.getElementById('settingsBtn');
const statusDiv = document.getElementById('status');

// Check proxy server status
async function checkProxyStatus() {
  try {
    const response = await fetch('http://localhost:3000/api/health', {
      method: 'GET',
      signal: AbortSignal.timeout(1000)
    });

    if (response.ok) {
      const data = await response.json();
      return { connected: true, cacheSize: data.cacheSize || 0 };
    }
  } catch (err) {
    // Ignore
  }
  return { connected: false, cacheSize: 0 };
}

// Update proxy status indicator
async function updateProxyStatus() {
  const status = await checkProxyStatus();
  const indicator = document.getElementById('proxyStatus') || createProxyIndicator();

  if (status.connected) {
    indicator.className = 'proxy-status connected';
    indicator.innerHTML = `🏠 Proxy: Connected (${status.cacheSize} cached)`;
    indicator.title = 'Property data proxy is running';
  } else {
    indicator.className = 'proxy-status disconnected';
    indicator.innerHTML = '🏠 Proxy: Disconnected';
    indicator.title = 'Start the proxy server with: npm start in sce-proxy-server';
  }
}

function createProxyIndicator() {
  const div = document.createElement('div');
  div.id = 'proxyStatus';
  div.className = 'proxy-status';
  document.body.insertBefore(div, document.body.firstChild);
  return div;
}

// Detect current page
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  chrome.tabs.sendMessage(tabs[0].id, { action: 'detectPage' }, (response) => {
    if (response) {
      pageInfo.textContent = `Page: ${response.page || 'Unknown'}`;

      // Enable button on all supported pages
      const formPages = ['customer-search', 'customer-information', 'additional-customer-info',
                        'enrollment-information', 'project-information', 'trade-ally-information',
                        'appointment-contact', 'assessment-questionnaire', 'measure-info', 'application-status'];
      fillBtn.disabled = !formPages.includes(response.page);

      if (!formPages.includes(response.page)) {
        pageInfo.textContent += ' (Navigate to a SCE form page)';
      }
    }
  });
});

// Update proxy status on load
updateProxyStatus();

// Fill button
fillBtn.addEventListener('click', () => {
  statusDiv.textContent = 'Filling form...';
  statusDiv.className = 'status';

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: 'fillForm' }, (response) => {
      if (response && response.success) {
        statusDiv.textContent = '✅ Form filled successfully!';
        statusDiv.className = 'status success';
      } else {
        statusDiv.textContent = '⚠️ Could not fill form. Make sure you are on a SCE form page.';
        statusDiv.className = 'status error';
      }
    });
  });
});

// Settings button
settingsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});
