/**
 * SCE PDF Generator Module
 * Generates 3x3 grid PDFs for door-to-door canvassing
 */

/**
 * Parse a full address string into components
 * @param {string} fullAddress - Full address like "1909 W Martha Ln, Santa Ana, CA 92706"
 * @returns {Object} Parsed address components {number, street, city, state, zip, full}
 */
export function parseAddressFromFull(fullAddress) {
  if (!fullAddress || typeof fullAddress !== 'string') {
    return {
      number: '',
      street: '',
      city: '',
      state: '',
      zip: '',
      full: ''
    };
  }

  // Remove extra whitespace
  const cleaned = fullAddress.trim().replace(/\s+/g, ' ');

  // Extract ZIP code (5 digits or 5+4 format)
  const zipMatch = cleaned.match(/\b(\d{5})(?:-\d{4})?\b/);
  const zip = zipMatch ? zipMatch[1] : '';

  // Extract state (2 letter code at end before ZIP)
  let state = '';
  if (zip) {
    const stateMatch = cleaned.match(new RegExp(`\\b([A-Z]{2})\\s+${zip}`));
    state = stateMatch ? stateMatch[1] : '';
  } else {
    // Try to find state at end
    const stateEndMatch = cleaned.match(/\s([A-Z]{2})\s*$/);
    state = stateEndMatch ? stateEndMatch[1] : '';
  }

  // Extract house number (at start of string)
  const numberMatch = cleaned.match(/^(\d+[A-Za-z]?)/);
  const number = numberMatch ? numberMatch[1] : '';

  // Everything between number and city/state is the street
  let street = '';
  let city = '';

  if (number) {
    // Remove number and zip from address
    let remaining = cleaned
      .replace(new RegExp(`^${number}\\s*`), '')
      .replace(new RegExp(`,?\\s*${state}\\s+${zip}\\s*$`), '')
      .replace(new RegExp(`,?\\s*${zip}\\s*$`), '')
      .trim();

    // Split into city and street (last comma separates them)
    const lastCommaIndex = remaining.lastIndexOf(',');
    if (lastCommaIndex !== -1) {
      street = remaining.substring(0, lastCommaIndex).trim();
      city = remaining.substring(lastCommaIndex + 1).trim();
    } else {
      street = remaining;
    }
  } else {
    // No number found, try to parse city from remaining
    const parts = cleaned.split(',').map(p => p.trim());
    if (parts.length >= 2) {
      street = parts[0];
      city = parts[1];
    } else {
      street = cleaned;
    }
  }

  return {
    number,
    street,
    city,
    state,
    zip,
    full: cleaned
  };
}

/**
 * Generate a 3x3 grid PDF for canvassing
 * @param {Array<Object>} cases - Array of case data objects
 * @param {Object} options - Configuration options
 * @param {string} options.title - Document title (default: "SCE DOOR-TO-DOOR CANVASSING ROUTE")
 * @param {string} options.orientation - Page orientation 'landscape' or 'portrait' (default: 'landscape')
 * @param {string} options.format - Page format (default: 'letter')
 * @returns {Object} jsPDF document instance
 */
export function generateCanvassPDF(cases, options = {}) {
  const {
    title = 'SCE DOOR-TO-DOOR CANVASSING ROUTE',
    orientation = 'landscape',
    format = 'letter'
  } = options;

  // Validate input
  if (!Array.isArray(cases) || cases.length === 0) {
    throw new Error('Cases array is required and must not be empty');
  }

  // Validate each case has required fields
  cases.forEach((caseData, index) => {
    if (!caseData || typeof caseData !== 'object') {
      throw new Error(`Case at index ${index} is not an object`);
    }

    // Get address from either 'address' or 'full' field
    const address = caseData.address || caseData.full;
    if (!address) {
      throw new Error(`Case at index ${index} missing required field: address or full`);
    }
  });

  // Access jsPDF from global scope (loaded via lib/jspdf.umd.min.js)
  const jsPDF = window.jspdf?.jsPDF;
  if (!jsPDF) {
    throw new Error('jsPDF library not loaded. Ensure lib/jspdf.umd.min.js is included.');
  }

  const doc = new jsPDF(orientation, 'mm', format);

  // Page dimensions for letter landscape (279mm x 216mm)
  const pageWidth = 279;
  const pageHeight = 216;

  // Grid configuration (3x3)
  const cols = 3;
  const rows = 3;
  const colWidth = (pageWidth - 20) / cols; // 10mm margins
  const rowHeight = (pageHeight - 50) / rows; // 35mm top margin, 15mm bottom
  const startX = 10;
  const startY = 35;

  // Extract street/location for header from first case
  const firstCase = cases[0];
  const headerInfo = parseAddressFromFull(firstCase.address || firstCase.full || '');
  const locationLine = `${headerInfo.street || ''}${headerInfo.city ? ', ' + headerInfo.city : ''}${headerInfo.state ? ', ' + headerInfo.state : ''} ${headerInfo.zip || ''}`.trim();

  // Draw header
  drawHeader(doc, title, locationLine, pageWidth);

  // Draw grid of case cards
  cases.forEach((caseData, index) => {
    if (index >= cols * rows) return; // Max 9 cases per page

    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = startX + (col * colWidth);
    const y = startY + (row * rowHeight);

    drawCaseCard(doc, caseData, x, y, colWidth, rowHeight, index + 1);
  });

  // Draw footer
  drawFooter(doc, pageWidth, pageHeight);

  return doc;
}

