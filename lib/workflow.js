/**
 * lib/workflow.js
 * SCE Rebate Center workflow definition
 *
 * Based on HAR recording analysis, the SCE form has:
 * 1. Conditional field visibility
 * 2. Multi-step workflow with dependencies
 * 3. File upload requirements
 * 4. Measure/product selection trees
 */

/**
 * Complete workflow definition
 */
export const WORKFLOW = {
    // Application creation
    create: {
        description: 'Create new application',
        fields: [
            { name: 'Program', type: 'select', required: true },
            { name: 'Application Type', type: 'select', required: true }
        ],
        next: 'projectInfo'
    },

    // Section 2: Project Information
    projectInfo: {
        description: 'Project Information',
        selector: 'li:nth-of-type(2) > div.sections-menu-item__title',
        fields: [
            { name: 'Site Address', type: 'text', required: true, source: 'zillow' },
            { name: 'Total Sq.Ft.', type: 'number', required: true, source: 'zillow', key: 'sqFt' },
            { name: 'Year Built', type: 'number', required: true, source: 'zillow', key: 'yearBuilt' },
            { name: 'Lot Size', type: 'number', required: false, source: 'zillow' },
            { name: 'Number of Bedrooms', type: 'number', required: true, source: 'zillow', key: 'bedrooms' },
            { name: 'Number of Bathrooms', type: 'number', required: true, source: 'zillow', key: 'bathrooms' }
        ],
        unlocks: ['assessmentQuestionnaire'],
        saveAfter: true
    },

    // Section 3: Assessment Questionnaire
    assessmentQuestionnaire: {
        description: 'Assessment Questionnaire',
        selector: 'li:nth-of-type(3) > div.sections-menu-item__title',
        fields: [
            { name: 'Household Members', type: 'list', required: true },
            { name: 'Primary Heat Source', type: 'select', required: true },
            { name: 'Primary Cool Source', type: 'select', required: true },
            { name: 'Water Heater Type', type: 'select', required: true },
            { name: 'Has Attic', type: 'boolean', required: true },
            { name: 'Attic Access', type: 'select', required: true, dependsOn: 'Has Attic', condition: true },
            { name: 'Attic Area', type: 'number', required: false, dependsOn: 'Has Attic', condition: true },
            { name: 'Has Crawlspace', type: 'boolean', required: true },
            { name: 'Crawlspace Access', type: 'select', required: true, dependsOn: 'Has Crawlspace', condition: true },
            { name: 'Foundation Type', type: 'select', required: true }
        ],
        uploads: [
            { name: 'Site Photos', type: 'photo', required: true, count: '3-5' },
            { name: 'Equipment Photos', type: 'photo', required: true }
        ],
        unlocks: ['measures'],
        saveAfter: true
    },

    // Section 4: Appointments
    appointments: {
        description: 'Appointments',
        selector: 'li:nth-of-type(4) > div.sections-menu-item__title',
        fields: [
            { name: 'Appointment Date', type: 'date', required: true },
            { name: 'Appointment Time', type: 'time', required: true },
            { name: 'Appointment Type', type: 'select', required: true }
        ],
        saveAfter: true
    },

    // Section 5: Trade Ally Information
    tradeAlly: {
        description: 'Trade Ally Information',
        selector: 'li:nth-of-type(5) > div.sections-menu-item__title',
        fields: [
            { name: 'Contractor Name', type: 'text', required: true },
            { name: 'Contractor License', type: 'text', required: true, pattern: /^[\dA-Z-]+$/ },
            { name: 'Contractor Phone', type: 'phone', required: true },
            { name: 'Contractor Email', type: 'email', required: true }
        ],
        saveAfter: true
    },

    // Section 6: Additional Customer Information
    customerInfo: {
        description: 'Additional Customer Information',
        selector: 'li:nth-of-type(6) > div.sections-menu-item__title',
        fields: [
            { name: 'First Name', type: 'text', required: true },
            { name: 'Last Name', type: 'text', required: true },
            { name: 'Email', type: 'email', required: true },
            { name: 'Phone', type: 'phone', required: true },
            { name: 'Alternate Phone', type: 'phone', required: false }
        ],
        saveAfter: true
    },

    // Section 7: Measures Selection (dynamic based on questionnaire)
    measures: {
        description: 'Measures',
        selector: 'li:nth-of-type(7) > div.sections-menu-item__title',
        dynamic: true,
        fields: [
            // Measure categories are dynamic based on eligibility
            { name: 'Primary Measure', type: 'measure-select', required: true },
            { name: 'Measure Quantity', type: 'number', required: true },
            { name: 'Measure Spaces', type: 'room-select', required: true, multiple: true }
        ],
        products: [
            // Products appear after measure selection
            { name: 'Product', type: 'product-select', required: true },
            { name: 'Product Quantity', type: 'number', required: true }
        ],
        saveAfter: true
    },

    // Section 8+: Additional sections that may appear dynamically
    basicEnrollment: {
        description: 'Basic Enrollment',
        selector: 'li:nth-of-type(8) > div.sections-menu-item__title',
        conditional: true,
        fields: []
    }
};

/**
 * Workflow state machine
 */
export class WorkflowRunner {
    constructor(page, data) {
        this.page = page;
        this.data = data;
        this.completed = new Set();
        this.current = null;
    }

