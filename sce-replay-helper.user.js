// ==UserScript==
// @name         SCE Rebate Center Replay Helper
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Replay JSON recordings on SCE Rebate Center forms
// @author       You
// @match        https://sce.dsmcentral.com/onsite/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=sce.dsmcentral.com
// @grant        GM_setClipboard
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @require      https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js
// ==/UserScript==

(function() {
    'use strict';

    // ============================================
    // CONFIGURATION
    // ============================================
    const CONFIG = {
        autoSave: true,
        autoSaveDelay: 2000,
        highlightFields: true,
        debugMode: true
    };

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================
    function log(msg, ...args) {
        if (CONFIG.debugMode) {
            console.log(`[SCE Replay] ${msg}`, ...args);
        }
    }

    function showNotification(message, type = 'info') {
        const colors = {
            info: '#2196F3',
            success: '#4CAF50',
            warning: '#FF9800',
            error: '#f44336'
        };

        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type]};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 99999;
            font-family: Arial, sans-serif;
            font-size: 14px;
            max-width: 350px;
            animation: slideIn 0.3s ease-out;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            notification.style.transition = 'all 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Add animation keyframes
    GM_addStyle(`
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        .sce-highlight {
            outline: 3px solid #4CAF50 !important;
            outline-offset: 2px;
            background: rgba(76, 175, 80, 0.1) !important;
        }
        .sce-panel {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            z-index: 99998;
            min-width: 400px;
            max-width: 600px;
            max-height: 80vh;
            overflow: auto;
            font-family: Arial, sans-serif;
        }
        .sce-panel-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 12px 12px 0 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .sce-panel-header h2 {
            margin: 0;
            font-size: 18px;
        }
        .sce-panel-close {
            background: none;
            border: none;
            color: white;
            font-size: 24px;
            cursor: pointer;
            padding: 0;
            width: 30px;
            height: 30px;
        }
        .sce-panel-body {
            padding: 20px;
        }
        .sce-panel-footer {
            padding: 15px 20px;
            border-top: 1px solid #eee;
            display: flex;
            justify-content: flex-end;
            gap: 10px;
        }
        .sce-btn {
            padding: 10px 20px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
        }
        .sce-btn-primary {
            background: #667eea;
            color: white;
        }
        .sce-btn-primary:hover {
            background: #5568d3;
        }
        .sce-btn-secondary {
            background: #f0f0f0;
            color: #333;
        }
        .sce-btn-secondary:hover {
            background: #e0e0e0;
        }
        .sce-form-group {
            margin-bottom: 15px;
        }
        .sce-form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: 500;
            color: #333;
        }
        .sce-form-group input,
        .sce-form-group select,
        .sce-form-group textarea {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 6px;
            box-sizing: border-box;
            font-size: 14px;
        }
        .sce-form-group textarea {
            min-height: 100px;
            font-family: monospace;
        }
        .sce-backdrop {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 99997;
        }
        .sce-floating-btn {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            cursor: pointer;
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            transition: transform 0.2s;
        }
        .sce-floating-btn:hover {
            transform: scale(1.1);
        }
    `);

    // ============================================
    // SELECTOR HELPERS
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
            return label.closest('mat-form-field')?.querySelector('input, mat-select, textarea');
        }

        return null;
    }

    // ============================================
    // FORM FILLING
    // ============================================
    async function fillField(labelText, value, options = {}) {
        const { highlight = true } = options;

        log(`Filling: ${labelText} = ${value}`);

        const input = findInputByLabel(labelText);
        if (!input) {
            log(`Field not found: ${labelText}`);
            return false;
        }

        if (highlight) {
            input.classList.add('sce-highlight');
            setTimeout(() => input.classList.remove('sce-highlight'), 1000);
        }

        // Focus the input
        input.focus();
        input.click();

        if (input.tagName === 'MAT-SELECT' || input.tagName === 'MAT-SELECT-TRIGGER') {
            // Handle dropdown
            const matSelect = input.closest('mat-select');
            if (matSelect) {
                matSelect.click();
                await sleep(300);

                const options = Array.from(document.querySelectorAll('mat-option'));
                const option = options.find(o =>
                    o.textContent.toLowerCase().includes(String(value).toLowerCase())
                );

                if (option) {
                    option.click();
                    log(`Selected: ${labelText} = ${value}`);
                    return true;
                } else {
                    log(`Option not found: ${value}`);
                    // Close dropdown
                    document.addEventListener('click', function closeDropdown() {
                        const backdrop = document.querySelector('.cdk-overlay-backdrop');
                        if (backdrop) backdrop.click();
                        document.removeEventListener('click', closeDropdown);
                    });
                    return false;
                }
            }
        } else {
            // Handle text input
            input.value = value;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            input.dispatchEvent(new Event('blur', { bubbles: true }));
            log(`Filled: ${labelText} = ${value}`);
            return true;
        }

        return false;
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ============================================
    // DATA-DRIVEN FORM FILLING
    // ============================================
    const FIELD_MAPPINGS = {
        // Customer Search
        'streetAddress': 'Street Address',
        'zipCode': 'Zip Code',

        // Customer Information
        'mailingAddress1': 'Mailing Address 1',
        'mailingAddress2': 'Mailing Address 2',
        'mailingCity': 'Mailing City',
        'mailingState': 'Mailing State',
        'mailingZip': 'Mailing Zip',
        'mailingCountry': 'Mailing Country',

        // Contact Information
        'contactFirstName': 'Contact First Name',
        'contactLastName': 'Contact Last Name',
        'contactPhone': 'Contact Phone',
        'contactEmail': 'Contact Email',
        'contactAltPhone': 'Contact Alternate Phone',
        'relationToAccount': 'Relation to Account Holder',

        // Project Information
        'spaceOrUnit': 'Space Or Unit',
        'householdUnits': 'Household Units',
        'totalSqFt': 'Total Sq.Ft.',
        'yearBuilt': 'Year Built',
        'lotSize': 'Lot Size',

        // Enrollment Information
        'projectContactFirstName': 'Project Contact First Name',
        'projectContactLastName': 'Project Contact Last Name',
        'projectContactTitle': 'Project Contact Title',
        'projectContactPhone': 'Project Contact Phone',
        'projectContactEmail': 'Project Contact Email',

        // Questionnaire
        'howDidYouHear': 'How did you hear',
        'language': 'Language',
        'preferredContactMethod': 'Preferred Contact Method'
    };

    async function fillFromData(data) {
        log('Filling form from data:', data);
        let filled = 0;
        let skipped = 0;

        for (const [key, value] of Object.entries(data)) {
            if (value === null || value === undefined || value === '') {
                skipped++;
                continue;
            }

            const fieldLabel = FIELD_MAPPINGS[key] || key;
            const result = await fillField(fieldLabel, value);
            if (result) {
                filled++;
            }
            await sleep(200);
        }

        showNotification(`Filled ${filled} fields (${skipped} skipped)`, 'success');
        log(`Filled ${filled} fields, skipped ${skipped}`);
        return { filled, skipped };
    }

    // ============================================
    // SECTION NAVIGATION
    // ============================================
    function goToSection(sectionName) {
        const sections = Array.from(document.querySelectorAll('.sections-menu-item'));

        for (const section of sections) {
            const title = section.querySelector('.sections-menu-item__title');
            if (title && title.textContent.toLowerCase().includes(sectionName.toLowerCase())) {
                title.click();
                log(`Navigated to: ${sectionName}`);
                return true;
            }
        }

        log(`Section not found: ${sectionName}`);
        return false;
    }

    function getNextIncompleteSection() {
        const sections = Array.from(document.querySelectorAll('.sections-menu-item'));
        for (const section of sections) {
            const icon = section.querySelector('mat-icon');
            const hasCheckCircle = icon && icon.textContent.includes('check_circle');
            if (!hasCheckCircle) {
                return section;
            }
        }
        return null;
    }

    // ============================================
    // REPLAY PANEL
    // ============================================
    function showReplayPanel() {
        // Create backdrop
        const backdrop = document.createElement('div');
        backdrop.className = 'sce-backdrop';
        document.body.appendChild(backdrop);

        // Create panel
        const panel = document.createElement('div');
        panel.className = 'sce-panel';
        panel.innerHTML = `
            <div class="sce-panel-header">
                <h2>🎬 SCE Replay Helper</h2>
                <button class="sce-panel-close">&times;</button>
            </div>
            <div class="sce-panel-body">
                <div class="sce-form-group">
                    <label>Form Data (JSON)</label>
                    <textarea id="sce-json-input" placeholder='{
  "contactPhone": "(562) 348-5375",
  "contactEmail": "gmariaca38@gmail.com",
  "spaceOrUnit": "1",
  "householdUnits": "2",
  "projectContactFirstName": "Sergio",
  "projectContactTitle": "Outreach",
  "projectContactPhone": "7143912727"
}'></textarea>
                </div>
                <div class="sce-form-group">
                    <label>Quick Presets</label>
                    <select id="sce-preset-select">
                        <option value="">-- Select Preset --</option>
                        <option value="maria-gonzalez">Maria Gonzalez (Recording)</option>
                        <option value="sample">Sample Data</option>
                    </select>
                </div>
                <div class="sce-form-group">
                    <label>
                        <input type="checkbox" id="sce-auto-save" checked>
                        Auto-save after filling
                    </label>
                </div>
            </div>
            <div class="sce-panel-footer">
                <button class="sce-btn sce-btn-secondary" id="sce-close-btn">Close</button>
                <button class="sce-btn sce-btn-primary" id="sce-fill-btn">Fill Form</button>
            </div>
        `;

        document.body.appendChild(panel);

        // Event handlers
        const closeBtn = panel.querySelector('.sce-panel-close');
        const closeBtnFooter = panel.querySelector('#sce-close-btn');
        const fillBtn = panel.querySelector('#sce-fill-btn');
        const presetSelect = panel.querySelector('#sce-preset-select');
        const jsonInput = panel.querySelector('#sce-json-input');

        const closePanel = () => {
            panel.remove();
            backdrop.remove();
        };

        closeBtn.onclick = closePanel;
        closeBtnFooter.onclick = closePanel;
        backdrop.onclick = closePanel;

        // Preset data
        const presets = {
            'maria-gonzalez': {
                contactPhone: '(562) 348-5375',
                contactEmail: 'gmariaca38@gmail.com',
                howDidYouHear: 'Other',
                language: 'Spanish',
                spaceOrUnit: '1',
                householdUnits: '2',
                projectContactFirstName: 'Sergio',
                projectContactTitle: 'Outreach',
                projectContactPhone: '7143912727'
            },
            'sample': {
                contactPhone: '(555) 123-4567',
                contactEmail: 'example@email.com',
                spaceOrUnit: '1',
                projectContactFirstName: 'John',
                projectContactTitle: 'Manager',
                projectContactPhone: '(555) 987-6543'
            }
        };

        presetSelect.onchange = () => {
            const preset = presets[presetSelect.value];
            if (preset) {
                jsonInput.value = JSON.stringify(preset, null, 2);
            }
        };

        fillBtn.onclick = async () => {
            const jsonText = jsonInput.value;
            try {
                const data = JSON.parse(jsonText);
                const autoSave = document.querySelector('#sce-auto-save').checked;

                await fillFromData(data);

                if (autoSave) {
                    setTimeout(() => {
                        const saveBtn = Array.from(document.querySelectorAll('button')).find(btn =>
                            btn.querySelector('mat-icon')?.textContent === 'backup');
                        if (saveBtn) {
                            saveBtn.click();
                            showNotification('Form filled and saved!', 'success');
                        } else {
                            showNotification('Form filled!', 'success');
                        }
                    }, 500);
                } else {
                    showNotification('Form filled!', 'success');
                }

                closePanel();
            } catch (e) {
                showNotification('Invalid JSON: ' + e.message, 'error');
            }
        };
    }

    // ============================================
    // FLOATING BUTTON
    // ============================================
    function addFloatingButton() {
        const btn = document.createElement('button');
        btn.className = 'sce-floating-btn';
        btn.innerHTML = '📝';
        btn.title = 'Open SCE Replay Helper';
        btn.onclick = showReplayPanel;
        document.body.appendChild(btn);
    }

    // ============================================
    // KEYBOARD SHORTCUTS
    // ============================================
    function initKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Alt+R: Open replay panel
            if (e.altKey && e.key === 'r') {
                e.preventDefault();
                showReplayPanel();
            }

            // Alt+S: Save
            if (e.altKey && e.key === 's') {
                e.preventDefault();
                const saveBtn = Array.from(document.querySelectorAll('button')).find(btn =>
                    btn.querySelector('mat-icon')?.textContent === 'backup');
                if (saveBtn) {
                    saveBtn.click();
                    showNotification('Saved!', 'success');
                }
            }

            // Alt+N: Next incomplete section
            if (e.altKey && e.shiftKey && e.key === 'N') {
                e.preventDefault();
                const next = getNextIncompleteSection();
                if (next) {
                    next.querySelector('.sections-menu-item__title')?.click();
                    showNotification('Moved to next section', 'info');
                }
            }
        });
    }

    // ============================================
    // EXPOSE TO CONSOLE
    // ============================================
    window.SCEReplay = {
        fill: fillFromData,
        fillField: fillField,
        goToSection: goToSection,
        showPanel: showReplayPanel,
        FIELD_MAPPINGS,
        log
    };

    // ============================================
    // INITIALIZATION
    // ============================================
    function init() {
        log('SCE Replay Helper loaded');
        log('Shortcuts: Alt+R (replay panel), Alt+S (save), Alt+Shift+N (next section)');
        log('Console: SCEReplay.showPanel(), SCEReplay.fill(data)');

        addFloatingButton();
        initKeyboardShortcuts();

        // Show welcome notification after a short delay
        setTimeout(() => {
            showNotification('SCE Replay Helper ready! Press Alt+R to open', 'info');
        }, 1000);
    }

    // Wait for page to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
