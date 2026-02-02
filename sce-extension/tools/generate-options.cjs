#!/usr/bin/env node
/**
 * SCE Auto-Fill Options Generator
 *
 * This script extracts field information from Playwright recording JSON files
 * and generates the options.html and options.js files for the extension.
 *
 * Usage:
 *   node tools/generate-options.js recording.json
 *
 * The recording file should contain Playwright/Puppeteer-style recorded actions.
 */

const fs = require('fs');
const path = require('path');

// Known field mappings - maps field labels to their configuration schema
const FIELD_SCHEMA = {
  // Customer Search
  'Street Address': { type: 'text', id: 'address', default: '22216 Seine', section: 'customer-search', label: 'Street Address' },
  'Site Zip Code': { type: 'text', id: 'zipCode', default: '90716', section: 'customer-search', label: 'Zip Code' },

  // Customer Information
  'Customer Name': { type: 'hidden', id: 'customerName', section: 'customer-info', label: 'Customer Name', readonly: true },
  'Contact First Name': { type: 'text', id: 'firstName', default: 'Sergio', section: 'customer-info', label: 'Contact First Name' },
  'Contact Last Name': { type: 'text', id: 'lastName', default: 'Corp', section: 'customer-info', label: 'Contact Last Name' },
  'Contact Phone': { type: 'text', id: 'phone', default: '7143912727', section: 'customer-info', label: 'Contact Phone' },
  'Contact Email': { type: 'text', id: 'email', default: '', section: 'customer-info', label: 'Contact Email' },

  // Additional Customer Information
  'Preferred Contact Time': {
    type: 'select',
    id: 'preferredContactTime',
    default: '1:00PM - 3:30PM',
    section: 'additional-info',
    label: 'Preferred Contact Time',
    options: ['8:00AM - 10:00AM', '10:00AM - 12:00PM', '12:00PM - 2:00PM', '1:00PM - 3:30PM', '2:00PM - 4:00PM', '4:00PM - 6:00PM']
  },
  'Preferred Correspondence Language': { type: 'select', id: 'language', default: 'English', section: 'additional-info', label: 'Language', options: ['English', 'Spanish'] },
  'Household Units': { type: 'select', id: 'householdUnits', default: '1', section: 'additional-info', label: 'Household Units', options: ['1', '2', '3', '4', '5'] },
  'Space Or Unit': { type: 'text', id: 'spaceOrUnit', default: '1', section: 'additional-info', label: 'Space Or Unit' },
  'How did you hear about the program?': { type: 'select', id: 'howDidYouHear', default: 'Contractor Outreach', section: 'additional-info', label: 'How did you hear about the program?', options: ['Contractor Outreach', 'Other'] },
  'Building Type': {
    type: 'select',
    id: 'buildingType',
    default: 'Residential',
    section: 'additional-info',
    label: 'Building Type',
    options: ['Residential', 'Residential mobile home', 'Single Family Detached', 'Single Family Attached', 'Multi-Family', 'Condo', 'Townhouse']
  },
  'Master Metered': { type: 'select', id: 'masterMetered', default: 'Yes', section: 'additional-info', label: 'Master Metered', options: ['Yes', 'No'] },
  'Homeowner or Renter/Tenant': { type: 'select', id: 'homeownerStatus', default: 'Renter/Tenant', section: 'additional-info', label: 'Homeowner or Renter/Tenant', options: ['Renter/Tenant', 'Homeowner'] },
  'Gas Provider': { type: 'select', id: 'gasProvider', default: 'SoCalGas', section: 'additional-info', label: 'Gas Provider', options: ['SoCalGas', 'Other'] },
  'Gas Account': { type: 'text', id: 'gasAccountNumber', default: '1', section: 'additional-info', label: 'Gas Account Number' },
  'Water Utility': { type: 'select', id: 'waterUtility', default: 'N/A', section: 'additional-info', label: 'Water Utility', options: ['N/A', 'Other'] },
  'Income Verified': { type: 'text', id: 'incomeVerifiedDate', default: '01/31/2026', section: 'additional-info', label: 'Income Verified Date' },

  // Demographics
  'Primary Applicant Age': { type: 'text', id: 'primaryApplicantAge', default: '44', section: 'additional-info', label: 'Primary Applicant Age' },
  'Ethnicity': {
    type: 'select',
    id: 'ethnicity',
    default: 'Hispanic/Latino',
    section: 'additional-info',
    label: 'Ethnicity',
    options: ['Hispanic/Latino', 'White', 'Black/African American', 'Asian', 'American Indian/Alaska Native', 'Decline to state']
  },
  'Are there permanently disabled household members?': { type: 'select', id: 'permanentlyDisabled', default: 'No', section: 'additional-info', label: 'Permanently Disabled', options: ['No', 'Yes'] },
  'Veteran': { type: 'select', id: 'veteran', default: 'No', section: 'additional-info', label: 'Veteran', options: ['No', 'Yes'] },
  'Native American': { type: 'select', id: 'nativeAmerican', default: 'No', section: 'additional-info', label: 'Native American', options: ['No', 'Yes'] },

  // Enrollment Information
  'Income Verification Type': { type: 'select', id: 'incomeVerificationType', default: 'PRISM code', section: 'enrollment', label: 'Income Verification Type', options: ['PRISM code', 'Other'] },
  'Enter Plus 4': { type: 'text', id: 'plus4Zip', default: '', section: 'enrollment', label: 'Enter Plus 4 (last 4 of zip)' },

  // Household Members
  'Name of Household Member': { type: 'hidden', id: 'householdMemberName', section: 'household', label: 'Name of Household Member' },
  'Relation to Applicant': {
    type: 'select',
    id: 'relationToApplicant',
    default: 'Applicant',
    section: 'household',
    label: 'Relation to Applicant',
    options: ['Applicant', 'Spouse', 'Child', 'Parent', 'Other']
  },
  'Household Member Age': { type: 'hidden', id: 'householdMemberAge', default: '44', section: 'household', label: 'Household Member Age' },

  // Project Information
  'Total Sq.Ft.': { type: 'text', id: 'zillowSqFt', default: '', section: 'project', label: 'Total Sq.Ft. (Zillow)' },
  'Total Sq. Ft.': { type: 'text', id: 'zillowSqFt', default: '', section: 'project', label: 'Total Sq.Ft. (Zillow)', duplicate: true },
  'Year Built': { type: 'text', id: 'zillowYearBuilt', default: '', section: 'project', label: 'Year Built (Zillow)' },

  // Trade Ally Information
  'Project Contact First Name': { type: 'text', id: 'projectFirstName', default: 'Sergio', section: 'trade-ally', label: 'Project Contact First Name' },
  'Project Contact Last Name': { type: 'text', id: 'projectLastName', default: 'Corp', section: 'trade-ally', label: 'Project Contact Last Name' },
  'Project Contact Title': { type: 'text', id: 'projectTitle', default: 'Outreach', section: 'trade-ally', label: 'Project Contact Title' },
  'Project Contact Phone': { type: 'text', id: 'projectPhone', default: '7143912727', section: 'trade-ally', label: 'Project Contact Phone' },
  'Project Contact Email': { type: 'text', id: 'projectEmail', default: '', section: 'trade-ally', label: 'Project Contact Email' },

  // Appointment Contact
  'Attempt 1 Date': { type: 'text', id: 'attempt1Date', default: '01/30/2026', section: 'appointment', label: 'Attempt 1 Date' },
  'Attempt 1 Time': {
    type: 'select',
    id: 'attempt1Time',
    default: '2:00PM',
    section: 'appointment',
    label: 'Attempt 1 Time',
    options: ['8:00AM', '9:00AM', '10:00AM', '11:00AM', '12:00PM', '1:00PM', '2:00PM', '3:00PM', '4:00PM', '5:00PM']
  },
  'Attempt 2 Date': { type: 'text', id: 'attempt2Date', default: '01/31/2026', section: 'appointment', label: 'Attempt 2 Date' },
  'Attempt 2 Time': {
    type: 'select',
    id: 'attempt2Time',
    default: '3:00PM',
    section: 'appointment',
    label: 'Attempt 2 Time',
    options: ['8:00AM', '9:00AM', '10:00AM', '11:00AM', '12:00PM', '1:00PM', '2:00PM', '3:00PM', '4:00PM', '5:00PM']
  },

  // Appointments section
  'Contractor': { type: 'text', id: 'contractorName', default: 'Sergio Corp', section: 'appointments', label: 'Contractor Name' },
  'Appointment Date': { type: 'text', id: 'appointmentDate', default: '01/30/2026', section: 'appointments', label: 'Appointment Date' },
  'Appointment Status': {
    type: 'select',
    id: 'appointmentStatus',
    default: 'Scheduled',
    section: 'appointments',
    label: 'Appointment Status',
    options: ['Scheduled', 'Completed', 'Cancelled', 'No Show']
  },
  'Appointment Type': {
    type: 'select',
    id: 'appointmentType',
    default: 'On-Site Appointment',
    section: 'appointments',
    label: 'Appointment Type',
    options: ['On-Site Appointment', 'Virtual Appointment', 'Phone Call']
  },
  'Start Time': {
    type: 'select',
    id: 'appointmentStartTime',
    default: '2:00PM',
    section: 'appointments',
    label: 'Start Time',
    options: ['8:00AM', '9:00AM', '10:00AM', '11:00AM', '12:00PM', '1:00PM', '2:00PM', '3:00PM', '4:00PM', '5:00PM']
  },
  'End Time': {
    type: 'select',
    id: 'appointmentEndTime',
    default: '',
    section: 'appointments',
    label: 'End Time',
    options: ['', '9:00AM', '10:00AM', '11:00AM', '12:00PM', '1:00PM', '2:00PM', '3:00PM', '4:00PM', '5:00PM', '6:00PM']
  },

  // Assessment / Equipment
  'Is the existing central heating system': {
    type: 'select',
    id: 'hvacSystemType',
    default: 'Natural Gas',
    section: 'assessment',
    label: 'Is the existing central heating system...?',
    options: ['Natural Gas - Central Furnace', 'Electric - Central Furnace', 'Electric Heat Pump', 'Gas Package Unit', 'Wall/Floor Heater', 'Baseboard', 'Other']
  },
  'Does the home have a Room air conditioner': {
    type: 'select',
    id: 'hasRoomAC',
    default: 'Yes - Room AC',
    section: 'assessment',
    label: 'Does the home have a Room air conditioner?',
    options: ['Yes - Central', 'Yes - Room AC', 'Yes - Mini Split', 'No']
  },
  'Does the home have an evaporative cooler': { type: 'select', id: 'hasEvapCooler', default: 'No', section: 'assessment', label: 'Does the home have an evaporative cooler?', options: ['Yes', 'No'] },
  'How many refrigerators': { type: 'select', id: 'refrigeratorCount', default: '1', section: 'assessment', label: 'How many refrigerators?', options: ['None', '1', '2', '3', '4'] },
  'Existing Refrigerator Equipment 1 Manufacturer Year': { type: 'text', id: 'fridge1Year', default: '2022', section: 'assessment', label: 'Existing Refrigerator Equipment 1 Manufacturer Year' },
  'Does the home have a stand-alone freezer': { type: 'select', id: 'hasFreezer', default: 'No', section: 'assessment', label: 'Does the home have a stand-alone freezer?', options: ['Yes', 'No'] },
  'What is the fuel type of the water heater': {
    type: 'select',
    id: 'waterHeaterFuel',
    default: 'Other',
    section: 'assessment',
    label: 'What is the fuel type of the water heater?',
    options: ['Natural Gas', 'Electric', 'Propane', 'Solar', 'Heat Pump', 'Other']
  },
  'Water Heater Size': { type: 'select', id: 'waterHeaterSize', default: '40 Gal', section: 'assessment', label: 'Water Heater Size', options: ['30 Gal', '40 Gal', '50 Gal', 'Other'] },
  'Does the home have a dishwasher': { type: 'select', id: 'hasDishwasher', default: 'No', section: 'assessment', label: 'Does the home have a dishwasher?', options: ['Yes', 'No'] },
  'Does the home have a clothes washer': { type: 'select', id: 'hasClothesWasher', default: 'No', section: 'assessment', label: 'Does the home have a clothes washer?', options: ['Yes', 'No'] },
  'Does the home have a clothes dryer': {
    type: 'select',
    id: 'hasClothesDryer',
    default: 'Electric',
    section: 'assessment',
    label: 'Does the home have a clothes dryer?',
    options: ['Electric', 'Gas', 'Electric Heat Pump', 'None']
  },
  'Dryer Type': {
    type: 'select',
    id: 'clothesDryerType',
    default: 'Electric',
    section: 'assessment',
    label: 'Dryer Type (if applicable)',
    options: ['Electric', 'Gas', 'Heat Pump Dryer', '110V Electric', '220V Electric']
  },

  // Equipment Information
  'Equipment to be Installed': {
    type: 'select',
    id: 'equipmentToInstall',
    default: 'None',
    section: 'equipment',
    label: 'Equipment to be Installed',
    options: ['None', 'Room AC Unit', 'Mini Split System', 'Central AC', 'Heat Pump', 'Furnace', 'Water Heater', 'Refrigerator']
  },

  // Terms
  'Electronic Acceptance Terms': { type: 'select', id: 'electronicAcceptance', default: 'I Agree', section: 'terms', label: 'Electronic Acceptance Terms', options: ['I Agree', 'I Disagree'] },
  'Did you receive': { type: 'select', id: 'priorIncentive', default: 'No', section: 'terms', label: 'Did you receive incentive for this measure before?', options: ['No', 'Yes'] },
};

