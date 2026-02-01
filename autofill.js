/**
 * autofill.js
 * Scrapes Zillow and auto-fills SCE Rebate Center forms
 *
 * Usage: node autofill.js "1909 W Martha Ln, Santa Ana, CA 92706"
 */

import { chromium } from 'playwright';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import config from './config.js';
import { getCache } from './lib/cache.js';

/**
 * Loads authentication data from saved session
 */
async function loadAuthData(context) {
    const cookiesPath = config.auth.cookiesPath;
    const storagePath = config.auth.storagePath;

    if (existsSync(cookiesPath)) {
        const cookies = JSON.parse(await import('fs').then(fs => fs.readFileSync(cookiesPath, 'utf-8')));
        await context.addCookies(cookies);
        console.log('✓ Loaded cookies from session');
    }

    if (existsSync(storagePath)) {
        const storage = JSON.parse(await import('fs').then(fs => fs.readFileSync(storagePath, 'utf-8')));

        // Apply localStorage to SCE domain
        const scePage = await context.newPage();
        await scePage.goto(config.sce.baseUrl);
        await scePage.evaluate((data) => {
            for (const [key, value] of Object.entries(data)) {
                localStorage.setItem(key, value);
            }
        }, storage);
        await scePage.close();
        console.log('✓ Loaded storage from session');
    }
}

/**
 * Scrapes Zillow for property data
 */
async function scrapeZillow(browser, address) {
    console.log(`\n🏠 Step 1: Scraping Zillow for: ${address}`);

    const context = await browser.newContext({
        viewport: config.browser.viewport,
        userAgent: config.browser.userAgent
    });

    const page = await context.newPage();

    try {
        await page.goto(config.zillow.baseUrl);
        await page.waitForLoadState('networkidle');

        // Handle cookie banner
        try {
            const acceptBtn = page.getByText('Accept').or(page.getByText('I agree'));
            await acceptBtn.click({ timeout: 3000 });
        } catch {}

        // Search for address
        const searchInput = page.locator('[aria-label="Search"]');
        await searchInput.fill(address);
        await searchInput.press('Enter');
        await page.waitForLoadState('networkidle', { timeout: 15000 });

        // Extract property data
        const data = await page.evaluate((address, patterns) => {
            const result = {
                address,
                scrapedAt: new Date().toISOString()
            };

            const text = document.body.textContent;

            // Extract using regex patterns
            const extract = (pattern, key, transform = v => v) => {
                const match = text.match(new RegExp(pattern, 'i'));
                if (match) result[key] = transform(match[1]);
            };

            extract('(\\d{3,4}(?:,\\d{3})*)\\s*(?:sq\\.?\\s?ft\\.?|square\\s*feet)', 'sqFt', v => parseInt(v.replace(',', '')));
            extract('(?:built|constructed)\\s*(?:in|:)?\\s*(\\d{4})', 'yearBuilt', v => parseInt(v));
            extract('(\\d+)\\s*bd?.?\\s*(?:bed)', 'bedrooms', v => parseInt(v));
            extract('(\\d+\\.?\\d*)\\s*ba?.?\\s*(?:bath)', 'bathrooms', v => parseFloat(v));

            // Try structured selectors
            const getSqFt = () => {
                const el = document.querySelector('span:has-text("sqft")');
                return el?.textContent?.match(/[\d,]+/)?.[0];
            };

            result.sqFt = result.sqFt || getSqFt()?.replace(/,/g, '');
            result.url = window.location.href;

            return result;
        }, address, {
            sqFt: config.patterns.sqFt.source,
            yearBuilt: config.patterns.yearBuilt.source,
            address: config.patterns.address.source
        });

        console.log('  ✓ Extracted:', JSON.stringify(data, null, 2));
        await context.close();
        return data;

    } catch (error) {
        await context.close();
        throw error;
    }
}

/**
 * Fills SCE form with property data
 */
