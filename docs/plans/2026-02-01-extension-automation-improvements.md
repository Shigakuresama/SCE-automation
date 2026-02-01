# Extension Automation Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve SCE Chrome extension reliability and coverage by adding shared utilities, sidebar-based navigation/detection, better proxy handling, stronger input setting, and broader section automation.

**Architecture:** Introduce a small shared utils module loaded before the content script, then refactor content/popup logic to rely on sidebar section titles and consistent label-based fill helpers. Expand automation via configurable per-section field maps and explicit household member support.

**Tech Stack:** Chrome MV3 extension (vanilla JS), Playwright automation repo, Node.js for utility tests.

---

### Task 1: Add shared utils module + tests

**Files:**
- Create: `sce-extension/utils.js`
- Create: `sce-extension/utils.test.js`
- Modify: `sce-extension/manifest.json`

**Step 1: Write the failing test**

```js
import assert from 'assert';
import utils from './utils.js';

assert.strictEqual(utils.normalizeLabel('* Total Sq.Ft.'), 'Total Sq.Ft.');
assert.strictEqual(utils.sectionTitleToKey('Enrollment Information'), 'enrollment-information');
assert.strictEqual(utils.addHoursToTime('2:00PM', 1), '3:00PM');
```

**Step 2: Run test to verify it fails**

Run: `node sce-extension/utils.test.js`
Expected: FAIL with “Cannot find module './utils.js'”

**Step 3: Write minimal implementation**

```js
(function (root) {
  const utils = {
    normalizeLabel(text) {
      return String(text || '')
        .replace(/^\*\s*/, '')
        .replace(/\s*:\s*$/, '')
        .trim();
    },
    sectionTitleToKey(title) {
      const map = {
        'Customer Information': 'customer-information',
        'Additional Customer Information': 'additional-customer-info',
        'Enrollment Information': 'enrollment-information',
        'Household Members': 'household-members',
        'Project Information': 'project-information',
        'Trade Ally Information': 'trade-ally-information',
        'Appointment Contact': 'appointment-contact',
        'Appointments': 'appointments',
        'Assessment Questionnaire': 'assessment-questionnaire',
        'Equipment Information': 'equipment-information',
        'Basic Enrollment Equipment': 'basic-enrollment-equipment',
        'Bonus/Adjustment Measure(s)': 'bonus-adjustment-measures',
        'Review Terms and Conditions': 'review-terms',
        'File Uploads': 'file-uploads',
        'Review Comments': 'review-comments',
        'Application Status': 'application-status'
      };
      return map[title] || 'unknown';
    },
    addHoursToTime(time, hours) {
      // parse 1:30PM or 1:30 PM
      const match = String(time || '').match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
      if (!match) return '';
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2] || '0', 10);
      const mer = match[3].toUpperCase();
      h = (h % 12) + (mer === 'PM' ? 12 : 0);
      let total = h * 60 + m + hours * 60;
      total = (total + 24 * 60) % (24 * 60);
      let outH = Math.floor(total / 60);
      const outM = total % 60;
      const outMer = outH >= 12 ? 'PM' : 'AM';
      outH = outH % 12 || 12;
      return `${outH}:${String(outM).padStart(2, '0')}${outMer}`;
    }
  };

  if (typeof module !== 'undefined') {
    module.exports = utils;
  }
  root.SCEAutoFillUtils = utils;
})(typeof window !== 'undefined' ? window : globalThis);
```

**Step 4: Run test to verify it passes**

Run: `node sce-extension/utils.test.js`
Expected: PASS (no output)

**Step 5: Commit**

```bash
git add sce-extension/utils.js sce-extension/utils.test.js sce-extension/manifest.json
git commit -m "feat: add shared utils for extension"
```

---

### Task 2: Sidebar-based detection + navigation

**Files:**
- Modify: `sce-extension/content.js`
- Modify: `sce-extension/popup.js`

**Step 1: Write the failing test**

```js
import assert from 'assert';
import utils from './utils.js';

assert.strictEqual(utils.sectionTitleToKey('File Uploads'), 'file-uploads');
```

**Step 2: Run test to verify it fails**

Run: `node sce-extension/utils.test.js`
Expected: FAIL if mapping missing

**Step 3: Write minimal implementation**

- Add sidebar helpers in `content.js`:
  - `getActiveSectionTitle()` from `.sections-menu-item.active .sections-menu-item__title`
  - `goToSectionTitle(title)` clicking `.sections-menu-item__title` text
