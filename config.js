// Configuration for SCE Rebate Center automation

export const config = {
    // ============================================
    // BROWSER SETTINGS
    // ============================================
    browser: {
        headless: false,           // Show browser window (set true for background)
        slowMo: 150,               // Delay between actions in milliseconds
        viewport: { width: 1280, height: 800 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },

    // ============================================
    // SCE REBATE CENTER SETTINGS
    // ============================================
    sce: {
        baseUrl: 'https://sce.dsmcentral.com',
        projectUrl: 'https://sce.dsmcentral.com/onsite/projects',

        // Auto-save settings
        autoSave: true,
        saveDelay: 2000,           // Wait time after save

        // Timeouts
        pageTimeout: 30000,
        navigationTimeout: 15000,
        selectorTimeout: 5000
    },

    // ============================================
    // ZILLOW SETTINGS
    // ============================================
    zillow: {
        baseUrl: 'https://www.zillow.com',
        searchUrl: 'https://www.zillow.com/homes/',

        // Timeouts
        pageTimeout: 20000,
        resultTimeout: 10000
    },

    // ============================================
    // FIELD MAPPINGS (Zillow → SCE)
    // ============================================
    fieldMappings: {
        sqFt: 'Total Sq.Ft.',
        yearBuilt: 'Year Built',
        address: 'Site Address',
        lotSize: 'Lot Size',
        bedrooms: 'Number of Bedrooms',
        bathrooms: 'Number of Bathrooms'
    },

    // ============================================
    // SECTION NAVIGATION
    // ============================================
    sections: {
        projectInformation: 'Project Information',
        assessmentQuestionnaire: 'Assessment Questionnaire',
        appointments: 'Appointments',
        tradeAlly: 'Trade Ally Information',
        customerInfo: 'Additional Customer Information',
        basicEnrollment: 'Basic Enrollment'
    },

    // ============================================
    // SELECTOR PATTERNS
    // ============================================
    selectors: {
        // SCE selectors
        sceSearchInput: '[aria-label*="Find Assessments"]',
        sceSearchBtn: 'button[aria-label*="search" i]',
        sceSectionMenu: '.sections-menu-item',
        sceSectionTitle: '.sections-menu-item__title',
        sceInput: (label) => `[aria-label*="${label}" i]`,
        sceMatLabel: (label) => `mat-label:has-text("${label}")`,
        sceSaveBtn: 'button mat-icon:has-text("backup")',

        // Zillow selectors
        zillowSearchInput: '[aria-label="Search"]',
        zillowSearchBtn: 'button[type="submit"]',
        zillowPropertyCard: '.home-address-row',
        zillowSqFt: 'span:has-text("sqft")',
        zillowYearBuilt: 'span:has-text("Built in")',
        zillowAddress: 'h3, .home-address-row'
    },

    // ============================================
    // DATA PATTERNS (for text extraction)
    // ============================================
    patterns: {
        sqFt: /(\d{3,4}(?:,\d{3})*)\s*(?:sq\.?\s?ft\.?|square\s*feet)/i,
        yearBuilt: /(?:built|constructed|year\s*built)\s*(?:in|:)?\s*(\d{4})/i,
        lotSize: /(\d{3,6}(?:,\d{3})*)\s*(?:sq\.?\s?ft\.?\s*lot|lot\s*sq\.?)/i,
        address: /(\d+\s+[\w\s]+,\s*[A-Z][a-z]+\s*[A-Z]{2}\s*\d{5})/,
        bathrooms: /(\d+\.?\d*)\s*ba?.?\s*(?:bath)/i,
        bedrooms: /(\d+)\s*bd?.?\s*(?:bed)/i,
        applicationId: /\d{8}/
    },

    // ============================================
    // OUTPUT SETTINGS
    // ============================================
    output: {
        dir: './output',
        screenshotDir: './output/screenshots',
        dateFormat: 'YYYY-MM-DD_HH-mm-ss'
    },

    // ============================================
    // AUTHENTICATION
    // ============================================
    auth: {
        cookiesPath: './auth/cookies.json',
        storagePath: './auth/storage.json',
        sessionExpiry: 30 * 24 * 60 * 60 * 1000  // 30 days in ms
    }
};

export default config;
