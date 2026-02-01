/**
 * SCE Rebate Center - Complete Automation
 *
 * Features:
 * - Interactive address/zip prompt
 * - Zillow property data extraction
 * - Customer name extraction → email generation
 * - Phone copy (Alternate Phone → Contact Phone)
 * - All 9 form sections with fixed/configurable values
 * - Config file support for overrides
 *
 * Usage: node sce-auto-fill.js
 */

import { chromium } from 'playwright';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Get current directory (ES modules compatible)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load config
const configPath = join(__dirname, 'sce-config.json');
const config = JSON.parse(await readFile(configPath, 'utf-8'));

// ============================================
// UTILITY FUNCTIONS
// ============================================
function log(msg, ...args) {
    console.log(`\x1b[36m[SCE Auto]\x1b[0m ${msg}`, ...args);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function generateEmail(firstName, lastName) {
    const { patterns, randomWords, randomDigits } = config.emailGeneration;

    // Clean names
    const first = firstName.toLowerCase().trim();
    const last = lastName.toLowerCase().replace(/[^a-z]/g, '').trim();

    // Generate random components
    const digits = Math.floor(Math.random() * 10 ** randomDigits).toString().padStart(randomDigits, '0');
    const word = randomWords[Math.floor(Math.random() * randomWords.length)];

    // Pick random pattern
    const pattern = patterns[Math.floor(Math.random() * patterns.length)];

    return pattern
        .replace(/{{firstname}}/gi, first)
        .replace(/{{lastname}}/gi, last)
        .replace(/{{randomDigits}}/gi, digits)
        .replace(/{{randomWord}}/gi, word);
}

async function prompt(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise(resolve => {
        rl.question(query, answer => {
            rl.close();
            resolve(answer);
        });
    });
}

// ============================================
// ZILLOW SCRAPER
// ============================================
async function scrapeZillow(address) {
    log(`🏠 Scraping Zillow for: ${address}`);

    // Launch a separate browser context for Zillow (doesn't need user profile)
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });

    const page = await context.newPage();

    try {
        await page.goto(config.zillow.baseUrl, { timeout: 20000 });
        await page.waitForLoadState('networkidle', { timeout: 10000 });

        // Accept cookies if present
        try {
            await page.getByText('Accept').or(page.getByText('I agree')).click({ timeout: 2000 });
        } catch {}

        // Search
        const searchInput = page.locator('[aria-label="Search"]');
        await searchInput.fill(address);
        await searchInput.press('Enter');
        await page.waitForTimeout(3000);

        // Extract data from page
        const data = await page.evaluate(() => {
            const text = document.body.textContent;

            const patterns = {
                sqFt: /(\d{3,4}(?:,\d{3})*)\s*(?:sq\.?\s?ft\.?|square\s*feet)/i,
                yearBuilt: /(?:built|constructed|year\s*built)\s*(?:in|:)?\s*(\d{4})/i,
                bedrooms: /(\d+)\s*bd?.?\s*(?:bed)/i,
                bathrooms: /(\d+\.?\d*)\s*ba?.?\s*(?:bath)/i,
                lotSize: /(\d{3,6}(?:,\d{3})*)\s*(?:sq\.?\s?ft\.?\s*lot|lot\s*sq\.?)/i
            };

            const result = {};
            for (const [key, pattern] of Object.entries(patterns)) {
                const match = text.match(pattern);
                if (match) {
                    result[key] = match[1].replace(/,/g, '');
                }
            }

            return result;
        });

        log(`  ✓ Zillow data:`, data);
        await context.close();
        return data;

    } catch (error) {
        await context.close();
        log(`  ⚠️  Zillow error: ${error.message}`);
        return {};
    }
}

// ============================================
// SCE FORM FILLER
// ============================================
class SCEFormFiller {
    constructor(page) {
        this.page = page;
    }

    async fillByAriaLabel(label, value) {
        try {
            const selector = `[aria-label*="${label}"]`;
            await this.page.fill(selector, String(value));
            log(`  ✓ Filled ${label}: ${value}`);
            await sleep(200);
            return true;
        } catch (e) {
            log(`  ⚠️  Could not fill ${label}: ${e.message}`);
            return false;
        }
    }

