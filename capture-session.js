/**
 * capture-session.js
 * Captures browser authentication session for SCE Rebate Center
 *
 * Usage: node capture-session.js
 */

import { chromium } from 'playwright';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import config from './config.js';

async function captureSession() {
    console.log('🔐 SCE Rebate Center - Session Capture');
    console.log('=' .repeat(50));
    console.log('\nThis will help you capture your login session.');
    console.log('Please follow these steps:\n');

    console.log('1. A browser window will open');
    console.log('2. Log in to SCE Rebate Center manually');
    console.log('3. Once logged in, press Enter in this terminal');
    console.log('4. Your session will be saved to ./auth/\n');

    // Create auth directory
    const authDir = './auth';
    await mkdir(authDir, { recursive: true });

    // Launch browser
    const browser = await chromium.launch({
        headless: false,
        slowMo: 100
    });

    const context = await browser.newContext({
        viewport: config.browser.viewport
    });

    const page = await context.newPage();

    // Navigate to SCE login
    console.log('📍 Opening SCE login page...');
    await page.goto('https://sce.dsmcentral.com/onsite');

    console.log('\n⏸️  Please log in now.');
    console.log('⏸️  After you see the projects page, press Enter here...\n');

    // Wait for user to press Enter
    await new Promise(resolve => {
        process.stdin.once('data', resolve);
    });

    // Capture cookies
    console.log('\n📸 Capturing session data...');

    const cookies = await context.cookies();
    await writeFile(
        join(authDir, 'cookies.json'),
        JSON.stringify(cookies, null, 2)
    );
    console.log(`  ✓ Saved ${cookies.length} cookies to ./auth/cookies.json`);

    // Capture localStorage
    const localStorage = await page.evaluate(() => {
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            data[key] = localStorage.getItem(key);
        }
        return data;
    });

    await writeFile(
        join(authDir, 'storage.json'),
        JSON.stringify(localStorage, null, 2)
    );
    console.log(`  ✓ Saved ${Object.keys(localStorage).length} storage items to ./auth/storage.json`);

    // Capture sessionStorage
    const sessionStorage = await page.evaluate(() => {
        const data = {};
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            data[key] = sessionStorage.getItem(key);
        }
        return data;
    });

    if (Object.keys(sessionStorage).length > 0) {
        await writeFile(
            join(authDir, 'sessionStorage.json'),
            JSON.stringify(sessionStorage, null, 2)
        );
        console.log(`  ✓ Saved ${Object.keys(sessionStorage).length} session storage items`);
    }

    console.log('\n✅ Session captured successfully!');
    console.log('\nYou can now run automated scripts without logging in manually.');
    console.log('\nNote: Session will expire after ~30 days.');

    await browser.close();
}

captureSession()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('❌ Error:', error.message);
        process.exit(1);
    });
