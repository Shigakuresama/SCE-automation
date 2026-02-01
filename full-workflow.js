/**
 * full-workflow.js
 * Complete SCE Rebate Center workflow from case data
 *
 * Features:
 * - Scrapes Zillow for property data (with caching)
 * - Follows proper workflow order
 * - Handles conditional field visibility
 * - Uploads photos and documents
 * - Fills all sections
 *
 * Usage: node full-workflow.js case-data.json [--dry-run] [--no-cache]
 */

import { chromium } from 'playwright';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, existsSync } from 'path';
import config from './config.js';
import { getCache } from './lib/cache.js';
import { executeWorkflow } from './lib/workflow.js';
import { FileUploader, preparePhotoDir, organizePhotos } from './lib/uploader.js';

/**
 * Load case data from JSON file
 */
async function loadCaseData(filePath) {
    const content = await readFile(filePath, 'utf-8');
    const data = JSON.parse(content);

    // Support case packet structure
    if (data.client && data.measures) {
        // Case packet format - merge client_data.json and measure_plan.json
        const clientData = data.client;
        const measurePlan = data.measures;

        return {
            applicationId: data.applicationId || clientData.applicationId,
            address: data.address || clientData.address,
            customer: {
                firstName: clientData.firstName,
                lastName: clientData.lastName,
                email: clientData.email,
                phone: clientData.phone
            },
            propertyData: {
                address: clientData.address,
                sqFt: clientData.sqFt,
                yearBuilt: clientData.yearBuilt,
                bedrooms: clientData.bedrooms,
                bathrooms: clientData.bathrooms
            },
            household: clientData.household || [],
            questionnaire: clientData.questionnaire || {},
            measures: measurePlan.measures || [],
            rooms: measurePlan.rooms || [],
            photos: data.photos || [],
            documents: data.documents || [],
            tradeAlly: clientData.tradeAlly || {},
            appointments: clientData.appointments || []
        };
    }

    return data;
}

/**
 * Scrape Zillow for property data (with caching)
 */
async function scrapePropertyData(browser, address, options = {}) {
    const { useCache = true, forceRefresh = false } = options;

    console.log(`\n🏠 Scraping Zillow: ${address}`);

    // Check cache first
    if (useCache) {
        const cache = await getCache();
        const cached = cache.get(address);

        if (cached && !forceRefresh) {
            console.log('  💾 Cache HIT');
            return cached;
        }
        console.log('  💾 Cache MISS');
    }

    // Scrape fresh
    const context = await browser.newContext({
        viewport: config.browser.viewport,
        userAgent: config.browser.userAgent
    });

    const page = await context.newPage();

    try {
        await page.goto(config.zillow.baseUrl);
        await page.waitForLoadState('networkidle');

        // Handle cookies
        try {
            await page.getByText('Accept').or(page.getByText('I agree')).click({ timeout: 2000 });
        } catch {}

        // Search
        await page.fill('[aria-label="Search"]', address);
        await page.press('[aria-label="Search"]', 'Enter');
        await page.waitForLoadState('networkidle', { timeout: 15000 });

        // Extract data
        const data = await page.evaluate((patterns) => {
            const text = document.body.textContent;
            const extract = (regex) => {
                const match = text.match(new RegExp(regex, 'i'));
                return match ? match[1] : null;
            };

            return {
                address: extract('(\\d+\\s+[\\w\\s]+,\\s*[A-Z][a-z]+\\s*[A-Z]{2}\\s*\\d{5})'),
                sqFt: extract('(\\d{3,4}(?:,\\d{3})*)\\s*(?:sq\\.?\\s?ft\\.?|square\\s*feet)')?.replace(',', ''),
                yearBuilt: extract('(?:built|constructed)\\s*(?:in|:)?\\s*(\\d{4})'),
                bedrooms: extract('(\\d+)\\s*bd?.?\\s*(?:bed)'),
                bathrooms: extract('(\\d+\\.?\\d*)\\s*ba?.?\\s*(?:bath)'),
                url: window.location.href,
                scrapedAt: new Date().toISOString()
            };
        });

        console.log('  ✓ Extracted:', JSON.stringify(data, null, 2));

        // Save to cache
        if (useCache && data.sqFt) {
            const cache = await getCache();
            cache.set(address, data);
            await cache.save();
            console.log('  💾 Saved to cache');
        }

        await context.close();
        return data;

    } catch (error) {
        await context.close();
        console.error('  ❌ Zillow error:', error.message);
        return null;
    }
}

/**
 * Load authentication session
 */
async function loadAuthData(context) {
    if (existsSync(config.auth.cookiesPath)) {
        const cookies = JSON.parse(await readFile(config.auth.cookiesPath, 'utf-8'));
        await context.addCookies(cookies);
        console.log('  ✓ Loaded auth cookies');
        return true;
    }
    return false;
}

/**
 * Fill SCE form with complete case data
 */
