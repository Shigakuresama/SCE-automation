/**
 * SCE Auto-Fill - Popup Script
 */

const pageInfo = document.getElementById('pageInfo');
const fillBtn = document.getElementById('fillBtn');
const openOptionsBtn = document.getElementById('openOptionsBtn');
const statusDiv = document.getElementById('status');

// Route planner module (lazy loaded)
let routePlannerInitialized = false;

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
  if (!tabs || !tabs[0]) {
    pageInfo.textContent = 'No active tab found.';
    fillBtn.disabled = true;
    return;
  }

  chrome.tabs.sendMessage(tabs[0].id, { action: 'detectPage' }, (response) => {
    if (chrome.runtime.lastError) {
      const errorMsg = chrome.runtime.lastError.message;
      // Distinguish different error types
      if (errorMsg.includes('Receiving end does not exist')) {
        pageInfo.textContent = 'Open an SCE form page to enable auto-fill.';
      } else if (errorMsg.includes('message port closed')) {
        pageInfo.textContent = 'Page is loading. Try refreshing.';
      } else {
        pageInfo.textContent = 'Could not communicate with page. Try refreshing.';
      }
      fillBtn.disabled = true;
      return;
    }

    if (response) {
      const pageKey = response.page || 'Unknown';
      const sectionTitle = response.sectionTitle || '';
      pageInfo.textContent = sectionTitle ? `Section: ${sectionTitle}` : `Page: ${pageKey}`;

      // Enable button on all supported pages
      const formPages = ['customer-search', 'customer-information', 'additional-customer-info',
                        'enrollment-information', 'household-members', 'project-information',
                        'trade-ally-information', 'appointment-contact', 'appointments',
                        'assessment-questionnaire', 'equipment-information', 'basic-enrollment-equipment',
                        'bonus-adjustment-measures', 'review-terms', 'file-uploads', 'review-comments',
                        'application-status'];
      fillBtn.disabled = !formPages.includes(pageKey);

      if (!formPages.includes(pageKey)) {
        pageInfo.textContent += ' (Navigate to a SCE form page)';
      }
    } else {
      pageInfo.textContent = 'Open an SCE form page to enable auto-fill.';
      fillBtn.disabled = true;
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

// Open Options button
openOptionsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// Save Settings button
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
if (saveSettingsBtn) {
  saveSettingsBtn.addEventListener('click', () => {
    const proxyUrl = document.getElementById('proxyUrl').value;
    chrome.storage.sync.set({ proxyUrl }, () => {
      const statusDiv = document.getElementById('settingsStatus');
      if (statusDiv) {
        statusDiv.textContent = '✅ Settings saved!';
        statusDiv.className = 'status success';
        setTimeout(() => {
          statusDiv.className = 'status';
        }, 2000);
      }
    });
  });
}

// ============================================
// TAB NAVIGATION
// ============================================

/**
 * Switch between tabs
 */
function switchTab(tabName) {
  // Hide all tabs
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });

  // Deactivate all buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  // Show selected tab
  const selectedTab = document.getElementById(`${tabName}-tab`);
  if (selectedTab) {
    selectedTab.classList.add('active');
  }

  // Activate button
  const activeBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
  if (activeBtn) {
    activeBtn.classList.add('active');
  }

  // Lazy load route planner module when switching to route planner tab
  if (tabName === 'route-planner' && !routePlannerInitialized) {
    initRoutePlanner();
  }
}

/**
 * Initialize route planner module
 */
async function initRoutePlanner() {
  try {
    // Load the route planner module
    const module = await import('./modules/route-planner.js');
    if (module.init) {
      module.init();
      routePlannerInitialized = true;
      console.log('Route Planner module loaded');
    }
  } catch (error) {
    console.error('Failed to load Route Planner module:', error);
  }
}

// Setup tab navigation
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const tabName = e.target.dataset.tab;
    if (tabName) {
      switchTab(tabName);
    }
  });
});
