# Live Session Worksheet - SCE Rebate Center Field Mapping

**Goal:** Capture complete field mapping and section unlock logic for automation

**When you're home, we'll spend ~15-20 minutes recording while you walk through a complete application.**

---

## Before the Session: Prepare

- [ ] Have a test application ready (or create new one)
- [ ] Have a sample address to use
- [ ] Be logged into SCE Rebate Center
- [ ] Open browser DevTools (F12) → Recorder tab

---

## During Session: Record These Things

### 1. Section Order (Click through each section, note what unlocks)

| Section | Unlocks After | Fields Present |
|---------|---------------|----------------|
| Project Information | - | SqFt, Year Built, Address, ... |
| Assessment Questionnaire | Project Info filled? | Household, Equipment, ... |
| Appointments | Questionnaire filled? | Date, Time, ... |
| Trade Ally | - | Name, License, ... |
| Customer Info | - | Name, Email, Phone, ... |
| Measures | ??? | ??? |
| Availability | ??? | ??? |

### 2. "Availability" Field - What's the Logic?

**Question:** What determines availability?

- [ ] Auto-filled from property data (what fields?)
- [ ] You manually enter after calling customer
- [ ] Combination (explain below)

```
Availability Logic:
- If (property meets criteria) AND (customer confirms) → Available
- Else → Not Available

What are the criteria?
```

### 3. Conditional Fields (What appears/disappears based on answers)

| Parent Field | Child Field | Condition |
|--------------|-------------|-----------|
| Has Attic? | Attic Access | If "Yes" |
| Has Attic? | Attic Area | If "Yes" |
| Has Crawlspace? | Crawlspace Access | If "Yes" |
| Primary Heat Source | ??? | ??? |
| ??? | ??? | ??? |

### 4. Measures - How Do They Appear?

1. Do measure options appear AFTER filling questionnaire?
2. Are measures filtered based on questionnaire answers?
3. Can you select multiple measures?
4. What happens after selecting a measure (do products appear)?

```
Measure Flow:
Step 1: ______________________
Step 2: ______________________
Step 3: ______________________
```

### 5. File Uploads - Where and What?

| Section | Upload Type | Required? | Max Files |
|---------|-------------|-----------|-----------|
| Assessment | Site Photos | Yes | ? |
| Assessment | Equipment Photos | Yes | ? |
| ??? | ??? | ??? | ??? |

### 6. Photo Types You'll Provide

- [ ] Site photos (exterior, street view, etc.)
- [ ] Equipment photos (HVAC, water heater, attic, etc.)
- [ ] After photos (after installation)
- [ ] Other: _______________

### 7. Equipment Info You'll Provide (Not in Zillow)

When you call me, you'll tell me:
- Primary heat source: _____________
- Primary cool source: _____________
- Water heater type: _______________
- Thermostat type: _________________
- Ductwork condition: ______________
- Other: ___________________________

---

## During Session: I'll Record

1. **New HAR file** - Complete application from start to finish
2. **Screenshots** - Each section with all fields visible
3. **Network requests** - To understand form validation/submission

---

## After Session: I'll Build

- [ ] Complete workflow state machine
- [ ] MCP server with tools for each step
- [ ] Field mapping for all conditional logic
- [ ] File upload automation
- [ ] Eligibility checker

---

## Quick Start for Session

1. Open Chrome
2. Press F12 (DevTools)
3. Go to "Recorder" tab
4. Click "Start new recording"
5. Name it "SCE-Full-Workflow"
6. Go through ENTIRE application (create → fill → submit)
7. Click "Stop recording"
8. Export as JSON
9. Share with me

---

## Notes

- Take it slow - I need to see each field interaction
- If something only appears after clicking, make sure to capture that click
- Note any loading spinners or delays
- If you need to contact customer during flow, pause and note where

---

**When you're ready, just say "I'm home" and we'll do the live session!**
