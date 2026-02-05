// ==UserScript==
// @name         SCE Route Planner AutoFill
// @namespace    http://localhost:8080
// @version      1.1
// @description  Auto-fill SCE forms, handle login, and send customer data back to webapp
// @match        https://sce-trade-ally-community.my.site.com/tradeally/s/login/*
// @match        https://sce.dsmcentral.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        window.close
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    console.log('[SCE AutoFill] Script loaded on', window.location.href);

    // ============================================
    // CONFIGURATION - EDIT YOUR CREDENTIALS HERE
    // ============================================
    const CONFIG = {
        username: 'YOUR_USERNAME_HERE',  // Your SCE username
        password: 'YOUR_PASSWORD_HERE',  // Your SCE password
        autoLogin: true                   // Set to false to disable auto-login
    };

    // ============================================
    // STATE
    // ============================================
    let currentAddress = null;
    let isProcessing = false;
    let pendingAddress = null; // Store address if we need to login first

    // ============================================
    // SESSION MANAGEMENT
    // ============================================

    function isLoggedIn() {
        // Check if we have a valid session
        const sessionCookie = document.cookie.includes('sid');
        const notOnLoginPage = !window.location.href.includes('/login/');
        return sessionCookie && notOnLoginPage;
    }

    function saveSession() {
        // Save session data for reuse
        const cookies = document.cookie;
        GM_setValue('sce_cookies', cookies);
        GM_setValue('sce_session_time', Date.now());
    }

    function loadSession() {
        // Restore session if available and recent (< 1 hour)
        const savedTime = GM_getValue('sce_session_time', 0);
        const hourAgo = Date.now() - (60 * 60 * 1000);

        if (savedTime > hourAgo) {
            console.log('[SCE AutoFill] Session is recent, skipping login');
            return true;
        }
        return false;
    }

    // ============================================
    // LOGIN HANDLING
    // ============================================

    async function handleLogin() {
        if (!CONFIG.autoLogin) {
            console.log('[SCE AutoFill] Auto-login disabled, waiting for manual login');
            return false;
        }

        if (CONFIG.username === 'YOUR_USERNAME_HERE') {
            console.log('[SCE AutoFill] Please configure your credentials in the userscript CONFIG section');
            alert('Please configure your SCE credentials in the Tampermonkey script!');
            return false;
        }

        console.log('[SCE AutoFill] Attempting auto-login...');

        // Wait for login form
        await waitForElement('input[type="email"], input[name="username"]', 5000);

        // Find username field
        const usernameInput = document.querySelector('input[type="email"], input[name="username"], input[id*="username" i], input[id*="email" i]');
        if (usernameInput) {
            await setInputValue(usernameInput, CONFIG.username);
            console.log('[SCE AutoFill] ✓ Username filled');
        } else {
            console.log('[SCE AutoFill] Username field not found');
            return false;
        }

        await sleep(300);

        // Find password field
        const passwordInput = document.querySelector('input[type="password"]');
        if (passwordInput) {
            await setInputValue(passwordInput, CONFIG.password);
            console.log('[SCE AutoFill] ✓ Password filled');
        } else {
            console.log('[SCE AutoFill] Password field not found');
            return false;
        }

        await sleep(500);

        // Find and click login button
        const loginBtn = document.querySelector('button[type="submit"], input[type="submit"], button:has-text("Log In"), button:has-text("Sign In")');
        if (!loginBtn) {
            // Try by text content
            const buttons = Array.from(document.querySelectorAll('button'));
            const btn = buttons.find(b => b.textContent.includes('Log In') || b.textContent.includes('Sign In') || b.textContent.includes('Login'));
            if (btn) {
                btn.click();
                console.log('[SCE AutoFill] ✓ Login button clicked');
            }
        } else {
            loginBtn.click();
            console.log('[SCE AutoFill] ✓ Login button clicked');
        }

        // Wait for navigation
        await sleep(3000);

        // Check if login succeeded
        if (!window.location.href.includes('/login/')) {
            console.log('[SCE AutoFill] ✓ Login successful!');
            saveSession();
            return true;
        }

        return false;
    }

    // ============================================
    // MESSAGE HANDLING
    // ============================================

    // Notify webapp that script is ready
    function notifyReady() {
        try {
            window.opener?.postMessage({
                type: 'SCRIPT_READY'
            }, 'http://localhost:8080');
            console.log('[SCE AutoFill] Notified opener that script is ready');
        } catch (e) {
            console.log('[SCE AutoFill] Could not notify opener:', e.message);
        }
    }

    // Listen for messages from webapp
    window.addEventListener('message', (event) => {
        if (event.origin !== 'http://localhost:8080') return;

        const { type, data } = event.data;
        console.log('[SCE AutoFill] Received message:', type, data);

        if (type === 'FILL_FORM') {
            currentAddress = data;
            fillSCEForm(data);
        }
    });

    // Send completion message back to webapp
    function sendComplete(data) {
        try {
            window.opener?.postMessage({
                type: 'ADDRESS_COMPLETE',
                data: data
            }, 'http://localhost:8080');
            console.log('[SCE AutoFill] Sent complete message:', data);
        } catch (e) {
            console.error('[SCE AutoFill] Failed to send complete:', e.message);
        }
    }

    // Send error message back to webapp
    function sendError(message) {
        try {
            window.opener?.postMessage({
                type: 'SCRIPT_ERROR',
                data: { message }
            }, 'http://localhost:8080');
        } catch (e) {
            console.error('[SCE AutoFill] Failed to send error:', e.message);
        }
    }

    // ============================================
    // MAIN INITIALIZATION
    // ============================================

    async function init() {
        const url = window.location.href;

        // If on login page, try to login
        if (url.includes('sce-trade-ally-community.my.site.com/tradeally/s/login/')) {
            console.log('[SCE AutoFill] On login page');

            // Check if we have a pending address to process
            if (pendingAddress) {
                console.log('[SCE AutoFill] Have pending address, will login and continue');
                const loginSuccess = await handleLogin();

                if (loginSuccess) {
                    // After successful login, navigate to customer search
                    await sleep(2000);
                    window.location.href = 'https://sce.dsmcentral.com/onsite/customer-search';
                } else {
                    sendError('Login failed. Please check your credentials.');
                }
            }
        }
        // If on SCE main site, handle form filling
        else if (url.includes('sce.dsmcentral.com')) {
            console.log('[SCE AutoFill] On SCE main site');
            notifyReady();

            // If we have a pending address from after-login redirect
            if (pendingAddress && url.includes('customer-search')) {
                console.log('[SCE AutoFill] Processing pending address after login');
                const addr = pendingAddress;
                pendingAddress = null;
                await fillSCEForm(addr);
            }
        }

        // Always notify ready when on SCE pages
        if (url.includes('sce.dsmcentral.com')) {
            notifyReady();
        }
    }

    // Notify ready when page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ============================================
    // SCE FORM FILLING
    // ============================================

    async function fillSCEForm(address) {
        // Check if we need to login first
        if (!isLoggedIn() && CONFIG.autoLogin) {
            console.log('[SCE AutoFill] Not logged in, redirecting to login...');
            pendingAddress = address;
            window.location.href = 'https://sce-trade-ally-community.my.site.com/tradeally/s/login/';
            return;
        }

        isProcessing = true;
        console.log('[SCE AutoFill] Starting form fill for:', address.full);

        try {
            // Parse address components
            const parts = address.full.split(',');
            const streetAddress = parts[0]?.trim() || '';
            const zipCode = parts[parts.length - 1]?.trim() || '';

            // Check if we're on Customer Search page
            if (window.location.href.includes('customer-search')) {
                await fillCustomerSearch(streetAddress, zipCode);
            } else if (window.location.href.includes('application-status')) {
                // We're already on status page - extract data
                const customerData = extractCustomerData();
                sendComplete({
                    address: address.full,
                    ...customerData,
                    status: 'complete'
                });
                closeWindow();
            } else {
                // Navigate to customer search
                window.location.href = 'https://sce.dsmcentral.com/onsite/customer-search';
            }
        } catch (error) {
            console.error('[SCE AutoFill] Error:', error);
            sendError(error.message);
        }

        isProcessing = false;
    }

    async function fillCustomerSearch(address, zipCode) {
        console.log('[SCE AutoFill] Filling Customer Search...');

        // Wait for form to be ready
        await waitForElement('input[placeholder*="Street Address" i]', 10000);

        // Find Street Address input
        let addressInput = document.querySelector('input[placeholder*="Street Address" i], input[aria-label*="Street Address" i]');
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
            console.log('[SCE AutoFill] ✓ Address filled:', address);
        } else {
            throw new Error('Address field not found');
        }

        await sleep(300);

        // Find Zip Code input
        let zipInput = document.querySelector('input[placeholder*="Site Zip Code" i], input[aria-label*="Zip Code" i]');
        if (!zipInput) {
            const labels = Array.from(document.querySelectorAll('mat-label'));
            const zipLabel = labels.find(l => l.textContent.includes('Site Zip Code'));
            if (zipLabel) {
                const formField = zipLabel.closest('mat-form-field');
                zipInput = formField?.querySelector('input');
            }
        }

        if (zipInput) {
            await setInputValue(zipInput, zipCode);
            console.log('[SCE AutoFill] ✓ ZIP filled:', zipCode);
        }

        await sleep(500);

        // Find and click Search button
        let searchBtn = document.querySelector('button[type="submit"], .customer-search-button, button.search-btn');
        if (!searchBtn) {
            searchBtn = Array.from(document.querySelectorAll('button')).find(btn =>
                btn.textContent.includes('Search') || btn.textContent.includes('Submit')
            );
        }

        if (searchBtn) {
            searchBtn.click();
            console.log('[SCE AutoFill] ✓ Search button clicked');

            // Wait for navigation and then extract data
            await sleep(3000);
            await waitForStatusPage();
        } else {
            throw new Error('Search button not found');
        }
    }

    async function waitForStatusPage() {
        console.log('[SCE AutoFill] Waiting for status page...');

        // Poll for status page up to 30 seconds
        for (let i = 0; i < 60; i++) {
            // Check if we're on application status or customer info page
            if (window.location.href.includes('application-status') ||
                window.location.href.includes('customer-information') ||
                window.location.href.includes('customer-info')) {

                console.log('[SCE AutoFill] ✓ On status/customer info page');

                // Extract customer data
                const customerData = extractCustomerData();

                sendComplete({
                    address: currentAddress?.full || '',
                    ...customerData,
                    status: 'complete'
                });

                closeWindow();
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
            '.applicant-name',
            '[class*="customer-name"]',
            '[id*="customer-name"]'
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
            const firstName = document.querySelector('input[placeholder*="First Name" i], [formcontrolname="firstName"], input[id*="firstname" i], input[id*="firstName" i]');
            const lastName = document.querySelector('input[placeholder*="Last Name" i], [formcontrolname="lastName"], input[id*="lastname" i], input[id*="lastName" i]');
            if (firstName?.value && lastName?.value) {
                data.customerName = `${firstName.value} ${lastName.value}`.trim();
            }
        }

        // Try phone selectors
        const phoneSelectors = [
            'input[placeholder*="Phone" i]',
            '[formcontrolname="phone"]',
            '[formcontrolname="phoneNumber"]',
            '.customer-phone',
            'input[id*="phone" i]'
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
            '.application-number',
            '[class*="case-id"]',
            '[id*="case" i]'
        ];

        for (const selector of caseIdSelectors) {
            const el = document.querySelector(selector);
            if (el?.textContent) {
                data.caseId = el.textContent.trim();
                break;
            }
        }

        console.log('[SCE AutoFill] ✓ Extracted data:', data);
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
