/**
 * replay-recording.js
 * Replay a JSON recording on SCE Rebate Center
 *
 * This script parses the JSON recording files and replays the form filling actions.
 * It's designed to work with recordings exported from the Chrome DevTools Recorder.
 *
 * Usage: node replay-recording.js <recording.json>
 *        node replay-recording.js <recording.json> --data='{"key":"value"}'
 */

import { chromium } from 'playwright';
import { readFile } from 'fs/promises';

// ============================================
// DATA REPLACEMENTS
// ============================================
function replaceDataValues(text, dataOverrides = {}) {
    let result = text;

    // Apply custom data overrides
    for (const [key, value] of Object.entries(dataOverrides)) {
        const placeholder = `{{${key}}}`;
        if (result.includes(placeholder)) {
            result = result.replace(new RegExp(placeholder, 'g'), value);
        }
    }

    return result;
}

// ============================================
// STEP EXECUTORS
// ============================================
async function executeStep(page, step, dataOverrides = {}) {
    const { type, selectors, value, url } = step;

    try {
        switch (type) {
            case 'navigate':
                console.log(`  📍 Navigating to: ${url}`);
                await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
                await page.waitForTimeout(1000);
                break;

            case 'click':
                if (selectors && selectors.length > 0) {
                    // Try each selector until one works
                    for (const sel of selectors) {
                        try {
                            if (typeof sel === 'string') {
                                const selector = sel[0] || sel;
                                console.log(`  🖱️  Clicking: ${selector.substring(0, 50)}...`);
                                await page.click(selector, { timeout: 5000 });
                                return true;
                            }
                        } catch (e) {
                            // Try next selector
                            continue;
                        }
                    }
                }
                break;

            case 'change':
            case 'input':
                if (selectors && selectors.length > 0 && value) {
                    let fillValue = replaceDataValues(String(value), dataOverrides);

                    for (const sel of selectors) {
                        try {
                            const selector = sel[0] || sel;
                            if (typeof selector === 'string' && !selector.startsWith('xpath')) {
                                console.log(`  ⌨️  Filling: ${selector.substring(0, 50)}... = "${fillValue}"`);
                                await page.fill(selector, fillValue);
                                await page.waitForTimeout(200);
                                return true;
                            }
                        } catch (e) {
                            continue;
                        }
                    }
                }
                break;

            case 'keyDown':
            case 'keyUp':
                // Keyboard events - skip for now as they're usually part of input
                break;

            case 'doubleClick':
                if (selectors && selectors.length > 0) {
                    for (const sel of selectors) {
                        try {
                            const selector = sel[0] || sel;
                            if (typeof selector === 'string' && !selector.startsWith('xpath')) {
                                console.log(`  🖱️  Double-clicking: ${selector.substring(0, 50)}...`);
                                await page.dblclick(selector, { timeout: 5000 });
                                return true;
                            }
                        } catch (e) {
                            continue;
                        }
                    }
                }
                break;

            case 'setViewport':
                // Viewport setting - handled at browser launch
                break;

            default:
                console.log(`  ⚠️  Unknown step type: ${type}`);
        }
    } catch (error) {
        console.log(`  ⚠️  Step failed (continuing): ${error.message}`);
        return false;
    }

    return true;
}

// ============================================
// FORM FILLING HELPERS
// ============================================
async function fillFormData(page, formData) {
    console.log('\n📝 Filling form data:');

    for (const [field, value] of Object.entries(formData)) {
        if (value === null || value === undefined || value === '') continue;

        let selector = null;

        // Find the right selector
        switch (field) {
            case 'streetAddress':
                selector = '[aria-label*="Street Address"]';
                break;
            case 'zipCode':
                selector = '#mat-input-18';  // Zip code in search
                break;
            case 'mailingZip':
                selector = '[aria-label*="Mailing Zip"]';
                break;
            case 'contactPhone':
                selector = '[aria-label*="Contact Phone"]';
                break;
            case 'contactEmail':
                selector = '[aria-label*="Contact Email"]';
                break;
            case 'projectContactFirstName':
                selector = '[aria-label*="Project Contact First Name"]';
                break;
            case 'projectContactTitle':
                selector = '[aria-label*="Project Contact Title"]';
                break;
            case 'projectContactPhone':
                selector = '[aria-label*="Project Contact Phone"]';
                break;
            case 'spaceOrUnit':
                selector = '[aria-label*="Space Or Unit"]';
                break;
            default:
                // Try aria-label
                selector = `[aria-label*="${field}"]`;
        }

        if (selector) {
            try {
                console.log(`  • ${field}: ${value}`);
                await page.fill(selector, String(value));
                await page.waitForTimeout(200);
            } catch (e) {
                console.log(`    ⚠️  Could not fill ${field}: ${e.message}`);
            }
        }
    }
}

