/**
 * SCE Auto-Fill - Options Script
 */

const defaultConfig = {
  address: '123 Main St', // Placeholder - update with your address
  zipCode: '90210', // Placeholder - update with your ZIP
  firstName: 'John', // Placeholder - update with your name
  title: 'Outreach',
  phone: '5551234567', // Placeholder - update with your phone
  preferredContactTime: '1:00PM - 3:30PM',
  language: 'English',
  ethnicity: 'Decline to state',
  householdUnits: '1',
  spaceOrUnit: '1',
  howDidYouHear: 'Contractor Outreach',
  masterMetered: 'Yes',
  buildingType: 'Residential',
  homeownerOrRenter: 'Renter/Tenant',
  contractorName: 'Your Company', // Placeholder - update with your company
  attempt1Date: '',
  attempt1Time: '2:00PM',
  attempt2Date: '',
  attempt2Time: '3:00PM',
  appointmentEndTime: '',
  appointmentType: 'On-Site Appointment',
  appointmentStatus: 'Scheduled',
  gasProvider: 'SoCalGas',
  gasAccountNumber: '', // Placeholder - update with your account
  waterUtility: 'N/A',
  primaryApplicantAge: '44',
  permanentlyDisabled: 'No',
  veteran: 'No',
  nativeAmerican: 'No',
  incomeVerifiedDate: '',
  zillowSqFt: '',
  zillowYearBuilt: '',
  householdMembers: [
    { name: '', age: '' }
  ],
  customFieldMap: '{}',
  autoFillPrompt: true
};

// Load current config
function loadConfig() {
  chrome.storage.sync.get('sceConfig', (result) => {
    const config = { ...defaultConfig, ...result.sceConfig };

    document.getElementById('address').value = config.address || '';
    document.getElementById('zipCode').value = config.zipCode || '';
    document.getElementById('firstName').value = config.firstName || '';
    document.getElementById('title').value = config.title || '';
    document.getElementById('phone').value = config.phone || '';
    document.getElementById('preferredContactTime').value = config.preferredContactTime || '';
    document.getElementById('language').value = config.language || 'Spanish';
    document.getElementById('ethnicity').value = config.ethnicity || '';
    document.getElementById('householdUnits').value = config.householdUnits || '1';
    document.getElementById('spaceOrUnit').value = config.spaceOrUnit || '1';
    document.getElementById('howDidYouHear').value = config.howDidYouHear || 'Contractor Outreach';
    document.getElementById('buildingType').value = config.buildingType || 'Residential';
    document.getElementById('homeownerOrRenter').value = 'Renter/Tenant';
    document.getElementById('masterMetered').value = config.masterMetered || 'Yes';
    document.getElementById('gasProvider').value = config.gasProvider || 'SoCalGas';
    document.getElementById('gasAccountNumber').value = config.gasAccountNumber || '1';
    document.getElementById('waterUtility').value = config.waterUtility || 'N/A';
    document.getElementById('incomeVerifiedDate').value = config.incomeVerifiedDate || '';
    const member1 = Array.isArray(config.householdMembers) ? config.householdMembers[0] : null;
    document.getElementById('householdMemberName1').value = member1?.name || '';
    document.getElementById('householdMemberAge1').value = member1?.age || '';
    document.getElementById('customFieldMap').value = config.customFieldMap || '{}';
    document.getElementById('contractorName').value = config.contractorName || 'Sergio Corp';
    document.getElementById('attempt1Date').value = config.attempt1Date || '';
    document.getElementById('attempt1Time').value = config.attempt1Time || '';
    document.getElementById('attempt2Date').value = config.attempt2Date || '';
    document.getElementById('attempt2Time').value = config.attempt2Time || '';
    document.getElementById('appointmentEndTime').value = config.appointmentEndTime || '';
    document.getElementById('appointmentType').value = config.appointmentType || 'On-Site Appointment';
    document.getElementById('appointmentStatus').value = config.appointmentStatus || 'Scheduled';
    document.getElementById('primaryApplicantAge').value = config.primaryApplicantAge || '44';
    document.getElementById('permanentlyDisabled').value = config.permanentlyDisabled || 'No';
    document.getElementById('veteran').value = config.veteran || 'No';
    document.getElementById('nativeAmerican').value = config.nativeAmerican || 'No';
    document.getElementById('zillowSqFt').value = config.zillowSqFt || '';
    document.getElementById('zillowYearBuilt').value = config.zillowYearBuilt || '';
    document.getElementById('autoFillPrompt').checked = config.autoFillPrompt !== false;
  });
}