// Section definitions for tab display
const SECTIONS = {
  'customer-search': { name: 'Search', icon: '🔍', description: 'Default search values for finding customers' },
  'customer-info': { name: 'Customer Info', icon: '👤', description: 'Customer details (usually auto-filled from search)' },
  'additional-info': { name: 'Additional', icon: '📋', description: 'Additional customer and demographic information' },
  'enrollment': { name: 'Enrollment', icon: '📝', description: 'Enrollment and income verification' },
  'household': { name: 'Household', icon: '👨‍👩‍👧‍👦', description: 'Household members information' },
  'project': { name: 'Project', icon: '🏠', description: 'Project information and property details' },
  'trade-ally': { name: 'Trade Ally', icon: '👤', description: 'Trade Ally / Project Contact information' },
  'appointment': { name: 'Appt Contact', icon: '📅', description: 'Appointment contact attempt dates and times' },
  'appointments': { name: 'Appointments', icon: '📅', description: 'Scheduled appointments details' },
  'assessment': { name: 'Assessment', icon: '📋', description: 'Assessment questionnaire and equipment information' },
  'equipment': { name: 'Equipment', icon: '❄️', description: 'Additional equipment details and specifications' },
  'basic-enrollment': { name: 'Basic Enroll', icon: '📦', description: 'Basic enrollment equipment measures' },
  'bonus': { name: 'Bonus', icon: '🎁', description: 'Bonus and adjustment measures' },
  'terms': { name: 'Terms', icon: '📄', description: 'Terms and conditions acceptance' },
  'uploads': { name: 'Uploads', icon: '📎', description: 'Required document uploads' },
  'comments': { name: 'Comments', icon: '💬', description: 'Review comments and notes' },
  'status': { name: 'Status', icon: '✅', description: 'Application status and lead acceptance' },
  'behavior': { name: 'Behavior', icon: '🔧', description: 'Extension behavior settings' },
};