async function selectDropdownOption(page, label, optionText) {
    console.log(`  • Selecting ${label}: ${optionText}`);

    try {
        // Find and click the dropdown
        const labelElement = await page.locator(`mat-label:has-text("${label}")`).first();
        if (await labelElement.count() > 0) {
            const formField = await labelElement.locator('xpath=../../..');
            await formField.locator('mat-select, .mat-select-trigger').first().click();
            await page.waitForTimeout(300);

            // Click the option
            const option = await page.locator(`mat-option:has-text("${optionText}")`).first();
            if (await option.count() > 0) {
                await option.click();
                await page.waitForTimeout(200);
                return true;
            }
        }
    } catch (e) {
        console.log(`    ⚠️  Could not select ${optionText} for ${label}`);
    }

    return false;
}

async function navigateToSection(page, sectionName) {
    console.log(`  📂 Navigating to: ${sectionName}`);

    try {
        const section = await page.locator(`.sections-menu-item__title:has-text("${sectionName}")`);
        if (await section.count() > 0) {
            await section.first().click();
            await page.waitForTimeout(500);
            return true;
        }
    } catch (e) {
        console.log(`    ⚠️  Could not navigate to ${sectionName}`);
    }

    return false;
}

async function saveForm(page) {
    console.log('  💾 Saving...');

    try {
        const saveBtn = await page.locator('button').filter({ hasText: 'backup' }).or(
            page.locator('mat-icon:has-text("backup")')
        ).first();

        if (await saveBtn.count() > 0) {
            await saveBtn.click();
            await page.waitForTimeout(2000);
            return true;
        }
    } catch (e) {
        console.log(`    ⚠️  Could not save: ${e.message}`);
    }

    return false;
}

// ============================================
// MAIN REPLAY FUNCTION
// ============================================
async function replayRecording(recordingPath, options = {}) {
    const { data = {}, headless = false, slowMo = 100 } = options;

    console.log('🎬 SCE Rebate Center - Recording Replay');
    console.log('='.repeat(50));

    // Load recording
    console.log(`\n📋 Loading recording: ${recordingPath}`);
    let recording;
    try {
        const content = await readFile(recordingPath, 'utf-8');
        recording = JSON.parse(content);
    } catch (error) {
        console.error('❌ Could not load recording:', error.message);
        throw error;
    }

    console.log(`  ✓ Recording has ${recording.steps?.length || 0} steps`);

    // Launch browser
    const browser = await chromium.launch({
        headless,
        slowMo,
        args: ['--start-maximized']
    });

    const context = await browser.newContext({
        viewport: recording.steps?.find(s => s.type === 'setViewport') || { width: 1920, height: 1080 }
    });

    const page = await context.newPage();

    // Default timeout
    page.setDefaultTimeout(10000);

    try {
        // If custom data is provided, use the smart form filler
        if (Object.keys(data).length > 0) {
            await fillSmartForm(page, data);
        } else {
            // Otherwise replay the recording step by step
            for (let i = 0; i < recording.steps.length; i++) {
                const step = recording.steps[i];
                console.log(`\n[Step ${i + 1}/${recording.steps.length}] ${step.type}`);

                await executeStep(page, step, data);

                // Small delay between actions
                await page.waitForTimeout(slowMo);
            }
        }

        console.log('\n✅ Replay complete!');

        // Keep browser open for review
        if (!headless) {
            console.log('Press Ctrl+C to exit...');
            await new Promise(() => {});
        }

    } catch (error) {
        console.error('\n❌ Replay failed:', error.message);
        throw error;
    } finally {
        if (headless) {
            await browser.close();
        }
    }
}