async function fillSCEForm(browser, caseData, options = {}) {
    const { dryRun = false, uploadPhotos = true } = options;

    console.log('\n📝 Filling SCE Rebate Center');

    const context = await browser.newContext({
        viewport: config.browser.viewport,
        userAgent: config.browser.userAgent
    });

    // Load auth
    const hasAuth = await loadAuthData(context);

    const page = await context.newPage();

    try {
        // Navigate
        console.log('  📍 Navigating to SCE...');
        await page.goto(config.sce.projectUrl, { timeout: 30000 });
        await page.waitForTimeout(2000);

        // Check login
        const needsLogin = await page.locator('input[type="password"]').count() > 0;
        if (needsLogin) {
            console.log('  ⚠️  Login required. Waiting 60 seconds...');
            console.log('  💡 Login now, script will continue automatically.');

            // Wait for successful login
            await page.waitForURL('**/projects', { timeout: 60000 });
            console.log('  ✓ Logged in!');
        }

        // Search application if provided
        if (caseData.applicationId) {
            console.log(`  🔍 Application ID: ${caseData.applicationId}`);
            await page.fill('[aria-label*="Find Assessments"]', caseData.applicationId);
            await page.press('[aria-label*="Find Assessments"]', 'Enter');
            await page.waitForTimeout(2000);
        }

        if (dryRun) {
            console.log('\n  🧪 DRY RUN - Skipping form filling');
            console.log('  📋 Would fill sections:');
            console.log('    • Project Information');
            console.log('    • Assessment Questionnaire');
            console.log('    • Trade Ally Information');
            console.log('    • Measures');
            console.log('    • Appointments');
            return page;
        }

        // Execute workflow
        console.log('\n  ▶️  Executing workflow...');
        const runner = await executeWorkflow(page, caseData);

        // Upload photos if provided
        if (uploadPhotos && caseData.photos && caseData.photos.length > 0) {
            console.log('\n  📸 Uploading photos...');
            const uploader = new FileUploader(page);

            for (const photo of caseData.photos) {
                if (photo.path && existsSync(photo.path)) {
                    await uploader.uploadPhotos(photo.type || 'site', [{ path: photo.path, name: photo.description || photo.path }]);
                }
            }
        }

        // Upload documents if provided
        if (caseData.documents && caseData.documents.length > 0) {
            console.log('\n  📄 Uploading documents...');
            const uploader = new FileUploader(page);

            for (const doc of caseData.documents) {
                if (doc.path && existsSync(doc.path)) {
                    await uploader.upload(uploader.uploaded.length, doc.path);
                }
            }
        }

        console.log('\n✅ Workflow Complete! Browser staying open for review.');
        console.log('Press Ctrl+C to exit.');

        // Stay open
        await new Promise(() => {});

    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    }
}

/**
 * Main workflow
 */
async function fullWorkflow(caseFilePath, options = {}) {
    console.log('🚀 SCE Rebate Center - Full Workflow');
    console.log('='.repeat(50));

    // Load case data
    console.log(`\n📋 Loading case data: ${caseFilePath}`);
    const caseData = await loadCaseData(caseFilePath);
    console.log('  ✓ Case data loaded');

    // Ensure output directories exist
    if (!existsSync(config.output.dir)) {
        await mkdir(config.output.dir, { recursive: true });
    }
    if (!existsSync(config.output.screenshotDir)) {
        await mkdir(config.output.screenshotDir, { recursive: true });
    }

    const browser = await chromium.launch({
        headless: options.headless || false,
        slowMo: config.browser.slowMo
    });

    try {
        // Step 1: Scrape Zillow if address provided
        if (caseData.address && !caseData.propertyData?.sqFt) {
            caseData.propertyData = {
                ...caseData.propertyData,
                ...await scrapePropertyData(browser, caseData.address, options)
            };
        }

        // Step 2: Fill SCE forms
        await fillSCEForm(browser, caseData, options);

        // Save output
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const outputFile = join(config.output.dir, `completed_${timestamp}.json`);
        await writeFile(outputFile, JSON.stringify(caseData, null, 2));
        console.log(`\n💾 Output saved: ${outputFile}`);

    } catch (error) {
        console.error('\n❌ Workflow failed:', error.message);
        process.exit(1);
    }
}

// ============================================
// CLI INTERFACE
// ============================================

async function main() {
    const args = process.argv.slice(2);

    // Parse options
    const options = {
        dryRun: args.includes('--dry-run'),
        headless: args.includes('--headless'),
        useCache: !args.includes('--no-cache'),
        forceRefresh: args.includes('--refresh'),
        uploadPhotos: !args.includes('--no-uploads')
    };

    // Get case file path
    const caseFilePath = args.find(arg => !arg.startsWith('--'));

    if (!caseFilePath) {
        console.log('Usage: node full-workflow.js <case-data.json> [options]');
        console.log('');
        console.log('Options:');
        console.log('  --dry-run      Validate and plan without filling forms');
        console.log('  --headless     Run browser in headless mode');
        console.log('  --refresh      Force refresh Zillow data (ignore cache)');
        console.log('  --no-cache     Disable caching for this run');
        console.log('  --no-uploads   Skip file uploads');
        console.log('');
        console.log('Case data format:');
        console.log(JSON.stringify({
            applicationId: '75114801',
            address: '1909 W Martha Ln, Santa Ana, CA 92706',
            household: [
                { name: 'John Doe', age: 35, relationship: 'Owner' }
            ],
            measures: [
                { category: 'HVAC', product: 'Central HVAC', quantity: 1 }
            ]
        }, null, 2));
        process.exit(1);
    }

    await fullWorkflow(caseFilePath, options);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
