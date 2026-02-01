/**
 * tools/validate.js
 * Dry-run validation mode - test data mapping without filling forms
 *
 * Usage: node tools/validate.js <case-file>
 *
 * Examples:
 *   node tools/validate.js example-case.json
 *   node tools/validate.js my-cases/batch1.json --verbose
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Field definitions with validation rules
const FIELD_DEFINITIONS = {
    // Project Information
    'Total Sq.Ft.': {
        type: 'number',
        required: true,
        min: 100,
        max: 50000,
        pattern: /^\d{3,5}$/,
        transform: (v) => parseInt(String(v).replace(/,/g, ''))
    },
    'Year Built': {
        type: 'number',
        required: true,
        min: 1800,
        max: new Date().getFullYear() + 1,
        pattern: /^\d{4}$/,
        transform: (v) => parseInt(v)
    },
    'Site Address': {
        type: 'string',
        required: true,
        minLength: 10,
        maxLength: 200
    },
    'Lot Size': {
        type: 'number',
        required: false,
        min: 1000,
        max: 1000000,
        transform: (v) => parseFloat(String(v).replace(/,/g, ''))
    },
    'Number of Bedrooms': {
        type: 'number',
        required: true,
        min: 0,
        max: 20,
        transform: (v) => parseInt(v)
    },
    'Number of Bathrooms': {
        type: 'number',
        required: true,
        min: 0,
        max: 20,
        allowDecimal: true,
        transform: (v) => parseFloat(v)
    },

    // Assessment Questionnaire
    'Property Type': {
        type: 'select',
        required: true,
        options: ['Single Family Detached', 'Single Family Attached', 'Duplex', 'Triplex', 'Fourplex', 'Mobile Home', 'Manufactured Home', 'Condominium', 'Townhouse']
    },
    'Foundation Type': {
        type: 'select',
        required: true,
        options: ['Slab', 'Crawlspace', 'Basement - Unconditioned', 'Basement - Conditioned', 'Other']
    },
    'Has Attic': {
        type: 'boolean',
        required: false
    },
    'Attic Access': {
        type: 'select',
        required: false,
        options: ['Easy Access', 'Difficult Access', 'No Access']
    },
    'Attic Area': {
        type: 'number',
        required: false,
        min: 0,
        max: 10000
    },

    // Customer Information
    'First Name': {
        type: 'string',
        required: true,
        minLength: 2,
        maxLength: 50
    },
    'Last Name': {
        type: 'string',
        required: true,
        minLength: 2,
        maxLength: 50
    },
    'Email': {
        type: 'email',
        required: true,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    'Phone': {
        type: 'phone',
        required: true,
        pattern: /^\d{10}$/,
        transform: (v) => String(v).replace(/\D/g, '')
    },

    // Trade Ally
    'Contractor Name': {
        type: 'string',
        required: true
    },
    'Contractor License': {
        type: 'string',
        required: true,
        pattern: /^\d{6,10}$/
    }
};

/**
 * Validation result class
 */
class ValidationResult {
    constructor() {
        this.valid = true;
        this.errors = [];
        this.warnings = [];
        this.fields = {};
        this.missingRequired = [];
    }

    addError(field, message) {
        this.valid = false;
        this.errors.push({ field, message });
    }

    addWarning(field, message) {
        this.warnings.push({ field, message });
    }

    addMissingRequired(field) {
        this.valid = false;
        this.missingRequired.push(field);
    }

    setField(field, value, status = 'ok') {
        this.fields[field] = { value, status };
    }

