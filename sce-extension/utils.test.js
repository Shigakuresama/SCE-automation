import assert from 'assert';

import './utils.js';

const utils = globalThis.SCEAutoFillUtils;

assert.ok(utils, 'SCEAutoFillUtils should be defined');

// ============================================
// normalizeLabel tests
// ============================================
console.log('Testing normalizeLabel...');

// Basic wildcard removal
assert.strictEqual(utils.normalizeLabel('* Total Sq.Ft.'), 'Total Sq.Ft.');
assert.strictEqual(utils.normalizeLabel('* Name of Household Member'), 'Name of Household Member');

// Trailing colon removal
assert.strictEqual(utils.normalizeLabel('Total Sq.Ft.:'), 'Total Sq.Ft.');
assert.strictEqual(utils.normalizeLabel('Total Sq.Ft. :'), 'Total Sq.Ft.');
assert.strictEqual(utils.normalizeLabel('Test:'), 'Test');

// Multiple wildcards - only first * is removed, spaces remain
assert.strictEqual(utils.normalizeLabel('**  Test'), '*  Test');

// Empty/null handling
assert.strictEqual(utils.normalizeLabel(''), '');
assert.strictEqual(utils.normalizeLabel(null), '');
assert.strictEqual(utils.normalizeLabel(undefined), '');

// Whitespace only
assert.strictEqual(utils.normalizeLabel('   '), '');
assert.strictEqual(utils.normalizeLabel('  test  '), 'test');

console.log('✓ normalizeLabel tests passed');

// ============================================
// sectionTitleToKey tests
// ============================================
console.log('Testing sectionTitleToKey...');

// All 16 section mappings
assert.strictEqual(utils.sectionTitleToKey('Customer Information'), 'customer-information');
assert.strictEqual(utils.sectionTitleToKey('Additional Customer Information'), 'additional-customer-info');
assert.strictEqual(utils.sectionTitleToKey('Enrollment Information'), 'enrollment-information');
assert.strictEqual(utils.sectionTitleToKey('Household Members'), 'household-members');
assert.strictEqual(utils.sectionTitleToKey('Project Information'), 'project-information');
assert.strictEqual(utils.sectionTitleToKey('Trade Ally Information'), 'trade-ally-information');
assert.strictEqual(utils.sectionTitleToKey('Appointment Contact'), 'appointment-contact');
assert.strictEqual(utils.sectionTitleToKey('Appointments'), 'appointments');
assert.strictEqual(utils.sectionTitleToKey('Assessment Questionnaire'), 'assessment-questionnaire');
assert.strictEqual(utils.sectionTitleToKey('Equipment Information'), 'equipment-information');
assert.strictEqual(utils.sectionTitleToKey('Basic Enrollment Equipment'), 'basic-enrollment-equipment');
assert.strictEqual(utils.sectionTitleToKey('Bonus/Adjustment Measure(s)'), 'bonus-adjustment-measures');
assert.strictEqual(utils.sectionTitleToKey('Review Terms and Conditions'), 'review-terms');
assert.strictEqual(utils.sectionTitleToKey('File Uploads'), 'file-uploads');
assert.strictEqual(utils.sectionTitleToKey('Review Comments'), 'review-comments');
assert.strictEqual(utils.sectionTitleToKey('Application Status'), 'application-status');

// Unknown title fallback
assert.strictEqual(utils.sectionTitleToKey('Nonexistent Section'), 'unknown');
assert.strictEqual(utils.sectionTitleToKey(''), 'unknown');

console.log('✓ sectionTitleToKey tests passed');

// ============================================
// keyToSectionTitle tests (reverse lookup)
// ============================================
console.log('Testing keyToSectionTitle...');

// Test reverse mappings
assert.strictEqual(utils.keyToSectionTitle('customer-information'), 'Customer Information');
assert.strictEqual(utils.keyToSectionTitle('household-members'), 'Household Members');
assert.strictEqual(utils.keyToSectionTitle('project-information'), 'Project Information');
assert.strictEqual(utils.keyToSectionTitle('file-uploads'), 'File Uploads');

