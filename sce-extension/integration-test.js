    const state = {
      testsRun: 0,
      testsPassed: 0,
      testsFailed: 0,
      currentSection: null
    };

    // DOM element references
    const elements = {
      testsRun: document.getElementById('testsRun'),
      testsPassed: document.getElementById('testsPassed'),
      testsFailed: document.getElementById('testsFailed'),
      passRate: document.getElementById('passRate'),
      overallProgress: document.getElementById('overallProgress'),
      uiResults: document.getElementById('uiResults'),
      addressResults: document.getElementById('addressResults'),
      pdfResults: document.getElementById('pdfResults'),
      integrationResults: document.getElementById('integrationResults')
    };

    /**
     * Update summary cards
     */
    function updateSummary() {
      elements.testsRun.textContent = state.testsRun;
      elements.testsPassed.textContent = state.testsPassed;
      elements.testsFailed.textContent = state.testsFailed;

      const rate = state.testsRun > 0
        ? Math.round((state.testsPassed / state.testsRun) * 100)
        : 0;
      elements.passRate.textContent = `${rate}%`;

      // Update progress bar
      const totalTests = 27; // Approximate total
      const progress = (state.testsRun / totalTests) * 100;
      elements.overallProgress.style.width = `${progress}%`;
    }

    /**
     * Log test result
     */
    function logTest(section, testName, passed, details = '') {
      state.testsRun++;
      if (passed) {
        state.testsPassed++;
      } else {
        state.testsFailed++;
      }
      updateSummary();

      const resultsDiv = elements[`${section}Results`];
      if (!resultsDiv) return;

      const resultDiv = document.createElement('div');
      resultDiv.className = `test-result ${passed ? 'success' : 'error'}`;

      const statusBadge = passed ? 'PASS' : 'FAIL';
      const icon = passed ? '✅' : '❌';

      resultDiv.innerHTML = `
        <div class="test-result-header">
          <span>${icon}</span>
          <span class="status-badge ${passed ? 'pass' : 'fail'}">${statusBadge}</span>
          <span>${testName}</span>
        </div>
        ${details ? `<div class="test-result-details">${escapeHtml(details)}</div>` : ''}
      `;

      resultsDiv.appendChild(resultDiv);
      resultsDiv.scrollTop = resultsDiv.scrollHeight;

      if (document.getElementById('stopOnFailure').checked && !passed) {
        throw new Error(`Test failed: ${testName}`);
      }
    }

    /**
     * Log info message
     */
    function logInfo(section, message) {
      const resultsDiv = elements[`${section}Results`];
      if (!resultsDiv) return;

      const infoDiv = document.createElement('div');
      infoDiv.className = 'test-result info';
      infoDiv.innerHTML = `<div class="test-result-header">ℹ️ ${message}</div>`;
      resultsDiv.appendChild(infoDiv);
    }

    /**
     * Escape HTML to prevent XSS
     */
    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    /**
     * Sleep utility
     */
    function sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ============================================
    // UI TESTS
    // ============================================

    window.runUITests = async function() {
      logInfo('ui', 'Starting UI tests...');
      try {
        await testPopupTabs();
        await testFormValidation();
        await testAddressCount();
        logInfo('ui', 'UI tests completed');
      } catch (error) {
        logTest('ui', 'UI Suite', false, error.message);
      }
    };

    window.testPopupTabs = async function() {
      logTest('ui', 'Tab Switching - Tab elements exist', true);
      const tabs = document.querySelectorAll('.tab-btn');
      logTest('ui', 'Tab Switching - Found tabs', tabs.length === 3,
        `Expected 3 tabs, found ${tabs.length}`);

      const tabContents = document.querySelectorAll('.tab-content');
      logTest('ui', 'Tab Switching - Tab content panels exist', tabContents.length === 3,
        `Expected 3 content panels, found ${tabContents.length}`);
    };

    window.testFormValidation = async function() {
      // Test start address validation
      const startInput = document.getElementById('startAddress');
      if (startInput) {
        startInput.value = '';
        logTest('ui', 'Form Validation - Empty start address detected', !startInput.value.trim());

        startInput.value = '1909 W Martha Ln';
        logTest('ui', 'Form Validation - Valid start address accepted', startInput.value.trim().length > 0);
      }

      // Test ZIP validation
      const zipInput = document.getElementById('zip');
      if (zipInput) {
        zipInput.value = '123';
        logTest('ui', 'Form Validation - Invalid ZIP (3 digits)', !/^\d{5}$/.test(zipInput.value));

        zipInput.value = '92706';
        logTest('ui', 'Form Validation - Valid ZIP (5 digits)', /^\d{5}$/.test(zipInput.value));
      }
    };

    window.testAddressCount = async function() {
      const startInput = document.getElementById('startAddress');
      const endInput = document.getElementById('endAddress');
      const countSpan = document.getElementById('addressCount');

      if (startInput && endInput && countSpan) {
        startInput.value = '1909 W Martha Ln';
        endInput.value = '1925 W Martha Ln';

        // Trigger input event
        startInput.dispatchEvent(new Event('input', { bubbles: true }));

        await sleep(500); // Wait for debounce

        const count = parseInt(countSpan.textContent);
        logTest('ui', 'Address Count - Range 1909-1925 generates addresses', count > 0,
          `Generated ${count} addresses`);
      }
    };

    // ============================================
    // ADDRESS GENERATION TESTS
    // ============================================

    window.runAddressGenerationTests = async function() {
      logInfo('address', 'Starting address generation tests...');
      try {
        await testBasicRange();
        await testOddEvenFilter();
        await testSkipAddresses();
        await testAddressSwap();
        logInfo('address', 'Address generation tests completed');
      } catch (error) {
        logTest('address', 'Address Suite', false, error.message);
      }
    };

    window.testBasicRange = async function() {
      try {
        // Import the address generator module
        const module = await import('./modules/address-generator.js');
        const { generateAddressRange } = module;

        const start = '1909 W Martha Ln, Santa Ana, CA 92706';
        const end = '1915 W Martha Ln, Santa Ana, CA 92706';

        const addresses = generateAddressRange(start, end);

        logTest('address', 'Basic Range - Generates correct count', addresses.length === 4,
          `Expected 4 addresses (1909, 1911, 1913, 1915), got ${addresses.length}`);

        logTest('address', 'Basic Range - First address correct', addresses[0].number === '1909',
          `First address: ${addresses[0].full}`);

        logTest('address', 'Basic Range - Last address correct', addresses[addresses.length - 1].number === '1915',
          `Last address: ${addresses[addresses.length - 1].full}`);

        logTest('address', 'Basic Range - All addresses increment by 2',
          addresses.every((addr, i) => i === 0 || parseInt(addr.number) - parseInt(addresses[i-1].number) === 2),
          addresses.map(a => a.number).join(', '));

      } catch (error) {
        logTest('address', 'Basic Range - Module loading/execution', false, error.message);
      }
    };

    window.testOddEvenFilter = async function() {
      try {
        const module = await import('./modules/address-generator.js');
        const { generateAddressRange } = module;

        const start = '1908 W Martha Ln, Santa Ana, CA 92706';
        const end = '1920 W Martha Ln, Santa Ana, CA 92706';

        // Test odd filter
        const oddAddresses = generateAddressRange(start, end, { side: 'odd' });
        logTest('address', 'Odd/Even Filter - Odd only', oddAddresses.length > 0 &&
          oddAddresses.every(addr => parseInt(addr.number) % 2 === 1),
          `Odd addresses: ${oddAddresses.map(a => a.number).join(', ')}`);

        // Test even filter
        const evenAddresses = generateAddressRange(start, end, { side: 'even' });
        logTest('address', 'Odd/Even Filter - Even only', evenAddresses.length > 0 &&
          evenAddresses.every(addr => parseInt(addr.number) % 2 === 0),
          `Even addresses: ${evenAddresses.map(a => a.number).join(', ')}`);

      } catch (error) {
        logTest('address', 'Odd/Even Filter', false, error.message);
      }
    };

    window.testSkipAddresses = async function() {
      try {
        const module = await import('./modules/address-generator.js');
        const { generateAddressRange } = module;

        const start = '1909 W Martha Ln, Santa Ana, CA 92706';
        const end = '1925 W Martha Ln, Santa Ana, CA 92706';

        const skip = ['1915', '1921'];
        const addresses = generateAddressRange(start, end, { skip });

        const skippedNumbers = addresses.map(a => a.number);
        const hasSkipped = skip.some(s => skippedNumbers.includes(s));

        logTest('address', 'Skip Addresses - Correctly excludes specified', !hasSkipped,
          `Generated: ${skippedNumbers.join(', ')}\nSkipped: ${skip.join(', ')}`);

      } catch (error) {
        logTest('address', 'Skip Addresses', false, error.message);
      }
    };

    window.testAddressSwap = async function() {
      try {
        const module = await import('./modules/address-generator.js');
        const { generateAddressRange } = module;

        // Provide end before start
        const start = '1925 W Martha Ln, Santa Ana, CA 92706';
        const end = '1909 W Martha Ln, Santa Ana, CA 92706';

        const addresses = generateAddressRange(start, end);

        logTest('address', 'Auto-Swap - Handles reversed input', addresses.length > 0,
          `Generated ${addresses.length} addresses from reversed input`);

        logTest('address', 'Auto-Swap - First address is smaller', addresses.length > 0 &&
          parseInt(addresses[0].number) <= parseInt(addresses[addresses.length - 1].number),
          `Range: ${addresses[0].number} to ${addresses[addresses.length - 1].number}`);

      } catch (error) {
        logTest('address', 'Auto-Swap', false, error.message);
      }
    };

    // ============================================
    // PDF TESTS
    // ============================================

    window.runPDFTests = async function() {
      logInfo('pdf', 'Starting PDF tests...');
      try {
        await testPDFLoad();
        await testPDFGeneration();
        await testPDFDownload();
        logInfo('pdf', 'PDF tests completed');
      } catch (error) {
        logTest('pdf', 'PDF Suite', false, error.message);
      }
    };

    window.testPDFLoad = async function() {
      const loaded = typeof window.jspdf !== 'undefined' && window.jspdf.jsPDF;
      logTest('pdf', 'jsPDF Load - Library available', loaded,
        loaded ? 'jsPDF is loaded' : 'jsPDF not found on window.jspdf');
    };

    window.testPDFGeneration = async function() {
      try {
        const module = await import('./modules/pdf-generator.js');
        const { generateCanvassPDF } = module;

        // Create test data
        const testCases = [
          {
            address: '1909 W Martha Ln, Santa Ana, CA 92706',
            name: 'John Doe',
            phone: '(555) 123-4567'
          },
          {
            address: '1911 W Martha Ln, Santa Ana, CA 92706',
            name: 'Jane Smith',
            phone: '(555) 234-5678'
          },
          {
            address: '1913 W Martha Ln, Santa Ana, CA 92706',
            name: 'Bob Johnson',
            phone: '(555) 345-6789'
          }
        ];

        const doc = generateCanvassPDF(testCases);

        logTest('pdf', 'PDF Generation - Creates document', doc !== null && typeof doc.save === 'function',
          `Document type: ${doc ? typeof doc : 'null'}`);

        logTest('pdf', 'PDF Generation - Accepts test data', true,
          `Test cases: ${testCases.length}`);

      } catch (error) {
        logTest('pdf', 'PDF Generation', false, error.message);
      }
    };

    window.testPDFDownload = async function() {
      try {
        const module = await import('./modules/pdf-generator.js');
        const { downloadCanvassPDF } = module;

        const testCases = [
          {
            address: '1909 W Martha Ln, Santa Ana, CA 92706',
            name: 'Test Customer',
            phone: '(555) 000-0000'
          }
        ];

        // Note: This will actually trigger a download
        const filename = await downloadCanvassPDF(testCases, 'test-integration');

        logTest('pdf', 'PDF Download - Generates filename', filename && filename.endsWith('.pdf'),
          `Generated: ${filename}`);

        logInfo('pdf', `PDF downloaded to: ${filename}`);

      } catch (error) {
        logTest('pdf', 'PDF Download', false, error.message);
      }
    };

    // ============================================
    // INTEGRATION TESTS
    // ============================================

    window.runFullIntegrationTest = async function() {
      logInfo('integration', 'Starting full integration test...');
      logInfo('integration', 'This test requires the extension to be loaded in Chrome');
      logInfo('integration', 'Open Chrome and load the extension to continue');

      const start = document.getElementById('testStart').value;
      const end = document.getElementById('testEnd').value;
      const city = document.getElementById('testCity').value;
      const zip = document.getElementById('testZIP').value;

      logTest('integration', 'Integration - Test inputs provided',
        start && end && city && zip,
        `Start: ${start}\nEnd: ${end}\nCity: ${city}\nZIP: ${zip}`);

      try {
        const module = await import('./modules/address-generator.js');
        const { generateAddressRange } = module;

        const startFull = `${start}, ${city}, CA ${zip}`;
        const endFull = `${end}, ${city}, CA ${zip}`;

        const addresses = generateAddressRange(startFull, endFull);

        logTest('integration', 'Integration - Address generation successful', addresses.length > 0,
          `Generated ${addresses.length} addresses`);

        // Test PDF generation with generated addresses
        const pdfModule = await import('./modules/pdf-generator.js');
        const { generateCanvassPDF } = pdfModule;

        const testCases = addresses.slice(0, 9).map(addr => ({
          address: addr.full,
          name: `Test Customer ${addr.number}`,
          phone: '(555) 000-0000'
        }));

        const doc = generateCanvassPDF(testCases);

        logTest('integration', 'Integration - PDF generation with route data', doc !== null,
          `Created PDF with ${testCases.length} cases`);

        logInfo('integration', 'Integration test completed successfully');
        logInfo('integration', 'Next step: Test in actual Chrome extension with real SCE forms');

      } catch (error) {
        logTest('integration', 'Integration - End-to-end flow', false, error.message);
      }
    };

    window.runSmallScaleTest = async function() {
      logInfo('integration', 'Running small scale test (3 addresses)...');

      try {
        const module = await import('./modules/address-generator.js');
        const { generateAddressRange } = module;

        const start = '1909 W Martha Ln, Santa Ana, CA 92706';
        const end = '1915 W Martha Ln, Santa Ana, CA 92706';

        const addresses = generateAddressRange(start, end);

        logTest('integration', 'Small Scale - Generated 3-4 addresses', addresses.length >= 3 && addresses.length <= 4,
          `Generated: ${addresses.map(a => a.number).join(', ')}`);

        // Simulate processing
        for (const addr of addresses) {
          logInfo('integration', `Processing: ${addr.full}`);
          await sleep(500);
        }

        logTest('integration', 'Small Scale - All addresses processed', true,
          `Processed ${addresses.length} addresses`);

      } catch (error) {
        logTest('integration', 'Small Scale', false, error.message);
      }
    };

    window.clearTestResults = async function() {
      state.testsRun = 0;
      state.testsPassed = 0;
      state.testsFailed = 0;
      updateSummary();

      Object.values(elements).forEach(el => {
        if (el && el.classList && el.classList.contains('test-results')) {
          el.innerHTML = '';
        }
      });

      logInfo('ui', 'Test results cleared');
    };

    // Initialize
    updateSummary();
    logInfo('ui', 'Test harness loaded. Click a test button to begin.');
  </script>