/**
 * Extract field labels from recording JSON
 */
function extractFieldsFromRecording(recordingPath) {
  const recording = JSON.parse(fs.readFileSync(recordingPath, 'utf8'));
  const foundFields = new Map();

  for (const step of recording.steps || []) {
    // Look for selector text patterns
    if (step.selectors) {
      for (const selector of step.selectors) {
        // Check for text/* selectors which contain labels
        if (selector[1] && selector[1].text) {
          const labelText = selector[1].text;
          // Try to match against known fields
          for (const [key, schema] of Object.entries(FIELD_SCHEMA)) {
            if (labelText.includes(key) || key.includes(labelText)) {
              if (!foundFields.has(schema.id)) {
                foundFields.set(schema.id, { ...schema, foundInRecording: true });
              }
            }
          }
        }
      }
    }
  }

  return foundFields;
}

/**
 * Generate HTML for a single field
 */
function generateFieldHTML(schema) {
  if (schema.type === 'select') {
    const options = schema.options || [];
    const optionsHTML = options.map(opt =>
      `<option value="${opt}"${opt === schema.default ? ' selected' : ''}>${opt}</option>`
    ).join('\n        ');

    return `      <div class="field">
        <label>${schema.label}</label>
        <select id="${schema.id}">
        ${optionsHTML}
        </select>
      </div>`;
  } else {
    return `      <div class="field">
        <label>${schema.label}</label>
        <input type="text" id="${schema.id}" value="${schema.default || ''}"${schema.readonly ? ' readonly' : ''}>
      </div>`;
  }
}