// Unknown key returns empty string
assert.strictEqual(utils.keyToSectionTitle('nonexistent-key'), '');

console.log('✓ keyToSectionTitle tests passed');

// ============================================
// addHoursToTime tests - Valid inputs
// ============================================
console.log('Testing addHoursToTime (valid inputs)...');

// Basic addition
assert.strictEqual(utils.addHoursToTime('2:00PM', 1), '3:00PM');
assert.strictEqual(utils.addHoursToTime('2:00PM', 2), '4:00PM');
assert.strictEqual(utils.addHoursToTime('11:30AM', 1), '12:30PM');

// Midnight rollover - critical edge cases
assert.strictEqual(utils.addHoursToTime('11:30PM', 1), '12:30AM');
assert.strictEqual(utils.addHoursToTime('11:59PM', 1), '12:59AM');
assert.strictEqual(utils.addHoursToTime('12:59AM', 1), '1:59AM');
assert.strictEqual(utils.addHoursToTime('12:00AM', 12), '12:00PM');
assert.strictEqual(utils.addHoursToTime('11:59PM', 13), '12:59PM');
assert.strictEqual(utils.addHoursToTime('11:00PM', 2), '1:00AM');
assert.strictEqual(utils.addHoursToTime('11:59PM', 0), '11:59PM');

// Noon boundary
assert.strictEqual(utils.addHoursToTime('11:00AM', 1), '12:00PM');
assert.strictEqual(utils.addHoursToTime('12:00PM', 1), '1:00PM');
assert.strictEqual(utils.addHoursToTime('12:00PM', 12), '12:00AM');

// Format variations (optional minutes, case-insensitive)
assert.strictEqual(utils.addHoursToTime('2PM', 1), '3:00PM');
assert.strictEqual(utils.addHoursToTime('2:00pm', 1), '3:00PM');
assert.strictEqual(utils.addHoursToTime('2:00 pm', 1), '3:00PM');
assert.strictEqual(utils.addHoursToTime('2 pm', 1), '3:00PM');

console.log('✓ addHoursToTime (valid inputs) tests passed');

// ============================================
// addHoursToTime tests - Invalid inputs
// ============================================
console.log('Testing addHoursToTime (invalid inputs)...');

// Empty/whitespace
assert.strictEqual(utils.addHoursToTime('', 1), '');
assert.strictEqual(utils.addHoursToTime('   ', 1), '');

// Invalid format
assert.strictEqual(utils.addHoursToTime('invalid', 1), '');
// Note: Function wraps hours via modulo, doesn't validate 1-12 range
// 25:00PM → (25%12=1, PM=+12) = 13:00 → +1hr = 14:00 → 2:00PM
assert.strictEqual(utils.addHoursToTime('25:00PM', 1), '2:00PM');
// Minutes overflow is normalized: 2:60PM → 3:00PM
assert.strictEqual(utils.addHoursToTime('2:60PM', 0), '3:00PM');
assert.strictEqual(utils.addHoursToTime('2:00', 1), '');    // Missing AM/PM
assert.strictEqual(utils.addHoursToTime('2:00XM', 1), '');  // Invalid meridiem

// Null/undefined
assert.strictEqual(utils.addHoursToTime(null, 1), '');
assert.strictEqual(utils.addHoursToTime(undefined, 1), '');

// Invalid hours (negative, large)
assert.strictEqual(utils.addHoursToTime('2:00PM', -1), '1:00PM'); // Negative works (modulo)
assert.strictEqual(utils.addHoursToTime('2:00PM', 100), '6:00PM'); // Large hours wraps around

console.log('✓ addHoursToTime (invalid inputs) tests passed');

console.log('');
console.log('=====================================');
console.log('✅ ALL TESTS PASSED!');
console.log('=====================================');
