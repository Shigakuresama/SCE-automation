// ==UserScript==
// @name         SCE Rebate Center Helper
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Automation helpers for SCE Rebate Center workflow with Zillow support
// @author       You
// @match        https://sce.dsmcentral.com/onsite/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=sce.dsmcentral.com
// @grant        GM_setClipboard
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // ============================================
    // CONFIGURATION
    // ============================================
    const CONFIG = {
        autoSave: true,
        autoSaveDelay: 2000, // ms
        skipConfirmations: false, // Set to true to auto-click "Add & Continue"
        highlightRequired: true,
        keyboardShortcuts: true
    };

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================

    function log(msg, ...args) {
        console.log(`[SCE Helper] ${msg}`, ...args);
    }

    function waitForSelector(selector, timeout = 5000) {
        return new Promise((resolve) => {
            const element = document.querySelector(selector);
            if (element) return resolve(element);

            const observer = new MutationObserver(() => {
                const element = document.querySelector(selector);
                if (element) {
                    observer.disconnect();
                    resolve(element);
                }
            });

            observer.observe(document.body, { childList: true, subtree: true });

            setTimeout(() => {
                observer.disconnect();
                resolve(null);
            }, timeout);
        });
    }

    // ============================================
    // SECTION NAVIGATION
    // ============================================

    function getAllSections() {
        return Array.from(document.querySelectorAll('.sections-menu-item'));
    }

    function getCurrentSection() {
        return document.querySelector('li.active .sections-menu-item__title');
    }

    function getNextIncompleteSection() {
        const sections = getAllSections();
        for (let section of sections) {
            const icon = section.querySelector('mat-icon');
            const hasCheckCircle = icon && icon.textContent.includes('check_circle');
            if (!hasCheckCircle) {
                return section;
            }
        }
        return null;
    }

    function goToSection(indexOrName) {
        const sections = getAllSections();

        if (typeof indexOrName === 'number') {
            if (sections[indexOrName]) {
                sections[indexOrName].querySelector('.sections-menu-item__title')?.click();
                return true;
            }
        } else if (typeof indexOrName === 'string') {
            const section = sections.find(s => {
                const title = s.querySelector('.sections-menu-item__title');
                return title && title.textContent.toLowerCase().includes(indexOrName.toLowerCase());
            });
            if (section) {
                section.querySelector('.sections-menu-item__title')?.click();
                return true;
            }
        }
        return false;
    }

    // ============================================
    // FORM HELPERS
    // ============================================

    function findInputByLabel(labelText) {
        // Try aria-label first
        let input = document.querySelector(`[aria-label*="${labelText}" i]`);
        if (input) return input;

        // Try finding by associated label
        const labels = Array.from(document.querySelectorAll('mat-label, label'));
        const label = labels.find(l => l.textContent.toLowerCase().includes(labelText.toLowerCase()));
        if (label) {
            const id = label.getAttribute('for');
            if (id) return document.getElementById(id);
            // Check if input is next sibling
            return label.closest('mat-form-field')?.querySelector('input, mat-select');
        }

        return null;
    }

    function fillField(labelText, value) {
        const input = findInputByLabel(labelText);
        if (!input) {
            log(`Field not found: ${labelText}`);
            return false;
        }

        input.click();
        input.focus();

        if (input.tagName === 'MAT-SELECT') {
            // Handle dropdown
            input.click();
            const options = document.querySelectorAll('mat-option');
            const option = Array.from(options).find(o =>
                o.textContent.toLowerCase().includes(String(value).toLowerCase())
            );
            if (option) {
                option.click();
                log(`Filled ${labelText} = ${value}`);
                return true;
            }
        } else {
            // Handle text input
            input.value = value;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            log(`Filled ${labelText} = ${value}`);
            return true;
        }

        return false;
    }

    function fillFromJSON(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            let filled = 0;

            for (const [label, value] of Object.entries(data)) {
                if (fillField(label, value)) {
                    filled++;
                }
            }

            log(`Filled ${filled} fields from JSON`);
            return filled;
        } catch (e) {
            log('Invalid JSON:', e);
            return 0;
        }
    }

    // ============================================
    // AUTO-SAVE WITH DEBOUNCE
    // ============================================

    let saveTimeout = null;

    function debounceSave() {
        if (!CONFIG.autoSave) return;

        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            const saveBtn = document.querySelector('button[svg="backup"]') ||
                           document.querySelector('button mat-icon:has-text("backup")');
            if (saveBtn) {
                log('Auto-saving...');
                saveBtn.click();
            }
        }, CONFIG.autoSaveDelay);
    }

    // Watch for form changes
    function initAutoSave() {
        if (!CONFIG.autoSave) return;

        const observer = new MutationObserver(() => {
            debounceSave();
        });

        observer.observe(document.body, {
            subtree: true,
            attributes: true,
            attributeFilter: ['value', 'aria-checked', 'class']
        });
    }

    // ============================================
    // AUTO-DISMISS "ADD & CONTINUE" DIALOG
    // ============================================

    function initAutoDismiss() {
        if (!CONFIG.skipConfirmations) return;

        const observer = new MutationObserver(() => {
            const dialog = document.querySelector('.cdk-overlay-container');
            if (dialog) {
                const addBtn = Array.from(dialog.querySelectorAll('button')).find(btn =>
                    btn.textContent.includes('Add & Continue')
                );
                if (addBtn) {
                    log('Auto-clicking "Add & Continue"');
                    addBtn.click();
                }
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    // ============================================
    // KEYBOARD SHORTCUTS
    // ============================================

    function initKeyboardShortcuts() {
        if (!CONFIG.keyboardShortcuts) return;

        document.addEventListener('keydown', (e) => {
            // Ctrl+Shift+Right Arrow: Next section
            if (e.ctrlKey && e.shiftKey && e.key === 'ArrowRight') {
                e.preventDefault();
                const next = getNextIncompleteSection();
                if (next) {
                    next.querySelector('.sections-menu-item__title')?.click();
                    log('Moved to next incomplete section');
                }
            }

            // Ctrl+Shift+S: Save
            if (e.ctrlKey && e.shiftKey && e.key === 'S') {
                e.preventDefault();
                const saveBtn = document.querySelector('button[svg="backup"]');
                if (saveBtn) saveBtn.click();
            }

            // Ctrl+Shift+F: Fill from clipboard (JSON)
            if (e.ctrlKey && e.shiftKey && e.key === 'F') {
                e.preventDefault();
                navigator.clipboard.readText().then(text => {
                    fillFromJSON(text);
                });
            }

            // Ctrl+Shift+Z: Fill from Zillow (clipboard)
            if (e.ctrlKey && e.shiftKey && e.key === 'Z') {
                e.preventDefault();
                fillFromZillow();
            }
        });
    }

    // ============================================
    // UI ENHANCEMENTS
    // ============================================

    function initUIEnhancements() {
        if (!CONFIG.highlightRequired) return;

        GM_addStyle(`
            .sce-highlight-required {
                outline: 2px solid #ff9800 !important;
                outline-offset: 2px;
            }
            .sce-section-shortcut {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 9999;
                background: #4CAF50;
                color: white;
                padding: 10px 15px;
                border-radius: 25px;
                cursor: pointer;
                box-shadow: 0 4px 6px rgba(0,0,0,0.3);
                font-family: Arial, sans-serif;
                font-size: 14px;
            }
            .sce-section-shortcut:hover {
                background: #45a049;
            }
        `);

        // Add floating "Next Section" button
        const nextBtn = document.createElement('div');
        nextBtn.className = 'sce-section-shortcut';
        nextBtn.innerHTML = '→ Next Section';
        nextBtn.title = 'Go to next incomplete section (Ctrl+Shift+→)';
        nextBtn.onclick = () => {
            const next = getNextIncompleteSection();
            if (next) next.querySelector('.sections-menu-item__title')?.click();
        };
        document.body.appendChild(nextBtn);
    }

    // ============================================
    // ZILLOW DATA EXTRACTION
    // ============================================

    function parseZillowText(text) {
        const data = {};
        const patterns = {
            // Sq Footage: "1,249 sqft" or "1249 square feet"
            sqFt: /(\d{3,4}(?:,\d{3})*)\s*(?:sq\.?\s?ft\.?|square\s*feet)/i,
            // Year Built: "Built in 1954" or "Year built: 1960"
            yearBuilt: /(?:built|constructed|year\s*built)\s*(?:in|:)?\s*(\d{4})/i,
            // Lot Size: "6,000 sqft lot" or "0.15 acre lot"
            lotSize: /(\d{3,6}(?:,\d{3})*)\s*(?:sq\.?\s?ft\.?\s*lot|lot\s*sq\.?)/i,
            // Address: "1909 W Martha Ln, Santa Ana, CA 92706"
            address: /(\d+\s+[\w\s]+,\s*[A-Z][a-z]+\s*[A-Z]{2}\s*\d{5})/,
            // Bathrooms: "2 ba" or "2.5 bathrooms"
            bathrooms: /(\d+\.?\d*)\s*ba?.?\s*(?:bath)/i,
            // Bedrooms: "3 bd" or "3 bedrooms"
            bedrooms: /(\d+)\s*bd?.?\s*(?:bed)/i
        };

        for (const [key, pattern] of Object.entries(patterns)) {
            const match = text.match(pattern);
            if (match) {
                let value = match[1].replace(/,/g, '');

                // Map Zillow keys to SCE field names
                const fieldMap = {
                    sqFt: 'Total Sq.Ft.',
                    yearBuilt: 'Year Built',
                    lotSize: 'Lot Size',
                    address: 'Site Address',
                    bathrooms: 'Number of Bathrooms',
                    bedrooms: 'Number of Bedrooms'
                };

                if (fieldMap[key]) {
                    data[fieldMap[key]] = value;
                }
            }
        }

        return data;
    }

    function fillFromZillow() {
        navigator.clipboard.readText().then(text => {
            const data = parseZillowText(text);
            log('Extracted from clipboard:', data);

            let filled = 0;
            for (const [label, value] of Object.entries(data)) {
                if (fillField(label, value)) filled++;
            }
            log(`Filled ${filled} fields from Zillow data`);
        }).catch(err => {
            log('Could not read clipboard:', err);
            log('Copy text from Zillow first, then press Ctrl+Shift+Z');
        });
    }

    // ============================================
    // DATA EXPORT
    // ============================================

    function exportCurrentSectionData() {
        const inputs = document.querySelectorAll('input, mat-select');
        const data = {};

        inputs.forEach(input => {
            const label = input.closest('mat-form-field')?.querySelector('mat-label')?.textContent;
            if (label) {
                data[label] = input.value || input.textContent?.trim();
            }
        });

        return JSON.stringify(data, null, 2);
    }

    // Expose to console
    window.SCEHelper = {
        goToSection,
        getNextIncompleteSection,
        fillField,
        fillFromJSON,
        fillFromZillow,
        parseZillowText,
        exportData: exportCurrentSectionData,
        log
    };

    log('SCE Rebate Center Helper loaded');
    log('Shortcuts: Ctrl+Shift+→ (next section), Ctrl+Shift+S (save), Ctrl+Shift+Z (Zillow), Ctrl+Shift+F (JSON)');
    log('Console: SCEHelper.goToSection(), SCEHelper.fillField(), SCEHelper.fillFromZillow()');

    // Initialize features
    initAutoSave();
    initAutoDismiss();
    initKeyboardShortcuts();
    initUIEnhancements();

})();