- Update `detectCurrentPage()` to prefer sidebar title → `SCEAutoFillUtils.sectionTitleToKey`
- Update `clickNext()` to fall back to `goToSectionTitle()` if Next button not found
- Update popup detection to display section title when available and handle `chrome.runtime.lastError`

**Step 4: Run test to verify it passes**

Run: `node sce-extension/utils.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add sce-extension/content.js sce-extension/popup.js
git commit -m "feat: add sidebar-based detection and navigation"
```

---

### Task 3: Reliability fixes (selectors, inputs, proxy)

**Files:**
- Modify: `sce-extension/content.js`

**Step 1: Write the failing test**

```js
import assert from 'assert';
import utils from './utils.js';

assert.strictEqual(utils.addHoursToTime('11:30PM', 1), '12:30AM');
```

**Step 2: Run test to verify it fails**

Run: `node sce-extension/utils.test.js`
Expected: FAIL if time math is wrong

**Step 3: Write minimal implementation**

- Replace invalid `:has-text()` selector in appointment add button with text-based search.
- Use `setInputValue()` for customer search address/zip inputs.
- Add proxy status TTL (e.g., recheck every 30s, reset to null after failures).

**Step 4: Run test to verify it passes**

Run: `node sce-extension/utils.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add sce-extension/content.js sce-extension/utils.js sce-extension/utils.test.js
git commit -m "fix: harden selectors, proxy status, and input handling"
```

---

### Task 4: Appointment time improvements + config UI

**Files:**
- Modify: `sce-extension/content.js`
- Modify: `sce-extension/options.html`
- Modify: `sce-extension/options.js`

**Step 1: Write the failing test**

```js
import assert from 'assert';
import utils from './utils.js';

assert.strictEqual(utils.addHoursToTime('2:00PM', 1), '3:00PM');
```

**Step 2: Run test to verify it fails**

Run: `node sce-extension/utils.test.js`
Expected: FAIL if implementation missing

**Step 3: Write minimal implementation**

- Add `appointmentEndTime` to config defaults and options UI.
- In `createAppointment()`, use `appointmentEndTime` if set, else compute from start time.

**Step 4: Run test to verify it passes**

Run: `node sce-extension/utils.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add sce-extension/content.js sce-extension/options.html sce-extension/options.js
git commit -m "feat: add appointment end time support"
```

---

### Task 5: Expand section coverage (household members + custom field maps)

**Files:**
- Modify: `sce-extension/content.js`
- Modify: `sce-extension/options.html`
- Modify: `sce-extension/options.js`

**Step 1: Write the failing test**

```js
import assert from 'assert';
import utils from './utils.js';

assert.strictEqual(utils.normalizeLabel('* Name of Household Member'), 'Name of Household Member');
```

**Step 2: Run test to verify it fails**

Run: `node sce-extension/utils.test.js`
Expected: FAIL if normalize not applied

**Step 3: Write minimal implementation**

- Add config for `householdMembers` (array) and basic fields for Member 1 (name/age) in options.
- Implement `fillHouseholdMembers()` using label-based fill for “Name of Household Member” and “Household Member Age”, clicking “Add & Continue” when present.
- Add `customFieldMap` (JSON) in options for per-section label → value mapping.
- Add generic `fillCustomFieldsForSection(sectionTitle)` that uses inputs or selects based on label lookup.
- Wire new sections in `runFillForm()` to call `fillCustomFieldsForSection` for Enrollment, Equipment, Basic Enrollment Equipment, Bonus/Adjustment, Review Terms, File Uploads, Review Comments.

**Step 4: Run test to verify it passes**

Run: `node sce-extension/utils.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add sce-extension/content.js sce-extension/options.html sce-extension/options.js
git commit -m "feat: add household members and custom field mapping"
```

---

### Task 6: Final verification

**Files:**
- None

**Step 1: Run validation check (existing tool)**

Run: `node tools/validate.js /tmp/validate-case.json`
Expected: PASS (validation succeeded)

**Step 2: Quick manual smoke checklist**

- Open SCE page → banner shows active section title
- Popup shows active section and handles non-SCE tabs gracefully
- Customer Search fills via consistent input events
- Project Information fills Sq.Ft/Year Built from proxy or config
- Household Members section fills name/age if configured

**Step 3: Commit (if needed)**

```bash
# Only if step 2 required changes
git add -A
git commit -m "chore: finalize extension improvements"
```