/**
 * Generate HTML for a section
 */
function generateSectionHTML(sectionId, fields) {
  const section = SECTIONS[sectionId];
  const sectionFields = Object.values(fields).filter(f => f.section === sectionId);

  if (sectionFields.length === 0 && sectionId !== 'behavior') {
    return '';
  }

  let html = `  <!-- Tab: ${section.name} -->\n`;
  html += `  <div id="${sectionId}" class="tab-content">\n`;
  html += `    <div class="card">\n`;
  html += `      <h3>${section.icon} ${section.name}</h3>\n`;
  if (section.description) {
    html += `      <div class="section-desc">${section.description}</div>\n`;
  }

  if (sectionId === 'behavior') {
    html += `
      <div class="field">
        <label>
          <input type="checkbox" id="autoFillPrompt" style="width: auto;">
          Show "Fill Form" banner on SCE pages
        </label>
        <div class="helper">When enabled, a banner will appear on SCE form pages offering to fill the form</div>
      </div>
    </div>

    <div class="card">
      <h3>🧩 Custom Field Mapping (Advanced)</h3>
      <div class="section-desc">Override any field using JSON mapping</div>

      <div class="field">
        <label>Custom Field Map (JSON)</label>
        <textarea id="customFieldMap" rows="6" style="width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; box-sizing: border-box; font-family: monospace;"></textarea>
        <div class="helper">Example: {"Project Information":{"Total Sq.Ft.":"1200","Year Built":"1970"}}</div>
      </div>
    </div>`;
  } else {
    // Group fields into rows of 2 where appropriate
    let i = 0;
    while (i < sectionFields.length) {
      const field = sectionFields[i];
      const nextField = sectionFields[i + 1];

      // Check if both fields can fit in a row (both are simple fields)
      if (nextField && !field.label.includes('\n') && !nextField.label.includes('\n') &&
          field.label.length < 40 && nextField.label.length < 40) {
        html += `\n      <div class="field-row">\n`;
        html += `        <div class="field">\n`;
        html += `          <label>${field.label}</label>\n`;
        if (field.type === 'select') {
          const options = field.options || [];
          html += `          <select id="${field.id}">\n`;
          options.forEach(opt => {
            html += `            <option value="${opt}"${opt === field.default ? ' selected' : ''}>${opt}</option>\n`;
          });
          html += `          </select>\n`;
        } else {
          html += `          <input type="text" id="${field.id}" value="${field.default || ''}">\n`;
        }
        html += `        </div>\n`;
        html += `        <div class="field">\n`;
        html += `          <label>${nextField.label}</label>\n`;
        if (nextField.type === 'select') {
          const options = nextField.options || [];
          html += `          <select id="${nextField.id}">\n`;
          options.forEach(opt => {
            html += `            <option value="${opt}"${opt === nextField.default ? ' selected' : ''}>${opt}</option>\n`;
          });
          html += `          </select>\n`;
        } else {
          html += `          <input type="text" id="${nextField.id}" value="${nextField.default || ''}">\n`;
        }
        html += `        </div>\n`;
        html += `      </div>\n`;
        i += 2;
      } else {
        html += `\n${generateFieldHTML(field).replace(/^      /, '      ').replace(/\n/g, '\n      ')}\n`;
        i++;
      }
    }
  }

  html += `    </div>\n`;
  html += `  </div>\n\n`;

  return html;
}

