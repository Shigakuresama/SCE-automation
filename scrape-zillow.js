/**
 * scrape-zillow.js
 * Scrapes property data from Zillow given an address
 *
 * Usage: node scrape-zillow.js "1909 W Martha Ln, Santa Ana, CA 92706"
 */

import { chromium } from 'playwright';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import config from './config.js';

async function scrapeZillow(address) {
    console.log(`🏠 Scraping Zillow for: ${address}`);

    const browser = await chromium.launch({
        headless: config.browser.headless,
        slowMo: config.browser.slowMo
    });

    const context = await browser.newContext({
        viewport: config.browser.viewport,
        userAgent: config.browser.userAgent
    });

    const page = await context.newPage();

    try {
        // Navigate to Zillow
        console.log('📍 Navigating to Zillow...');
        await page.goto(config.zillow.baseUrl, { timeout: config.zillow.pageTimeout });

        // Accept cookies if present
        const cookieBtn = page.getByText('Accept').or(page.getByText('I agree')).or(page.getByRole('button', { name: /accept/i }));
        try {
            await cookieBtn.click({ timeout: 3000 });
            console.log('✓ Accepted cookies');
        } catch {
            // No cookie prompt, continue
        }

        // Search for address
        console.log('🔍 Searching for address...');
        const searchInput = page.locator(config.zillow.baseUrl.includes('zillow.com')
            ? '[aria-label="Search"]'
            : 'input[type="search"]');

        await searchInput.fill(address);
        await searchInput.press('Enter');

        // Wait for results
        await page.waitForLoadState('networkidle', { timeout: config.zillow.resultTimeout });

        // Check if we got a direct property page or search results
        const url = page.url();

        let propertyData = {};

        if (url.includes('/homedetails/')) {
            // Direct property page
            console.log('✓ Found property page');
            propertyData = await extractPropertyData(page, address);
        } else {
            // Search results - click first match
            console.log('📋 Search results page, clicking first match...');
            try {
                const firstResult = page.locator('.home-address-row, a[data-zpid]').first();
                await firstResult.click({ timeout: 5000 });
                await page.waitForLoadState('networkidle');
                propertyData = await extractPropertyData(page, address);
            } catch (e) {
                throw new Error(`No property found for address: ${address}`);
            }
        }

        // Add metadata
        propertyData.searchAddress = address;
        propertyData.scrapedAt = new Date().toISOString();
        propertyData.zillowUrl = page.url();

        console.log('\n✅ Scraping Complete!');
        console.log(JSON.stringify(propertyData, null, 2));

        // Save to file
        const outputDir = config.output.dir;
        if (!existsSync(outputDir)) {
            await mkdir(outputDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const outputFile = join(outputDir, `zillow_${timestamp}.json`);
        await writeFile(outputFile, JSON.stringify(propertyData, null, 2));
        console.log(`\n💾 Saved to: ${outputFile}`);

        return propertyData;

    } catch (error) {
        console.error('❌ Error scraping Zillow:', error.message);

        // Take screenshot for debugging
        const screenshotPath = join(config.output.screenshotDir, `error_${Date.now()}.png`);
        await page.screenshot({ path: screenshotPath });
        console.log(`📸 Screenshot saved: ${screenshotPath}`);

        throw error;
    } finally {
        await browser.close();
    }
}

async function extractPropertyData(page, address) {
    const data = {
        address: '',
        sqFt: null,
        yearBuilt: null,
        lotSize: null,
        bedrooms: null,
        bathrooms: null,
        propertyType: '',
        zestimate: null,
        priceHistory: []
    };

    // Wait for page content
    await page.waitForTimeout(2000);

    // Extract data from page content
    const pageText = await page.textContent('body');

    // Extract Sq Footage
    const sqFtMatch = pageText.match(config.patterns.sqFt);
    if (sqFtMatch) {
        data.sqFt = parseInt(sqFtMatch[1].replace(/,/g, ''));
        console.log(`  ✓ SqFt: ${data.sqFt}`);
    }

    // Extract Year Built
    const yearMatch = pageText.match(config.patterns.yearBuilt);
    if (yearMatch) {
        data.yearBuilt = parseInt(yearMatch[1]);
        console.log(`  ✓ Year Built: ${data.yearBuilt}`);
    }

    // Extract Address
    const addrMatch = pageText.match(config.patterns.address);
    if (addrMatch) {
        data.address = addrMatch[1];
        console.log(`  ✓ Address: ${data.address}`);
    } else {
        data.address = address;
    }

    // Extract Bedrooms
    const bedMatch = pageText.match(config.patterns.bedrooms);
    if (bedMatch) {
        data.bedrooms = parseInt(bedMatch[1]);
        console.log(`  ✓ Bedrooms: ${data.bedrooms}`);
    }

    // Extract Bathrooms
    const bathMatch = pageText.match(config.patterns.bathrooms);
    if (bathMatch) {
        data.bathrooms = parseFloat(bathMatch[1]);
        console.log(`  ✓ Bathrooms: ${data.bathrooms}`);
    }

    // Extract Lot Size
    const lotMatch = pageText.match(config.patterns.lotSize);
    if (lotMatch) {
        data.lotSize = parseInt(lotMatch[1].replace(/,/g, ''));
        console.log(`  ✓ Lot Size: ${data.lotSize}`);
    }

    // Try to get more structured data from specific selectors
    try {
        // Zestimate/Value
        const zestimateElem = await page.$('.ds-value, .zestimate-value, [data-testid="zestimate-value"]');
        if (zestimateElem) {
            const zestimateText = await zestimateElem.textContent();
            data.zestimate = zestimateText;
        }
    } catch (e) {
        // Zestimate might not be available
    }

    return data;
}

// ============================================
// CLI INTERFACE
// ============================================

const address = process.argv[2];

if (!address) {
    console.log('Usage: node scrape-zillow.js "<address>"');
    console.log('');
    console.log('Example:');
    console.log('  node scrape-zillow.js "1909 W Martha Ln, Santa Ana, CA 92706"');
    process.exit(1);
}

scrapeZillow(address)
    .then(data => {
        process.exit(0);
    })
    .catch(error => {
        console.error('Scraping failed:', error.message);
        process.exit(1);
    });
