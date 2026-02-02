# Section-Only Fill Button Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a second button to the banner that fills only the currently active sidebar section, enabling testing of individual sections.

**Architecture:**
- Detect active sidebar section using existing `getActiveSectionTitle()`
- Map to existing workflow actions
- Fill current section only, no navigation
- Keep banner visible for re-use

**Tech Stack:** Chrome Extension MV3, Vanilla JavaScript

---

## Task 1: Update Banner HTML Structure

**Files:**
- Modify: `/home/sergio/Projects/SCE/sce-extension/content.js:2173-2186` (showBanner function)

**Step 1: Modify showBanner() to include two buttons**

Replace the banner HTML to include both "Fill All Sections" and "Fill: [Section]" buttons:

```javascript
function showBanner() {
  // Remove existing banner
  const existing = document.getElementById('sce-autofill-banner');
  if (existing) existing.remove();

  const activeTitle = getActiveSectionTitle();
  const sectionBtnText = activeTitle ? `Fill: ${activeTitle}` : 'Fill: Current Page';

  const banner = document.createElement('div');
  banner.id = 'sce-autofill-banner';
  banner.innerHTML = `
    <div class="sce-banner-content">
      <span class="sce-banner-text">📋 SCE Form Detected</span>
      <button id="sce-fill-all-btn" class="sce-btn sce-btn-primary">Fill All Sections</button>
      <button id="sce-fill-section-btn" class="sce-btn sce-btn-secondary">${sectionBtnText}</button>
      <button id="sce-dismiss-btn" class="sce-btn sce-btn-tertiary">✕</button>
    </div>
  `;
  document.body.appendChild(banner);

  // Attach event listeners
  document.getElementById('sce-fill-all-btn').addEventListener('click', () => {
    banner.classList.add('sce-filling');
    runFillForm().then(() => {
      banner.classList.add('sce-success');
      banner.querySelector('.sce-banner-text').textContent = '✅ Form Filled!';
      setTimeout(() => banner.remove(), 3000);
    });
  });

  document.getElementById('sce-fill-section-btn').addEventListener('click', () => {
    banner.classList.add('sce-filling');
    runFillCurrentSectionOnly(banner).then(() => {
      // Banner stays visible, button shows success briefly
    });
  });

  document.getElementById('sce-dismiss-btn').addEventListener('click', () => {
    banner.remove();
  });
}
```

**Step 2: Test banner appears with two buttons**

Run: Load extension, navigate to any SCE form page
Expected: Banner shows with two buttons side-by-side

**Step 3: Commit**

```bash
git add sce-extension/content.js
git commit -m "feat: add two-button banner layout for section-only filling

- Add Fill All Sections button (primary)
- Add Fill: [Section] button (secondary) with dynamic text
- Keep banner visible for re-use"
```

---

## Task 2: Add Section Button Update Function

**Files:**
- Modify: `/home/sergio/Projects/SCE/sce-extension/content.js` (after showBanner function)

**Step 1: Add updateSectionButton() function**

```javascript
// Update the section button text based on current active section
function updateSectionButton(banner) {
  const btn = banner?.querySelector('#sce-fill-section-btn');
  if (!btn) return;

  const activeTitle = getActiveSectionTitle();
  if (activeTitle) {
    btn.textContent = `Fill: ${activeTitle}`;
    btn.disabled = false;
  } else {
    btn.textContent = 'Fill: Current Page';
  }
}

// Show temporary success message on section button
function updateBannerButtonSuccess(banner) {
  const btn = banner?.querySelector('#sce-fill-section-btn');
  if (!btn) return;

  const originalText = btn.textContent;
  btn.textContent = '✅ Filled!';
  btn.classList.add('sce-success');

  setTimeout(() => {
    btn.textContent = originalText;
    btn.classList.remove('sce-success');
    updateSectionButton(banner); // Refresh to current section
  }, 2000);
}
```