/**
 * Generate complete options.html
 */
function generateOptionsHTML(fields) {
  let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>SCE Auto-Fill Settings</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 32px 16px;
      background: #f5f5f5;
    }

    h1 {
      color: #333;
      margin-bottom: 24px;
    }

    .tabs {
      display: flex;
      gap: 4px;
      background: white;
      padding: 4px;
      border-radius: 12px;
      margin-bottom: 0;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow-x: auto;
      flex-wrap: wrap;
    }

    .tab {
      flex: 0 0 auto;
      min-width: 100px;
      padding: 10px 14px;
      border: none;
      background: transparent;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      color: #666;
      transition: all 0.2s;
    }

    .tab:hover {
      background: #f0f0f0;
    }

    .tab.active {
      background: #4CAF50;
      color: white;
    }

    .tab-content {
      display: none;
    }

    .tab-content.active {
      display: block;
    }

    .card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .card h3 {
      margin-top: 0;
      color: #4CAF50;
      font-size: 16px;
    }

    .field {
      margin-bottom: 14px;
    }

    label {
      display: block;
      font-weight: 600;
      margin-bottom: 6px;
      color: #555;
      font-size: 13px;
    }

    input, select, textarea {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
      box-sizing: border-box;
    }

    input:focus, select:focus, textarea:focus {
      outline: none;
      border-color: #4CAF50;
    }

    input[readonly] {
      background: #f5f5f5;
      color: #888;
    }

    .btn-row {
      display: flex;
      gap: 12px;
      margin-top: 24px;
    }

    .btn {
      flex: 1;
      padding: 12px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-primary {
      background: #4CAF50;
      color: white;
    }

    .btn-secondary {
      background: #f5f5f5;
      color: #333;
    }

    #status {
      padding: 12px;
      border-radius: 6px;
      margin-top: 16px;
      display: none;
    }

    #status.success {
      background: #e8f5e9;
      color: #2e7d32;
      display: block;
    }

    #status.error {
      background: #ffebee;
      color: #c62828;
      display: block;
    }

    .helper {
      font-size: 11px;
      color: #888;
      margin-top: 4px;
    }

    .field-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .section-desc {
      font-size: 12px;
      color: #888;
      margin-bottom: 16px;
      font-style: italic;
    }
  </style>
