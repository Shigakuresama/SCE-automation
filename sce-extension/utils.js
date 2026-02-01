(() => {
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

  globalThis.SCEAutoFillUtils = utils;
})();