**Step 2: Commit**

```bash
git add sce-extension/content.js
git commit -m "feat: add section button update and success feedback

- Add updateSectionButton() to refresh button text
- Add updateBannerButtonSuccess() for temporary success state
- Button reverts to section name after 2 seconds"
```

---

## Task 3: Implement Section-Only Fill Logic

**Files:**
- Modify: `/home/sergio/Projects/SCE/sce-extension/content.js` (before runFillForm function)

**Step 1: Add runFillCurrentSectionOnly() function**

```javascript
// Fill only the current section (for testing individual sections)
async function runFillCurrentSectionOnly(banner) {
  log('🚀 Filling current section only...');

  // Detect current section
  const currentPage = detectCurrentPage();
  const activeTitle = getActiveSectionTitle();

  log(`   📋 Current section: ${activeTitle} (${currentPage})`);

  // Get workflow array (reference existing workflow in runFillForm)
  const workflow = [
    { key: 'customer-search', name: 'Customer Search', action: fillCustomerSearch },
    { key: 'customer-information', name: 'Customer Information', action: fillCustomerInfo },
    { key: 'additional-customer-info', name: 'Additional Customer Information', action: fillAdditionalCustomerInfo },
    { key: 'enrollment-information', name: 'Enrollment Information', action: fillEnrollmentInformation },
    { key: 'project-information', name: 'Project Information', action: fillProjectInformation },
    { key: 'trade-ally-information', name: 'Trade Ally Information', action: fillTradeAllyInformation },
    { key: 'appointment-contact', name: 'Appointment Contact', action: fillAppointmentContact },
    { key: 'appointments', name: 'Appointments', action: fillCustomFieldsOnly },
    { key: 'assessment-questionnaire', name: 'Assessment Questionnaire', action: fillAssessmentQuestionnaire },
    { key: 'equipment-information', name: 'Equipment Information', action: fillCustomFieldsOnly },
    { key: 'basic-enrollment-equipment', name: 'Basic Enrollment Equipment', action: fillCustomFieldsOnly },
    { key: 'bonus-adjustment-measures', name: 'Bonus/Adjustment Measures', action: fillCustomFieldsOnly },
    { key: 'review-terms', name: 'Review Terms and Conditions', action: fillCustomFieldsOnly },
    { key: 'file-uploads', name: 'File Uploads', action: fillCustomFieldsOnly },
    { key: 'review-comments', name: 'Review Comments', action: fillCustomFieldsOnly },
    { key: 'measure-info', name: 'Measure Info', action: fillMeasureInfoPhase },
    { key: 'summary-info', name: 'Summary Info', action: fillSummaryInfo },
    { key: 'application-status', name: 'Application Status', action: acceptLead }
  ];

  // Find matching workflow entry
  const step = workflow.find(s => s.key === currentPage);

  if (!step) {
    log('  ⚠️ Section not supported for single-fill');
    updateBannerButtonError(banner, 'Section not supported');
    return;
  }

  // Wait for Angular stability
  await waitForAngularStability(3000);

  // Execute the fill action for this section only
  try {
    if (step.action === fillCustomFieldsOnly) {
      const sectionTitle = step.name || activeTitle;
      await fillCustomFieldsForSection(sectionTitle);
    } else if (step.action === fillMeasureInfoPhase) {
      await fillHouseholdMembers();
      await createAppointment();
    } else {
      await step.action();
    }

    // Also fill custom fields for this section
    const sectionTitle = step.name || activeTitle;
    if (step.action !== fillCustomFieldsOnly) {
      await fillCustomFieldsForSection(sectionTitle);
    }

    // Show success
    log(`✅ ${activeTitle} filled!`);
    updateBannerButtonSuccess(banner);
  } catch (err) {
    log(`  ⚠️ Error: ${err.message}`);
    updateBannerButtonError(banner, err.message);
  }
}

// Helper to show error on banner
function updateBannerButtonError(banner, message) {
  const btn = banner?.querySelector('#sce-fill-section-btn');
  if (!btn) return;

  btn.textContent = `⚠️ Error`;
  btn.classList.add('sce-error');

  setTimeout(() => {
    btn.classList.remove('sce-error');
    updateSectionButton(banner);
  }, 3000);
}
```

