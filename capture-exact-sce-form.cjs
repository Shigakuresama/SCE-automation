/**
 * Capture Exact SCE Form Structure
 * This script navigates to SCE and captures the exact DOM with all Angular attributes
 */

const { chromium } = require('playwright');
const fs = require('fs');

async function captureSCEForm() {
  console.log('🚀 Starting SCE form capture...');

  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });
  const page = await context.newPage();

  console.log('\n📋 Please follow these steps:');
  console.log('1. Log in to SCE when prompted');
  console.log('2. Navigate to a Customer Information form');
  console.log('3. Once the form is fully loaded, press ENTER in this terminal');
  console.log('4. The script will capture the exact DOM structure\n');

  // Navigate to SCE - you'll need to log in
  await page.goto('https://sce.dsmcentral.com/#/customer-search');

  // Wait for user to navigate and log in
  console.log('⏳ Waiting for you to log in and navigate to the form...');
  console.log('   Press ENTER in this terminal when ready to capture...\n');

  // Wait for user input
  await new Promise(resolve => {
    process.stdin.once('data', resolve);
  });

  // Capture the form HTML
  console.log('📸 Capturing form structure...');

  // Get the main form content
  const formHTML = await page.evaluate(() => {
    // Find the main form container
    const formContainer = document.querySelector('app-customer-information, app-additional-customer-information, .assessments, .simple-form, [class*="customer"], [class*="form"]');
    if (!formContainer) return null;

    // Clone to avoid modifying the DOM
    const clone = formContainer.cloneNode(true);

    // Remove script tags and event listeners
    clone.querySelectorAll('script').forEach(s => s.remove());

    // Get outer HTML
    return clone.outerHTML;
  });

  if (!formHTML) {
    console.log('❌ Could not find form. Trying alternate approach...');

    // Fallback: get entire body content
    const bodyHTML = await page.evaluate(() => {
      const clone = document.body.cloneNode(true);
      clone.querySelectorAll('script, style, link, iframe').forEach(s => s.remove());
      return clone.innerHTML;
    });

    await saveForm(bodyHTML, 'sce-form-capture-full.html');
  } else {
    await saveForm(formHTML, 'sce-form-capture-form.html');
  }

  // Also capture field info
  const fieldInfo = await page.evaluate(() => {
    const fields = [];

    // Find all mat-label elements
    const labels = document.querySelectorAll('mat-label');
    labels.forEach(label => {
      const labelText = label.textContent?.trim();
      const formField = label.closest('mat-form-field');
      if (!formField) return;

      const input = formField.querySelector('input');
      const select = formField.querySelector('mat-select');
      const textarea = formField.querySelector('textarea');

      const fieldInfo = {
        label: labelText,
        hasInput: !!input,
        hasSelect: !!select,
        hasTextarea: !!textarea,
        inputId: input?.id || null,
        inputName: input?.name || null,
        inputPlaceholder: input?.placeholder || null,
        inputDisabled: input?.disabled || false,
        selectId: select?.id || null,
        rawHTML: formField.outerHTML.substring(0, 500)
      };

      fields.push(fieldInfo);
    });

    return fields;
  });

  console.log('\n📊 Fields found:');
  fieldInfo.forEach((f, i) => {
    console.log(`  ${i + 1}. ${f.label}`);
    console.log(`     - Input: ${f.inputId || 'N/A'} (disabled: ${f.inputDisabled})`);
    console.log(`     - Select: ${f.selectId || 'N/A'}`);
  });

  // Save field info
  fs.writeFileSync(
    '/home/sergio/Downloads/sce.dsmcentral.com/field-info.json',
    JSON.stringify(fieldInfo, null, 2),
    'utf8'
  );
  console.log('\n✅ Field info saved to: field-info.json');

  await browser.close();
  console.log('\n✅ Capture complete!');
}

async function saveForm(html, filename) {
  const outputPath = `/home/sergio/Downloads/sce.dsmcentral.com/${filename}`;

  // Wrap in a complete HTML document
  const wrappedHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SCE Form - Exact Capture</title>
  <link href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700" rel="stylesheet">
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
  <style>
    /* Reset */
    * { box-sizing: border-box; }
    body { margin: 0; padding: 20px; font-family: 'Roboto', sans-serif; background: #fafafa; }

    /* Angular Material Styles */
    .mat-form-field {
      display: block;
      position: relative;
      padding: 12px 0;
      font-size: 14px;
    }
    .mat-form-field-wrapper {
      display: flex;
      position: relative;
    }
    .mat-form-field-flex {
      display: flex;
      align-items: baseline;
      position: relative;
    }
    .mat-form-field-infix {
      display: block;
      position: relative;
      flex: 1 1 auto;
      min-width: 0;
      width: 180px;
    }
    .mat-input-element {
      font: inherit;
      background: transparent;
      color: currentColor;
      border: none;
      outline: none;
      padding: 0;
      margin: 0;
      width: 100%;
    }
    .mat-form-field-label-wrapper {
      position: absolute;
      left: 0;
      box-sizing: content-box;
      width: 100%;
      height: 100%;
      overflow: hidden;
      pointer-events: none;
    }
    .mat-form-field-label {
      position: absolute;
      left: 0;
      font-size: 14px;
      color: #666;
      pointer-events: none;
      width: 100%;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }
    .mat-form-field-underline {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 1px;
    }
    .mat-form-field-ripple {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: 2px;
      transform-origin: bottom;
      transform: scaleY(0);
    }
    .mat-focused .mat-form-field-ripple {
      transform: scaleY(1);
      background-color: #1565c0;
    }
    .mat-form-field-disabled .mat-form-field-label {
      color: #9e9e9e;
    }
    input.mat-input-element {
      padding: 12px 0;
      border-bottom: 1px solid #c0c0c0;
    }
    input.mat-input-element:focus {
      border-bottom: 1px solid #1565c0;
    }
    mat-label {
      display: block;
      font-size: 13px;
      font-weight: 500;
      color: #666;
      margin-bottom: 8px;
      pointer-events: none;
    }
    mat-select {
      display: block;
      width: 100%;
      padding: 12px 0;
      border-bottom: 1px solid #c0c0c0;
      cursor: pointer;
    }
    .field {
      display: block;
      margin-bottom: 16px;
    }
    .simple-form__form {
      width: 50%;
      display: inline-block;
      vertical-align: top;
      padding: 0 16px;
    }
    .assessments, .form-section {
      background: white;
      padding: 24px;
      border-radius: 4px;
      margin-bottom: 16px;
    }
    .header {
      background: linear-gradient(135deg, #1565c0, #0d47a1);
      color: white;
      padding: 16px 24px;
      margin-bottom: 24px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>⚡ SCE Form - Exact Capture</h1>
  </div>
  <div class="info-banner" style="background: #e3f2fd; padding: 16px; border-left: 4px solid #2196f3; margin-bottom: 20px;">
    This is an <strong>exact DOM capture</strong> from the live SCE form with all Angular attributes preserved.
  </div>
  ${html}
  <script>
    console.log('[SCE Exact Capture] Loaded');
    console.log('[SCE Exact Capture] mat-label:', document.querySelectorAll('mat-label').length);
    console.log('[SCE Exact Capture] mat-form-field:', document.querySelectorAll('mat-form-field').length);
    console.log('[SCE Exact Capture] input elements:', document.querySelectorAll('input').length);
  </script>
</body>
</html>`;

  fs.writeFileSync(outputPath, wrappedHTML, 'utf8');
  console.log(`✅ Saved: ${outputPath}`);
  console.log(`🌐 Open: http://localhost:8080/${filename}`);
}

captureSCEForm().catch(console.error);