    async selectDropdown(label, optionText) {
        try {
            // Find dropdown by label
            const labelElement = this.page.locator(`mat-label:has-text("${label}")`).first();
            if (await labelElement.count() > 0) {
                const formField = labelElement.locator('xpath=../../..');
                await formField.locator('mat-select, .mat-select-trigger').first().click();
                await sleep(300);

                const option = this.page.locator(`mat-option:has-text("${optionText}")`).first();
                if (await option.count() > 0) {
                    await option.click();
                    log(`  ✓ Selected ${label}: ${optionText}`);
                    await sleep(200);
                    return true;
                }
            }
            return false;
        } catch (e) {
            log(`  ⚠️  Could not select ${optionText} for ${label}`);
            return false;
        }
    }

    async clickButton(text) {
        try {
            await this.page.locator(`button:has-text("${text}")`).first().click();
            await sleep(500);
            return true;
        } catch {
            return false;
        }
    }

    async clickNextButton() {
        return await this.clickButton('>');
    }

    async navigateToSection(sectionName) {
        try {
            const section = this.page.locator(`.sections-menu-item__title:has-text("${sectionName}")`);
            if (await section.count() > 0) {
                await section.first().click();
                log(`📍 Navigated to: ${sectionName}`);
                await sleep(500);
                return true;
            }
            return false;
        } catch {
            return false;
        }
    }

    async saveForm() {
        try {
            const saveBtn = await this.page.locator('button').filter({ hasText: 'backup' }).or(
                this.page.locator('mat-icon:has-text("backup")')
            ).first();

            if (await saveBtn.count() > 0) {
                await saveBtn.click();
                log('💾 Form saved');
                await sleep(1000);
                return true;
            }
        } catch {}
        return false;
    }
}

// ============================================
// SECTION HANDLERS
// ============================================
async function handleCustomerInformation(page, filler, data) {
    log('📋 Section: Customer Information');

    // Wait for section to load
    await sleep(1000);

    // Extract customer name from readonly field
    const customerName = await page.locator('[aria-label*="Customer Name"]').inputValue();
    const [firstName, lastName] = customerName.split(' ');

    log(`  ✓ Extracted customer name: ${customerName}`);

    // Extract alternate phone
    const altPhone = await page.locator('[aria-label*="Alternate Phone"]').inputValue();
    log(`  ✓ Extracted alternate phone: ${altPhone}`);

    // Fill Contact Phone (copy from alternate phone)
    if (altPhone && config.fieldMappings.copyFields.alternatePhoneToContactPhone) {
        await filler.fillByAriaLabel('Contact Phone', altPhone);
    }

    // Generate and fill email
    if (config.emailGeneration.enabled && firstName && lastName) {
        const email = generateEmail(firstName, lastName);
        await filler.fillByAriaLabel('Contact Email', email);
        log(`  ✓ Generated email: ${email}`);
    }

    // Fill Contact First/Last Name (from customer name)
    if (config.fieldMappings.copyFields.customerNameToContactName) {
        await filler.fillByAriaLabel('Contact First Name', firstName);
        await filler.fillByAriaLabel('Contact Last Name', lastName);
    }

    await filler.clickNextButton();
    return { customerName, firstName, lastName, altPhone };
}

async function handleAdditionalCustomerInfo(page, filler) {
    log('📋 Section: Additional Customer Information');

    // Household Units
    await filler.selectDropdown('Household Units', config.overrides.householdUnits);

    await filler.clickNextButton();
}

async function handleEnrollmentInformation(page, filler) {
    log('📋 Section: Enrollment Information');

    // Project Contact fields
    await filler.fillByAriaLabel('Project Contact First Name', config.userProvided.projectContactFirstName);
    await filler.fillByAriaLabel('Project Contact Title', config.fixedValues.projectContactTitle);
    await filler.fillByAriaLabel('Project Contact Phone', config.userProvided.projectContactPhone);

    await filler.clickNextButton();
}

async function handleProjectInformation(page, filler, data) {
    log('📋 Section: Project Information');

    // Space Or Unit (from Zillow or config)
    const spaceOrUnit = data.zillow.spaceOrUnit || config.overrides.spaceOrUnit;
    await filler.fillByAriaLabel('Space Or Unit', spaceOrUnit);

    // Year Built (from Zillow)
    if (data.zillow.yearBuilt) {
        await filler.fillByAriaLabel('Year Built', data.zillow.yearBuilt);
    }

    // Total Sq.Ft. (from Zillow)
    if (data.zillow.sqFt) {
        await filler.fillByAriaLabel('Total Sq.Ft.', data.zillow.sqFt);
    }

    await filler.clickNextButton();
}

