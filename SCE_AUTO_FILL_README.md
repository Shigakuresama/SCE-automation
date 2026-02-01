# SCE Rebate Center - Complete Automation

## 🎯 What This Script Does

1. **Prompts you for everything interactively** - no config file editing needed!
2. **Scrapes Zillow** for property data (Year Built, Sq Ft, etc.)
3. **Extracts Customer Name** from SCE page → generates random email
4. **Copies Alternate Phone** to Contact Phone field
5. **Fills all 9 form sections** with fixed/configurable values
6. **Stays open** for your review after completion

## 📋 What You'll Be Asked (All Interactive!)

When you run the script, it will ask you:

```
Enter street address (e.g., 22029 Seine Ave): [YOU TYPE]
Enter zip code (e.g., 90716): [YOU TYPE]
⏰ Appointment Start Time (e.g., 1:00PM) [1:00PM]: [YOU TYPE OR PRESS ENTER]
⏰ Appointment End Time (e.g., 3:30PM) [3:30PM]: [YOU TYPE OR PRESS ENTER]
📅 Income Verified Date (e.g., 01/31/2026): [YOU TYPE]
👤 Primary Applicant Age (e.g., 43): [YOU TYPE]
🌍 Language (e.g., Spanish, English) [Spanish]: [YOU TYPE OR PRESS ENTER]
🌍 Ethnicity (e.g., Hispanic/Latino): [YOU TYPE]
👤 Your First Name (e.g., Sergio) [Sergio]: [YOU TYPE OR PRESS ENTER]
📱 Your Phone (e.g., 7143912727): [YOU TYPE]

🔧 Override defaults? (y/n) [n]: [TYPE y TO CUSTOMIZE MORE]
```

**Press Enter** to use the [default] values shown in brackets.

### **Optional Overrides (if you type "y"):**
```json
{
  "userProvided": {
    "appointmentStartTime": "1:00PM",     // ⚠️ CONFIGURE THIS
    "appointmentEndTime": "3:30PM",       // ⚠️ CONFIGURE THIS
    "incomeVerifiedDate": "01/31/2026",   // ⚠️ CONFIGURE THIS
    "primaryApplicantAge": "43",           // ⚠️ CONFIGURE THIS
    "language": "Spanish",                 // ⚠️ CONFIGURE THIS
    "ethnicity": "Hispanic/Latino",        // ⚠️ CONFIGURE THIS
    "projectContactFirstName": "Sergio",   // ⚠️ YOUR NAME
    "projectContactPhone": "7143912727"    // ⚠️ YOUR PHONE
  }
}
```

## 🚀 Usage

### **Step 1: Open Chrome with remote debugging**

Close all Chrome windows, then run:

```bash
google-chrome --remote-debugging-port=9222
# OR
chromium --remote-debugging-port=9222
```

Leave Chrome running in the background.

### **Step 2: Run the automation**

```bash
cd /home/sergio/Projects/SCE/playwright-automation
node sce-auto-fill.js
```

### **Step 3: Answer the prompts**

The script will interactively ask for all the information it needs!

## 📁 All 9 Sections Handled

| # | Section | Key Fields | Source |
|---|---------|------------|--------|
| 1 | Customer Information | Email (generated), Phone (copied), Contact Name | Auto-extracted |
| 2 | Additional Customer Info | Household Units | Config: "2" |
| 3 | Enrollment Information | Project Contact (your info) | Config |
| 4 | Project Information | Space Or Unit, Year Built, Sq Ft | Zillow + Config |
| 5 | Trade Ally Information | - | Skipped/Fixed |
| 6 | Appointment Contact | Appointment type, time, status | Config |
| 7 | Assessment Questionnaire | **Many dropdowns** (see below) | Config + Fixed |
| 8 | Review Comments | - | Skipped |
| 9 | Application Status | - | Auto-filled |

## 📝 Assessment Questionnaire Fields

All filled automatically (prompted at runtime or fixed):

| Field | Value | Source |
|-------|-------|--------|
| How did you hear about us | "Other" | Fixed (or override if prompted) |
| Native American | "No" | Fixed |
| Permanently disabled household members | "No" | Fixed |
| Water Utility | "N/A" | Fixed |
| Gas Provider | "SoCalGas" | Fixed |
| Gas Account Number | "1" | Fixed |
| Primary Applicant Age | *[You provide at runtime]* | Interactive prompt |
| Language | *[You provide at runtime]* | Interactive prompt |
| Ethnicity | *[You provide at runtime]* | Interactive prompt |
| Master Metered | "Yes" | Fixed |
| Building Type | "Residential mobile home" | Fixed |
| Income Verification Type | "PRIZM Code" | Fixed |
| Income Verified Date | *[You provide at runtime]* | Interactive prompt |
| Enter Plus 4 | Auto-filled from mailing zip | Auto-extracted |

## ✅ Fixed Values (No Configuration Needed)

- Project Contact Title: **"Outreach"** (always)
- Appointment Type: **"On-Site Appointment"** (always)
- Appointment Status: **"Scheduled"** (always)
- Space Or Unit: **"1"** (config override)

## 🔧 Email Generation

Random email patterns from customer name:
- `firstname.lastname123@gmail.com`
- `lastname.firstname456@gmail.com`
- `firstnamelastname789@gmail.com`
- `firstname.lastname.geek@gmail.com`

## 📦 Files Created

```
playwright-automation/
├── sce-config.json          # Defaults (optional - script is fully interactive)
├── sce-auto-fill.js          # Main automation script
└── SCE_AUTO_FILL_README.md   # This file
```