async function fillSCE(browser, propertyData, applicationId = null) {
    console.log(`\n📝 Step 2: Filling SCE Rebate Center`);

    const context = await browser.newContext({
        viewport: config.browser.viewport,
        userAgent: config.browser.userAgent
    });

    // Load authentication if available
    await loadAuthData(context);

    const page = await context.newPage();

    try {
        // Navigate to SCE projects
        console.log('  📍 Navigating to SCE...');
        await page.goto(config.sce.projectUrl, { timeout: config.sce.pageTimeout });

        // Check if already logged in
        const isLoggedIn = await page.locator('.sections-menu-item, app-assessment-projects').count() > 0;

        if (!isLoggedIn) {
            console.log('  ⚠️  Not logged in. Please log in manually.');
            console.log('  💡 Run: node capture-session.js');
            console.log('  ⏸️  Waiting 60 seconds for manual login...');

            // Wait for user to log in
            await page.waitForURL('**/projects', { timeout: 60000 });
            console.log('  ✓ Logged in!');
        }

        // Search for application if provided
        if (applicationId) {
            console.log(`  🔍 Searching for application: ${applicationId}`);
            const searchInput = page.locator(config.selectors.sceSearchInput);
            await searchInput.fill(applicationId);
            await searchInput.press('Enter');
            await page.waitForTimeout(2000);
        }

        // Navigate to Project Information section
        console.log('  📂 Opening Project Information section...');
        await page.waitForSelector('.sections-menu-item', { timeout: 10000 });

        // Find and click Project Information section
        const sections = await page.locator('.sections-menu-item').all();
        let projectInfoFound = false;

        for (const section of sections) {
            const text = await section.textContent();
            if (text.toLowerCase().includes('project information')) {
                await section.click();
                projectInfoFound = true;
                break;
            }
        }

        if (!projectInfoFound) {
            // Try clicking by index (section 8 based on analysis)
            await sections[7]?.click();
        }

        await page.waitForTimeout(2000);

        // Fill Total Sq.Ft.
        if (propertyData.sqFt) {
            try {
                const sqFtInput = page.locator('[aria-label*="Total Sq.Ft." i], [aria-label*="Sq.Ft." i]').first();
                await sqFtInput.click();
                await sqFtInput.fill(String(propertyData.sqFt));
                console.log(`  ✓ Filled Total Sq.Ft.: ${propertyData.sqFt}`);
            } catch (e) {
                console.log('  ⚠️  Could not find Sq.Ft. field');
            }
        }

        // Fill Year Built
        if (propertyData.yearBuilt) {
            try {
                const yearInput = page.locator('[aria-label*="Year Built" i], [aria-label*="Built" i]').first();
                await yearInput.click();
                await yearInput.fill(String(propertyData.yearBuilt));
                console.log(`  ✓ Filled Year Built: ${propertyData.yearBuilt}`);
            } catch (e) {
                console.log('  ⚠️  Could not find Year Built field');
            }
        }

        // Auto-save
        if (config.sce.autoSave) {
            console.log('  💾 Saving...');
            await page.waitForTimeout(config.sce.saveDelay);

            // Click save button
            try {
                const saveBtn = page.locator('button').filter(async (btn) => {
                    const text = await btn.textContent();
                    return text.includes('backup') || text.includes('Save');
                }).first();

                await saveBtn.click();
                await page.waitForTimeout(1000);
                console.log('  ✓ Saved');
            } catch (e) {
                console.log('  ⚠️  Could not find save button');
            }
        }

        // Keep browser open for review
        console.log('\n✅ Form filled! Browser will stay open for review.');
        console.log('Press Ctrl+C to exit when done.');

        // Wait indefinitely until user closes
        await new Promise(() => {});

    } catch (error) {
        console.error('❌ Error filling SCE:', error.message);

        // Screenshot for debugging
        const timestamp = Date.now();
        await page.screenshot({ path: join(config.output.screenshotDir, `error_${timestamp}.png`) });
        console.log(`📸 Screenshot saved: error_${timestamp}.png`);

        throw error;
    }
}

/**
 * Scrapes Zillow for property data (with caching)
 */
async function scrapeZillow(browser, address, options = {}) {
    const { forceRefresh = false, useCache = true } = options;

    if (useCache) {
        const cache = await getCache();

        // Check cache
        const cached = cache.get(address);
        if (cached && !forceRefresh) {
            console.log(`  💾 Cache HIT: ${address}`);
            return cached;
        }
        console.log(`  💾 Cache MISS: ${address}`);
    }

    // Scrape fresh
    console.log(`\n🏠 Step 1: Scraping Zillow for: ${address}`);

    const context = await browser.newContext({
        viewport: config.browser.viewport,
        userAgent: config.browser.userAgent
    });

    const page = await context.newPage();

    try {
        await page.goto(config.zillow.baseUrl);
        await page.waitForLoadState('networkidle');

        // Handle cookie banner
        try {
            const acceptBtn = page.getByText('Accept').or(page.getByText('I agree'));
            await acceptBtn.click({ timeout: 3000 });
        } catch {}

        // Search for address
        const searchInput = page.locator('[aria-label="Search"]');
        await searchInput.fill(address);
        await searchInput.press('Enter');
        await page.waitForLoadState('networkidle', { timeout: 15000 });

        // Extract property data
        const data = await page.evaluate((address) => {
            const result = {
                address,
                scrapedAt: new Date().toISOString()
            };

            const text = document.body.textContent;

            // Extract using regex patterns
            const extract = (pattern, key, transform = v => v) => {
                const match = text.match(new RegExp(pattern, 'i'));
                if (match) result[key] = transform(match[1]);
            };

            extract('(\\d{3,4}(?:,\\d{3})*)\\s*(?:sq\\.?\\s?ft\\.?|square\\s*feet)', 'sqFt', v => parseInt(v.replace(',', '')));
            extract('(?:built|constructed)\\s*(?:in|:)?\\s*(\\d{4})', 'yearBuilt', v => parseInt(v));
            extract('(\\d+)\\s*bd?.?\\s*(?:bed)', 'bedrooms', v => parseInt(v));
            extract('(\\d+\\.?\\d*)\\s*ba?.?\\s*(?:bath)', 'bathrooms', v => parseFloat(v));

            // Try structured selectors
            const getSqFt = () => {
                const el = document.querySelector('span:has-text("sqft")');
                return el?.textContent?.match(/[\d,]+/)?.[0];
            };

            result.sqFt = result.sqFt || getSqFt()?.replace(/,/g, '');
            result.url = window.location.href;

            return result;
        }, address);

        console.log('  ✓ Extracted:', JSON.stringify(data, null, 2));

        // Save to cache
        if (useCache) {
            const cache = await getCache();
            cache.set(address, data);
            await cache.save();
            console.log('  💾 Saved to cache');
        }

        await context.close();
        return data;

    } catch (error) {
        await context.close();
        throw error;
    }
}

