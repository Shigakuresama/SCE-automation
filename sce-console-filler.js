/**
 * SCE Rebate Center - Console Form Filler
 *
 * INSTRUCTIONS:
 * 1. Log in to SCE and navigate to the customer page
 * 2. Open browser DevTools (F12)
 * 3. Paste this entire script into the Console
 * 4. Call SCE.fillForm(data) with your data
 *
 * EXAMPLE:
 * SCE.fillForm({
 *   contactPhone: "(562) 348-5375",
 *   spaceOrUnit: "1",
 *   householdUnits: "2",
 *   appointmentStartTime: "1:00PM",
 *   appointmentEndTime: "3:30PM",
 *   incomeVerifiedDate: "01/31/2026",
 *   primaryApplicantAge: "44"
 * });
 */

(function() {
    'use strict';

    const SCE = {
        version: '1.0',
        debug: true,

        log(msg, ...args) {
            if (this.debug) console.log(`%c[SCE] ${msg}`, 'color: #4CAF50; font-weight: bold', ...args);
        },

        // Find input by aria-label, label text, or placeholder
        findInput(labelText, occurrence = 1) {
            this.log(`🔍 Looking for: ${labelText} (occurrence ${occurrence})`);

            // Try exact aria-label match first
            let allMatches = Array.from(document.querySelectorAll(`[aria-label*="${labelText}" i]`));
            if (allMatches.length > 0) {
                if (occurrence <= allMatches.length) {
                    this.log(`  ✓ Found via aria-label (${occurrence} of ${allMatches.length})`);
                    return allMatches[occurrence - 1];
                }
            }

            // Try finding by mat-label text
            const matLabels = Array.from(document.querySelectorAll('mat-label'));
            let labelCount = 0;
            for (const label of matLabels) {
                if (label.textContent && label.textContent.toLowerCase().includes(labelText.toLowerCase())) {
                    labelCount++;
                    if (labelCount === occurrence) {
                        const formField = label.closest('mat-form-field');
                        if (formField) {
                            const found = formField.querySelector('input, mat-select, textarea, .mat-input-element');
                            if (found) {
                                this.log(`  ✓ Found via mat-label`);
                                return found;
                            }
                        }
                    }
                }
            }

            // Try by placeholder - handle duplicates
            const withPlaceholder = Array.from(document.querySelectorAll('input, textarea'));
            let placeholderCount = 0;
            for (const el of withPlaceholder) {
                if (el.placeholder && el.placeholder.toLowerCase().includes(labelText.toLowerCase())) {
                    placeholderCount++;
                    if (placeholderCount === occurrence) {
                        this.log(`  ✓ Found via placeholder (${occurrence} of ${placeholderCount + allMatches.length})`);
                        return el;
                    }
                }
            }

            // Try by name attribute
            const byName = document.querySelector(`[name*="${labelText}" i]`);
            if (byName) {
                this.log(`  ✓ Found via name attribute`);
                return byName;
            }

            this.log(`  ❌ Not found`);
            return null;
        },

        // Fill a text input
        fillField(label, value) {
            const input = this.findInput(label);
            if (!input) {
                this.log(`⚠️ Field not found: ${label}`);
                return false;
            }

            this.log(`✓ Filling ${label}: ${value}`);

            // Highlight the field
            input.style.outline = '3px solid #4CAF50';
            input.style.outlineOffset = '2px';
            setTimeout(() => {
                input.style.outline = '';
                input.style.outlineOffset = '';
            }, 1000);

            input.focus();
            input.click();

            // Handle mat-select dropdowns
            if (input.tagName === 'MAT-SELECT' || input.classList.contains('mat-select-trigger')) {
                input.click();
                return this.selectOption(value);
            }

            // Handle text inputs
            const nativeInput = input.querySelector('input') || input;
            nativeInput.value = value;
            nativeInput.dispatchEvent(new Event('input', { bubbles: true }));
            nativeInput.dispatchEvent(new Event('change', { bubbles: true }));
            nativeInput.dispatchEvent(new Event('blur', { bubbles: true }));

            return true;
        },

        // Select an option from dropdown
        selectOption(value) {
            return new Promise(resolve => {
                setTimeout(() => {
                    const options = Array.from(document.querySelectorAll('mat-option'));
                    const match = options.find(o =>
                        o.textContent.toLowerCase().includes(String(value).toLowerCase())
                    );
                    if (match) {
                        match.click();
                        this.log(`✓ Selected: ${value}`);
                    } else {
                        this.log(`⚠️ Option not found: ${value}`);
                    }
                    resolve(!!match);
                }, 300);
            });
        },

        // Click a button by text
        clickButton(text) {
            const buttons = Array.from(document.querySelectorAll('button, mat-button, [role="button"]'));
            const match = buttons.find(b =>
                b.textContent && b.textContent.toLowerCase().includes(text.toLowerCase())
            );
            if (match) {
                match.click();
                this.log(`✓ Clicked button: ${text}`);
                return true;
            }
            this.log(`⚠️ Button not found: ${text}`);
            return false;
        },

        // Click Next button to go to next section
        clickNext() {
            // Find button with > or Next text
            const allButtons = Array.from(document.querySelectorAll('button, mat-button'));
            const nextBtn = allButtons.find(b => {
                const text = b.textContent.trim();
                return text.includes('>') || text.toLowerCase().includes('next');
            });

            if (nextBtn) {
                nextBtn.click();
                return true;
            }

            return false;
        },

        // Skip Enrollment Information page (just click Next)
        skipEnrollmentInformation() {
            this.log('📋 Skipping Enrollment Information...');
            this.clickNext();
        },

        // Fill Project Information page (NO Next click - handled by resume)
        async fillProjectInformation(zillowData) {
            this.log('📋 Filling Project Information...');

            // Wait for page to load
            await this.sleep(1000);

            // Default values
            let spaceOrUnit = '1';
            let yearBuilt = '';
            let totalSqFt = '';

            if (zillowData) {
                if (zillowData.spaceOrUnit) spaceOrUnit = zillowData.spaceOrUnit;
                if (zillowData.yearBuilt) yearBuilt = zillowData.yearBuilt;
                if (zillowData.sqFt) totalSqFt = zillowData.sqFt;
            }

            // Fill Space Or Unit (if present on this page)
            if (spaceOrUnit) {
                this.fillField('Space Or Unit', spaceOrUnit);
            }

            // Fill Year Built (if Zillow data available)
            if (yearBuilt) {
                this.fillField('Year Built', yearBuilt);
            }

            // Fill Total Sq.Ft. (if Zillow data available)
            if (totalSqFt) {
                this.fillField('Total Sq.Ft.', totalSqFt);
            }

            this.log('✅ Project Information filled!');
            // NO Next click here - resumeFromCurrentPage handles it
        },

        // Skip Trade Ally Information page (just click Next)
        skipTradeAllyInformation() {
            this.log('📋 Skipping Trade Ally Information...');
            this.clickNext();
        },

        // Click the first visible mat-button (for empty Angular buttons)
        clickFirstMatButton() {
            const buttons = Array.from(document.querySelectorAll('button.mat-button, mat-button'));
            // Find first button that's visible
            const match = buttons.find(b => {
                const rect = b.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0;
            });
            if (match) {
                match.click();
                this.log(`✓ Clicked first visible mat-button`);
                return true;
            }
            this.log(`⚠️ No visible mat-button found`);
            return false;
        },

        // Click all mat-buttons (useful for multiple select buttons)
        clickAllMatButtons() {
            const buttons = Array.from(document.querySelectorAll('button.mat-button, mat-button'));
            let clicked = 0;
            buttons.forEach(b => {
                const rect = b.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    b.click();
                    clicked++;
                }
            });
            this.log(`✓ Clicked ${clicked} mat-buttons`);
            return clicked;
        },

        // Navigate to a section
        goToSection(sectionName) {
            const sections = Array.from(document.querySelectorAll('.sections-menu-item, [role="menuitem"]'));
            for (const section of sections) {
                if (section.textContent.toLowerCase().includes(sectionName.toLowerCase())) {
                    section.click();
                    this.log(`✓ Navigated to: ${sectionName}`);
                    return true;
                }
            }
            return false;
        },

        // Save the form
        saveForm() {
            const saveBtn = Array.from(document.querySelectorAll('button, mat-icon')).find(btn =>
                btn.textContent === 'backup' || btn.querySelector('mat-icon')?.textContent === 'backup'
            );
            if (saveBtn) {
                saveBtn.click();
                this.log(`💾 Form saved`);
                return true;
            }
            return false;
        },

        // Fill all sections with data
        async fillAllSections(data) {
            this.log('🚀 Starting form fill...');

            // Customer Information Section
            this.log('📋 Customer Information');
            if (data.contactPhone) this.fillField('Contact Phone', data.contactPhone);
            if (data.contactEmail) this.fillField('Contact Email', data.contactEmail);
            if (data.contactFirstName) this.fillField('Contact First Name', data.contactFirstName);
            if (data.contactLastName) this.fillField('Contact Last Name', data.contactLastName);

            // Navigate to Additional Customer Info
            await this.sleep(500);
            this.clickButton('>'); // Next button

            // Additional Customer Information
            this.log('📋 Additional Customer Information');
            if (data.householdUnits) this.fillField('Household Units', data.householdUnits);
            await this.sleep(500);
            this.clickButton('>');

            // Enrollment Information
            this.log('📋 Enrollment Information');
            if (data.projectContactFirstName) this.fillField('Project Contact First Name', data.projectContactFirstName);
            if (data.projectContactTitle) this.fillField('Project Contact Title', data.projectContactTitle || 'Outreach');
            if (data.projectContactPhone) this.fillField('Project Contact Phone', data.projectContactPhone);
            await this.sleep(500);
            this.clickButton('>');

            // Project Information
            this.log('📋 Project Information');
            if (data.spaceOrUnit) this.fillField('Space Or Unit', data.spaceOrUnit);
            if (data.yearBuilt) this.fillField('Year Built', data.yearBuilt);
            if (data.totalSqFt) this.fillField('Total Sq.Ft.', data.totalSqFt);
            await this.sleep(500);
            this.clickButton('>');

            // Trade Ally Information - skip
            this.log('📋 Trade Ally Information');
            await this.sleep(500);
            this.clickButton('>');

            // Appointment Contact
            this.log('📋 Appointment Contact');
            if (data.appointmentType) this.fillField('Appointment Type', data.appointmentType || 'On-Site Appointment');
            if (data.appointmentStatus) this.fillField('Appointment Status', data.appointmentStatus || 'Scheduled');
            if (data.appointmentStartTime) this.fillField('Start Time', data.appointmentStartTime);
            if (data.appointmentEndTime) this.fillField('End Time', data.appointmentEndTime);
            await this.sleep(500);
            this.clickButton('>');

            // Assessment Questionnaire
            this.log('📋 Assessment Questionnaire');
            if (data.howDidYouHear) this.fillField('How did you hear', data.howDidYouHear || 'Other');
            if (data.nativeAmerican !== undefined) this.fillField('Native American', data.nativeAmerican || 'No');
            if (data.permanentlyDisabled !== undefined) this.fillField('Permanently disabled', data.permanentlyDisabled || 'No');
            if (data.waterUtility) this.fillField('Water Utility', data.waterUtility || 'N/A');
            if (data.gasProvider) this.fillField('Gas Provider', data.gasProvider || 'SoCalGas');
            if (data.gasAccountNumber) this.fillField('Gas Account', data.gasAccountNumber || '1');
            if (data.primaryApplicantAge) this.fillField('Primary Applicant Age', data.primaryApplicantAge);
            if (data.language) this.fillField('Language', data.language);
            if (data.ethnicity) this.fillField('Ethnicity', data.ethnicity);
            if (data.masterMetered) this.fillField('Master Metered', data.masterMetered || 'Yes');
            if (data.buildingType) this.fillField('Building Type', data.buildingType || 'Residential mobile home');
            if (data.incomeVerificationType) this.fillField('Income Verification Type', data.incomeVerificationType || 'PRIZM Code');
            if (data.incomeVerifiedDate) this.fillField('Income Verified Date', data.incomeVerifiedDate);

            this.log('✅ Form fill complete!');
            this.saveForm();
        },

        // Fill current section only
        fillForm(data) {
            this.log('📋 Filling current section...');
            for (const [key, value] of Object.entries(data)) {
                if (value) {
                    this.fillField(key, value);
                }
            }
            this.log('✅ Done!');
        },

        sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        },

        // Wait for URL to change (with timeout fallback)
        async waitForUrlChange(timeoutMs = 30000) {
            const startUrl = window.location.href;
            this.log(`   Waiting for URL change from: ${startUrl}`);

            const startTime = Date.now();
            while (Date.now() - startTime < timeoutMs) {
                if (window.location.href !== startUrl) {
                    this.log(`   ✓ URL changed to: ${window.location.href}`);
                    return true;
                }
                await this.sleep(100);
            }

            this.log(`   ⚠️ URL change timeout after ${timeoutMs}ms`);
            return false;
        },

        // Wait for URL to contain a specific string
        async waitForUrlContains(urlPart, timeoutMs = 30000) {
            this.log(`   Waiting for URL to contain: ${urlPart}`);

            const startTime = Date.now();
            while (Date.now() - startTime < timeoutMs) {
                if (window.location.href.includes(urlPart)) {
                    this.log(`   ✓ URL now contains: ${urlPart}`);
                    return true;
                }
                await this.sleep(100);
            }

            this.log(`   ⚠️ URL wait timeout after ${timeoutMs}ms`);
            return false;
        },

        // Wait for element to appear in DOM
        async waitForElement(selector, timeoutMs = 15000) {
            this.log(`   Waiting for element: ${selector}`);

            const startTime = Date.now();
            while (Date.now() - startTime < timeoutMs) {
                const el = document.querySelector(selector);
                if (el) {
                    const rect = el.getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0) {
                        this.log(`   ✓ Element found and visible: ${selector}`);
                        return el;
                    }
                }
                await this.sleep(100);
            }

            this.log(`   ⚠️ Element not found after ${timeoutMs}ms: ${selector}`);
            return null;
        },

        // Quick fill with test data
        testData() {
            return {
                contactPhone: "(562) 348-5375",
                contactEmail: "test@example.com",
                spaceOrUnit: "1",
                householdUnits: "1",
                projectContactFirstName: "Sergio",
                projectContactTitle: "Outreach",
                projectContactPhone: "7143912727",
                appointmentStartTime: "1:00PM",
                appointmentEndTime: "3:30PM",
                incomeVerifiedDate: "01/31/2026",
                primaryApplicantAge: "44",
                language: "Spanish",
                ethnicity: "Hispanic/Latino"
            };
        },

        // Fill customer search form (uses correct field positions)
        async fillCustomerSearch(address, zipCode) {
            this.log('🔍 Filling customer search form...');

            // Find fields by their full placeholder text to be specific
            const allInputs = document.querySelectorAll('input');
            let addressField, zipField;

            allInputs.forEach(el => {
                const ph = el.getAttribute('placeholder') || '';
                if (ph.includes('Street Address')) addressField = el;
                if (ph === 'Site Zip Code') zipField = el;  // Exact match for the second one
            });

            if (addressField) {
                addressField.value = address;
                addressField.dispatchEvent(new Event('input', { bubbles: true }));
                this.log(`  ✓ Filled Address: ${address}`);
            }

            if (zipField) {
                zipField.value = zipCode;
                zipField.dispatchEvent(new Event('input', { bubbles: true }));
                this.log(`  ✓ Filled Zip Code: ${zipCode}`);
            }

            // Click Search button
            await this.sleep(500);
            const searchBtn = document.querySelector('.customer-search-button');
            if (searchBtn) {
                searchBtn.click();
                this.log('  ✓ Clicked Search button');
            } else {
                this.log('  ⚠️ Search button not found');
            }

            // Wait for results, then click Select Customer
            await this.sleep(2000);
            const selectBtn = document.querySelector('.customer-continue-button');
            if (selectBtn) {
                selectBtn.click();
                this.log('  ✓ Clicked Select Customer button');
            } else {
                this.log('  ⚠️ Select Customer button not found');
            }

            // Wait for URL to change to programs page
            await this.waitForUrlChange(30000);

            // Wait for program button to be available
            await this.sleep(1000);

            // Click on the first program (Income Qualified Program Inquiry)
            const programBtn = document.querySelector('app-assessment-programs button');
            if (programBtn) {
                programBtn.click();
                this.log('  ✓ Clicked Program button');
            } else {
                this.log('  ⚠️ Program button not found');
            }

            // Wait for URL to change again (form loading)
            await this.waitForUrlChange(45000);

            // Extra wait for Angular to finish rendering
            await this.sleep(2000);
        },

        // Find input by its mat-label text
        findInputByMatLabel(labelText) {
            const labels = Array.from(document.querySelectorAll('mat-label'));
            const label = labels.find(l => l.textContent.includes(labelText));
            if (!label) return null;

            const formField = label.closest('mat-form-field');
            if (!formField) return null;

            return formField.querySelector('input');
        },

        // Set input value with verification (retries if not set)
        async setInputValue(input, value, fieldName, maxRetries = 3) {
            for (let i = 0; i < maxRetries; i++) {
                input.value = value;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                input.dispatchEvent(new Event('blur', { bubbles: true }));

                // Verify the value was set
                await this.sleep(200);
                if (input.value === value) {
                    this.log(`  ✓ ${fieldName}: "${value}"`);
                    return true;
                }

                this.log(`  ⚠️ Retry ${i + 1}/${maxRetries} for ${fieldName}`);
                await this.sleep(300);
            }

            this.log(`  ⚠️ Failed to set ${fieldName} after ${maxRetries} attempts`);
            return false;
        },

        // Fill Customer Information section (NO Next click - handled by resume)
        async fillCustomerInfo() {
            this.log('📋 Filling Customer Information...');

            // Wait for form to be ready
            await this.sleep(1000);

            // Get Customer Name from readonly field (by mat-label)
            const nameInput = this.findInputByMatLabel('Customer Name');
            let customerName = nameInput?.value || '';

            this.log(`  Customer Name: "${customerName}"`);

            // Get Alternate Phone value (by mat-label)
            const altPhoneInput = this.findInputByMatLabel('Alternate Phone');
            let altPhone = altPhoneInput?.value || '';

            if (altPhone) {
                this.log(`  Alternate Phone: "${altPhone}"`);

                // Fill Contact Phone with Alternate Phone value (by mat-label)
                const contactPhoneInput = this.findInputByMatLabel('Contact Phone');
                if (contactPhoneInput) {
                    await this.setInputValue(contactPhoneInput, altPhone, 'Contact Phone');
                }
            }

            // Generate and fill random email from customer name
            if (customerName) {
                const email = this.generateEmail(customerName);
                const emailInput = this.findInputByMatLabel('Contact Email');
                if (emailInput) {
                    await this.setInputValue(emailInput, email, 'Contact Email');
                }

                // Fill Contact First/Last Name from Customer Name
                const nameParts = customerName.split(' ');
                const firstName = nameParts[0] || '';
                const lastName = nameParts.slice(1).join(' ') || '';

                if (firstName) {
                    const firstNameInput = this.findInputByMatLabel('Contact First Name');
                    if (firstNameInput) {
                        await this.setInputValue(firstNameInput, firstName, 'Contact First Name');
                    }
                }

                if (lastName) {
                    const lastNameInput = this.findInputByMatLabel('Contact Last Name');
                    if (lastNameInput) {
                        await this.setInputValue(lastNameInput, lastName, 'Contact Last Name');
                    }
                }
            }

            this.log('✅ Customer Information filled!');
            // NO Next click here - resumeFromCurrentPage handles it
        },

        // Generate random email from name
        generateEmail(name) {
            const patterns = [
                (f, l, d, w) => `${f.toLowerCase()}.${l.toLowerCase()}${d}@gmail.com`,
                (f, l, d, w) => `${l.toLowerCase()}.${f.toLowerCase()}${d}@gmail.com`,
                (f, l, d, w) => `${f.toLowerCase()}${l.toLowerCase()}${d}@gmail.com`,
                (f, l, d, w) => `${f.toLowerCase()}.${l.toLowerCase()}.${w}@gmail.com`,
            ];
            const words = ['geek', 'pro', 'expert', 'guru', 'master', 'ninja', 'dev', 'tech'];

            const parts = name.trim().split(/\s+/);
            const first = parts[0] || 'user';
            const last = parts.slice(1).join('') || 'name';

            const digits = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            const word = words[Math.floor(Math.random() * words.length)];

            const pattern = patterns[Math.floor(Math.random() * patterns.length)];
            return pattern(first, last, digits, word);
        },

        // Scrape Zillow for property data
        async scrapeZillow(address, zipCode) {
            this.log(`🏠 Opening Zillow for: ${address}, ${zipCode}`);

            // Use Zillow search URL format (more reliable)
            const zillowUrl = `https://www.zillow.com/homes/${address},${zipCode}_rb/`;
            this.log(`   URL: ${zillowUrl}`);

            const zillowWindow = window.open(zillowUrl, '_blank');

            if (!zillowWindow) {
                this.log('⚠️ Popup blocked! Please allow popups for this site.');
                this.log(`   Open manually: ${zillowUrl}`);
                return null;
            }

            this.log('⏳ Waiting for Zillow to load...');
            await this.sleep(5000);

            try {
                const data = zillowWindow.document.body.textContent;

                const result = {
                    householdUnits: '1', // Default for single family
                    spaceOrUnit: '1',
                    sqFt: null,
                    yearBuilt: null,
                    bedrooms: null,
                    propertyType: null
                };

                // Detect property type
                if (data.toLowerCase().includes('condo') || data.toLowerCase().includes('condominium')) {
                    result.propertyType = 'condo';
                    result.householdUnits = '2'; // Condos often have multiple units
                } else if (data.toLowerCase().includes('townhouse')) {
                    result.propertyType = 'townhouse';
                } else if (data.toLowerCase().includes('multi-family')) {
                    result.propertyType = 'multi-family';
                    result.householdUnits = '2';
                }

                // Extract bedrooms (helps determine units)
                const bedsMatch = data.match(/(\d+)\s*bd?.?\s*(?:bed)/i);
                if (bedsMatch) {
                    result.bedrooms = bedsMatch[1];
                }

                // Extract sq ft
                const sqftMatch = data.match(/(\d{3,4}(?:,\d{3})*)\s*(?:sq\.?\s?ft\.?|square\s*feet)/i);
                if (sqftMatch) {
                    result.sqFt = sqftMatch[1].replace(',', '');
                }

                // Extract year built
                const yearMatch = data.match(/(?:built|constructed|year\s*built)\s*(?:in|:)?\s*(\d{4})/i);
                if (yearMatch) {
                    result.yearBuilt = yearMatch[1];
                }

                this.log('✓ Zillow data extracted:', result);
                this.log('   You can close the Zillow tab when ready.');

                // Store for later use
                this._zillowData = result;
                return result;

            } catch (error) {
                this.log(`⚠️ Error scraping Zillow: ${error.message}`);
                return null;
            }
        },

        // Fill Additional Customer Information page (NO Next click - handled by resume)
        async fillAdditionalCustomerInfo(zillowData) {
            this.log('📋 Filling Additional Customer Information...');

            // Wait for page to fully load
            await this.sleep(1500);

            // If Zillow data provided, use it for Household Units
            let householdUnits = '1';
            let spaceOrUnit = '1';

            if (zillowData) {
                if (zillowData.householdUnits) {
                    householdUnits = zillowData.householdUnits;
                }
                if (zillowData.spaceOrUnit) {
                    spaceOrUnit = zillowData.spaceOrUnit;
                }
            }

            const selections = {
                'How did you hear about the program?': 'Contractor Outreach',
                'Preferred Contact Time': '1:00PM - 3:30PM',
                'Preferred Correspondence Language': 'Spanish',
                'Household Spoken Language': 'Spanish',
                'Household Units': householdUnits,
                'Master Metered': 'Yes'
            };

            // Fill each dropdown with proper wait
            for (const [label, value] of Object.entries(selections)) {
                await this.selectDropdown(label, value);
            }

            // Fill Space Or Unit Number (text input, not dropdown)
            // Wait a bit for the field to be ready
            await this.sleep(500);
            this.log(`  Filling Space Or Unit: ${spaceOrUnit}`);

            const labels = Array.from(document.querySelectorAll('mat-label'));
            const spaceLabel = labels.find(l => l.textContent.includes('Space Or Unit'));

            if (spaceLabel) {
                const formField = spaceLabel.closest('mat-form-field');
                if (formField) {
                    const input = formField.querySelector('input');
                    if (input) {
                        // Focus, click, then type for better Angular detection
                        input.focus();
                        input.click();
                        await this.sleep(100);
                        input.value = spaceOrUnit;
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                        input.dispatchEvent(new Event('blur', { bubbles: true }));
                        this.log(`  ✓ Filled Space Or Unit: ${spaceOrUnit}`);
                    } else {
                        this.log(`  ⚠️ No input found for Space Or Unit`);
                    }
                }
            } else {
                this.log(`  ⚠️ Space Or Unit label not found on this page`);
            }

            this.log('✅ Additional Customer Information filled!');
            // NO Next click here - resumeFromCurrentPage handles it
        },

        // Quick manual fill for Space Or Unit
        fillSpaceOrUnit(value) {
            this.log(`  Filling Space Or Unit: ${value}`);
            const labels = Array.from(document.querySelectorAll('mat-label'));
            const spaceLabel = labels.find(l => l.textContent.includes('Space Or Unit'));
            if (spaceLabel) {
                const formField = spaceLabel.closest('mat-form-field');
                if (formField) {
                    const input = formField.querySelector('input');
                    if (input) {
                        input.value = value;
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                        this.log(`  ✓ Filled Space Or Unit: ${value}`);
                        return true;
                    }
                }
            }
            this.log(`  ⚠️ Space Or Unit field not found`);
            return false;
        },

        // Select dropdown by label text (SLOW but RELIABLE)
        async selectDropdown(labelText, optionText) {
            this.log(`  📋 Selecting: ${labelText} → ${optionText}`);

            // Find the mat-label
            const labels = Array.from(document.querySelectorAll('mat-label'));
            const label = labels.find(l => l.textContent.includes(labelText));

            if (!label) {
                this.log(`  ⚠️ Label not found: ${labelText}`);
                return false;
            }

            // Get the mat-form-field and find the mat-select
            const formField = label.closest('mat-form-field');
            if (!formField) {
                this.log(`  ⚠️ Form field not found for: ${labelText}`);
                return false;
            }

            const matSelect = formField.querySelector('mat-select');
            if (!matSelect) {
                this.log(`  ⚠️ Mat-select not found for: ${labelText}`);
                return false;
            }

            // Click the dropdown to open it
            matSelect.click();

            // Wait for options (SLOWER but reliable - Angular needs time)
            await this.sleep(500);

            const options = Array.from(document.querySelectorAll('mat-option'));
            const match = options.find(o =>
                o.textContent && o.textContent.toLowerCase().includes(String(optionText).toLowerCase())
            );

            if (match) {
                match.click();
                this.log(`  ✓ ${labelText}: ${optionText}`);
            } else {
                this.log(`  ⚠️ Option not found: ${optionText}`);
                this.log(`     Available options: ${options.map(o => o.textContent.trim()).slice(0, 5).join(', ')}`);
            }

            // Wait for Angular to register the change
            await this.sleep(400);

            return true;
        },

        // ============================================
        // PAGE DETECTION - Detect which page we're on (URL-based, FAST)
        // ============================================
        detectCurrentPage() {
            const url = window.location.href;

            // URL-based detection (FASTEST)
            if (url.includes('/customer-search')) return 'customer-search';
            if (url.includes('/programs?siteId=')) return 'programs';

            // Query param based
            if (url.includes('creating=true')) return 'programs';

            // Fallback: check by page content
            const labels = Array.from(document.querySelectorAll('mat-label')).map(l => l.textContent.trim());

            if (labels.some(l => l.includes('Customer Name'))) return 'customer-information';
            if (labels.some(l => l.includes('How did you hear'))) return 'additional-customer-info';
            if (labels.some(l => l.includes('Project Contact First Name'))) return 'enrollment-information';
            if (labels.some(l => l.includes('Space Or Unit')) && labels.some(l => l.includes('Year Built'))) return 'project-information';
            if (labels.some(l => l.includes('Trade Ally'))) return 'trade-ally-information';

            return 'unknown';
        },

        // ============================================
        // SMART RESUME - Continue from current page
        // ============================================
        async resumeFromCurrentPage(address, zipCode, config = {}) {
            this.log('🔍 Detecting current page...');
            const currentPage = this.detectCurrentPage();
            this.log(`   Current page: ${currentPage}`);

            const cfg = {
                firstName: config.firstName || 'Sergio',
                title: config.title || 'Outreach',
                phone: config.phone || '7143912727',
                householdUnits: config.householdUnits || '1',
                spaceOrUnit: config.spaceOrUnit || '1'
            };

            const zillowData = {
                spaceOrUnit: cfg.spaceOrUnit,
                householdUnits: cfg.householdUnits
            };

            switch (currentPage) {
                case 'customer-search':
                    await this.fillCustomerSearch(address, zipCode);
                    // Wait for Customer Info page
                    await this.waitForPageChange('customer-information');
                    await this.fillCustomerInfo();
                    // Click Next and wait for Additional Info
                    await this.clickNextAndWait('additional-customer-info');
                    await this.fillAdditionalCustomerInfo(zillowData);
                    await this.clickNextAndWait('enrollment-information');
                    await this.clickNextAndWait('project-information');
                    await this.fillProjectInformation(zillowData);
                    await this.clickNextAndWait('trade-ally-information');
                    this.fillTradeAllyInformation(cfg.firstName, cfg.title, cfg.phone);
                    break;

                case 'programs':
                    const programBtn = document.querySelector('app-assessment-programs button');
                    if (programBtn) {
                        programBtn.click();
                        this.log('  ✓ Clicked Program button');
                    }
                    await this.waitForUrlChange(45000);
                    await this.sleep(2000);
                    await this.fillCustomerInfo();
                    await this.clickNextAndWait('additional-customer-info');
                    await this.fillAdditionalCustomerInfo(zillowData);
                    await this.clickNextAndWait('enrollment-information');
                    await this.clickNextAndWait('project-information');
                    await this.fillProjectInformation(zillowData);
                    await this.clickNextAndWait('trade-ally-information');
                    this.fillTradeAllyInformation(cfg.firstName, cfg.title, cfg.phone);
                    break;

                case 'customer-information':
                    await this.fillCustomerInfo();
                    await this.clickNextAndWait('additional-customer-info');
                    await this.fillAdditionalCustomerInfo(zillowData);
                    await this.clickNextAndWait('enrollment-information');
                    await this.clickNextAndWait('project-information');
                    await this.fillProjectInformation(zillowData);
                    await this.clickNextAndWait('trade-ally-information');
                    this.fillTradeAllyInformation(cfg.firstName, cfg.title, cfg.phone);
                    break;

                case 'additional-customer-info':
                    await this.fillAdditionalCustomerInfo(zillowData);
                    await this.clickNextAndWait('enrollment-information');
                    await this.clickNextAndWait('project-information');
                    await this.fillProjectInformation(zillowData);
                    await this.clickNextAndWait('trade-ally-information');
                    this.fillTradeAllyInformation(cfg.firstName, cfg.title, cfg.phone);
                    break;

                case 'enrollment-information':
                    await this.clickNextAndWait('project-information');
                    await this.fillProjectInformation(zillowData);
                    await this.clickNextAndWait('trade-ally-information');
                    this.fillTradeAllyInformation(cfg.firstName, cfg.title, cfg.phone);
                    break;

                case 'project-information':
                    await this.fillProjectInformation(zillowData);
                    await this.clickNextAndWait('trade-ally-information');
                    this.fillTradeAllyInformation(cfg.firstName, cfg.title, cfg.phone);
                    break;

                case 'trade-ally-information':
                    this.fillTradeAllyInformation(cfg.firstName, cfg.title, cfg.phone);
                    break;

                default:
                    this.log('⚠️ Unknown page. Try: SCE.diagnose()');
            }

            this.log('');
            this.log('✅ RESUME COMPLETE!');
        },

        // Wait for page to change to specific type (FAST VERSION)
        async waitForPageChange(expectedPage, timeoutMs = 5000) {
            this.log(`   ⏳ Waiting for page: ${expectedPage}`);
            const startTime = Date.now();

            while (Date.now() - startTime < timeoutMs) {
                const currentPage = this.detectCurrentPage();
                if (currentPage === expectedPage) {
                    return true;
                }
                await this.sleep(50); // Faster polling
            }

            this.log(`   ⚠️ Timeout. Current: ${this.detectCurrentPage()}`);
            return false;
        },

        // Wait for Angular to be stable (check for no active animations/requests)
        async waitForAngularStability() {
            // Simple stability check: wait until no mat-progress-spinner is visible
            const startTime = Date.now();
            while (Date.now() - startTime < 3000) {
                const spinners = document.querySelectorAll('mat-progress-spinner, .mat-progress-spinner, [role="progressbar"]');
                const visibleSpinners = Array.from(spinners).filter(s => {
                    const rect = s.getBoundingClientRect();
                    return rect.width > 0 && rect.height > 0;
                });
                if (visibleSpinners.length === 0) {
                    return true;
                }
                await this.sleep(100);
            }
            return false;
        },

        // Click Next and wait for expected page (OPTIMIZED)
        async clickNextAndWait(expectedPage) {
            this.log(`➡️ Next → ${expectedPage}`);

            // Find and click Next
            const allButtons = Array.from(document.querySelectorAll('button, mat-button'));
            const nextBtn = allButtons.find(b => {
                const text = b.textContent.trim();
                return text.includes('>') || text.toLowerCase().includes('next');
            });

            if (nextBtn) {
                nextBtn.click();
            } else {
                this.log('⚠️ Next button not found');
                return false;
            }

            // Ultra-fast poll for page change (20ms = 50 checks per second)
            const startTime = Date.now();
            let lastPage = this.detectCurrentPage();

            while (Date.now() - startTime < 8000) {
                const currentPage = this.detectCurrentPage();

                // Page changed?
                if (currentPage !== lastPage) {
                    lastPage = currentPage;
                }

                // Reached expected page?
                if (currentPage === expectedPage) {
                    // Quick stability check
                    await this.waitForAngularStability();
                    this.log(`  ✓ Arrived at ${expectedPage}`);
                    await this.sleep(300); // Minimal Angular settle time
                    return true;
                }

                await this.sleep(20); // Super fast polling
            }

            this.log(`  ⚠️ Timeout. Current: ${this.detectCurrentPage()}`);
            return false;
        },

        // ============================================
        // MASTER AUTOMATION - Runs all sections
        // ============================================
        async runFullAutomation(address, zipCode, config = {}) {
            this.log('🚀 STARTING FULL AUTOMATION');
            this.log('=====================================');
            this.log(`📍 Address: ${address}, ${zipCode}`);

            // Config with defaults
            const cfg = {
                firstName: config.firstName || 'Sergio',
                title: config.title || 'Outreach',
                phone: config.phone || '7143912727',
                preferredContactTime: config.preferredContactTime || '1:00PM - 3:30PM',
                householdUnits: config.householdUnits || '1',
                spaceOrUnit: config.spaceOrUnit || '1',
                howDidYouHear: config.howDidYouHear || 'Contractor Outreach',
                language: config.language || 'Spanish',
                masterMetered: config.masterMetered || 'Yes'
            };

            this.log('📋 Config:', cfg);
            this.log('');

            // STEP 1: Fill Customer Search
            this.log('🔍 STEP 1: Filling Customer Search...');
            await this.fillCustomerSearch(address, zipCode);

            // STEP 2: Customer Information
            this.log('📋 STEP 2: Customer Information');
            await this.sleep(5000);  // Wait for form to load
            this.fillCustomerInfo();
            await this.sleep(3000);

            // STEP 3: Use default property data (Zillow popups blocked)
            this.log('🏠 STEP 3: Using default property data...');
            const zillowData = {
                spaceOrUnit: cfg.spaceOrUnit,
                householdUnits: cfg.householdUnits,
                yearBuilt: '',
                sqFt: ''
            };
            await this.sleep(1000);

            // STEP 4: Additional Customer Information
            this.log('📋 STEP 4: Additional Customer Information');
            await this.sleep(3000);  // Wait for form to load
            await this.fillAdditionalCustomerInfo(zillowData);
            await this.sleep(3000);

            // STEP 5: Enrollment Information (skip)
            this.log('📋 STEP 5: Enrollment Information (skipping)');
            await this.sleep(2000);  // Wait for form to load
            this.skipEnrollmentInformation();
            await this.sleep(3000);

            // STEP 6: Project Information
            this.log('📋 STEP 6: Project Information');
            await this.sleep(3000);  // Wait for form to load
            await this.fillProjectInformation(zillowData);
            await this.sleep(3000);

            // STEP 7: Trade Ally Information
            this.log('📋 STEP 7: Trade Ally Information');
            await this.sleep(3000);  // Wait for form to load
            this.fillTradeAllyInformation(cfg.firstName, cfg.title, cfg.phone);
            await this.sleep(2000);

            this.log('');
            this.log('=====================================');
            this.log('✅ AUTOMATION COMPLETE!');
            this.log('=====================================');
        },

        // Diagnostic - list all input fields on page
        diagnose() {
            this.log('🔍 DIAGNOSTIC - Scanning page for fields...');

            const allInputs = document.querySelectorAll('input, mat-select, textarea');
            this.log(`Found ${allInputs.length} input elements:`);

            allInputs.forEach((el, i) => {
                const aria = el.getAttribute('aria-label') || '';
                const place = el.getAttribute('placeholder') || '';
                const name = el.getAttribute('name') || '';
                const tag = el.tagName.toLowerCase();
                this.log(`  ${i + 1}. ${tag} - aria: "${aria}" placeholder: "${place}" name: "${name}"`);
            });

            this.log('\n📋 MAT LABELS:');
            const labels = document.querySelectorAll('mat-label');
            labels.forEach((l, i) => {
                this.log(`  ${i + 1}. "${l.textContent.trim()}"`);
            });
        },

        // Trade Ally Information - smart fill with label-based then fallback
        async fillTradeAllyInformation(firstName = 'Sergio', title = 'Outreach', phone = '7143912727') {
            this.log('📋 Filling Trade Ally Information...');
            this.log('   Using: First Name, Title, Phone');

            // Wait for page to fully load
            await this.sleep(1500);

            // First, try to find fields by their mat-labels
            const labels = Array.from(document.querySelectorAll('mat-label'));
            this.log(`   Found ${labels.length} mat-labels on page`);

            const fieldMap = {
                'Project Contact First Name': firstName,
                'Project Contact Last Name': '',  // Not commonly used
                'Project Contact Title': title,
                'Project Contact Phone': phone
            };

            let filledByLabel = 0;

            // Try to fill each field by label
            for (const [labelText, value] of Object.entries(fieldMap)) {
                if (!value) continue;  // Skip empty values

                const label = labels.find(l => l.textContent.includes(labelText));
                if (label) {
                    const formField = label.closest('mat-form-field');
                    if (formField) {
                        const input = formField.querySelector('input');
                        if (input && !input.readOnly && !input.disabled) {
                            await this.setInputValue(input, value, labelText);
                            filledByLabel++;
                            await this.sleep(300);
                        }
                    }
                } else {
                    this.log(`  ⚠️ Label not found: ${labelText}`);
                }
            }

            // Fallback: if we didn't fill enough fields, fill first N editable inputs
            if (filledByLabel < 2) {
                this.log('   🔄 Using fallback: filling first editable inputs...');
                const allInputs = Array.from(document.querySelectorAll('input[type="text"], input:not([type][type!="hidden"]):not([type="checkbox"]):not([type="radio"])'));
                const values = [firstName, title, phone].filter(v => v);

                let filled = 0;
                for (const input of allInputs) {
                    if (filled >= values.length) break;

                    const rect = input.getBoundingClientRect();
                    const isVisible = rect.width > 0 && rect.height > 0;
                    const isEditable = !input.readOnly && !input.disabled && !input.value;

                    if (isVisible && isEditable) {
                        await this.setInputValue(input, values[filled], `Input ${filled + 1} (fallback)`);
                        filled++;
                        await this.sleep(300);
                    }
                }

                this.log(`   ✓ Fallback filled ${filled} inputs`);
            }

            // Save the form (no Next button on this page - use backup icon)
            await this.sleep(500);
            this.saveForm();

            this.log('✅ Trade Ally Information filled!');
        },

        // Manual fill for Trade Ally - shows what fields are available
        diagnoseTradeAlly() {
            this.log('🔍 TRADE ALLY PAGE DIAGNOSTIC');
            this.log('================================');

            const allInputs = Array.from(document.querySelectorAll('input, mat-select, textarea'));
            this.log(`Found ${allInputs.length} input elements:`);

            allInputs.forEach((el, i) => {
                const aria = el.getAttribute('aria-label') || '';
                const place = el.getAttribute('placeholder') || '';
                const name = el.getAttribute('name') || '';
                const tag = el.tagName.toLowerCase();
                const val = el.value ? `"${el.value}"` : '(empty)';
                const ro = el.readOnly ? ' [readonly]' : '';
                this.log(`  ${i + 1}. ${tag} - aria: "${aria}" placeholder: "${place}" name: "${name}" value: ${val}${ro}`);
            });

            this.log('\n📋 MAT LABELS:');
            const labels = document.querySelectorAll('mat-label');
            labels.forEach((l, i) => {
                this.log(`  ${i + 1}. "${l.textContent.trim()}"`);

                // Find associated input
                const formField = l.closest('mat-form-field');
                if (formField) {
                    const input = formField.querySelector('input, mat-select, textarea');
                    if (input) {
                        const val = input.value ? `"${input.value}"` : '(empty)';
                        this.log(`      → Input value: ${val}`);
                    }
                }
            });

            this.log('\n💡 Run: SCE.fillTradeAllyInformation("YourName", "Outreach", "1234567890")');
        }
    };

    // Expose to window
    window.SCE = SCE;

    console.log('%c✅ SCE Form Filler loaded!', 'color: #4CAF50; font-size: 16px; font-weight: bold');
    console.log('%cUsage:', 'color: #2196F3; font-weight: bold');
    console.log('  SCE.resumeFromCurrentPage(addr, zip)  - 🔄 SMART RESUME from ANY page!');
    console.log('  SCE.detectCurrentPage()              - Detect which page you\'re on');
    console.log('  SCE.diagnose()                       - List all fields on current page');
    console.log('  SCE.diagnoseTradeAlly()              - 🔍 Trade Ally page diagnostic');
    console.log('  SCE.clickNext()                      - Click Next button');
    console.log('  SCE.fillCustomerInfo()               - Copy phone, generate email');
    console.log('  SCE.fillAdditionalCustomerInfo(data) - Fill additional info');
    console.log('  SCE.fillProjectInformation(data)     - Fill Project Info');
    console.log('  SCE.fillTradeAllyInformation(fn,tit,phone) - Fill Trade Ally, save');
    console.log('  SCE.saveForm()                       - Save form (backup icon)');
    console.log('');
    console.log('%cExample:', 'color: #FF9800; font-weight: bold');
    console.log('  SCE.resumeFromCurrentPage("22216 Seine", "90716")');

})();