/**
 * Download the generated PDF
 * @param {Array<Object>} cases - Array of case data objects
 * @param {string} filename - Desired filename (without .pdf extension)
 * @param {Object} options - Configuration options for generateCanvassPDF
 * @returns {Promise<void>}
 */
export async function downloadCanvassPDF(cases, filename, options = {}) {
  try {
    const doc = generateCanvassPDF(cases, options);

    // Generate filename if not provided
    let finalFilename = filename;
    if (!finalFilename) {
      const firstCase = cases[0];
      const addrInfo = parseAddressFromFull(firstCase.address || firstCase.full || '');
      const streetSlug = (addrInfo.street || 'route')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      const dateSlug = new Date().toISOString().split('T')[0];
      finalFilename = `${streetSlug}-${dateSlug}-canvass`;
    }

    // Ensure .pdf extension
    if (!finalFilename.endsWith('.pdf')) {
      finalFilename += '.pdf';
    }

    // Trigger download
    doc.save(finalFilename);

    return finalFilename;
  } catch (error) {
    console.error('Failed to generate PDF:', error);
    throw new Error(`PDF generation failed: ${error.message}`);
  }
}

/**
 * Draw PDF header section
 * @private
 */
function drawHeader(doc, title, location, pageWidth) {
  // Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 10, 10);

  // Location
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(location, 10, 18);

  // Generation date
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  doc.text(`Generated: ${dateStr}`, 10, 24);

  // Instructions
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100);
  doc.text('Fill in Age and Notes during door-to-door visits', 10, 30);
  doc.setTextColor(0); // Reset to black
}

/**
 * Draw a single case card in the grid
 * @private
 */
function drawCaseCard(doc, caseData, x, y, width, height, caseNumber) {
  // Card border
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.rect(x, y, width, height);

  // Parse address for display
  const addressInfo = parseAddressFromFull(caseData.address || caseData.full || '');

  // Case number header
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`CASE ${caseNumber}`, x + 3, y + 6);

  // Address section
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');

  // House number and street
  const streetLine = `${addressInfo.number} ${addressInfo.street}`.trim();
  doc.text(streetLine, x + 3, y + 12);

  // City, State, ZIP
  doc.setFont('helvetica', 'normal');
  const cityLine = `${addressInfo.city}${addressInfo.city ? ', ' : ''}${addressInfo.state} ${addressInfo.zip}`.trim();
  doc.text(cityLine, x + 3, y + 17);

  // Divider line
  doc.setDrawColor(200);
  doc.setLineWidth(0.3);
  doc.line(x + 3, y + 20, x + width - 3, y + 20);
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);

  // Customer information
  let currentY = y + 26;

  // Name
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const name = caseData.name || 'N/A';
  doc.text(`Name: ${name}`, x + 3, currentY);
  currentY += 6;

  // Phone
  const phone = caseData.phone || 'N/A';
  doc.text(`Phone: ${phone}`, x + 3, currentY);
  currentY += 6;

  // Age field (blank for manual entry)
  doc.text('Age: ____________', x + 3, currentY);
  currentY += 8;

  // Notes section
  doc.setFont('helvetica', 'bold');
  doc.text('Notes:', x + 3, currentY);
  currentY += 4;

  // Draw lined area for notes
  doc.setFont('helvetica', 'normal');
  const noteLineHeight = 5;
  const noteLines = 3;
  for (let i = 0; i < noteLines; i++) {
    doc.line(x + 3, currentY, x + width - 3, currentY);
    currentY += noteLineHeight;
  }

  // Checkboxes at bottom
  currentY = y + height - 5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('☐ Qualified  ☐ Interested  ☐ Scheduled', x + 3, currentY);
}

/**
 * Draw PDF footer section
 * @private
 */
function drawFooter(doc, pageWidth, pageHeight) {
  const footerY = pageHeight - 10;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(150);

  const footerText = 'Generated by SCE Form Auto-Fill Extension';
  const textWidth = doc.getTextWidth(footerText);
  doc.text(footerText, (pageWidth - textWidth) / 2, footerY);

  doc.setTextColor(0); // Reset to black
}
