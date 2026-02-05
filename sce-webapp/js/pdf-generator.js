export class PDFGenerator {
  constructor() {
    this.jsPDF = window.jspdf.jsPDF;
    this.currentBlockId = null;
  }

  async generateGrid(addresses) {
    const pageSize = 9;
    const totalPages = Math.ceil(addresses.length / pageSize);
    const doc = new this.jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) doc.addPage();

      const startIdx = page * pageSize;
      const endIdx = Math.min(startIdx + pageSize, addresses.length);
      const pageAddresses = addresses.slice(startIdx, endIdx);

      this._drawPageHeader(doc, page + 1, totalPages);
      this._drawGridPage(doc, pageAddresses, pageWidth, pageHeight);
    }

    return new Promise((resolve) => {
      doc.output('blob', (blob) => resolve(blob));
    });
  }

  _drawPageHeader(doc, pageNum, totalPages) {
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Page ${pageNum} of ${totalPages}`, 10, 10);
  }

  _drawGridPage(doc, addresses, pageWidth, pageHeight) {
    const margin = 20;
    const cols = 3;
    const rows = 3;
    const cellWidth = (pageWidth - 2 * margin) / cols;
    const cellHeight = (pageHeight - 30 - 2 * margin) / rows; // -30 for header

    addresses.forEach((addr, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = margin + col * cellWidth;
      const y = 30 + margin + row * cellHeight; // +30 for header

      this._drawCell(doc, x, y, cellWidth, cellHeight, addr, index + 1);
    });
  }

  _drawCell(doc, x, y, width, height, address, number) {
    const padding = 5;
    let currentY = y + padding;

    // Cell border
    doc.rect(x, y, width, height);

    // Number
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`${number}.`, x + padding, currentY);
    currentY += 6;

    // Address
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(address.full || address.display_name || 'Unknown', width - 2 * padding);
    doc.text(lines, x + padding, currentY);
    currentY += lines.length * 4 + 4;

    // SCE Data (pre-filled if available)
    if (address.customerName || address.phone) {
      doc.setFontSize(7);
      doc.setTextColor(50);

      if (address.customerName) {
        doc.text(`Customer: ${address.customerName}`, x + padding, currentY);
        currentY += 4;
      }

      if (address.phone) {
        doc.text(`Phone: ${address.phone}`, x + padding, currentY);
        currentY += 4;
      }

      if (address.caseId) {
        doc.text(`Case: ${address.caseId}`, x + padding, currentY);
        currentY += 4;
      }

      doc.setTextColor(0);
    } else {
      // Fillable fields
      doc.setFontSize(7);
      doc.text('Customer:', x + padding, currentY);
      currentY += 4;
      doc.setDrawColor(200);
      doc.line(x + padding, currentY, x + width - padding, currentY);
      currentY += 4;

      doc.text('Phone:', x + padding, currentY);
      currentY += 4;
      doc.line(x + padding, currentY, x + width - padding, currentY);
      currentY += 4;
    }

    // Age field
    doc.text('Age:', x + padding, currentY);
    currentY += 4;
    doc.line(x + padding, currentY, x + width - padding, currentY);
    currentY += 4;

    // Notes
    doc.text('Notes:', x + padding, currentY);
    currentY += 4;

    const notesHeight = y + height - currentY - padding;
    const lineHeight = 3;
    for (let i = 0; i < Math.floor(notesHeight / lineHeight); i++) {
      doc.line(x + padding, currentY, x + width - padding, currentY);
      currentY += lineHeight;
    }

    // Checkboxes
    const checkboxY = y + height - padding - 4;
    const checkboxWidth = 3;
    const checkboxGap = (width - 3 * checkboxWidth) / 4;

    const checkboxes = ['Qualified', 'Interested', 'Scheduled'];
    checkboxes.forEach((label, i) => {
      const cbX = x + checkboxGap + i * (checkboxWidth + checkboxGap);
      doc.rect(cbX, checkboxY, checkboxWidth, 3);
      doc.setFontSize(5);
      doc.text(label, cbX, checkboxY - 1);
    });
  }

  download(blob, filename = 'route-planner.pdf') {
    const blockId = this.currentBlockId || 'unknown';
    const date = new Date().toISOString().split('T')[0];
    const finalFilename = `route-planner-${date}-block-${blockId}.pdf`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = finalFilename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async generateAndDownload(addresses, blockId) {
    this.currentBlockId = blockId;
    const blob = await this.generateGrid(addresses);
    this.download(blob);
  }
}

export default PDFGenerator;
