/**
 * ============================================================
 *  OmniBackup — reports.js
 *  Stolen-device report controller: file, download, display.
 *  Depends on: config.js, utils.js, store.js, ui.js
 * ============================================================
 */

'use strict';

const reports = {

  /* ----------------------------------------------------------
     Open the "File report" modal
     ---------------------------------------------------------- */

  /**
   * Open the stolen report modal and populate the device dropdown
   * with all non-stolen devices.
   */
  openForm() {
    reports._populateDeviceSelect();
    // Default date to today
    const dateEl = document.getElementById('sr-date');
    if (dateEl && !dateEl.value) dateEl.value = utils.todayIso();
    ui.openModal('stolenModal');
  },

  /* ----------------------------------------------------------
     Submit the stolen report form
     ---------------------------------------------------------- */

  /**
   * Read the stolen report form, validate it, and file a new report.
   */
  submitForm() {
    const get = id => {
      const el = document.getElementById(id);
      return el ? el.value.trim() : '';
    };

    const deviceName   = get('sr-device');
    const dateReported = get('sr-date') || utils.todayIso();
    const lastLocation = get('sr-location');
    const policeRef    = get('sr-police');
    const description  = get('sr-desc');

    if (!deviceName) {
      ui.showToast('Please select a device');
      return;
    }

    // Find matching device in state
    const device = state.devices.find(d => d.name === deviceName);

    const reportData = {
      deviceId:     device ? device.id    : null,
      deviceName,
      imei:         device ? (device.imei || device.serial || '') : '',
      dateReported,
      lastLocation,
      policeRef,
      description,
    };

    const report = storeAddReport(reportData);

    // Clear form fields
    ['sr-location', 'sr-police', 'sr-desc', 'sr-date'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

    ui.closeModal('stolenModal');
    ui.updateMetrics();
    ui.renderDashDevices();
    ui.renderStolenReports();
    ui.showToast(`Stolen report filed — Case #${report.caseNumber}`);
  },

  /* ----------------------------------------------------------
     Download a report as a text file
     ---------------------------------------------------------- */

  /**
   * Generate and download a stolen device report as a .txt file.
   * @param {number} reportId
   */
  download(reportId) {
    const r = state.reports.find(x => x.id === reportId);
    if (!r) { ui.showToast('Report not found'); return; }

    const divider = '─'.repeat(48);
    const lines = [
      '╔══════════════════════════════════════════════╗',
      '║         OmniBackup — Stolen Device Report        ║',
      '╚══════════════════════════════════════════════╝',
      '',
      divider,
      `  Case Number   : ${r.caseNumber}`,
      `  Status        : ${r.status?.toUpperCase() || 'ACTIVE'}`,
      divider,
      '',
      '  DEVICE INFORMATION',
      `  Device Name   : ${r.deviceName}`,
      `  IMEI / Serial : ${r.imei || '—'}`,
      '',
      '  INCIDENT DETAILS',
      `  Date Reported : ${utils.formatDate(r.dateReported)}`,
      `  Last Location : ${r.lastLocation || '—'}`,
      `  Police Ref    : ${r.policeRef    || '—'}`,
      `  Insurance     : ${r.insuranceClaim || 'Not filed'}`,
      '',
      '  DESCRIPTION',
      `  ${r.description || 'No description provided.'}`,
      '',
      divider,
      `  Generated     : ${new Date().toLocaleString('en-ZA')}`,
      `  OmniBackup    : v${APP_VERSION}`,
      divider,
      '',
      '  Share this report with:',
      '  • Your local police station (SAPS)',
      '  • Your insurance provider',
      '  • Your mobile network operator (for IMEI blacklisting)',
    ];

    utils.downloadFile(
      lines.join('\n'),
      `OmniBackup-Report-${r.caseNumber}.txt`,
      'text/plain'
    );
    ui.showToast('Report downloaded');
  },

  /* ----------------------------------------------------------
     Private helpers
     ---------------------------------------------------------- */

  /**
   * @private
   * Populate the stolen-report device dropdown with non-stolen devices.
   */
  _populateDeviceSelect() {
    const select = document.getElementById('sr-device');
    if (!select) return;

    const eligible = state.devices.filter(d => d.status !== DEVICE_STATUS.STOLEN);

    if (!eligible.length) {
      select.innerHTML = `<option value="">No eligible devices</option>`;
      return;
    }

    select.innerHTML = eligible.map(d =>
      `<option value="${utils.escapeHtml(d.name)}">${utils.escapeHtml(d.name)}</option>`
    ).join('');
  },

};