</head>
<body>
  <h1>⚙️ SCE Auto-Fill Settings</h1>

  <!-- Tabs -->
  <div class="tabs">
`;

  // Generate tab buttons
  const sectionIds = Object.keys(SECTIONS);
  sectionIds.forEach((sectionId, index) => {
    const section = SECTIONS[sectionId];
    html += `    <button class="tab${index === 0 ? ' active' : ''}" onclick="switchTab('${sectionId}')">${section.name}</button>\n`;
  });

  html += `  </div>\n\n`;

  // Generate section content
  sectionIds.forEach((sectionId, index) => {
    html += generateSectionHTML(sectionId, fields);
  });

  // Footer with buttons
  html += `  <div class="btn-row">
    <button id="saveBtn" class="btn btn-primary">Save Settings</button>
    <button id="resetBtn" class="btn btn-secondary">Reset to Defaults</button>
  </div>

  <div id="status"></div>

  <script src="options.js"></script>
</body>
</html>
`;

  return html;
}

/**
 * Generate options.js with all field load/save logic
 */
function generateOptionsJS(fields) {
  let js = `/**
 * SCE Auto-Fill - Options Script
 *
 * AUTO-GENERATED by tools/generate-options.js
 * Run: node tools/generate-options.js <recording.json>
 */