/**
 * Main autofill workflow
 */
async function autofill(address, applicationId = null, options = {}) {
    const { dryRun = false, forceRefresh = false, useCache = true } = options;

    console.log('🚀 SCE Rebate Center - Zillow AutoFill');
    console.log('='.repeat(50));

    if (dryRun) {
        console.log('🧪 DRY RUN MODE - No forms will be filled');
    }

    const browser = await chromium.launch({
        headless: false,
        slowMo: config.browser.slowMo
    });

    try {
        // Step 1: Scrape Zillow
        const propertyData = await scrapeZillow(browser, address, { forceRefresh, useCache });

        // Save scraped data
        const outputDir = config.output.dir;
        if (!existsSync(outputDir)) {
            await mkdir(outputDir, { recursive: true });
        }
        if (!existsSync(config.output.screenshotDir)) {
            await mkdir(config.output.screenshotDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const outputFile = join(outputDir, `autofill_${timestamp}.json`);
        await writeFile(outputFile, JSON.stringify(propertyData, null, 2));
        console.log(`  💾 Saved to: ${outputFile}`);

        // Step 2: Fill SCE (skip if dry run)
        if (!dryRun) {
            await fillSCE(browser, propertyData, applicationId);
        } else {
            console.log('\n✅ Dry run complete. Data extracted but not filled.');
            console.log('💡 To fill forms, run without --dry-run flag');
        }

    } catch (error) {
        console.error('\n❌ Autofill failed:', error.message);
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
        forceRefresh: args.includes('--refresh'),
        useCache: !args.includes('--no-cache')
    };

    // Handle cache management commands
    if (args.includes('--cache-stats')) {
        const cache = await getCache();
        cache.printStats();
        return;
    }

    if (args.includes('--cache-list')) {
        const cache = await getCache();
        cache.list();
        return;
    }

    if (args.includes('--cache-clear')) {
        const cache = await getCache();
        cache.clear();
        await cache.save();
        console.log('✅ Cache cleared');
        return;
    }

    if (args.includes('--cache-cleanup')) {
        const cache = await getCache();
        const removed = cache.cleanup();
        await cache.save();
        console.log(`✅ Removed ${removed} expired entries`);
        return;
    }

    // Get positional arguments (remove options)
    const positional = args.filter(arg => !arg.startsWith('--'));
    const address = positional[0];
    const applicationId = positional[1];

    if (!address) {
        console.log('Usage: node autofill.js "<address>" [applicationId] [options]');
        console.log('');
        console.log('Arguments:');
        console.log('  address       Property address to scrape from Zillow');
        console.log('  applicationId Optional SCE application ID to search for');
        console.log('');
        console.log('Options:');
        console.log('  --dry-run     Extract data but don\'t fill forms');
        console.log('  --refresh     Force refresh Zillow data (ignore cache)');
        console.log('  --no-cache    Disable caching for this run');
        console.log('  --cache-stats Show cache statistics');
        console.log('  --cache-list  List all cached addresses');
        console.log('  --cache-clear Clear all cached data');
        console.log('  --cache-cleanup Remove expired cache entries');
        console.log('');
        console.log('Examples:');
        console.log('  node autofill.js "1909 W Martha Ln, Santa Ana, CA 92706"');
        console.log('  node autofill.js "1909 W Martha Ln, Santa Ana, CA 92706" 75114801');
        console.log('  node autofill.js "1909 W Martha Ln, Santa Ana, CA 92706" --dry-run');
        console.log('  node autofill.js "1909 W Martha Ln, Santa Ana, CA 92706" --refresh');
        console.log('  node autofill.js --cache-stats');
        process.exit(1);
    }

    await autofill(address, applicationId, options);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
