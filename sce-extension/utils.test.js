import assert from 'assert';

import './utils.js';

const utils = globalThis.SCEAutoFillUtils;

assert.ok(utils, 'SCEAutoFillUtils should be defined');
assert.strictEqual(utils.normalizeLabel('* Total Sq.Ft.'), 'Total Sq.Ft.');
assert.strictEqual(utils.sectionTitleToKey('Enrollment Information'), 'enrollment-information');
assert.strictEqual(utils.sectionTitleToKey('File Uploads'), 'file-uploads');
assert.strictEqual(utils.addHoursToTime('2:00PM', 1), '3:00PM');
assert.strictEqual(utils.addHoursToTime('11:30PM', 1), '12:30AM');
assert.strictEqual(utils.normalizeLabel('* Name of Household Member'), 'Name of Household Member');
