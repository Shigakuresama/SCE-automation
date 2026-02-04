export class PDFGenerator {
  constructor() {
    this.jsPDF = window.jspdf.jsPDF;
  }

  async generateGrid(addresses) {
    const doc = new this.jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const margin = 10;
    const cols = 3;
    const rows = 3;
    const cellWidth = (pageWidth - 2 * margin) / cols;
    const cellHeight = (pageHeight - 2 * margin) / rows;

    const gridAddresses = addresses.slice(0, 9);

    gridAddresses.forEach((addr, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = margin + col * cellWidth;
      const y = margin + row * cellHeight;

      this._drawCell(doc, x, y, cellWidth, cellHeight, addr, index + 1);
    });

    return new Promise((resolve) => {
      doc.output('blob', (blob) => {
        resolve(blob);
      });
    });
  }

  _drawCell(doc, x, y, width, height, address, number) {
    const padding = 5;
    let currentY = y + padding;

    doc.rect(x, y, width, height);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`${number}.`, x + padding, currentY);
    currentY += 6;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(address.full || address.display_name || 'Unknown', width - 2 * padding);
    doc.text(lines, x + padding, currentY);
    currentY += lines.length * 4 + 4;

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

    doc.text('Age:', x + padding, currentY);
    currentY += 4;
    doc.line(x + padding, currentY, x + width - padding, currentY);
    currentY += 4;

    doc.text('Notes:', x + padding, currentY);
    currentY += 4;

    const notesHeight = y + height - currentY - padding;
    const lineHeight = 3;
    for (let i = 0; i < Math.floor(notesHeight / lineHeight); i++) {
      doc.line(x + padding, currentY, x + width - padding, currentY);
      currentY += lineHeight;
    }

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
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async generateAndDownload(addresses, filename = 'route-planner.pdf') {
    const blob = await this.generateGrid(addresses);
    this.download(blob, filename);
  }
}

export default PDFGenerator;