    /**
     * Navigate to a specific section
     */
    async goToSection(sectionKey) {
        const section = WORKFLOW[sectionKey];
        if (!section) {
            throw new Error(`Unknown section: ${sectionKey}`);
        }

        console.log(`\n📂 Navigating to: ${section.description}`);

        // Click section menu item
        if (section.selector) {
            try {
                await this.page.locator(section.selector).click();
                await this.page.waitForTimeout(1500);
                this.current = sectionKey;
            } catch (e) {
                console.log(`  ⚠️  Could not click section: ${section.description}`);
            }
        }
    }

    /**
     * Fill all fields in current section
     */
    async fillSection(sectionKey) {
        const section = WORKFLOW[sectionKey];
        if (!section || !section.fields) {
            return;
        }

        console.log(`  ✏️  Filling fields...`);

        for (const field of section.fields) {
            await this.fillField(field);
        }

        this.completed.add(sectionKey);

        // Save after section if configured
        if (section.saveAfter) {
            await this.saveSection();
        }
    }

    /**
     * Fill a single field
     */
    async fillField(field) {
        const { name, type, required, key = name } = field;

        // Get value from data
        const value = this.data[key];

        if (value === undefined || value === null) {
            if (required) {
                console.log(`  ⚠️  Missing required field: ${name}`);
            }
            return;
        }

        // Check dependencies
        if (field.dependsOn) {
            const depValue = this.data[field.dependsOn];
            if (depValue !== field.condition) {
                console.log(`  ⊘ Skipped ${name} (dependency not met)`);
                return;
            }
        }

        // Find and fill the field
        try {
            const selector = await this.findFieldSelector(name, type);
            if (!selector) {
                console.log(`  ⚠️  Could not find field: ${name}`);
                return;
            }

            const element = this.page.locator(selector).first();
            await element.click();
            await element.fill(String(value));
            console.log(`  ✓ ${name}: ${value}`);
        } catch (e) {
            console.log(`  ⚠️  Could not fill ${name}: ${e.message}`);
        }
    }

    /**
     * Find selector for a field by name/type
     */
    async findFieldSelector(name, type) {
        // Try multiple selector patterns
        const patterns = [
            `[aria-label*="${name}" i]`,
            `[placeholder*="${name}" i]`,
            `[name*="${name}" i]`,
            `mat-label:has-text("${name}") ~ input`,
            `mat-label:has-text("${name}") ~ mat-select`,
            `mat-form-field:has(mat-label:text-is("${name}")) input`,
            `mat-form-field:has(mat-label:text-is("${name}")) mat-select`
        ];

        for (const pattern of patterns) {
            try {
                const count = await this.page.locator(pattern).count();
                if (count > 0) {
                    return pattern;
                }
            } catch {}
        }

        return null;
    }

    /**
     * Upload files to a section
     */
    async uploadFiles(sectionKey, files) {
        const section = WORKFLOW[sectionKey];
        if (!section || !section.uploads) {
            return;
        }

        console.log(`  📤 Uploading files...`);

        for (const uploadSpec of section.uploads) {
            const { name, type, required } = uploadSpec;

            // Find file uploader
            const uploaderSelector = 'app-file-uploader input[type="file"]';
            const uploaders = await this.page.locator(uploaderSelector).all();

            if (uploaders.length === 0) {
                console.log(`  ⚠️  No file uploaders found for ${name}`);
                continue;
            }

            // Get files for this upload spec
            const filesToUpload = files.filter(f => f.type === type || f.uploadTo === name);

            if (required && filesToUpload.length === 0) {
                console.log(`  ⚠️  Required upload missing: ${name}`);
                continue;
            }

            // Upload each file
            for (const file of filesToUpload) {
                try {
                    await uploaders[0].setInputFiles(file.path);
                    console.log(`  ✓ Uploaded: ${file.name}`);
                } catch (e) {
                    console.log(`  ⚠️  Could not upload ${file.name}: ${e.message}`);
                }
            }
        }
    }

    /**
     * Save current section
     */
    async saveSection() {
        try {
            const saveBtn = this.page.locator('button mat-icon:has-text("backup")').first();
            await saveBtn.click();
            await this.page.waitForTimeout(1000);
            console.log(`  💾 Section saved`);
        } catch (e) {
            console.log(`  ⚠️  Could not save section`);
        }
    }

    /**
     * Run complete workflow
     */
    async run() {
        const sections = Object.keys(WORKFLOW);

        for (const sectionKey of sections) {
            const section = WORKFLOW[sectionKey];

            // Skip conditional sections if not applicable
            if (section.conditional) {
                continue;
            }

            // Skip if prerequisites not met
            if (section.unlocks) {
                const hasPrereqs = section.unlocks.every(s => this.completed.has(s));
                if (!hasPrereqs) {
                    continue;
                }
            }

            await this.goToSection(sectionKey);
            await this.fillSection(sectionKey);
        }

        console.log('\n✅ Workflow complete!');
    }
}

/**
 * Execute workflow with data
 */
export async function executeWorkflow(page, data, options = {}) {
    const { dryRun = false, stopAtSection = null } = options;

    const runner = new WorkflowRunner(page, data);

    if (dryRun) {
        console.log('🧪 Dry run mode - would execute:');
        console.log(JSON.stringify(WORKFLOW, null, 2));
        return;
    }

    await runner.run();

    return runner;
}

export default WORKFLOW;