// Tab switching function
function switchTab(tabName) {
  // Hide all tab contents
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });

  // Remove active from all tabs
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.remove('active');
  });

  // Show selected tab content
  const selectedContent = document.getElementById(tabName);
  if (selectedContent) {
    selectedContent.classList.add('active');
  }

  // Activate corresponding tab button
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach((tab) => {
    if (tab.getAttribute('onclick').includes(tabName)) {
      tab.classList.add('active');
    }
  });
}

const defaultConfig = {
`;

  // Generate config object
  const fieldArray = Object.values(fields);
  fieldArray.forEach(field => {
    if (field.type !== 'hidden') {
      const value = typeof field.default === 'string' ? `'${field.default}'` : field.default;
      js += `  ${field.id}: ${value},\n`;
    }
  });

  // Add behavior fields
  js += `  autoFillPrompt: true,
  customFieldMap: '{}'
};

// Helper to get value by ID with default
function getValue(id, defaultValue = '') {
  const el = document.getElementById(id);
  return el ? el.value : defaultValue;
}

// Helper to set value by ID
function setValue(id, value, defaultValue = '') {
  const el = document.getElementById(id);
  if (el) {
    el.value = value !== undefined && value !== null ? value : defaultValue;
  }
}

// Helper to set checkbox value
function setCheckbox(id, value) {
  const el = document.getElementById(id);
  if (el) {
    el.checked = value !== false;
  }
}

// Load current config
function loadConfig() {
  chrome.storage.sync.get('sceConfig', (result) => {
    const config = { ...defaultConfig, ...result.sceConfig };
`;

  // Generate load statements
  fieldArray.forEach(field => {
    if (field.type !== 'hidden') {
      const defaultValue = field.default ? `'${field.default}'` : "''";
      js += `    setValue('${field.id}', config.${field.id}, ${defaultValue});\n`;
    }
  });

  js += `    setValue('customFieldMap', config.customFieldMap, '{}');
    setCheckbox('autoFillPrompt', config.autoFillPrompt);
  });
}

