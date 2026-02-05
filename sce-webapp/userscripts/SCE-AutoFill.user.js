// ==UserScript==
// @name         SCE Route Planner AutoFill
// @namespace    http://localhost:8080
// @version      1.0
// @description  Auto-fill SCE forms and send customer data back to webapp
// @match        https://sce.dsmcentral.com/*
// @grant        window.close
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    console.log('[SCE AutoFill] Script loaded');

    let currentAddress = null;
    let isProcessing = false;

    // Only run on SCE application pages
    if (!window.location.href.includes('sce.dsmcentral.com')) {
        return;
    }

    // Notify webapp that script is ready
    function notifyReady() {
        try {
            window.opener?.postMessage({
                type: 'SCRIPT_READY'
            }, 'http://localhost:8080');
        } catch (e) {
            console.log('[SCE AutoFill] Could not notify opener:', e.message);
        }
    }

    // Listen for messages from webapp
    window.addEventListener('message', (event) => {
        if (event.origin !== 'http://localhost:8080') return;

        const { type, data } = event.data;

        if (type === 'FILL_FORM') {
            console.log('[SCE AutoFill] Received fill request:', data);
            currentAddress = data;
            fillSCEForm(data);
        }
    });

    // Fill SCE form with address data
    function fillSCEForm(address) {
        isProcessing = true;

        // TODO: Implement actual SCE form filling logic
        // This will be adapted from sce-extension/content.js
        // For now, simulate the process

        console.log('[SCE AutoFill] Filling form for:', address.full);

        // Simulate filling and waiting for status page
        setTimeout(() => {
            pollForApplicationStatus();
        }, 2000);
    }

    // Poll for customer data on Application Status page
    function pollForApplicationStatus() {
        let attempts = 0;
        const maxAttempts = 60; // 30 seconds max

        const checkInterval = setInterval(() => {
            attempts++;

            // Try to scrape customer data
            const caseId = scrapeCaseId();
            const customerName = scrapeCustomerName();
            const phone = scrapePhone();

            if (caseId && customerName) {
                clearInterval(checkInterval);

                console.log('[SCE AutoFill] Found customer data:', { caseId, customerName, phone });

                // Send data back to webapp
                window.opener?.postMessage({
                    type: 'ADDRESS_COMPLETE',
                    data: {
                        address: currentAddress,
                        caseId,
                        customerName,
                        phone,
                        status: 'complete'
                    }
                }, 'http://localhost:8080');

                // Close tab after short delay
                setTimeout(() => {
                    window.close();
                }, 500);

                return;
            }

            if (attempts >= maxAttempts) {
                clearInterval(checkInterval);

                // Send error back to webapp
                window.opener?.postMessage({
                    type: 'SCRIPT_ERROR',
                    data: { message: 'Timeout: Could not find customer data' }
                }, 'http://localhost:8080');

                console.error('[SCE AutoFill] Timeout waiting for customer data');
            }
        }, 500);
    }

    // Scrape functions (to be implemented based on actual SCE DOM)
    function scrapeCaseId() {
        // TODO: Implement actual scraping
        return document.querySelector('.case-id')?.textContent?.trim() ||
               document.querySelector('[data-case-id]')?.textContent?.trim() ||
               'CASE-' + Math.random().toString(36).substr(2, 9);
    }

    function scrapeCustomerName() {
        // TODO: Implement actual scraping
        return document.querySelector('.customer-name')?.textContent?.trim() ||
               document.querySelector('[data-customer-name]')?.textContent?.trim() ||
               'Test Customer';
    }

    function scrapePhone() {
        // TODO: Implement actual scraping
        return document.querySelector('.phone-number')?.textContent?.trim() ||
               document.querySelector('[data-phone]')?.textContent?.trim() ||
               '(555) 123-4567';
    }

    // Notify ready when page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', notifyReady);
    } else {
        notifyReady();
    }
})();
