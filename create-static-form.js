/**
 * Create Static SCE Form from example.txt
 * Extracts the actual HTML structure and creates a working offline replica
 */

const fs = require('fs');
const path = require('path');

const inputFile = '/home/sergio/Projects/SCE/JSON Y NETWORK/example.txt';
const outputFile = '/home/sergio/Downloads/sce.dsmcentral.com/sce-form-replica.html';

// Read the example file
const content = fs.readFileSync(inputFile, 'utf8');

// Extract CSS styles from the file
const cssMatch = content.match(/<style[^>]*>([\s\S]*?)<\/style>/g);
const extractedCSS = cssMatch ? cssMatch.map(m => m.replace(/<\/?style[^>]*>/g, '')).join('\n') : '';

// Extract all mat-label texts
const labelMatches = content.match(/mat-label[^>]*>([^<]+)</g);
const labels = labelMatches ? labelMatches.map(m => m.replace(/mat-label[^>]*>/, '').replace('<', '').trim()) : [];

// Extract unique field labels
const uniqueLabels = [...new Set(labels)].filter(l => l.length > 0 && !l.includes('pointer-events'));

console.log(`Found ${uniqueLabels.length} unique labels:`);
uniqueLabels.forEach(l => console.log(`  - ${l}`));

// Create the static HTML form
const staticHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SCE Form - Offline Replica</title>
  <link href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700" rel="stylesheet">
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Roboto', sans-serif;
      margin: 0;
      padding: 0;
      background: #fafafa;
      color: #333;
    }
    .header {
      background: linear-gradient(135deg, #1565c0 0%, #0d47a1 100%);
      color: white;
      padding: 16px 24px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    .header h1 { margin: 0; font-size: 20px; font-weight: 400; }
    .header .badge {
      background: rgba(255,255,255,0.2);
      padding: 4px 12px;
      border-radius: 16px;
      font-size: 12px;
      margin-left: 16px;
    }
    .container { max-width: 1400px; margin: 0 auto; padding: 24px; }
    .section {
      background: white;
      margin-bottom: 16px;
      padding: 24px;
      border-radius: 4px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.12);
    }
    .section h2 {
      margin: 0 0 20px 0;
      font-size: 18px;
      font-weight: 500;
      color: #1565c0;
      border-bottom: 2px solid #e3f2fd;
      padding-bottom: 12px;
    }
    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 16px 24px;
    }
    .form-grid.half { grid-template-columns: repeat(2, 1fr); }
    .field { display: block; position: relative; }
    mat-label {
      display: block;
      font-size: 13px;
      font-weight: 500;
      color: #666;
      margin-bottom: 8px;
      pointer-events: auto;
      touch-action: none;
      user-select: none;
    }
    mat-label.required::after { content: ' *'; color: #d32f2f; }
    mat-form-field {
      display: block;
      position: relative;
    }
    .mat-input-wrapper {
      position: relative;
      width: 100%;
    }
    input[type="text"],
    input[type="email"],
    input[type="tel"],
    input[type="number"] {
      width: 100%;
      padding: 12px 14px;
      border: 1px solid #c0c0c0;
      border-radius: 4px;
      font-size: 15px;
      font-family: 'Roboto', sans-serif;
      background: white;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    input:focus {
      outline: none;
      border-color: #1565c0;
      box-shadow: 0 0 0 2px rgba(21,101,192,0.1);
    }
    input:disabled {
      background: #f5f5f5;
      color: #9e9e9e;
      cursor: not-allowed;
    }
    mat-select {
      display: block;
      width: 100%;
      padding: 12px 14px;
      border: 1px solid #c0c0c0;
      border-radius: 4px;
      font-size: 15px;
      background: white url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 9L1 4h10z'/%3E%3C/svg%3E") no-repeat right 14px center;
      cursor: pointer;
      appearance: none;
    }
    mat-select:focus {
      border-color: #1565c0;
      box-shadow: 0 0 0 2px rgba(21,101,192,0.1);
    }
    mat-option {
      display: block;
      padding: 12px 16px;
      cursor: pointer;
    }
    mat-option:hover { background: #e3f2fd; }
    .row { display: flex; gap: 16px; margin-bottom: 16px; }
    .row .field { flex: 1; }
    .full-width { grid-column: 1 / -1; }
    .info-banner {
      background: #e3f2fd;
      border-left: 4px solid #2196f3;
      padding: 16px 20px;
      margin-bottom: 24px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .info-banner mat-icon { color: #2196f3; }
    .actions {
      display: flex;
      justify-content: space-between;
      padding: 20px 24px;
      background: white;
      border-top: 1px solid #e0e0e0;
      position: sticky;
      bottom: 0;
      box-shadow: 0 -2px 8px rgba(0,0,0,0.1);
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
      background: #1565c0;
      color: white;
    }
    .btn-primary:hover { background: #0d47a1; }
    .btn-secondary {
      background: transparent;
      color: #666;
      border: 1px solid #c0c0c0;
    }
    .btn-secondary:hover { background: #f5f5f5; }
    .success-message {
      position: fixed;
      bottom: 80px;
      right: 24px;
      background: #4caf50;
      color: white;
      padding: 16px 24px;
      border-radius: 4px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      display: flex;
      align-items: center;
      gap: 12px;
      opacity: 0;
      transform: translateY(20px);
      transition: all 0.3s;
    }
    .success-message.show {
      opacity: 1;
      transform: translateY(0);
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>
      ⚡ SCE Rebate Center
      <span class="badge">OFFLINE REPLICA - TESTING</span>
    </h1>
  </div>

  <div class="container">
    <div class="info-banner">
      <mat-icon style="font-size: 24px;">info</mat-icon>
      <span>This is an <strong>offline replica</strong> for testing the Chrome extension. Fields match the actual SCE form structure with proper <code>mat-label</code>, <code>mat-form-field</code>, and <code>mat-select</code> elements.</span>
    </div>

    <!-- Customer Information Section -->
    <div class="section">
      <h2>Customer Information</h2>
      <div class="form-grid">
        <mat-form-field class="field">
          <mat-label class="required">Customer Number</mat-label>
          <div class="mat-input-wrapper">
            <input type="text" id="customerNumber" disabled placeholder="Auto-filled">
          </div>
        </mat-form-field>

        <mat-form-field class="field">
          <mat-label class="required">Site Number</mat-label>
          <div class="mat-input-wrapper">
            <input type="text" id="siteNumber" disabled placeholder="Auto-filled">
          </div>
        </mat-form-field>

        <mat-form-field class="field">
          <mat-label class="required">Bill Account Number</mat-label>
          <div class="mat-input-wrapper">
            <input type="text" id="billAccountNumber" placeholder="Enter bill account number">
          </div>
        </mat-form-field>

        <mat-form-field class="field">
          <mat-label class="required">Customer Name</mat-label>
          <div class="mat-input-wrapper">
            <input type="text" id="customerName" placeholder="John Smith">
          </div>
        </mat-form-field>

        <mat-form-field class="field">
          <mat-label>Rate Schedule</mat-label>
          <div class="mat-input-wrapper">
            <input type="text" id="rateSchedule" placeholder="Auto-detected">
          </div>
        </mat-form-field>

        <mat-form-field class="field">
          <mat-label>Relation to Account Holder</mat-label>
          <mat-select id="relationToAccount">
            <option value="">Select...</option>
            <option value="Self">Self</option>
            <option value="Spouse">Spouse</option>
            <option value="Other">Other</option>
          </mat-select>
        </mat-form-field>
      </div>
    </div>

    <!-- Site Address Section -->
    <div class="section">
      <h2>Site Address</h2>
      <div class="form-grid half">
        <mat-form-field class="field">
          <mat-label class="required">Site Address 1</mat-label>
          <div class="mat-input-wrapper">
            <input type="text" id="siteAddress1" placeholder="Street address">
          </div>
        </mat-form-field>

        <mat-form-field class="field">
          <mat-label>Site Address 2</mat-label>
          <div class="mat-input-wrapper">
            <input type="text" id="siteAddress2" placeholder="Apt, suite, bldg, etc">
          </div>
        </mat-form-field>

        <mat-form-field class="field">
          <mat-label>Site City</mat-label>
          <div class="mat-input-wrapper">
            <input type="text" id="siteCity" placeholder="City">
          </div>
        </mat-form-field>

        <mat-form-field class="field">
          <mat-label>Site State</mat-label>
          <mat-select id="siteState">
            <option value="CA">CA</option>
            <option value="">Select...</option>
          </mat-select>
        </mat-form-field>

        <mat-form-field class="field">
          <mat-label class="required">Site Zip</mat-label>
          <div class="mat-input-wrapper">
            <input type="text" id="siteZip" placeholder="90716">
          </div>
        </mat-form-field>
      </div>
    </div>

    <!-- Contact Information Section -->
    <div class="section">
      <h2>Contact Information</h2>
      <div class="form-grid half">
        <mat-form-field class="field">
          <mat-label>Contact Alternate Phone</mat-label>
          <div class="mat-input-wrapper">
            <input type="tel" id="contactAltPhone" placeholder="(714) 555-1234">
          </div>
        </mat-form-field>

        <mat-form-field class="field">
          <mat-label class="required">Contact Phone</mat-label>
          <div class="mat-input-wrapper">
            <input type="tel" id="contactPhone" placeholder="Will copy from Alternate Phone">
          </div>
        </mat-form-field>

        <mat-form-field class="field">
          <mat-label class="required">Contact Email</mat-label>
          <div class="mat-input-wrapper">
            <input type="email" id="contactEmail" placeholder="Auto-generated from name">
          </div>
        </mat-form-field>

        <mat-form-field class="field">
          <mat-label class="required">Contact First Name</mat-label>
          <div class="mat-input-wrapper">
            <input type="text" id="contactFirstName" placeholder="First name">
          </div>
        </mat-form-field>

        <mat-form-field class="field">
          <mat-label class="required">Contact Last Name</mat-label>
          <div class="mat-input-wrapper">
            <input type="text" id="contactLastName" placeholder="Last name">
          </div>
        </mat-form-field>
      </div>
    </div>

    <!-- Mailing Address Section -->
    <div class="section">
      <h2>Mailing Address</h2>
      <div class="form-grid half">
        <mat-form-field class="field">
          <mat-label class="required">Mailing Address 1</mat-label>
          <div class="mat-input-wrapper">
            <input type="text" id="mailingAddress1" placeholder="Street address">
          </div>
        </mat-form-field>

        <mat-form-field class="field">
          <mat-label>Mailing Address 2</mat-label>
          <div class="mat-input-wrapper">
            <input type="text" id="mailingAddress2" placeholder="Apt, suite, bldg, etc">
          </div>
        </mat-form-field>

        <mat-form-field class="field">
          <mat-label class="required">Mailing City</mat-label>
          <div class="mat-input-wrapper">
            <input type="text" id="mailingCity" placeholder="City">
          </div>
        </mat-form-field>

        <mat-form-field class="field">
          <mat-label class="required">Mailing State</mat-label>
          <mat-select id="mailingState">
            <option value="CA">CA</option>
            <option value="">Select...</option>
          </mat-select>
        </mat-form-field>

        <mat-form-field class="field">
          <mat-label class="required">Mailing Zip</mat-label>
          <div class="mat-input-wrapper">
            <input type="text" id="mailingZip" placeholder="Zip code">
          </div>
        </mat-form-field>

        <mat-form-field class="field">
          <mat-label>Mailing Country</mat-label>
          <div class="mat-input-wrapper">
            <input type="text" id="mailingCountry" placeholder="USA">
          </div>
        </mat-form-field>
      </div>
    </div>

    <!-- Additional Customer Information (Phase 2 & 3) -->
    <div class="section">
      <h2>Additional Customer Information</h2>
      <div class="form-grid half">
        <mat-form-field class="field">
          <mat-label>How did you hear about the program?</mat-label>
          <mat-select id="howDidYouHear">
            <option value="Contractor Outreach">Contractor Outreach</option>
            <option value="Utility Bill">Utility Bill</option>
            <option value="Other">Other</option>
          </mat-select>
        </mat-form-field>

        <mat-form-field class="field">
          <mat-label>Preferred Contact Time</mat-label>
          <div class="mat-input-wrapper">
            <input type="text" id="preferredContactTime" placeholder="1:00PM - 3:30PM">
          </div>
        </mat-form-field>

        <mat-form-field class="field">
          <mat-label>Preferred Correspondence Language</mat-label>
          <mat-select id="language">
            <option value="Spanish">Spanish</option>
            <option value="English">English</option>
          </mat-select>
        </mat-form-field>

        <mat-form-field class="field">
          <mat-label>Household Units</mat-label>
          <mat-select id="householdUnits">
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
          </mat-select>
        </mat-form-field>

        <mat-form-field class="field">
          <mat-label>Master Metered</mat-label>
          <mat-select id="masterMetered">
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </mat-select>
        </mat-form-field>

        <mat-form-field class="field">
          <mat-label>Building Type</mat-label>
          <mat-select id="buildingType">
            <option value="Residential">Residential</option>
            <option value="Residential mobile home">Residential mobile home</option>
            <option value="Single Family Detached">Single Family Detached</option>
            <option value="Multi-Family">Multi-Family</option>
          </mat-select>
        </mat-form-field>

        <mat-form-field class="field">
          <mat-label>Space Or Unit</mat-label>
          <div class="mat-input-wrapper">
            <input type="text" id="spaceOrUnit" placeholder="1">
          </div>
        </mat-form-field>

        <mat-form-field class="field">
          <mat-label>Gas Provider</mat-label>
          <mat-select id="gasProvider">
            <option value="SoCalGas">SoCalGas</option>
            <option value="Other">Other</option>
          </mat-select>
        </mat-form-field>

        <mat-form-field class="field">
          <mat-label>Gas Account Number</mat-label>
          <div class="mat-input-wrapper">
            <input type="text" id="gasAccountNumber" placeholder="1">
          </div>
        </mat-form-field>

        <mat-form-field class="field">
          <mat-label>Total Sq.Ft.</mat-label>
          <div class="mat-input-wrapper">
            <input type="text" id="totalSqFt" placeholder="From proxy server">
          </div>
        </mat-form-field>

        <mat-form-field class="field">
          <mat-label>Year Built</mat-label>
          <div class="mat-input-wrapper">
            <input type="text" id="yearBuilt" placeholder="From proxy server">
          </div>
        </mat-form-field>

        <mat-form-field class="field">
          <mat-label>Primary Applicant Age</mat-label>
          <div class="mat-input-wrapper">
            <input type="text" id="primaryApplicantAge" placeholder="44">
          </div>
        </mat-form-field>

        <mat-form-field class="field">
          <mat-label>Ethnicity</mat-label>
          <div class="mat-input-wrapper">
            <input type="text" id="ethnicity" placeholder="Hispanic/Latino">
          </div>
        </mat-form-field>
      </div>
    </div>

    <!-- Trade Ally Information -->
    <div class="section">
      <h2>Trade Ally Information</h2>
      <div class="form-grid half">
        <mat-form-field class="field">
          <mat-label>Project Contact First Name</mat-label>
          <div class="mat-input-wrapper">
            <input type="text" id="projectContactFirstName" placeholder="Sergio">
          </div>
        </mat-form-field>

        <mat-form-field class="field">
          <mat-label>Project Contact Last Name</mat-label>
          <div class="mat-input-wrapper">
            <input type="text" id="projectContactLastName" placeholder="Corp">
          </div>
        </mat-form-field>

        <mat-form-field class="field">
          <mat-label>Project Contact Title</mat-label>
          <div class="mat-input-wrapper">
            <input type="text" id="projectContactTitle" placeholder="Outreach">
          </div>
        </mat-form-field>

        <mat-form-field class="field">
          <mat-label>Project Contact Phone</mat-label>
          <div class="mat-input-wrapper">
            <input type="tel" id="projectContactPhone" placeholder="7143912727">
          </div>
        </mat-form-field>
      </div>
    </div>

    <!-- Appointment Contact -->
    <div class="section">
      <h2>Appointment Contact</h2>
      <div class="form-grid half">
        <mat-form-field class="field">
          <mat-label>Attempt 1 Date</mat-label>
          <div class="mat-input-wrapper">
            <input type="text" id="attempt1Date" placeholder="01/30/2026">
          </div>
        </mat-form-field>

        <mat-form-field class="field">
          <mat-label>Attempt 1 Time</mat-label>
          <mat-select id="attempt1Time">
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

        <mat-form-field class="field">
          <mat-label>Attempt 2 Date</mat-label>
          <div class="mat-input-wrapper">
            <input type="text" id="attempt2Date" placeholder="01/31/2026">
          </div>
        </mat-form-field>

        <mat-form-field class="field">
          <mat-label>Attempt 2 Time</mat-label>
          <mat-select id="attempt2Time">
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

  <div class="actions">
    <button class="btn-secondary">
      ← Back
    </button>
    <div style="display: flex; gap: 12px;">
      <button class="btn-secondary" onclick="saveDraft()">💾 Save Draft</button>
      <button class="btn-primary" onclick="nextPage()">Save and Continue →</button>
    </div>
  </div>

  <div id="successMessage" class="success-message">
    <mat-icon>check_circle</mat-icon>
    <span>Draft saved successfully!</span>
  </div>

  <script>
    // Pre-fill test data
    document.getElementById('customerName').value = 'John Smith';
    document.getElementById('contactAltPhone').value = '7145551234';

    function saveDraft() {
      const msg = document.getElementById('successMessage');
      msg.classList.add('show');
      setTimeout(() => msg.classList.remove('show'), 2000);
    }

    function nextPage() {
      alert('This is a static replica. In the real SCE form, this would navigate to the next section.');
    }

    // Simulate mat-select behavior for extension
    document.querySelectorAll('mat-select').forEach(select => {
      select.addEventListener('change', function() {
        console.log('Selected:', this.id, '=', this.value);
      });
    });

    // Log for debugging
    console.log('[SCE Offline Replica] Page loaded');
    console.log('[SCE Offline Replica] mat-label elements:', document.querySelectorAll('mat-label').length);
    console.log('[SCE Offline Replica] mat-form-field elements:', document.querySelectorAll('mat-form-field').length);
    console.log('[SCE Offline Replica] mat-select elements:', document.querySelectorAll('mat-select').length);
    console.log('[SCE Offline Replica] Ready for extension testing!');
  </script>
</body>
</html>`;

// Write the output file
fs.writeFileSync(outputFile, staticHTML, 'utf8');

console.log(`\n✅ Static form created: ${outputFile}`);
console.log(`🌐 Open in Chrome: http://localhost:8080/sce-form-replica.html`);