**Step 2: Commit**

```bash
git add sce-extension/content.js
git commit -m "feat: implement section-only fill logic

- Add runFillCurrentSectionOnly() function
- Maps current section to appropriate fill action
- Shows success/error feedback on button
- No navigation after filling - stays on current section"
```

---

## Task 4: Add CSS Styling for Two-Button Layout

**Files:**
- Modify: `/home/sergio/Projects/SCE/sce-extension/banner.css`

**Step 1: Update banner CSS**

```css
.sce-banner-content {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.sce-btn {
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight:  600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.sce-btn-primary {
  background: #4CAF50;
  color: white;
}

.sce-btn-secondary {
  background: #2196F3;
  color: white;
}

.sce-btn-tertiary {
  background: #f5f5f5;
  color: #666;
  padding: 10px 12px;
}

.sce-btn.success {
  background: #4CAF50;
}

.sce-btn.error {
  background: #f44336;
}

.sce-filling .sce-btn {
  opacity: 0.7;
  pointer-events: none;
}
```

**Step 2: Commit**

```bash
git add sce-extension/banner.css
git commit -m "style: add two-button layout for banner

- Flexbox layout with gap
- Separate button styles for primary/secondary/tertiary
- Success and error states
- Responsive wrapping"
```

---

## Task 5: Add Sidebar Change Detection (Optional Enhancement)

**Files:**
- Modify: `/home/sergio/Projects/SCE/sce-extension/content.js`

**Step 1: Add MutationObserver for sidebar changes**

```javascript
// Watch for sidebar section changes and update button text
function setupSidebarObserver(banner) {
  const sidebar = document.querySelector('.sections-menu');
  if (!sidebar) return;

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes' &&
          mutation.target.classList?.contains('active')) {
        updateSectionButton(banner);
        break;
      }
    }
  });

  observer.observe(sidebar, {
    attributes: true,
    subtree: true,
    attributeFilter: ['class']
  });

  return observer;
}

// Call this in showBanner() after creating banner:
// const observer = setupSidebarObserver(banner);
// Store observer reference to disconnect when banner is removed
```

**Step 2: Commit**

```bash
git add sce-extension/content.js
git commit -m "feat: add sidebar change observer for dynamic button updates

- Add MutationObserver to watch sidebar class changes
- Update section button text when user navigates
- Auto-disconnect when banner removed"
```

---

## Testing

**Manual Test Steps:**

1. **Load extension** and navigate to Assessment Questionnaire page
2. **Verify banner shows**: "Fill: Assessment Questionnaire" button visible
3. **Click "Fill: Assessment Questionnaire"** button
4. **Verify**: Form fills, button shows "✅ Filled!" briefly, then reverts
5. **Navigate to different section** (e.g., Equipment Information)
6. **Verify**: Button text updates to "Fill: Equipment Information"
7. **Click "Fill All Sections"** to verify full workflow still works

**Edge Cases to Test:**
- Customer Search page (no sidebar) - button should show "Fill: Current Page"
- Measure Info page (in workflow but no sidebar) - should work correctly
- Clicking section button on unsupported page - should show error message

---

## Files Modified

- `/home/sergio/Projects/Sce/sce-extension/content.js` - Main logic
- `/home/sergio/Projects/SCE/sce-extension/banner.css` - Styling

---

## Summary

This implementation adds a section-only fill capability for testing individual sidebar sections. The banner now shows two buttons, with the section button dynamically updating based on the active sidebar section. After filling, the banner remains visible for reuse, and the button shows temporary success feedback.
