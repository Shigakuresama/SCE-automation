/**
 * Capture SCE Form as Static HTML
 * This script uses Playwright to navigate to SCE and save the form as static HTML
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function captureSCEForm() {
  console.log('🚀 Starting SCE form capture...');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  // Listen for console messages
  page.on('console', msg => console.log('  Browser:', msg.text()));

  try {
    // TODO: You'll need to log in to SCE first or provide a direct URL
    // For now, let's create a template based on the known form structure

    console.log('⚠️ Note: For full SCE form capture, you need to:');
    console.log('   1. Be logged into SCE in the browser');
    console.log('   2. Navigate to the actual form page');
    console.log('   3. Provide the URL here');

    console.log('\n📋 Creating static form template based on SCE structure...');

    // Create a comprehensive static form based on SCE's actual structure
    const staticForm = createStaticSCEForm();

    const outputPath = path.join(__dirname, '../Downloads/sce.dsmcentral.com/sce-form-static.html');
    fs.writeFileSync(outputPath, staticForm, 'utf8');

    console.log(`✅ Static form saved to: ${outputPath}`);
    console.log(`\n🌐 Open in Chrome: http://localhost:8080/sce-form-static.html`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

function createStaticSCEForm() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SCE Form - Static Replica</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700">
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Roboto', sans-serif;
      margin: 0;
      padding: 20px;
      background: #f5f5f5;
    }
    .app-container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .app-header {
      background: linear-gradient(135deg, #1e88e5 0%, #1565c0 100%);
      color: white;
      padding: 20px;
      border-radius: 8px 8px 0 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .app-header h1 { margin: 0; font-size: 24px; }
    .app-header .badge {
      background: rgba(255,255,255,0.2);
      padding: 5px 12px;
      border-radius: 20px;
      font-size: 12px;
    }
    .stepper {
      display: flex;
      justify-content: space-between;
      padding: 20px 40px;
      border-bottom: 1px solid #e0e0e0;
    }
    .step {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #9e9e9e;
      font-size: 14px;
    }
    .step.active { color: #1976d2; font-weight: 500; }
    .step.completed { color: #4caf50; }
    .step-number {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid currentColor;
    }
    .step.active .step-number { background: #1976d2; color: white; }
    .step.completed .step-number { background: #4caf50; color: white; }
    .form-content { padding: 30px; }
    .form-section {
      margin-bottom: 30px;
      padding: 20px;
      background: #fafafa;
      border-radius: 8px;
      border-left: 4px solid #1976d2;
    }
    .form-section h3 {
      margin: 0 0 20px 0;
      color: #1976d2;
      font-size: 18px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .form-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 15px;
    }
    mat-form-field {
      display: block;
      position: relative;
    }
    mat-label {
      display: block;
      font-size: 13px;
      font-weight: 500;
      color: #666;
      margin-bottom: 6px;
    }
    .mat-input-wrapper {
      position: relative;
    }
    input[type="text"], input[type="email"], input[type="tel"] {
      width: 100%;
      padding: 12px 14px;
      border: 1px solid #c0c0c0;
      border-radius: 4px;
      font-size: 15px;
      font-family: inherit;
      background: white;
      transition: border-color 0.2s;
    }
    input:focus {
      outline: none;
      border-color: #1976d2;
      box-shadow: 0 0 0 2px rgba(25,118,210,0.1);
    }
    mat-select {
      display: block;
      width: 100%;
      padding: 12px 14px;
      border: 1px solid #c0c0c0;
      border-radius: 4px;
      font-size: 15px;
      background: white;
      cursor: pointer;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 12px center;
    }
    .required mat-label::after {
      content: ' *';
      color: #f44336;
    }
    .form-actions {
      display: flex;
      justify-content: space-between;
      padding: 20px 30px;
      border-top: 1px solid #e0e0e0;
      background: #fafafa;
    }
    button {
      padding: 12px 24px;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }
    .btn-primary {
      background: #1976d2;
      color: white;
    }
    .btn-primary:hover { background: #1565c0; }
    .btn-secondary {
      background: transparent;
      color: #666;
      border: 1px solid #c0c0c0;
    }
    .btn-secondary:hover { background: #f5f5f5; }
    .info-banner {
      background: #e3f2fd;
      border-left: 4px solid #2196f3;
      padding: 15px 20px;
      margin-bottom: 20px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .info-banner mat-icon { color: #2196f3; }
    .save-indicator {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #4caf50;
      color: white;
      padding: 12px 20px;
      border-radius: 4px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      display: flex;
      align-items: center;
      gap: 8px;
      opacity: 0;
      transition: opacity 0.3s;
    }
    .save-indicator.show { opacity: 1; }
  </style>
</head>
<body>
  <div class="app-container">
    <div class="app-header">
      <h1>⚡ SCE Rebate Center</h1>
      <span class="badge">STATIC REPLICA - TESTING ONLY</span>
    </div>

    <div class="stepper">
      <div class="step completed">
        <div class="step-number">✓</div>
        <span>Customer Search</span>
      </div>
      <div class="step active">
        <div class="step-number">2</div>
        <span>Customer Info</span>
      </div>
      <div class="step">
        <div class="step-number">3</div>
        <span>Additional Info</span>
      </div>
      <div class="step">
        <div class="step-number">4</div>
        <span>Enrollment</span>
      </div>
      <div class="step">
        <div class="step-number">5</div>
        <span>Project Info</span>
      </div>
    </div>

    <div class="form-content">
      <div class="info-banner">
        <mat-icon>info</mat-icon>
        <span>This is a static replica for testing the Chrome extension. All form fields mimic the real SCE form structure.</span>
      </div>

      <!-- Customer Information Section -->
      <div class="form-section">
        <h3><mat-icon>person</mat-icon> Customer Information</h3>

        <div class="form-row">
          <mat-form-field class="required">
            <mat-label>Customer Name</mat-label>
            <div class="mat-input-wrapper">
              <input type="text" id="customerName" placeholder="Enter customer name">
            </div>
          </mat-form-field>

          <mat-form-field>
            <mat-label>Account Number</mat-label>
            <div class="mat-input-wrapper">
              <input type="text" placeholder="Auto-filled from search">
            </div>
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field>
            <mat-label>Service Address</mat-label>
            <div class="mat-input-wrapper">
              <input type="text" placeholder="22216 Seine, Hawaiian Gardens, CA 90716">
            </div>
          </mat-form-field>

          <mat-form-field>
            <mat-label>Site Zip Code</mat-label>
            <div class="mat-input-wrapper">
              <input type="text" value="90716">
            </div>
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field>
            <mat-label>Alternate Phone</mat-label>
            <div class="mat-input-wrapper">
              <input type="tel" id="altPhone" placeholder="Phone from utility account">
            </div>
          </mat-form-field>

          <mat-form-field class="required">
            <mat-label>Contact Phone</mat-label>
            <div class="mat-input-wrapper">
              <input type="tel" id="contactPhone" placeholder="Will copy from Alternate Phone">
            </div>
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field class="required">
            <mat-label>Contact Email</mat-label>
            <div class="mat-input-wrapper">
              <input type="email" id="contactEmail" placeholder="Auto-generated from name">
            </div>
          </mat-form-field>

          <mat-form-field>
            <mat-label>Preferred Contact Method</mat-label>
            <mat-select>
              <option value="">Select...</option>
              <option value="email">Email</option>
              <option value="phone">Phone</option>
            </mat-select>
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field class="required">
            <mat-label>Contact First Name</mat-label>
            <div class="mat-input-wrapper">
              <input type="text" id="contactFirstName" placeholder="From Customer Name">
            </div>
          </mat-form-field>

          <mat-form-field class="required">
            <mat-label>Contact Last Name</mat-label>
            <div class="mat-input-wrapper">
              <input type="text" id="contactLastName" placeholder="From Customer Name">
            </div>
          </mat-form-field>
        </div>
      </div>

      <!-- Additional Customer Information Section -->
      <div class="form-section">
        <h3><mat-icon>description</mat-icon> Additional Customer Information</h3>

        <div class="form-row">
          <mat-form-field class="required">
            <mat-label>How did you hear about the program?</mat-label>
            <mat-select id="howDidYouHear">
              <option value="">Select...</option>
              <option value="Contractor Outreach">Contractor Outreach</option>
              <option value="Utility Bill">Utility Bill</option>
              <option value="Referral">Referral</option>
              <option value="Online">Online</option>
              <option value="Other">Other</option>
            </mat-select>
          </mat-form-field>

          <mat-form-field>
            <mat-label>Preferred Contact Time</mat-label>
            <div class="mat-input-wrapper">
              <input type="text" id="preferredContactTime" placeholder="e.g., 1:00PM - 3:30PM">
            </div>
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field class="required">
            <mat-label>Preferred Correspondence Language</mat-label>
            <mat-select id="language">
              <option value="Spanish">Spanish</option>
              <option value="English">English</option>
            </mat-select>
          </mat-form-field>

          <mat-form-field>
            <mat-label>Household Spoken Language</mat-label>
            <mat-select>
              <option value="Spanish">Spanish</option>
              <option value="English">English</option>
            </mat-select>
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field>
            <mat-label>Household Units</mat-label>
            <mat-select id="householdUnits">
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
            </mat-select>
          </mat-form-field>

          <mat-form-field class="required">
            <mat-label>Master Metered</mat-label>
            <mat-select id="masterMetered">
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </mat-select>
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field class="required">
            <mat-label>Building Type</mat-label>
            <mat-select id="buildingType">
              <option value="Residential">Residential</option>
              <option value="Residential mobile home">Residential mobile home</option>
              <option value="Single Family Detached">Single Family Detached</option>
              <option value="Single Family Attached">Single Family Attached</option>
              <option value="Multi-Family">Multi-Family</option>
              <option value="Condo">Condo</option>
              <option value="Townhouse">Townhouse</option>
            </mat-select>
          </mat-form-field>

          <mat-form-field class="required">
            <mat-label>Homeowner or Renter/Tenant</mat-label>
            <mat-select id="homeownerOrRenter">
              <option value="Renter/Tenant">Renter/Tenant</option>
              <option value="Homeowner">Homeowner</option>
            </mat-select>
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field class="required">
            <mat-label>Space Or Unit</mat-label>
            <div class="mat-input-wrapper">
              <input type="text" id="spaceOrUnit" placeholder="Unit number">
            </div>
          </mat-form-field>

          <mat-form-field>
            <mat-label>Gas Provider</mat-label>
            <mat-select id="gasProvider">
              <option value="SoCalGas">SoCalGas</option>
              <option value="Other">Other</option>
            </mat-select>
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field>
            <mat-label>Gas Account Number</mat-label>
            <div class="mat-input-wrapper">
              <input type="text" id="gasAccountNumber" placeholder="Gas utility account">
            </div>
          </mat-form-field>

          <mat-form-field>
            <mat-label>Water Utility</mat-label>
            <mat-select id="waterUtility">
              <option value="N/A">N/A</option>
              <option value="Other">Other</option>
            </mat-select>
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field>
            <mat-label>Homeowner First Name</mat-label>
            <div class="mat-input-wrapper">
              <input type="text" id="homeownerFirstName" placeholder="From Customer Name">
            </div>
          </mat-form-field>

          <mat-form-field>
            <mat-label>Homeowner Last Name</mat-label>
            <div class="mat-input-wrapper">
              <input type="text" id="homeownerLastName" placeholder="From Customer Name">
            </div>
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field>
            <mat-label>Income Verified Date</mat-label>
            <div class="mat-input-wrapper">
              <input type="text" id="incomeVerifiedDate" placeholder="MM/DD/YYYY">
            </div>
          </mat-form-field>
        </div>
      </div>

      <!-- Project Information Section -->
      <div class="form-section">
        <h3><mat-icon>home</mat-icon> Project Information</h3>

        <div class="form-row">
          <mat-form-field class="required">
            <mat-label>Space Or Unit</mat-label>
            <div class="mat-input-wrapper">
              <input type="text" id="projectSpaceOrUnit" placeholder="Unit number">
            </div>
          </mat-form-field>

          <mat-form-field>
            <mat-label></mat-label>
            <div class="mat-input-wrapper"></div>
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field class="required">
            <mat-label>Total Sq.Ft.</mat-label>
            <div class="mat-input-wrapper">
              <input type="text" id="totalSqFt" placeholder="From Zillow or manual">
              <small style="color: #666; font-size: 11px;">Auto-fetched from proxy server</small>
            </div>
          </mat-form-field>

          <mat-form-field class="required">
            <mat-label>Year Built</mat-label>
            <div class="mat-input-wrapper">
              <input type="text" id="yearBuilt" placeholder="From Zillow or manual">
              <small style="color: #666; font-size: 11px;">Auto-fetched from proxy server</small>
            </div>
          </mat-form-field>
        </div>
      </div>

      <!-- Assessment Questionnaire Section -->
      <div class="form-section">
        <h3><mat-icon>quiz</mat-icon> Assessment Questionnaire</h3>

        <div class="form-row">
          <mat-form-field class="required">
            <mat-label>Primary Applicant Age</mat-label>
            <div class="mat-input-wrapper">
              <input type="text" id="primaryApplicantAge" placeholder="Age">
            </div>
          </mat-form-field>

          <mat-form-field class="required">
            <mat-label>Ethnicity</mat-label>
            <div class="mat-input-wrapper">
              <input type="text" id="ethnicity" placeholder="e.g., Hispanic/Latino">
            </div>
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field>
            <mat-label>Permanently Disabled</mat-label>
            <mat-select id="permanentlyDisabled">
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </mat-select>
          </mat-form-field>

          <mat-form-field>
            <mat-label>Veteran</mat-label>
            <mat-select id="veteran">
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </mat-select>
          </mat-form-field>

          <mat-form-field>
            <mat-label>Native American</mat-label>
            <mat-select id="nativeAmerican">
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </mat-select>
          </mat-form-field>
        </div>
      </div>

      <!-- Trade Ally Information Section -->
      <div class="form-section">
        <h3><mat-icon>business</mat-icon> Trade Ally Information</h3>

        <div class="form-row">
          <mat-form-field class="required">
            <mat-label>Project Contact First Name</mat-label>
            <div class="mat-input-wrapper">
              <input type="text" id="projectContactFirstName" placeholder="Contractor first name">
            </div>
          </mat-form-field>

          <mat-form-field class="required">
            <mat-label>Project Contact Last Name</mat-label>
            <div class="mat-input-wrapper">
              <input type="text" id="projectContactLastName" placeholder="Contractor last name">
            </div>
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field class="required">
            <mat-label>Project Contact Title</mat-label>
            <div class="mat-input-wrapper">
              <input type="text" id="projectContactTitle" placeholder="e.g., Outreach">
            </div>
          </mat-form-field>

          <mat-form-field class="required">
            <mat-label>Project Contact Phone</mat-label>
            <div class="mat-input-wrapper">
              <input type="tel" id="projectContactPhone" placeholder="Contractor phone">
            </div>
          </mat-form-field>
        </div>
      </div>

      <!-- Appointment Contact Section -->
      <div class="form-section">
        <h3><mat-icon>event</mat-icon> Appointment Contact</h3>

        <div class="form-row">
          <mat-form-field class="required">
            <mat-label>Attempt 1 Date</mat-label>
            <div class="mat-input-wrapper">
              <input type="text" id="attempt1Date" placeholder="MM/DD/YYYY">
            </div>
          </mat-form-field>

          <mat-form-field class="required">
            <mat-label>Attempt 1 Time</mat-label>
            <mat-select id="attempt1Time">
              <option value="">Select...</option>
              <option value="8:00AM">8:00AM</option>
              <option value="9:00AM">9:00AM</option>
              <option value="10:00AM">10:00AM</option>
              <option value="11:00AM">11:00AM</option>
              <option value="12:00PM">12:00PM</option>
              <option value="1:00PM">1:00PM</option>
              <option value="2:00PM">2:00PM</option>
              <option value="3:00PM">3:00PM</option>
              <option value="4:00PM">4:00PM</option>
              <option value="5:00PM">5:00PM</option>
            </mat-select>
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field>
            <mat-label>Attempt 2 Date</mat-label>
            <div class="mat-input-wrapper">
              <input type="text" id="attempt2Date" placeholder="MM/DD/YYYY">
            </div>
          </mat-form-field>

          <mat-form-field>
            <mat-label>Attempt 2 Time</mat-label>
            <mat-select id="attempt2Time">
              <option value="">Select...</option>
              <option value="9:00AM">9:00AM</option>
              <option value="10:00AM">10:00AM</option>
              <option value="11:00AM">11:00AM</option>
              <option value="12:00PM">12:00PM</option>
              <option value="1:00PM">1:00PM</option>
              <option value="2:00PM">2:00PM</option>
              <option value="3:00PM">3:00PM</option>
              <option value="4:00PM">4:00PM</option>
              <option value="5:00PM">5:00PM</option>
            </mat-select>
          </mat-form-field>
        </div>
      </div>

    </div>

    <div class="form-actions">
      <button class="btn-secondary">
        <mat-icon>arrow_back</mat-icon> Back
      </button>
      <div style="display: flex; gap: 10px;">
        <button class="btn-secondary" onclick="saveDraft()">
          <mat-icon>save</mat-icon> Save Draft
        </button>
        <button class="btn-primary" onclick="nextPage()">
          Next <mat-icon>arrow_forward</mat-icon>
        </button>
      </div>
    </div>
  </div>

  <div id="saveIndicator" class="save-indicator">
    <mat-icon>check_circle</mat-icon> Draft Saved
  </div>

  <script>
    function saveDraft() {
      const indicator = document.getElementById('saveIndicator');
      indicator.classList.add('show');
      setTimeout(() => indicator.classList.remove('show'), 2000);
      console.log('[SCE Static Form] Draft saved');
    }

    function nextPage() {
      alert('This is a static replica. In the real SCE form, this would navigate to the next section.');
    }

    // Simulate Angular mat-select behavior for extension compatibility
    document.querySelectorAll('mat-select').forEach(select => {
      select.addEventListener('change', function() {
        this.style.borderColor = '#4caf50';
        setTimeout(() => this.style.borderColor = '#c0c0c0', 500);
      });
    });

    // Log for extension detection
    console.log('[SCE Static Form] Page loaded - Customer Information');
    console.log('[SCE Static Form] mat-label elements:', document.querySelectorAll('mat-label').length);
    console.log('[SCE Static Form] mat-form-field elements:', document.querySelectorAll('mat-form-field').length);
    console.log('[SCE Static Form] mat-select elements:', document.querySelectorAll('mat-select').length);
  </script>
</body>
</html>`;
}

// Run the capture
captureSCEForm();
