/**
 * SCE Auto-Fill - Options Script
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

  // Activate corresponding tab button (using data-tab attribute)
  const activeTab = document.querySelector(`.tab[data-tab="${tabName}"]`);
  if (activeTab) {
    activeTab.classList.add('active');
  }
}

// Set up tab event listeners
function setupTabListeners() {
  const tabs = document.querySelectorAll('.tab[data-tab]');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.getAttribute('data-tab');
      switchTab(tabName);
    });
  });
}

const defaultConfig = {
  // Customer Search
  address: '22216 Seine',
  zipCode: '90716',

  // Customer Information
  firstName: 'Sergio',
  lastName: 'Correa',
  phone: '7143912727',
  email: 'scm.energysavings@gmail.com',

  // Additional Customer Information
  preferredContactTime: '1:00PM - 3:30PM',
  language: 'English',
  householdUnits: '1',
  spaceOrUnit: '1',
  howDidYouHear: 'Contractor Outreach',
  buildingType: 'Residential',
  masterMetered: 'Yes',
  homeownerStatus: 'Renter/Tenant',
  gasProvider: 'SoCalGas',
  gasAccountNumber: '1',
  waterUtility: 'N/A',
  incomeVerifiedDate: '01/31/2026',

  // Demographics
  primaryApplicantAge: '44',
  ethnicity: 'Hispanic/Latino',
  permanentlyDisabled: 'No',
  veteran: 'No',
  nativeAmerican: 'No',

  // Enrollment Information
  incomeVerificationType: 'PRISM code',
  plus4Zip: '',

  // Household Members
  householdMembersCount: '1',
  relationToApplicant: 'Applicant',

  // Project Information
  zillowSqFt: '',
  zillowYearBuilt: '',
  projectSpaceOrUnit: '1',

  // Trade Ally Information
  projectFirstName: 'Sergio',
  projectLastName: 'Correa',
  projectTitle: 'Outreach',
  projectPhone: '7143912727',
  projectEmail: 'scm.energysavings@gmail.com',

  // Appointment Contact
  attempt1Date: '01/30/2026',
  attempt1Time: '2:00PM',
  attempt2Date: '01/31/2026',
  attempt2Time: '3:00PM',

  // Appointments
  contractorName: 'Sergio Correa',
  appointmentDate: '01/30/2026',
  appointmentStatus: 'Scheduled',
  appointmentType: 'On-Site Appointment',
  appointmentStartTime: '2:00PM',
  appointmentEndTime: '',

  // Assessment/Equipment
  hvacSystemType: 'Natural Gas',
  hasRoomAC: 'Yes - Room AC',
  hasEvapCooler: 'No',
  refrigeratorCount: '1',
  fridge1Year: '2022',
  hasFreezer: 'No',
  waterHeaterFuel: 'Natural Gas',
  waterHeaterSize: '40 Gal',
  hasDishwasher: 'No',
  hasClothesWasher: 'No',
  hasClothesDryer: 'Electric',
  clothesDryerType: 'Electric',

  // Equipment Information
  equipmentToInstall: 'None',
  equipmentBrand: '',
  equipmentModel: '',

  // Basic Enrollment Equipment
  measureType: 'Basic',
  equipmentQuantity: '1',

  // Bonus Measures
  bonusMeasureType: 'None',
  adjustmentNotes: '',

  // Terms
  electronicAcceptance: 'I Agree',
  priorIncentive: 'No',

  // Uploads
  autoUploadDocs: 'false',

  // Comments
  reviewComment: '',

  // Status
  autoAcceptLead: 'true',
  finalStatus: 'Accepted',

  // Behavior
  autoFillPrompt: true,
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

    // Customer Search
    setValue('address', config.address);
    setValue('zipCode', config.zipCode);

    // Customer Information
    setValue('firstName', config.firstName);
    setValue('lastName', config.lastName);
    setValue('phone', config.phone);
    setValue('email', config.email);

    // Additional Customer Information
    setValue('preferredContactTime', config.preferredContactTime, '1:00PM - 3:30PM');
    setValue('language', config.language, 'English');
    setValue('householdUnits', config.householdUnits, '1');
    setValue('spaceOrUnit', config.spaceOrUnit, '1');
    setValue('howDidYouHear', config.howDidYouHear, 'Contractor Outreach');
    setValue('buildingType', config.buildingType, 'Residential');
    setValue('masterMetered', config.masterMetered, 'Yes');
    setValue('homeownerStatus', config.homeownerStatus, 'Renter/Tenant');
    setValue('gasProvider', config.gasProvider, 'SoCalGas');
    setValue('gasAccountNumber', config.gasAccountNumber, '1');
    setValue('waterUtility', config.waterUtility, 'N/A');
    setValue('incomeVerifiedDate', config.incomeVerifiedDate);

    // Demographics
    setValue('primaryApplicantAge', config.primaryApplicantAge, '44');
    setValue('ethnicity', config.ethnicity, 'Hispanic/Latino');
    setValue('permanentlyDisabled', config.permanentlyDisabled, 'No');
    setValue('veteran', config.veteran, 'No');
    setValue('nativeAmerican', config.nativeAmerican, 'No');

    // Enrollment Information
    setValue('incomeVerificationType', config.incomeVerificationType, 'PRISM code');
    setValue('plus4Zip', config.plus4Zip);

    // Household Members
    setValue('householdMembersCount', config.householdMembersCount, '1');
    setValue('relationToApplicant', config.relationToApplicant, 'Applicant');

    // Project Information
    setValue('zillowSqFt', config.zillowSqFt);
    setValue('zillowYearBuilt', config.zillowYearBuilt);
    setValue('projectSpaceOrUnit', config.projectSpaceOrUnit, '1');

    // Trade Ally Information
    setValue('projectFirstName', config.projectFirstName, 'Sergio');
    setValue('projectLastName', config.projectLastName, 'Correa');
    setValue('projectTitle', config.projectTitle, 'Outreach');
    setValue('projectPhone', config.projectPhone, '7143912727');
    setValue('projectEmail', config.projectEmail);

    // Appointment Contact
    setValue('attempt1Date', config.attempt1Date);
    setValue('attempt1Time', config.attempt1Time, '2:00PM');
    setValue('attempt2Date', config.attempt2Date);
    setValue('attempt2Time', config.attempt2Time, '3:00PM');

    // Appointments
    setValue('contractorName', config.contractorName, 'Sergio Correa');
    setValue('appointmentDate', config.appointmentDate);
    setValue('appointmentStatus', config.appointmentStatus, 'Scheduled');
    setValue('appointmentType', config.appointmentType, 'On-Site Appointment');
    setValue('appointmentStartTime', config.appointmentStartTime, '2:00PM');
    setValue('appointmentEndTime', config.appointmentEndTime);

    // Assessment/Equipment
    setValue('hvacSystemType', config.hvacSystemType, 'Natural Gas');
    setValue('hasRoomAC', config.hasRoomAC, 'Yes - Room AC');
    setValue('hasEvapCooler', config.hasEvapCooler, 'No');
    setValue('refrigeratorCount', config.refrigeratorCount, '1');
    setValue('fridge1Year', config.fridge1Year);
    setValue('hasFreezer', config.hasFreezer, 'No');
    setValue('waterHeaterFuel', config.waterHeaterFuel, 'Natural Gas');
    setValue('waterHeaterSize', config.waterHeaterSize, '40 Gal');
    setValue('hasDishwasher', config.hasDishwasher, 'No');
    setValue('hasClothesWasher', config.hasClothesWasher, 'No');
    setValue('hasClothesDryer', config.hasClothesDryer, 'Electric');
    setValue('clothesDryerType', config.clothesDryerType, 'Electric');

    // Equipment Information
    setValue('equipmentToInstall', config.equipmentToInstall, 'None');
    setValue('equipmentBrand', config.equipmentBrand);
    setValue('equipmentModel', config.equipmentModel);

    // Basic Enrollment Equipment
    setValue('measureType', config.measureType, 'Basic');
    setValue('equipmentQuantity', config.equipmentQuantity, '1');

    // Bonus Measures
    setValue('bonusMeasureType', config.bonusMeasureType, 'None');
    setValue('adjustmentNotes', config.adjustmentNotes);

    // Terms
    setValue('electronicAcceptance', config.electronicAcceptance, 'I Agree');
    setValue('priorIncentive', config.priorIncentive, 'No');

    // Uploads
    setValue('autoUploadDocs', config.autoUploadDocs, 'false');

    // Comments
    setValue('reviewComment', config.reviewComment);

    // Status
    setValue('autoAcceptLead', config.autoAcceptLead, 'true');
    setValue('finalStatus', config.finalStatus, 'Accepted');

    // Behavior
    setValue('customFieldMap', config.customFieldMap, '{}');
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
    // Customer Search
    address: getValue('address'),
    zipCode: getValue('zipCode'),

    // Customer Information
    firstName: getValue('firstName'),
    lastName: getValue('lastName'),
    phone: getValue('phone'),
    email: getValue('email'),

    // Additional Customer Information
    preferredContactTime: getValue('preferredContactTime', '1:00PM - 3:30PM'),
    language: getValue('language', 'English'),
    householdUnits: getValue('householdUnits', '1'),
    spaceOrUnit: getValue('spaceOrUnit', '1'),
    howDidYouHear: getValue('howDidYouHear', 'Contractor Outreach'),
    buildingType: getValue('buildingType', 'Residential'),
    masterMetered: getValue('masterMetered', 'Yes'),
    homeownerStatus: getValue('homeownerStatus', 'Renter/Tenant'),
    gasProvider: getValue('gasProvider', 'SoCalGas'),
    gasAccountNumber: getValue('gasAccountNumber', '1'),
    waterUtility: getValue('waterUtility', 'N/A'),
    incomeVerifiedDate: getValue('incomeVerifiedDate'),

    // Demographics
    primaryApplicantAge: getValue('primaryApplicantAge', '44'),
    ethnicity: getValue('ethnicity', 'Hispanic/Latino'),
    permanentlyDisabled: getValue('permanentlyDisabled', 'No'),
    veteran: getValue('veteran', 'No'),
    nativeAmerican: getValue('nativeAmerican', 'No'),

    // Enrollment Information
    incomeVerificationType: getValue('incomeVerificationType', 'PRISM code'),
    plus4Zip: getValue('plus4Zip'),

    // Household Members
    householdMembersCount: getValue('householdMembersCount', '1'),
    relationToApplicant: getValue('relationToApplicant', 'Applicant'),

    // Project Information
    zillowSqFt: getValue('zillowSqFt'),
    zillowYearBuilt: getValue('zillowYearBuilt'),
    projectSpaceOrUnit: getValue('projectSpaceOrUnit', '1'),

    // Trade Ally Information
    projectFirstName: getValue('projectFirstName', 'Sergio'),
    projectLastName: getValue('projectLastName', 'Correa'),
    projectTitle: getValue('projectTitle', 'Outreach'),
    projectPhone: getValue('projectPhone', '7143912727'),
    projectEmail: getValue('projectEmail'),

    // Appointment Contact
    attempt1Date: getValue('attempt1Date'),
    attempt1Time: getValue('attempt1Time', '2:00PM'),
    attempt2Date: getValue('attempt2Date'),
    attempt2Time: getValue('attempt2Time', '3:00PM'),

    // Appointments
    contractorName: getValue('contractorName', 'Sergio Correa'),
    appointmentDate: getValue('appointmentDate'),
    appointmentStatus: getValue('appointmentStatus', 'Scheduled'),
    appointmentType: getValue('appointmentType', 'On-Site Appointment'),
    appointmentStartTime: getValue('appointmentStartTime', '2:00PM'),
    appointmentEndTime: getValue('appointmentEndTime'),

    // Assessment/Equipment
    hvacSystemType: getValue('hvacSystemType', 'Natural Gas'),
    hasRoomAC: getValue('hasRoomAC', 'Yes - Room AC'),
    hasEvapCooler: getValue('hasEvapCooler', 'No'),
    refrigeratorCount: getValue('refrigeratorCount', '1'),
    fridge1Year: getValue('fridge1Year'),
    hasFreezer: getValue('hasFreezer', 'No'),
    waterHeaterFuel: getValue('waterHeaterFuel', 'Natural Gas'),
    waterHeaterSize: getValue('waterHeaterSize', '40 Gal'),
    hasDishwasher: getValue('hasDishwasher', 'No'),
    hasClothesWasher: getValue('hasClothesWasher', 'No'),
    hasClothesDryer: getValue('hasClothesDryer', 'Electric'),
    clothesDryerType: getValue('clothesDryerType', 'Electric'),

    // Equipment Information
    equipmentToInstall: getValue('equipmentToInstall', 'None'),
    equipmentBrand: getValue('equipmentBrand'),
    equipmentModel: getValue('equipmentModel'),

    // Basic Enrollment Equipment
    measureType: getValue('measureType', 'Basic'),
    equipmentQuantity: getValue('equipmentQuantity', '1'),

    // Bonus Measures
    bonusMeasureType: getValue('bonusMeasureType', 'None'),
    adjustmentNotes: getValue('adjustmentNotes'),

    // Terms
    electronicAcceptance: getValue('electronicAcceptance', 'I Agree'),
    priorIncentive: getValue('priorIncentive', 'No'),

    // Uploads
    autoUploadDocs: getValue('autoUploadDocs', 'false'),

    // Comments
    reviewComment: getValue('reviewComment'),

    // Status
    autoAcceptLead: getValue('autoAcceptLead', 'true'),
    finalStatus: getValue('finalStatus', 'Accepted'),

    // Behavior
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
      showStatus('✅ Reset to defaults!', 'success');
    });
  }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  setupTabListeners();
  document.getElementById('saveBtn').addEventListener('click', saveConfig);
  document.getElementById('resetBtn').addEventListener('click', resetToDefaults);
  loadConfig();
});