    print() {
        console.log('\n' + '='.repeat(60));

        if (this.valid) {
            console.log('✅ VALIDATION PASSED\n');
        } else {
            console.log('❌ VALIDATION FAILED\n');
        }

        // Show field status
        console.log('📋 Field Status:');
        console.log('─'.repeat(60));

        for (const [name, { value, status }] of Object.entries(this.fields)) {
            const icon = status === 'ok' ? '✅' : status === 'warning' ? '⚠️' : '❌';
            const displayValue = value === undefined || value === null ? '(missing)' : `"${value}"`;
            console.log(`  ${icon} ${name.padEnd(30)} ${displayValue}`);
        }

        // Show missing required
        if (this.missingRequired.length > 0) {
            console.log('\n❌ Missing Required Fields:');
            for (const field of this.missingRequired) {
                console.log(`  • ${field}`);
            }
        }

        // Show errors
        if (this.errors.length > 0) {
            console.log('\n❌ Errors:');
            for (const { field, message } of this.errors) {
                console.log(`  • ${field}: ${message}`);
            }
        }

        // Show warnings
        if (this.warnings.length > 0) {
            console.log('\n⚠️  Warnings:');
            for (const { field, message } of this.warnings) {
                console.log(`  • ${field}: ${message}`);
            }
        }

        // Summary
        console.log('\n' + '─'.repeat(60));
        const okCount = Object.values(this.fields).filter(f => f.status === 'ok').length;
        const warningCount = Object.values(this.fields).filter(f => f.status === 'warning').length;
        const errorCount = Object.values(this.fields).filter(f => f.status === 'error').length;

        console.log(`📊 Summary: ${okCount} ok, ${warningCount} warnings, ${errorCount} errors, ${this.missingRequired.length} missing`);
        console.log('='.repeat(60) + '\n');
    }
}

/**
 * Validate a single field value
 */
function validateField(name, value, definition) {
    const result = { valid: true, errors: [], warnings: [] };

    // Check required
    if (definition.required && (value === undefined || value === null || value === '')) {
        result.valid = false;
        result.errors.push('Required field is missing');
        return result;
    }

    // Skip validation if not required and empty
    if (!definition.required && (value === undefined || value === null || value === '')) {
        return result;
    }

    // Apply transform
    if (definition.transform) {
        try {
            value = definition.transform(value);
        } catch (e) {
            result.valid = false;
            result.errors.push('Invalid format - cannot parse value');
            return result;
        }
    }

    // Type validation
    switch (definition.type) {
        case 'number':
            if (isNaN(value)) {
                result.valid = false;
                result.errors.push('Must be a number');
            } else {
                // Range validation
                if (definition.min !== undefined && value < definition.min) {
                    result.valid = false;
                    result.errors.push(`Must be at least ${definition.min}`);
                }
                if (definition.max !== undefined && value > definition.max) {
                    result.valid = false;
                    result.errors.push(`Must be at most ${definition.max}`);
                }
            }
            break;

        case 'string':
            if (typeof value !== 'string') {
                result.valid = false;
                result.errors.push('Must be a string');
            } else {
                if (definition.minLength && value.length < definition.minLength) {
                    result.valid = false;
                    result.errors.push(`Must be at least ${definition.minLength} characters`);
                }
                if (definition.maxLength && value.length > definition.maxLength) {
                    result.valid = false;
                    result.errors.push(`Must be at most ${definition.maxLength} characters`);
                }
            }
            break;

        case 'email':
            if (!definition.pattern.test(value)) {
                result.valid = false;
                result.errors.push('Invalid email format');
            }
            break;

        case 'phone':
            if (!definition.pattern.test(value)) {
                result.valid = false;
                result.errors.push('Invalid phone number (need 10 digits)');
            }
            break;

        case 'select':
            if (definition.options && !definition.options.includes(value)) {
                result.valid = false;
                result.errors.push(`Must be one of: ${definition.options.join(', ')}`);
            }
            break;

        case 'boolean':
            if (typeof value !== 'boolean' && value !== 'true' && value !== 'false' && value !== 1 && value !== 0) {
                result.warnings.push('Value should be boolean (true/false)');
            }
            break;
    }

    // Pattern validation
    if (definition.pattern && value && !definition.pattern.test(String(value))) {
        result.valid = false;
        result.errors.push('Format does not match required pattern');
    }

    return result;
}

/**
 * Validate an entire case
 */