// ============================================
// SMART FORM FILLER (data-driven)
// ============================================
async function fillSmartForm(page, data) {
    console.log('\n📝 Smart Form Fill Mode');
    console.log('Data:', JSON.stringify(data, null, 2));

    // Navigate to customer search
    if (data.url) {
        await page.goto(data.url);
    } else if (data.address) {
        await page.goto('https://sce.dsmcentral.com/onsite/customer-search');
    }

    // Customer Search
    if (data.address) {
        console.log('\n🔍 Customer Search');
        await page.fill('[aria-label*="Street Address"]', data.address);
        if (data.zipCode) {
            await page.fill('[aria-label*="Zip Code"]', data.zipCode);
        }
        await page.click('button:has-text("Search")');
        await page.waitForTimeout(2000);

        // Select first customer
        try {
            await page.click('button:has-text("Select Customer")', { timeout: 5000 });
        } catch {}
    }

    // Wait for form to load
    await page.waitForTimeout(2000);

    // Click first program
    try {
        await page.click('app-assessment-item button', { timeout: 5000 });
    } catch {}

    await page.waitForTimeout(1000);

    // Customer Information Section
    if (data.contactPhone || data.contactEmail || data.mailingZip) {
        await navigateToSection(page, 'Additional Customer');
        await page.waitForTimeout(500);

        if (data.mailingZip) {
            await fillFormData(page, { mailingZip: data.mailingZip });
        }
        if (data.contactPhone) {
            await fillFormData(page, { contactPhone: data.contactPhone });
        }
        if (data.contactEmail) {
            await fillFormData(page, { contactEmail: data.contactEmail });
        }

        // How did you hear about us
        if (data.howDidYouHear) {
            await selectDropdownOption(page, 'How did you hear', data.howDidYouHear);
        }

        // Language
        if (data.language) {
            await selectDropdownOption(page, 'Language', data.language);
        }

        await saveForm(page);
    }

    // Project Information Section
    if (data.spaceOrUnit || data.householdUnits) {
        await navigateToSection(page, 'Project Information');
        await page.waitForTimeout(500);

        if (data.spaceOrUnit) {
            await fillFormData(page, { spaceOrUnit: data.spaceOrUnit });
        }
        if (data.householdUnits) {
            await selectDropdownOption(page, 'Household Units', data.householdUnits);
        }

        await saveForm(page);
    }

    // Enrollment Information Section
    if (data.projectContactFirstName || data.projectContactTitle || data.projectContactPhone) {
        await navigateToSection(page, 'Enrollment Information');
        await page.waitForTimeout(500);

        await fillFormData(page, {
            projectContactFirstName: data.projectContactFirstName,
            projectContactTitle: data.projectContactTitle,
            projectContactPhone: data.projectContactPhone
        });

        await saveForm(page);
    }

    // Submit if requested
    if (data.submit) {
        console.log('\n📤 Submitting...');
        try {
            await page.click('button:has-text("Submit")');
        } catch {}
    }

    console.log('\n✅ Form filling complete!');
}

// ============================================
// CLI
// ============================================
async function main() {
    const args = process.argv.slice(2);

    const recordingPath = args.find(arg => !arg.startsWith('--'));

    if (!recordingPath) {
        console.log('Usage: node replay-recording.js <recording.json> [options]');
        console.log('');
        console.log('Options:');
        console.log('  --headless              Run in headless mode');
        console.log('  --data=\'{"key":"value"}\'  Override data values');
        console.log('  --slowMo=<ms>           Delay between actions');
        console.log('');
        console.log('Example:');
        console.log('  node replay-recording.js recording.json');
        console.log('  node replay-recording.js recording.json --headless');
        console.log('  node replay-recording.js recording.json --data=\'{"address":"123 Main St"}\'');
        process.exit(1);
    }

    const options = {
        headless: args.includes('--headless'),
        slowMo: parseInt(args.find(a => a.startsWith('--slowMo='))?.split('=')[1]) || 100
    };

    // Parse data override
    const dataArg = args.find(a => a.startsWith('--data='));
    if (dataArg) {
        try {
            options.data = JSON.parse(dataArg.split('=')[1]);
        } catch (e) {
            console.error('Invalid JSON in --data argument');
            process.exit(1);
        }
    }

    await replayRecording(recordingPath, options);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
