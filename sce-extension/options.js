/**
 * SCE Auto-Fill - Options Script
 */

const defaultConfig = {
  address: '22216 Seine',
  zipCode: '90716',
  firstName: 'Sergio',
  title: 'Outreach',
  phone: '7143912727',
  preferredContactTime: '1:00PM - 3:30PM',
  language: 'Spanish',
  ethnicity: 'Hispanic/Latino',
  householdUnits: '1',
  spaceOrUnit: '1',
  howDidYouHear: 'Contractor Outreach',
  masterMetered: 'Yes',
  buildingType: 'Residential',
  homeownerOrRenter: 'Renter/Tenant',
  contractorName: 'Sergio Corp',
  attempt1Date: '01/30/2026',
  attempt1Time: '2:00PM',
  attempt2Date: '01/31/2026',
  attempt2Time: '3:00PM',
  appointmentEndTime: '',
  appointmentType: 'On-Site Appointment',
  appointmentStatus: 'Scheduled',
  gasProvider: 'SoCalGas',
  gasAccountNumber: '1',
  waterUtility: 'N/A',
  primaryApplicantAge: '44',
  permanentlyDisabled: 'No',
  veteran: 'No',
  nativeAmerican: 'No',
  incomeVerifiedDate: '01/31/2026',
  zillowSqFt: '',
  zillowYearBuilt: '',
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
    autoFillPrompt: document.getElementById('autoFillPrompt').checked
  };

  chrome.storage.sync.set({ sceConfig: config }, () => {
    const status = document.getElementById('status');
    status.textContent = '✅ Settings saved!';
    status.className = 'success';
    setTimeout(() => {
      status.className = '';
    }, 2000);
  });
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
