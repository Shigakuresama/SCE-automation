/**
 * tools/field-mapper.js
 * Analyzes SCE Rebate Center forms and generates field mappings
 *
 * Usage: node tools/field-mapper.js [section]
 *
 * Examples:
 *   node tools/field-mapper.js                    # Map current page
 *   node tools/field-mapper.js "Project Information" # Map specific section
 *   node tools/field-mapper.js --all              # Map all sections
 */

import { chromium } from 'playwright';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import config from '../config.js';

// Section names in SCE (in order)
const KNOWN_SECTIONS = [
    'Project Information',
    'Assessment Questionnaire',
    'Appointments',
    'Trade Ally Information',
    'Additional Customer Information',
    'Basic Enrollment'
];

/**
 * Load authentication session
 */
async function loadAuthData(context) {
    const cookiesPath = config.auth.cookiesPath;
    const storagePath = config.auth.storagePath;

    if (existsSync(cookiesPath)) {
        const cookies = JSON.parse(await import('fs').then(fs => fs.readFileSync(cookiesPath, 'utf-8')));
        await context.addCookies(cookies);
    }

    if (existsSync(storagePath)) {
        const storage = JSON.parse(await import('fs').then(fs => fs.readFileSync(storagePath, 'utf-8')));
        const page = await context.newPage();
        await page.goto(config.sce.baseUrl);
        await page.evaluate((data) => {
            for (const [key, value] of Object.entries(data)) {
                localStorage.setItem(key, value);
            }
        }, storage);
        await page.close();
    }
}

/**
 * Extract all fillable fields from current page
 */
async function extractFields(page) {
    return await page.evaluate(() => {
        const fields = [];

        // Find all input elements
        const inputs = document.querySelectorAll('input, textarea, select, mat-select');

        inputs.forEach((el, idx) => {
            const ariaLabel = el.getAttribute('aria-label');
            const placeholder = el.getAttribute('placeholder');
            const name = el.getAttribute('name');
            const id = el.getAttribute('id');
            const type = el.getAttribute('type') || el.tagName.toLowerCase();
            const matLabel = el.closest('mat-form-field')?.querySelector('mat-label')?.textContent;

            // Get current value
            let value = el.value || '';
            if (el.tagName === 'SELECT') {
                value = el.options[el.selectedIndex]?.text || '';
            }

            // Skip if no identifying attributes
            if (!ariaLabel && !placeholder && !name && !id && !matLabel) return;

            fields.push({
                index: idx,
                ariaLabel: ariaLabel || null,
                placeholder: placeholder || null,
                name: name || null,
                id: id || null,
                matLabel: matLabel || null,
                type: type,
                value: value,
                required: el.hasAttribute('required'),
                disabled: el.hasAttribute('disabled') || el.hasAttribute('readonly'),
                // Generate robust selector
                selector: generateSelector(el)
            });
        });

        return fields;
    });
}

/**
 * Generate a robust CSS selector for an element
 */
function generateSelector(el) {
    // Priority: aria-label > id > name > placeholder > mat-label
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel) return `[aria-label="${ariaLabel}"]`;

    const id = el.getAttribute('id');
    if (id && !id.match(/^\d+$/)) return `#${id}`;

    const name = el.getAttribute('name');
    if (name) return `[name="${name}"]`;

    const placeholder = el.getAttribute('placeholder');
    if (placeholder) return `[placeholder="${placeholder}"]`;

    // Fallback to mat-label
    const matLabel = el.closest('mat-form-field')?.querySelector('mat-label')?.textContent;
    if (matLabel) return `mat-form-field:has(mat-label:text("${matLabel}"))`;

    return null;
}

/**
 * Navigate to a section by name
 */
async function navigateToSection(page, sectionName) {
    console.log(`  📂 Looking for section: ${sectionName}`);

    // Wait for sections menu
    await page.waitForSelector('.sections-menu-item', { timeout: 10000 });

    // Find matching section
    const sections = await page.locator('.sections-menu-item').all();

    for (const section of sections) {
        const text = await section.textContent();
        if (text.toLowerCase().includes(sectionName.toLowerCase())) {
            await section.click();
            console.log(`  ✓ Clicked section: ${text}`);
            await page.waitForTimeout(2000);
            return true;
        }
    }

    console.log(`  ⚠️  Section not found: ${sectionName}`);
    return false;
}

/**
 * Map all sections
 */
async function mapAllSections(page) {
    const results = {};

    for (const section of KNOWN_SECTIONS) {
        console.log(`\n📋 Mapping: ${section}`);
        console.log('─'.repeat(40));

        const found = await navigateToSection(page, section);
        if (!found) {
            results[section] = { error: 'Section not found' };
            continue;
        }

        const fields = await extractFields(page);
        results[section] = fields;

        console.log(`  Found ${fields.length} fillable fields`);

        // Show summary
        fields.forEach(f => {
            const label = f.ariaLabel || f.matLabel || f.placeholder || f.name || f.id || 'unnamed';
            const status = f.value ? '✓' : '○';
            console.log(`    ${status} ${label}`);
        });
    }

    return results;
}

