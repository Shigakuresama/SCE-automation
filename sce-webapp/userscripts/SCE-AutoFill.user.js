// ==UserScript==
// @name         SCE Route Planner AutoFill
// @namespace    http://localhost:8080
// @version      1.2
// @description  Auto-fill SCE forms and send customer data back to webapp
// @match        https://sce.dsmcentral.com/*
// @grant        window.close
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    console.log('[SCE AutoFill] Script loaded on', window.location.href);

    let currentAddress = null;

    // ============================================
    // CONFIGURATION - EDIT YOUR CREDENTIALS HERE
    // ============================================
    const CONFIG = {
        username: 'YOUR_USERNAME_HERE',
        password: 'YOUR_PASSWORD_HERE'
    };

    // ============================================
    // MESSAGE HANDLING
    // ============================================

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

    window.addEventListener('message', (event) => {
        if (event.origin !== 'http://localhost:8080') return;

        const { type, data } = event.data;
        console.log('[SCE AutoFill] Received message:', type, data);

        if (type === 'FILL_FORM') {
            currentAddress = data;
            fillSCEForm(data);
        }
    });

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

        try {
            const parts = address.full.split(',');
            const streetAddress = parts[0]?.trim() || '';
            const zipCode = parts[parts.length - 1]?.trim() || '';

            // Check if we're on Customer Search page
            if (window.location.href.includes('customer-search')) {
                await fillCustomerSearch(streetAddress, zipCode);
            } else if (window.location.href.includes('application-status') ||
                       window.location.href.includes('customer-information')) {
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

        // Find Zip Code input
        let zipInput = document.querySelector('input[placeholder*="Site Zip Code" i]');
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
            console.log('[SCE AutoFill] ZIP filled:', zipCode);
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