// Save config
function saveConfig() {
  // Validate customFieldMap JSON before saving
  const customFieldMapInput = document.getElementById('customFieldMap').value;
  if (customFieldMapInput.trim()) {
    try {
      const parsed = JSON.parse(customFieldMapInput);
      if (Array.isArray(parsed)) {
        showStatus('❌ Custom Field Map must be a JSON object, not an array. Example: {"Project Information": {"Total Sq.Ft.": "1200"}}', 'error');
        return;
      }
    } catch (e) {
      showStatus(\`❌ Invalid JSON in Custom Field Map: \${e.message}\`, 'error');
      return;
    }
  }

  const config = {
`;

  // Generate save statements
  fieldArray.forEach(field => {
    if (field.type !== 'hidden') {
      const defaultValue = field.default ? `'${field.default}'` : "''";
      js += `    ${field.id}: getValue('${field.id}', ${defaultValue}),\n`;
    }
  });

  js += `    customFieldMap: customFieldMapInput,
    autoFillPrompt: document.getElementById('autoFillPrompt').checked
  };

  chrome.storage.sync.set({ sceConfig: config }, () => {
    showStatus('✅ Settings saved!', 'success');
  });
}

// Helper to show status messages
function showStatus(message, className) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = className;
  setTimeout(() => {
    status.className = '';
  }, 3000);
}

// Reset to defaults
function resetToDefaults() {
  if (confirm('Reset all settings to defaults?')) {
    chrome.storage.sync.set({ sceConfig: defaultConfig }, () => {
      loadConfig();
      showStatus('✅ Reset to defaults!', 'success');
    });
  }
}

// Event listeners
document.getElementById('saveBtn').addEventListener('click', saveConfig);
document.getElementById('resetBtn').addEventListener('click', resetToDefaults);

// Load on page ready
loadConfig();
`;

  return js;
}

/**
 * Generate content.js config update snippet
 */
function generateContentConfig(fields) {
  let js = `// CONFIG (auto-generated - copy to content.js)
let config = {
`;

  const fieldArray = Object.values(fields).filter(f => f.type !== 'hidden' && !f.duplicate);
  const seenIds = new Set();

  fieldArray.forEach(field => {
    if (!seenIds.has(field.id)) {
      seenIds.add(field.id);
      const value = field.default !== undefined ? `'${field.default}'` : `''`;
      js += `  ${field.id}: ${value},\n`;
    }
  });

  js += `  autoFillPrompt: true,
  customFieldMap: '{}'
};`;

  return js;
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: node tools/generate-options.js <recording.json>');
    console.log('');
    console.log('This script will:');
    console.log('  1. Extract field information from the recording JSON');
    console.log('  2. Generate options.html in the sce-extension directory');
    console.log('  3. Generate options.js in the sce-extension directory');
    console.log('');
    console.log('Options:');
    console.log('  --config-only    Only output the config object for content.js');
    process.exit(1);
  }

  const recordingPath = args[0];
  const configOnly = args.includes('--config-only');

  if (!fs.existsSync(recordingPath)) {
    console.error(`Error: Recording file not found: ${recordingPath}`);
    process.exit(1);
  }

  console.log(`📋 Reading recording from: ${recordingPath}`);

  // Extract fields from recording
  const foundFields = extractFieldsFromRecording(recordingPath);
  console.log(`   Found ${foundFields.size} fields in recording`);

  // Use all known fields (including those not found in recording)
  const allFields = { ...FIELD_SCHEMA };

  // Mark fields found in recording
  for (const [id, field] of Object.entries(allFields)) {
    if (foundFields.has(id)) {
      allFields[id].foundInRecording = true;
    }
  }

  console.log(`   Total fields in schema: ${Object.keys(allFields).length}`);

  if (configOnly) {
    console.log('\n=== Config for content.js ===\n');
    console.log(generateContentConfig(allFields));
    return;
  }

  // Generate files
  const extensionDir = path.join(__dirname, '..');
  const htmlPath = path.join(extensionDir, 'options.html');
  const jsPath = path.join(extensionDir, 'options.js');

  console.log('\n📝 Generating files...');

  fs.writeFileSync(htmlPath, generateOptionsHTML(allFields));
  console.log(`   ✓ Generated: ${htmlPath}`);

  fs.writeFileSync(jsPath, generateOptionsJS(allFields));
  console.log(`   ✓ Generated: ${jsPath}`);

  console.log('\n✅ Done! Reload the extension to see the new options page.');
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  generateOptionsHTML,
  generateOptionsJS,
  generateContentConfig,
  FIELD_SCHEMA,
  SECTIONS
};