/**
 * Generate a JavaScript config file from mapped fields
 */
function generateFieldConfig(mapping) {
    const lines = [];

    lines.push('// Auto-generated field mappings');
    lines.push('// Run: node tools/field-mapper.js --all');
    lines.push('');
    lines.push('export const fieldMappings = {');

    for (const [section, fields] of Object.entries(mapping)) {
        if (fields.error) continue;

        lines.push(`  // ${section}`);
        lines.push(`  ${camelCase(section)}: {`);

        fields.forEach(f => {
            const key = f.ariaLabel || f.matLabel || f.placeholder || f.name || f.id;
            if (!key) return;

            const safeKey = camelCase(key);
            lines.push(`    /**`);
            lines.push(`     * ${key}`);
            lines.push(`     * Selector: ${f.selector}`);
            if (f.value) lines.push(`     * Current value: ${f.value}`);
            lines.push(`     */`);
            lines.push(`    "${safeKey}": "${f.selector}",`);
        });

        lines.push('  },');
    }

    lines.push('};');
    lines.push('');
    lines.push('export default fieldMappings;');

    return lines.join('\n');
}

/**
 * Generate summary report
 */
function generateReport(mapping) {
    const lines = [];

    lines.push('# SCE Rebate Center - Field Mapping Report');
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');

    let totalFields = 0;

    for (const [section, fields] of Object.entries(mapping)) {
        if (fields.error) {
            lines.push(`## ${section}`);
            lines.push(`❌ ${fields.error}`);
            lines.push('');
            continue;
        }

        totalFields += fields.length;
        lines.push(`## ${section} (${fields.length} fields)`);
        lines.push('');

        fields.forEach(f => {
            const label = f.ariaLabel || f.matLabel || f.placeholder || f.name || f.id || 'unnamed';
            const status = f.value ? '✅' : '⬜';
            const required = f.required ? ' **(required)**' : '';

            lines.push(`### ${status} ${label}${required}`);
            lines.push(`- **Type:** ${f.type}`);
            lines.push(`- **Selector:** \`${f.selector}\``);
            if (f.value) lines.push(`- **Current Value:** ${f.value}`);
            lines.push('');
        });
    }

    lines.push('---');
    lines.push(`**Total:** ${totalFields} fillable fields`);

    return lines.join('\n');
}

function camelCase(str) {
    return str
        .toLowerCase()
        .replace(/[^a-z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
        .replace(/^[A-Z]/, chr => chr.toLowerCase());
}

/**
 * Main function
 */
async function main() {
    const args = process.argv.slice(2);
    const targetSection = args[0];
    const mapAll = args.includes('--all');

    console.log('🔍 SCE Field Mapper');
    console.log('='.repeat(50));

    const browser = await chromium.launch({
        headless: false,
        slowMo: 100
    });

    const context = await browser.newContext({
        viewport: config.browser.viewport
    });

    await loadAuthData(context);

    const page = await context.newPage();

    console.log('\n📍 Navigating to SCE...');
    await page.goto(config.sce.projectUrl);

    // Check login
    const isLoggedIn = await page.locator('.sections-menu-item').count() > 0;

    if (!isLoggedIn) {
        console.log('⚠️  Not logged in. Please log in manually.');
        console.log('⏸️  Waiting 60 seconds...');

        await page.waitForURL('**/projects', { timeout: 60000 });
    }

    console.log('✓ Logged in');

    // Map sections
    let mapping;

    if (mapAll) {
        mapping = await mapAllSections(page);
    } else if (targetSection) {
        await navigateToSection(page, targetSection);
        const fields = await extractFields(page);
        mapping = { [targetSection]: fields };
    } else {
        // Map current page
        const fields = await extractFields(page);
        const currentSection = await page.locator('.sections-menu-item.active').textContent();
        mapping = { [currentSection || 'Current Page']: fields };
    }

    // Save output
    const outputDir = './output/mappings';
    await mkdir(outputDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    // Save JSON
    await writeFile(
        join(outputDir, `mapping-${timestamp}.json`),
        JSON.stringify(mapping, null, 2)
    );

    // Save generated config
    await writeFile(
        join(outputDir, `field-config-${timestamp}.js`),
        generateFieldConfig(mapping)
    );

    // Save report
    await writeFile(
        join(outputDir, `report-${timestamp}.md`),
        generateReport(mapping)
    );

    console.log('\n✅ Mapping complete!');
    console.log(`📁 Output saved to: ${outputDir}/`);

    console.log('\nPress Ctrl+C to exit...');
    await new Promise(() => {});
}

main().catch(console.error);