function validateCase(caseData, verbose = false) {
    const result = new ValidationResult();

    // Validate each field
    for (const [fieldName, definition] of Object.entries(FIELD_DEFINITIONS)) {
        const value = caseData[fieldName];

        // Check if required field is present
        if (definition.required && !(fieldName in caseData)) {
            result.addMissingRequired(fieldName);
            continue;
        }

        // Validate the value
        const validation = validateField(fieldName, value, definition);

        result.setField(fieldName, value, validation.valid ? 'ok' : 'error');

        for (const error of validation.errors) {
            result.addError(fieldName, error);
        }
        for (const warning of validation.warnings) {
            result.addWarning(fieldName, warning);
        }
    }

    // Warn about unknown fields
    const knownFields = new Set(Object.keys(FIELD_DEFINITIONS));
    for (const field of Object.keys(caseData)) {
        if (!knownFields.has(field) && field !== 'address' && field !== 'applicationId' && field !== 'scrapedAt') {
            result.addWarning(field, 'Unknown field - will be ignored');
        }
    }

    // Check for address consistency
    if (caseData.address && caseData['Site Address']) {
        // Simple check - both should contain similar info
        const addr1 = caseData.address.toLowerCase();
        const addr2 = caseData['Site Address'].toLowerCase();
        if (!addr1.includes(addr2.split(' ')[0]) && !addr2.includes(addr1.split(' ')[0])) {
            result.addWarning('Site Address', 'May not match scraped Zillow address');
        }
    }

    return result;
}

/**
 * Generate a summary report
 */
function generateSummary(caseData, result) {
    const lines = [];

    lines.push('# Validation Report');
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');

    // Case info
    lines.push('## Case Information');
    lines.push(`- Address: ${caseData.address || 'N/A'}`);
    lines.push(`- Application ID: ${caseData.applicationId || 'N/A'}`);
    lines.push(`- Scraped: ${caseData.scrapedAt || 'N/A'}`);
    lines.push('');

    // Result
    lines.push(`## Result: ${result.valid ? '✅ PASSED' : '❌ FAILED'}`);
    lines.push('');

    // Fields
    lines.push('## Fields');
    for (const [name, { value, status }] of Object.entries(result.fields)) {
        const icon = status === 'ok' ? '✅' : '❌';
        lines.push(`### ${icon} ${name}`);
        lines.push(`**Value:** ${value === undefined ? '(not set)' : value}`);
        lines.push('');
    }

    // Issues
    if (result.errors.length > 0) {
        lines.push('## Errors');
        for (const { field, message } of result.errors) {
            lines.push(`- **${field}**: ${message}`);
        }
        lines.push('');
    }

    if (result.warnings.length > 0) {
        lines.push('## Warnings');
        for (const { field, message } of result.warnings) {
            lines.push(`- **${field}**: ${message}`);
        }
        lines.push('');
    }

    if (result.missingRequired.length > 0) {
        lines.push('## Missing Required Fields');
        for (const field of result.missingRequired) {
            lines.push(`- ${field}`);
        }
    }

    return lines.join('\n');
}

/**
 * Main function
 */
async function main() {
    const args = process.argv.slice(2);
    const verbose = args.includes('--verbose');

    // Get case file path
    const caseFile = args.find(arg => !arg.startsWith('--'));

    if (!caseFile) {
        console.log('Usage: node tools/validate.js <case-file> [--verbose]');
        console.log('');
        console.log('Examples:');
        console.log('  node tools/validate.js example-case.json');
        console.log('  node tools/validate.js my-cases/batch1.json --verbose');
        process.exit(1);
    }

    // Check file exists
    if (!existsSync(caseFile)) {
        console.error(`❌ File not found: ${caseFile}`);
        process.exit(1);
    }

    // Load case data
    let caseData;
    try {
        const content = await readFile(caseFile, 'utf-8');
        caseData = JSON.parse(content);
    } catch (error) {
        console.error(`❌ Error reading file: ${error.message}`);
        process.exit(1);
    }

    console.log('🔍 SCE Case Validator (Dry-Run Mode)');
    console.log('='.repeat(60));
    console.log(`📁 File: ${caseFile}`);
    console.log('');

    // Validate
    const result = validateCase(caseData, verbose);
    result.print();

    // Generate report
    const report = generateSummary(caseData, result);
    const reportPath = join('./output/validation', `report-${Date.now()}.md`);

    await import('fs/promises').then(fs => fs.mkdir('./output/validation', { recursive: true }));
    await import('fs/promises').then(fs => fs.writeFile(reportPath, report));

    console.log(`📄 Report saved: ${reportPath}`);

    process.exit(result.valid ? 0 : 1);
}

main().catch(console.error);