async function handleAssessmentQuestionnaire(page, filler) {
    log('📋 Section: Assessment Questionnaire');

    // How did you hear about us
    await filler.selectDropdown('How did you hear', config.overrides.howDidYouHear);

    // Native American
    await filler.selectDropdown('Native American', config.fixedValues.nativeAmerican);

    // Permanently disabled household members
    await filler.selectDropdown('Permanently disabled', config.fixedValues.permanentlyDisabledHouseholdMembers);

    // Water Utility
    await filler.selectDropdown('Water Utility', config.fixedValues.waterUtility);

    // Gas Provider
    await filler.selectDropdown('Gas Provider', config.fixedValues.gasProvider);

    // Gas Account Number
    await filler.fillByAriaLabel('Gas Account', config.fixedValues.gasAccountNumber);

    // Primary Applicant Age
    await filler.fillByAriaLabel('Primary Applicant Age', config.userProvided.primaryApplicantAge);

    // Language
    await filler.selectDropdown('Language', config.userProvided.language);

    // Ethnicity
    await filler.selectDropdown('Ethnicity', config.userProvided.ethnicity);

    // Master Metered
    await filler.selectDropdown('Master Metered', config.fixedValues.masterMetered);

    // Building Type
    await filler.selectDropdown('Building Type', config.fixedValues.buildingType);

    // Income Verification Type
    await filler.selectDropdown('Income Verification Type', config.fixedValues.incomeVerificationType);

    // Income Verified Date
    await filler.fillByAriaLabel('Income Verified Date', config.userProvided.incomeVerifiedDate);

    // Enter Plus 4 (last 4 of zip - pre-filled, just ensure it's there)
    // The form auto-fills this from mailing zip, so we just verify

    await filler.clickNextButton();
}

async function handleAppointmentContact(page, filler) {
    log('📋 Section: Appointment Contact');

    // Appointment Type
    await filler.selectDropdown('Appointment Type', config.fixedValues.appointmentType);

    // Appointment Status
    await filler.selectDropdown('Appointment Status', config.fixedValues.appointmentStatus);

    // Appointment Start Time
    await filler.selectDropdown('Start Time', config.userProvided.appointmentStartTime);

    // Appointment End Time
    await filler.selectDropdown('End Time', config.userProvided.appointmentEndTime);

    await filler.clickNextButton();
}

async function handleTradeAllyInformation(page) {
    log('📋 Section: Trade Ally Information');

    // Skip or fill minimal data
    // This section may not need filling

    const filler = new SCEFormFiller(page);
    await filler.clickNextButton();
}

