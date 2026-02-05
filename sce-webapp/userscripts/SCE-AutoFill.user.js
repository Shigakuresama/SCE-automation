// ==UserScript==
// @name         SCE Route Planner AutoFill
// @namespace    http://localhost:8080
// @version      1.4
// @description  Auto-fill SCE forms and send customer data back to webapp
// @match        https://sce.dsmcentral.com/*
// @match        https://sce-trade-ally-community.my.site.com/*
// @grant        window.close
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    console.log('[SCE AutoFill] Script loaded on', window.location.href);

    let currentAddress = null;

    // ============================================
    // CONFIGURATION - CREDENTIALS
    // ============================================
    // Get credentials from localStorage or prompt user
    function getCredentials() {
        let username = localStorage.getItem('sce_username');
        let password = localStorage.getItem('sce_password');

        if (!username || !password) {
            // Prompt user for credentials
            username = prompt('Enter SCE Trade Ally username:');
            if (!username) return null;

            password = prompt('Enter SCE Trade Ally password:');
            if (!password) return null;

            // Save to localStorage for future use
            localStorage.setItem('sce_username', username);
            localStorage.setItem('sce_password', password);
        }

        return { username, password };
    }

    const CONFIG = getCredentials();
    if (!CONFIG) {
        console.error('[SCE AutoFill] No credentials provided. Automation cannot continue.');
        // Optionally show user-facing error
    }

    // ============================================
    // UI NOTIFICATIONS
    // ============================================

    function showNotification(message, type = 'info') {
        // Create a temporary notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 16px 20px;
            background: ${type === 'error' ? '#d32f2f' : type === 'warning' ? '#f57c00' : '#1976d2'};
            color: white;
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            max-width: 400px;
            word-wrap: break-word;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }

    // ============================================
    // MESSAGE HANDLING
    // ============================================

    function notifyReady() {
        try {
            if (window.opener) {
                const targetOrigin = window.opener.location.origin;
                window.opener.postMessage({
                    type: 'SCRIPT_READY'
                }, targetOrigin);
                console.log('[SCE AutoFill] Notified opener that script is ready:', targetOrigin);
            } else {
                console.error('[SCE AutoFill] No window.opener found - this window was not opened by another window');
                // Show user-facing notification
                showNotification('Error: This window must be opened from the Route Planner webapp', 'error');
            }
        } catch (e) {
            console.error('[SCE AutoFill] Could not notify opener:', e.message);
            // Fallback: Try sessionStorage as alternative communication method
            try {
                sessionStorage.setItem('sce_autofill_ready', JSON.stringify({
                    timestamp: Date.now(),
                    url: window.location.href
                }));
                console.log('[SCE AutoFill] Ready status stored in sessionStorage as fallback');
            } catch (storageError) {
                console.error('[SCE AutoFill] Failed to store in sessionStorage:', storageError.message);
            }
            // Show user-facing error
            showNotification('Communication error: Cannot connect to parent window. Please close this window and try again.', 'error');
        }
    }

    window.addEventListener('message', (event) => {
        // Allow messages from localhost:8080 OR from any SCE/tradeally domain
        const allowedOrigins = ['http://localhost:8080', 'https://sce-trade-ally-community.my.site.com', 'http://localhost:3000'];
        if (!allowedOrigins.includes(event.origin)) {
            console.log('[SCE AutoFill] Blocked message from unknown origin:', event.origin);
            return;
        }

        const { type, data } = event.data;
        console.log('[SCE AutoFill] Received message:', type, data);

        if (type === 'FILL_FORM') {
            currentAddress = data;
            fillSCEForm(data);
        }
    });

    function sendComplete(data) {
        try {
            if (window.opener) {
                const targetOrigin = window.opener.location.origin;
                window.opener.postMessage({
                    type: 'ADDRESS_COMPLETE',
                    data: data
                }, targetOrigin);
                console.log('[SCE AutoFill] Sent complete to:', targetOrigin, data);
                return true;
            } else {
                console.error('[SCE AutoFill] No window.opener found - cannot send completion status');
                // Fallback to sessionStorage
                try {
                    sessionStorage.setItem('sce_autofill_complete', JSON.stringify({
                        timestamp: Date.now(),
                        data: data,
                        url: window.location.href
                    }));
                    console.log('[SCE AutoFill] Completion data stored in sessionStorage as fallback');
                    showNotification('Data saved locally. Please return to the Route Planner to continue.', 'warning');
                    return true;
                } catch (storageError) {
                    console.error('[SCE AutoFill] Failed to store in sessionStorage:', storageError.message);
                    showNotification('Error: Cannot save data. Please take a screenshot of this page manually.', 'error');
                    return false;
                }
            }
        } catch (e) {
            console.error('[SCE AutoFill] Failed to send complete:', e.message);
            // Try fallback to sessionStorage
            try {
                sessionStorage.setItem('sce_autofill_complete', JSON.stringify({
                    timestamp: Date.now(),
                    data: data,
                    url: window.location.href,
                    error: e.message
                }));
                console.log('[SCE AutoFill] Completion data stored in sessionStorage as fallback');
                showNotification('Communication error - data saved locally. Check the Route Planner.', 'warning');
                return true;
            } catch (storageError) {
                console.error('[SCE AutoFill] Failed to store in sessionStorage:', storageError.message);
                showNotification('Error: Cannot communicate with parent window. Please take a screenshot manually.', 'error');
                return false;
            }
        }
    }

    function sendError(message) {
        try {
            if (window.opener) {
                const targetOrigin = window.opener.location.origin;
                window.opener.postMessage({
                    type: 'SCRIPT_ERROR',
                    data: { message }
                }, targetOrigin);
                console.log('[SCE AutoFill] Error sent to opener:', message);
                return true;
            } else {
                console.error('[SCE AutoFill] No window.opener found - cannot send error');
                // Fallback: Store error in sessionStorage
                try {
                    sessionStorage.setItem('sce_autofill_error', JSON.stringify({
                        timestamp: Date.now(),
                        message: message,
                        url: window.location.href
                    }));
                    console.log('[SCE AutoFill] Error stored in sessionStorage as fallback');
                } catch (storageError) {
                    console.error('[SCE AutoFill] Failed to store error in sessionStorage:', storageError.message);
                }
                // Show alert to user
                alert(`SCE AutoFill Error: ${message}\n\nPlease close this window and try again.`);
                return false;
            }
        } catch (e) {
            console.error('[SCE AutoFill] Failed to send error:', e.message);
            // Double fallback: Try sessionStorage, then alert
            try {
                sessionStorage.setItem('sce_autofill_error', JSON.stringify({
                    timestamp: Date.now(),
                    message: message,
                    originalError: e.message,
                    url: window.location.href
                }));
                console.log('[SCE AutoFill] Error stored in sessionStorage as fallback');
            } catch (storageError) {
                console.error('[SCE AutoFill] Failed to store error in sessionStorage:', storageError.message);
            }
            // Always show alert as last resort
            alert(`SCE AutoFill Error: ${message}\n\nCommunication with parent window failed. Please take a screenshot and contact support.`);
            return false;
        }
    }

    // Notify ready when page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', notifyReady);
    } else {
        notifyReady();
    }

    // ============================================
    // SCE FORM FILLING
    // ============================================

    async function fillSCEForm(address) {
        console.log('[SCE AutoFill] Starting form fill for:', address.full);

        // ============================================
        // HANDLE LOGIN - Check if we're on the login page
        // ============================================
        if (window.location.href.includes('tradeally') && window.location.href.includes('login')) {
            console.log('[SCE AutoFill] Detected login page, logging in...');

            // Wait for form to be ready
            await waitForElement('input[type="email"], input[name="email"], input[id*="email" i]', 5000);

            // Find email input
            const emailInput = document.querySelector('input[type="email"], input[name="email"], input[id*="email" i]');
            // Find password input
            const passwordInput = document.querySelector('input[type="password"], input[name="password"], input[id*="password" i]');

            if (emailInput && passwordInput) {
                await setInputValue(emailInput, CONFIG.username);
                await sleep(300);
                await setInputValue(passwordInput, CONFIG.password);
                await sleep(500);

                // Find and click login button
                const loginBtn = document.querySelector('button[type="submit"], button[aria-label*="Login" i], .login-btn');
                if (loginBtn) {
                    loginBtn.click();
                    console.log('[SCE AutoFill] Login button clicked');
                } else {
                    // Try to find button by text
                    const allBtns = Array.from(document.querySelectorAll('button'));
                    const loginClickBtn = allBtns.find(btn => btn.textContent.includes('Log In') || btn.textContent.includes('Sign In'));
                    if (loginClickBtn) {
                        loginClickBtn.click();
                        console.log('[SCE AutoFill] Login button clicked (by text)');
                    }
                }

                // Wait for redirect after login
                await sleep(5000);

                // After login, we should be redirected. The page will reload and this script will run again.
                console.log('[SCE AutoFill] Login submitted, waiting for redirect...');
                return;
            } else {
                console.error('[SCE AutoFill] Login form not found!');
                sendError('Could not find login form fields');
                return;
            }
        }

        // Check if we're still on the login page after attempting login
        if (window.location.href.includes('login')) {
            sendError('Still on login page after login attempt');
            return;
        }

        try {
            const parts = address.full.split(',');
            const streetAddress = parts[0]?.trim() || '';

            // Extract just the ZIP code number (remove state, spaces)
            let zipPart = parts[parts.length - 1]?.trim() || '';
            // Remove any text (like "CA") and just get numbers
            const zipMatch = zipPart.match(/\d{5}/);
            const zipCode = zipMatch ? zipMatch[0] : zipPart;

            // Check if we're on Customer Search page
            if (window.location.href.includes('customer-search')) {
                await fillCustomerSearch(streetAddress, zipCode);
            } else if (window.location.href.includes('application-status') ||
                       window.location.href.includes('customer-information')) {
                const customerData = extractCustomerData();
                const sent = sendComplete({
                    address: address.full,
                    ...customerData,
                    status: 'complete'
                });
                if (sent) {
                    closeWindow();
                } else {
                    showNotification('Failed to send data to parent window. Window will remain open.', 'error');
                }
            } else if (window.location.href.includes('login') && !window.location.href.includes('tradeally')) {
                // Redirect to correct login URL
                console.log('[SCE AutoFill] Redirecting to correct login URL...');
                window.location.href = 'https://sce-trade-ally-community.my.site.com/tradeally/s/login/?ec=302&startURL=%2Ftradeally%2Fs%2Fmy-account-home';
                return;
            } else {
                // Navigate to customer search
                window.location.href = 'https://sce.dsmcentral.com/onsite/customer-search';
            }
        } catch (error) {
            console.error('[SCE AutoFill] Error:', error);
            sendError(error.message);
        }
    }

    async function fillCustomerSearch(address, zipCode) {
        console.log('[SCE AutoFill] Filling Customer Search...');

        // Wait for form to be ready
        await waitForElement('input[placeholder*="Street Address" i]', 10000);

        // Find Street Address input
        let addressInput = document.querySelector('input[placeholder*="Street Address" i]');
        if (!addressInput) {
            const labels = Array.from(document.querySelectorAll('mat-label'));
            const addrLabel = labels.find(l => l.textContent.includes('Street Address'));
            if (addrLabel) {
                const formField = addrLabel.closest('mat-form-field');
                addressInput = formField?.querySelector('input');
            }
        }

        if (addressInput) {
            await setInputValue(addressInput, address);
            console.log('[SCE AutoFill] Address filled:', address);
        } else {
            throw new Error('Address field not found');
        }

        await sleep(300);

        // Find Zip Code input (second Site Zip Code - the one in same section as Street Address)
        // There are TWO "Site Zip Code" fields - we need the second one (after Street Address/Apt)
        let zipInput = null;
        let strategy = '';

        // Strategy 1: Find zip field in same container as Street Address (preferred)
        if (addressInput) {
            const addressContainer = addressInput.closest('.search-field-wrap');
            if (addressContainer) {
                zipInput = addressContainer.querySelector('input[placeholder*="Zip Code" i], input[placeholder*="Site Zip" i]');
                if (zipInput) {
                    strategy = 'same-container';
                    console.log('[SCE AutoFill] Strategy 1: Found zip in same container as address');
                }
            }
        }

        // Strategy 2: Get all zip inputs and take the second one (index 1)
        if (!zipInput) {
            const zipInputs = Array.from(document.querySelectorAll('input[placeholder*="Site Zip Code" i], input[placeholder*="Zip Code" i]'));
            console.log(`[SCE AutoFill] Strategy 2: Found ${zipInputs.length} zip inputs total`);
            if (zipInputs.length >= 2) {
                zipInput = zipInputs[1]; // Second zip field
                strategy = 'second-input';
                console.log('[SCE AutoFill] Strategy 2: Using second zip input (index 1)');
            } else if (zipInputs.length === 1) {
                zipInput = zipInputs[0];
                strategy = 'only-input';
                console.log('[SCE AutoFill] Strategy 2: Only one zip input found, using it');
            }
        }

        // Strategy 3: Try by mat-label (find second "Site Zip Code" label)
        if (!zipInput) {
            const labels = Array.from(document.querySelectorAll('mat-label'));
            const zipLabels = labels.filter(l => l.textContent.includes('Site Zip Code'));
            console.log(`[SCE AutoFill] Strategy 3: Found ${zipLabels.length} "Site Zip Code" labels`);
            if (zipLabels.length >= 2) {
                const secondLabel = zipLabels[1];
                const formField = secondLabel.closest('mat-form-field');
                zipInput = formField?.querySelector('input');
                strategy = 'second-label';
                console.log('[SCE AutoFill] Strategy 3: Using second "Site Zip Code" label');
            } else if (zipLabels.length === 1) {
                const formField = zipLabels[0].closest('mat-form-field');
                zipInput = formField?.querySelector('input');
                strategy = 'only-label';
                console.log('[SCE AutoFill] Strategy 3: Only one "Site Zip Code" label found');
            }
        }

        if (zipInput) {
            await setInputValue(zipInput, zipCode);
            console.log(`[SCE AutoFill] ZIP filled: "${zipCode}" using strategy: ${strategy}`);
            console.log('[SCE AutoFill] Zip input element:', zipInput);
        } else {
            console.error('[SCE AutoFill] Could not find any zip input field!');
            throw new Error('ZIP code field not found');
        }

        await sleep(500);

        // Find and click Search button
        let searchBtn = document.querySelector('button[type="submit"], .customer-search-button');
        if (!searchBtn) {
            searchBtn = Array.from(document.querySelectorAll('button')).find(btn =>
                btn.textContent.includes('Search') || btn.textContent.includes('Submit')
            );
        }

        if (searchBtn) {
            searchBtn.click();
            console.log('[SCE AutoFill] Search button clicked');
            await sleep(3000);
            await waitForStatusPage();
        } else {
            throw new Error('Search button not found');
        }
    }

    async function waitForStatusPage() {
        console.log('[SCE AutoFill] Waiting for status page...');

        for (let i = 0; i < 60; i++) {
            if (window.location.href.includes('application-status') ||
                window.location.href.includes('customer-information') ||
                window.location.href.includes('customer-info')) {

                console.log('[SCE AutoFill] On status/customer info page');
                const customerData = extractCustomerData();

                const sent = sendComplete({
                    address: currentAddress?.full || '',
                    ...customerData,
                    status: 'complete'
                });

                if (sent) {
                    closeWindow();
                } else {
                    showNotification('Failed to send data to parent window. Window will remain open.', 'error');
                }
                return;
            }

            await sleep(500);
        }

        throw new Error('Timeout waiting for status page');
    }

    function extractCustomerData() {
        console.log('[SCE AutoFill] Extracting customer data...');

        const data = {
            customerName: '',
            phone: '',
            caseId: '',
            address: ''
        };

        // Try multiple selectors for customer name
        const nameSelectors = [
            '.customer-name',
            '[data-testid="customer-name"]',
            'app-customer-info .customer-name',
            '.applicant-name'
        ];

        for (const selector of nameSelectors) {
            const el = document.querySelector(selector);
            if (el?.textContent) {
                data.customerName = el.textContent.trim();
                break;
            }
        }

        // Try to find name from form fields
        if (!data.customerName) {
            const firstName = document.querySelector('input[placeholder*="First Name" i], [formcontrolname="firstName"]');
            const lastName = document.querySelector('input[placeholder*="Last Name" i], [formcontrolname="lastName"]');
            if (firstName?.value && lastName?.value) {
                data.customerName = `${firstName.value} ${lastName.value}`.trim();
            }
        }

        // Try phone selectors
        const phoneSelectors = [
            'input[placeholder*="Phone" i]',
            '[formcontrolname="phone"]',
            '[formcontrolname="phoneNumber"]',
            '.customer-phone'
        ];

        for (const selector of phoneSelectors) {
            const el = document.querySelector(selector);
            if (el?.value) {
                data.phone = el.value.trim();
                break;
            }
        }

        // Try case ID selectors
        const caseIdSelectors = [
            '.case-id',
            '[data-testid="case-id"]',
            '.application-number'
        ];

        for (const selector of caseIdSelectors) {
            const el = document.querySelector(selector);
            if (el?.textContent) {
                data.caseId = el.textContent.trim();
                break;
            }
        }

        console.log('[SCE AutoFill] Extracted data:', data);
        return data;
    }

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================

    async function setInputValue(element, value) {
        element.focus();
        element.value = value;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.blur();
        await sleep(100);
    }

    function waitForElement(selector, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
                return;
            }

            const observer = new MutationObserver(() => {
                const element = document.querySelector(selector);
                if (element) {
                    observer.disconnect();
                    resolve(element);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Element not found: ${selector}`));
            }, timeout);
        });
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function closeWindow() {
        setTimeout(() => {
            window.close();
        }, 1000);
    }

    console.log('[SCE AutoFill] Script initialized');
})();