// Save config
function saveConfig() {
  // Validate customFieldMap JSON before saving
  const customFieldMapInput = document.getElementById('customFieldMap').value;
  if (customFieldMapInput.trim()) {
    try {
      const parsed = JSON.parse(customFieldMapInput);
      // Ensure it's an object, not an array
      if (Array.isArray(parsed)) {
        showStatus('❌ Custom Field Map must be a JSON object, not an array. Example: {"Project Information": {"Total Sq.Ft.": "1200"}}', 'error');
        return;
      }
    } catch (e) {
      showStatus(`❌ Invalid JSON in Custom Field Map: ${e.message}`, 'error');
      return;
    }
  }

  const config = {
    address: document.getElementById('address').value,
    zipCode: document.getElementById('zipCode').value,
    firstName: document.getElementById('firstName').value,
    title: document.getElementById('title').value,
    phone: document.getElementById('phone').value,
    preferredContactTime: document.getElementById('preferredContactTime').value,
    language: document.getElementById('language').value,
    ethnicity: document.getElementById('ethnicity').value,
    householdUnits: document.getElementById('householdUnits').value,
    spaceOrUnit: document.getElementById('spaceOrUnit').value,
    howDidYouHear: document.getElementById('howDidYouHear').value,
    buildingType: document.getElementById('buildingType').value,
    masterMetered: document.getElementById('masterMetered').value,
    homeownerOrRenter: 'Renter/Tenant',  // Always Renter/Tenant
    gasProvider: document.getElementById('gasProvider').value,
    gasAccountNumber: document.getElementById('gasAccountNumber').value,
    waterUtility: document.getElementById('waterUtility').value,
    incomeVerifiedDate: document.getElementById('incomeVerifiedDate').value,
    contractorName: document.getElementById('contractorName').value,
    attempt1Date: document.getElementById('attempt1Date').value,
    attempt1Time: document.getElementById('attempt1Time').value,
    attempt2Date: document.getElementById('attempt2Date').value,
    attempt2Time: document.getElementById('attempt2Time').value,
    appointmentEndTime: document.getElementById('appointmentEndTime').value,
    appointmentType: 'On-Site Appointment',  // Always On-Site Appointment
    appointmentStatus: 'Scheduled',  // Always Scheduled
    primaryApplicantAge: document.getElementById('primaryApplicantAge').value,
    permanentlyDisabled: document.getElementById('permanentlyDisabled').value,
    veteran: 'No',  // Always No
    nativeAmerican: 'No',  // Always No
    zillowSqFt: document.getElementById('zillowSqFt').value,
    zillowYearBuilt: document.getElementById('zillowYearBuilt').value,
    householdMembers: [
      {
        name: document.getElementById('householdMemberName1').value,
        age: document.getElementById('householdMemberAge1').value
      }
    ],
    customFieldMap: customFieldMapInput,
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
      const status = document.getElementById('status');
      status.textContent = '✅ Reset to defaults!';
      status.className = 'success';
      setTimeout(() => {
        status.className = '';
      }, 2000);
    });
  }
}

// Event listeners
document.getElementById('saveBtn').addEventListener('click', saveConfig);
document.getElementById('resetBtn').addEventListener('click', resetToDefaults);

// Load on page ready
loadConfig();