// ============================================
// MAIN WORKFLOW
// ============================================
async function main() {
    log('🚀 SCE Rebate Center - Complete Automation');
    log('='.repeat(50));

    // ============================================
    // LAUNCH CHROME WITH YOUR PROFILE USING PLAYWRIGHT
    // ============================================
    log('');
    log('🌐 Launching Chrome...');

    // Kill any existing Chrome first
    log('   Closing existing Chrome...');
    try {
        await execAsync('pkill -9 chrome 2>/dev/null');
        await sleep(2000);
    } catch {}

    // Launch Chrome with Playwright
    log('   Starting Chrome...');
    const browser = await chromium.launch({
        headless: false,
        channel: 'chrome',
        args: ['--start-maximized']
    });

    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
    });

    const page = await context.newPage();
    const filler = new SCEFormFiller(page);

    log('   ✓ Chrome is running!');

    // Check for test mode
    const isTestMode = process.argv.includes('--test');

    // Get user input
    let address, zipCode;
    if (isTestMode) {
        log('🧪 TEST MODE - Using predefined values');
        address = '22216 Seine';
        zipCode = '90716';

        config.userProvided.appointmentStartTime = '1:45PM';
        config.userProvided.appointmentEndTime = '8:45PM';
        config.userProvided.incomeVerifiedDate = '01/31/2026';
        config.userProvided.primaryApplicantAge = '44';
        config.userProvided.language = 'Spanish';
        config.userProvided.ethnicity = 'Hispanic/Latino';
        config.userProvided.projectContactFirstName = 'Sergio';
        config.userProvided.projectContactPhone = '7143912727';
        config.overrides.householdUnits = '1';
    } else {
        address = await prompt('📌 Enter street address (e.g., 22029 Seine Ave): ');
        zipCode = await prompt('📌 Enter zip code (e.g., 90716): ');

        // ============================================
        // INTERACTIVE PROMPTS (all config via CLI)
        // ============================================
        log('📝 Please provide the following information:');
        log('');

        // User-provided values - prompt for ALL
        config.userProvided.appointmentStartTime =
            await prompt('⏰ Appointment Start Time (e.g., 1:00PM) [1:00PM]: ') || '1:00PM';
        config.userProvided.appointmentEndTime =
            await prompt('⏰ Appointment End Time (e.g., 3:30PM) [3:30PM]: ') || '3:30PM';
        config.userProvided.incomeVerifiedDate =
            await prompt('📅 Income Verified Date (e.g., 01/31/2026): ');
        config.userProvided.primaryApplicantAge =
            await prompt('👤 Primary Applicant Age (e.g., 43): ');
        config.userProvided.language =
            await prompt('🌍 Language (e.g., Spanish, English) [Spanish]: ') || 'Spanish';
        config.userProvided.ethnicity =
            await prompt('🌍 Ethnicity (e.g., Hispanic/Latino): ');
        config.userProvided.projectContactFirstName =
            await prompt('👤 Your First Name (e.g., Sergio) [Sergio]: ') || 'Sergio';
        config.userProvided.projectContactPhone =
            await prompt('📱 Your Phone (e.g., 7143912727): ');

        // Optional: Override defaults
        log('');
        const overrideDefaults = await prompt('🔧 Override defaults? (y/n) [n]: ') || 'n';

        if (overrideDefaults.toLowerCase() === 'y') {
            config.overrides.howDidYouHear = await prompt('  How did you hear about us? [Other]: ') || 'Other';
            config.overrides.language = await prompt('  Form language preference? [Spanish]: ') || 'Spanish';
            config.overrides.spaceOrUnit = await prompt('  Space Or Unit number? [1]: ') || '1';
            config.overrides.householdUnits = await prompt('  Household Units? (1-5) [2]: ') || '2';
            config.overrides.relationToAccountHolder = await prompt('  Relation to account holder? [Self]: ') || 'Self';
        }
    }

    log('');
    log('✅ Configuration complete. Starting automation...');
    log('');

    // ============================================
    // START AUTOMATION
    // ============================================
    log('🔗 Starting automation...');

    try {
        // Step 1: Navigate to login page and wait for user to log in
        log(`📍 Navigating to SCE login page...`);
        await page.goto(config.sce.loginUrl);

        log('');
        log('=' .repeat(50));
        log('⚠️  PLEASE LOG IN TO THE SCE PORTAL');
        log('   Log in to the Chrome window that opened.');
        log('   Press Enter here when you are logged in...');
        log('='.repeat(50));
        await prompt('   ');

        log('✅ Proceeding with automation...');
        log('');

        // Step 2: Navigate to customer search
        log(`📍 Navigating to SCE...`);
        await page.goto(config.sce.customerSearchUrl);
        await sleep(2000);

        // Step 3: Fill search form
        log('🔍 Filling customer search...');
        await page.fill('[aria-label*="Street Address"]', address);
        await page.fill('[aria-label*="Zip Code"]', zipCode);

        // Click search
        await page.click('button:has-text("Search")');
        await sleep(3000);

        // Step 4: Select customer
        log('👤 Selecting customer...');
        try {
            // First, click the dropdown arrow to open customer selection
            await page.click('.ng-arrow-wrapper');
            await sleep(500);

            // Then click "Select Customer" button
            await page.click('button:has-text("Select Customer")');
            await sleep(2000);
        } catch {
            log('⚠️  Could not find customer selection elements');
        }

        // Step 5: Click first available program
        try {
            await page.click('app-assessment-item button');
            await sleep(2000);
        } catch {
            log('⚠️  Could not find program button');
        }

        // Step 6: Scrape Zillow for property data
        let zillowData = {};
        if (config.zillow.enabled) {
            zillowData = await scrapeZillow(`${address}, ${zipCode}`);
        }

        // Step 7: Fill form sections
        await handleCustomerInformation(page, filler, {});
        await filler.saveForm();

        await handleAdditionalCustomerInfo(page, filler, {});
        await filler.saveForm();

        await handleEnrollmentInformation(page, filler, {});
        await filler.saveForm();

        await handleProjectInformation(page, filler, { zillow: zillowData });
        await filler.saveForm();

        await handleTradeAllyInformation(page, filler, {});
        await filler.saveForm();

        await handleAppointmentContact(page, filler, {});
        await filler.saveForm();

        await handleAssessmentQuestionnaire(page, filler, {});
        await filler.saveForm();

        log('✅ Automation complete!');
        log('📝 Browser will stay open for review. Press Ctrl+C to exit.');

        // Keep browser open
        await new Promise(() => {});

    } catch (error) {
        log(`❌ Error: ${error.message}`);
        console.error(error);
        await browser.close();
        process.exit(1);
    }
}

main();
