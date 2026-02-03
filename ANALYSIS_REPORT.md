# SCE Rebate Center - Workflow Analysis Report

**Date:** 2026-01-29
**Application:** SCE Rebate Center (sce.dsmcentral.com/onsite)
**Analysis Based On:** 2 clickstream recordings + HAR file (175MB)

---

## 1. Executive Summary

### Top 5 Bottlenecks Identified
1. **Repeated navigation through 16+ section menu items** - no quick jump to next section
2. **Manual data re-entry from external sources** (Zillow for property info)
3. **Multiple "Add & Continue" dialogs** requiring confirmation after each product selection
4. **Photo upload workflow** - requires navigating to specific section, selecting files individually
5. **No bulk fill for similar measures** - each room/space requires individual entry

### Top 5 Automation Opportunities
1. **Property data pre-fill** - scrape Zillow/assessor records → auto-fill SqFt, Year Built, etc.
2. **Section navigation shortcuts** - jump to next incomplete section
3. **Measure templates** - pre-configured room/equipment combinations
4. **Bulk photo uploader** - drag-drop multiple photos with auto-tagging
5. **Auto-save with debouncing** - eliminate repetitive "Add & Continue" confirmations

---

## 2. Section Menu Structure (From Clickstream Analysis)

Based on selector patterns (`li:nth-of-type(N)`), at least **16 menu sections** exist:

| # | Section Name | Status Icon | Notes |
|---|-------------|-------------|-------|
| 1 | *(unnamed)* | - | Likely summary/home |
| 2 | **Appointments** | - | Scheduling section |
| 3 | **Trade Ally Information** | - | Contractor info |
| 4 | **Additional Customer Information** | - | Customer details |
| 5 | *(unnamed)* | `panorama_fish_eye` | In progress indicator |
| 6-7 | *(unnamed)* | - | |
| 8 | **Project Information** | `check_circle` | Completed ✓ |
| 9 | **Assessment Questionnaire** | `panorama_fish_eye` | Main form section |
| 10-16 | Various sections | - | Including Basic Enrollment (#11) |

**Selector Pattern:** `app-new-estimated-right-sidebar > div[2] > div[3] > ul > li[N]`

---

## 3. Key Form Fields & Data Flow

### Property Information (from Zillow lookup)
```json
{
  "Total Sq.Ft.": "mat-input-92",
  "Year Built": "mat-input-93",
  "Address": "1909 W Martha Ln, Santa Ana, CA 92706"
}
```

### Household Information
- Name of Household Member (text)
- Household Member Age (number)

### Equipment Inventory
- Existing Refrigerator 1 (manufacturer year)
- Existing HVAC Equipment (dropdown: "Central HVAC-Package-2.0 Ton" through "5.0 Ton")
- Central heating system type (gas/electric)
- Central heating location

### Dynamic Options (from API)
Field ID: `FORM-159345108-181991091-182060655-182041038-2-Task_Instances_Attributes-182040938-ExistingHVACEquipment1`

Options:
- Central HVAC-Package-2.0/2.5/3.0/3.5/4.0/5.0 Ton
- Central HVAC-Split-2.0/2.5/3.0/3.5/4.0/5.0 Ton

---

## 4. API Endpoints (From HAR Analysis)

### Key APIs
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/traksmart4/public/onsite/dynamicOptions.json` | POST | Get dropdown options for fields |
| `/traksmart4/public/onsite/form/saveAndCalculate.json` | POST | Save form data, recalculate |
| `/traksmart4/public/onsite/customer_applications.json` | POST | List/filter applications |
| `/traksmart4/public/onsite/spaces.json?projectId=X&programId=Y` | GET | Get space/room data |
| `/traksmart4/public/onsite/v2/program/{id}/form/{id}/section/{id}/measure/categories.json` | GET | Get measure categories |

### Request Pattern Example (customer_applications)
```json
{
  "start": 0,
  "limit": 10,
  "sort": {
    "property": "lastUpdateDate",
    "direction": "DESC"
  },
  "excludeCompleted": true,
  "filters": []
}
```

---

## 5. Evidence-First Rules Extraction

### HYPOTHESIS - Section Visibility Rules
*Status: Requires additional evidence*

The HAR file did not contain response bodies (recorded with minimal payload). To determine:
- What makes sections appear/disappear
- Eligibility criteria for measures
- Required document triggers

**Missing Evidence Needed:**
1. Response payloads from `saveAndCalculate.json` - likely returns section visibility state
2. Comparison of two applications (qualified vs not qualified)
3. Form definition JSON with validation rules
4. Initial application state vs. final state

### Observed Section Unlock Triggers (From Clickstream)
- **Adding a product/measures** → appears to enable subsequent sections
- **Completing Questionnaire** → unlocks Project Information section (shows `check_circle`)
- **File uploads** → may unlock document review sections

---

## 6. Automation Recommendations

### Quick Wins (No-Code)

1. **Text Expander Snippets**
   ```
   ;sqt → [Tab to Total Sq.Ft. field]
   ;yb → [Tab to Year Built field]
   ;adr → [Paste address format]
   ```

2. **Browser Bookmarklets**
   ```javascript
   // Jump to next incomplete section
   javascript:(() => {
     const items = document.querySelectorAll('.sections-menu-item__title');
     for (let item of items) {
       if (!item.closest('li').classList.contains('completed')) {
         item.click();
         break;
       }
     }
   })();

   // Auto-dismiss "Add & Continue" dialog
   javascript:(() => {
     const btn = document.querySelector('div.cdk-overlay-container button');
     if (btn && btn.textContent.includes('Add & Continue')) {
       btn.click();
     }
   })();
   ```

3. **File Naming Convention**
   ```
   {appNumber}_{section}_{description}.{ext}
   Example: 75114801_HVAC_ExistingUnit.jpg
   ```

### Mid-Effort (User Script)

**Tampermonkey Script Concept:**
```javascript
// ==UserScript==
// @name         SCE Rebate Center Helper
// @match        https://sce.dsmcentral.com/onsite/*
// ==/UserScript==

// Features:
// 1. Keyboard shortcuts (Ctrl+S to save, Ctrl+→ next section)
// 2. Auto-fill from clipboard (JSON format)
// 3. Highlight required fields
// 4. Skip "Add & Continue" confirmations
// 5. Bulk photo upload with room tagging
```

### Long-Term (Playwright Automation)

```typescript
// sce-automation.spec.ts
import { test } from '@playwright/test';

test('complete HVAC assessment', async ({ page }) => {
  await page.goto('https://sce.dsmcentral.com/onsite/projects');

  // Search by application number
  await page.fill('[aria*="Find Assessments"]', appId);
  await page.press('[aria*="Find Assessments"]', 'Enter');

  // Load case data from JSON
  const caseData = loadCaseData(appId);

  // Fill Project Information
  await fillSection('Project Information', caseData.projectInfo);

  // Fill Assessment Questionnaire
  await fillSection('Assessment Questionnaire', caseData.questionnaire);

  // Add measures from template
  await addMeasures(caseData.measures);

  // Upload photos in batch
  await uploadPhotos(caseData.photos);

  // Verify completion
  await expect(page.locator('li:nth-of-type(8)')).toHaveClass(/completed/);
});
```

---

## 7. Case Packet Structure (Recommended)

```
CasePackets/
├── {date}__{appId}__{address}/
│   ├── intake.md                 # Goal, constraints, notes
│   ├── inputs/
│   │   ├── client_data.json      # Household, property info
│   │   ├── measure_plan.json     # Selected measures/quantities
│   │   └── property_lookup.json  # Zillow/assessor data
│   ├── evidence/
│   │   ├── network.har           # (if available with bodies)
│   │   ├── api_responses/        # Key API responses
│   │   ├── screenshots/          # Section states
│   │   └── dom_snippets/         # Field selectors
│   ├── uploads/
│   │   ├── photos/
│   │   │   ├── hvac_existing_1.jpg
│   │   │   ├── hvac_existing_2.jpg
│   │   │   └── attic_access.jpg
│   │   └── docs/
│   │       ├── invoice.pdf
│   │       └── license.pdf
│   └── outputs/
│       ├── rules_table.md        # Section visibility rules
│       ├── run_logs/             # Automation execution logs
│       └── errors.md             # Validation errors/issues
```

---

## 8. Standing Questions (Requiring Additional Evidence)

1. **What is the exact success state?** Save vs Submit vs Approval?
   - Need API response showing status transitions

2. **Eligibility criteria?** What makes a client qualify for specific measures?
   - Need comparison: qualified vs. not qualified cases
   - Need response payload from eligibility check endpoint

3. **Required documents per measure?**
   - Need document list API response

4. **Which fields trigger section unlocks?**
   - Need before/after state comparison
   - Need form definition with dependency rules

5. **Rate limits / session timeouts?**
   - Need to test MFA expiry timing

---

## 9. Missing Artifacts Required for Full Automation

| Artifact | Purpose | Current Status |
|----------|---------|----------------|
| HAR with response bodies | API response analysis | Not available (HAR was 175MB but bodies empty) |
| Form definition JSON | Field validation rules | Need to capture |
| Eligibility API response | Qualification logic | Need to capture |
| Qualified vs. unqualified case | Rule comparison | Not available |
| Document requirements list | Upload automation | Need to capture |
| Section state transitions | Visibility rules | Need to capture |

---

## 10. Data Collection Instructions

For future captures, please include:

1. **Browser DevTools Network Tab**
   - Right-click → Save all as HAR with content
   - Ensure "Preserve log" is checked
   - Include response bodies

2. **Two comparable cases**
   - One qualified for measures
   - One NOT qualified
   - Redact PII but preserve structure

3. **Screenshots**
   - Section menu at each state
   - Validation errors
   - Confirmation dialogs

4. **Clickstream recording** of complete workflow
   - From login to submission
   - Including error conditions

---

## 11. Stable Selectors for Automation

| Element | Stable Selector | Avoid |
|---------|----------------|-------|
| Section menu items | `li.sections-menu-item` | `li:nth-of-type(N)` |
| Section titles | `.sections-menu-item__title` | Text-based selectors |
| Input fields | `aria-label` or `aria-*` attributes | `#mat-input-N` |
| Save button | `aria/Save` or `button[svg="backup"]` | `button:nth-of-type(N)` |
| Add & Continue | `text/Add & Continue` | `div.cdk-overlay-container button` |

---

## Appendix: Clickstream Statistics

**Recording 1 (Jan 28, 7:29 PM)**
- Duration: ~50 minutes
- Total steps: 2000+
- Navigation events: 3
- Form changes: 100+
- Section clicks: 25+
- File uploads: 1

**Recording 2 (Jan 29, 12:30 PM)**
- Targeted measure info page
- Focus on household member entry
- Product selection workflow

---

*Report generated by Claude Code Automation Analysis*
