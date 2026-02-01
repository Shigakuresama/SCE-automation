/**
 * SCE Form Auto-Fill - Background Service Worker
 */

console.log('[SCE Auto-Fill] Background service worker loaded');

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'fillSCEForm',
    title: 'Fill SCE Form',
    contexts: ['page', 'selection'],
    documentUrlPatterns: [
      'https://sce.dsmcentral.com/*',
      'https://sce-trade-ally-community.my.site.com/*'
    ]
  });

  chrome.contextMenus.create({
    id: 'openSettings',
    title: '⚙️ Settings',
    contexts: ['page', 'selection'],
    documentUrlPatterns: [
      'https://sce.dsmcentral.com/*',
      'https://sce-trade-ally-community.my.site.com/*'
    ]
  });

  console.log('[SCE Auto-Fill] Context menu created');
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'fillSCEForm') {
    chrome.tabs.sendMessage(tab.id, { action: 'fillForm' });
  } else if (info.menuItemId === 'openSettings') {
    chrome.runtime.openOptionsPage();
  }
});

// Handle popup messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getConfig') {
    chrome.storage.sync.get('sceConfig', (result) => {
      sendResponse(result.sceConfig || {});
    });
    return true;
  }

  if (request.action === 'saveConfig') {
    chrome.storage.sync.set({ sceConfig: request.config }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});
