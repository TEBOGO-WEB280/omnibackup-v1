/**
 * ============================================================
 *  OmniBackup — docs.js
 *  Documents controller: upload (simulated), list, remove.
 *  Depends on: config.js, utils.js, store.js, ui.js
 * ============================================================
 */

'use strict';

const docs = {

  /**
   * Simulate a file upload by prompting a file picker,
   * reading metadata, and storing a document record.
   * In a real app this would POST to a storage API.
   */
  upload() {
    const deviceSelect = document.getElementById('doc-device-select');
    const catSelect    = document.getElementById('doc-category-select');

    // If selects don't exist in the DOM yet, use prompt fallback
    const deviceName = deviceSelect
      ? deviceSelect.value
      : (state.devices[0]?.name || 'Unknown device');
    const category   = catSelect ? catSelect.value : 'Receipt';

    const input    = document.createElement('input');
    input.type     = 'file';
    input.accept   = '.pdf,.jpg,.jpeg,.png,.doc,.docx';
    input.multiple = false;

    input.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;

      const sizeKb = Math.round(file.size / 1024);
      const sizeFmt = sizeKb > 1024
        ? `${(sizeKb / 1024).toFixed(1)} MB`
        : `${sizeKb} KB`;

      const ext = file.name.split('.').pop().toUpperCase();

      // Find the linked device
      const device = state.devices.find(d => d.name === deviceName);

      const docData = {
        deviceId:   device ? device.id : null,
        deviceName: deviceName,
        name:       `${deviceName} — ${category}`,
        category,
        fileSize:   sizeFmt,
        fileType:   ext,
        fileName:   file.name,
        addedAt:    new Date().toISOString(),
      };

      storeAddDocument(docData);
      ui.closeModal('uploadDocModal');
      ui.renderDocuments();
      ui.showToast(`"${file.name}" uploaded`);
    });

    input.click();
  },

  /**
   * Remove a document record by ID.
   * @param {number} docId
   */
  remove(docId) {
    const doc = state.documents.find(d => d.id === docId);
    if (!doc) return;
    if (!confirm(`Remove "${doc.name}"?`)) return;
    storeDeleteDocument(docId);
    ui.renderDocuments();
    ui.showToast('Document removed');
  },

  /**
   * Open the upload document modal and populate the device dropdown.
   */
  openUpload() {
    const select = document.getElementById('doc-device-select');
    if (select) {
      select.innerHTML = state.devices.map(d =>
        `<option value="${utils.escapeHtml(d.name)}">${utils.escapeHtml(d.name)}</option>`
      ).join('');
    }
    ui.openModal('uploadDocModal');
  },

};


/* ============================================================
   OmniBackup — settings.js
   User settings controller: toggles, profile updates.
   Depends on: config.js, store.js, ui.js
   ============================================================ */

const settings = {

  /**
   * Toggle a boolean setting and update the toggle UI.
   * @param {string}      key       Key in state.settings
   * @param {HTMLElement} toggleEl  The .toggle DOM element
   */
  toggle(key, toggleEl) {
    const newVal = storeToggleSetting(key);
    if (toggleEl) toggleEl.classList.toggle('on', newVal);
    ui.showToast(`${utils.labelFromKey(key)} ${newVal ? 'enabled' : 'disabled'}`);
  },

  /**
   * Save profile edits from the settings page.
   */
  saveProfile() {
    const nameEl  = document.getElementById('settings-name-input');
    const emailEl = document.getElementById('settings-email-input');

    const name  = nameEl  ? nameEl.value.trim()  : state.settings.userName;
    const email = emailEl ? emailEl.value.trim() : state.settings.userEmail;

    if (email && !utils.isValidEmail(email)) {
      ui.showToast('Please enter a valid email address');
      return;
    }

    storeSetting('userName',  name);
    storeSetting('userEmail', email);
    ui.renderSettings();
    ui.showToast('Profile saved');
  },

  /**
   * Prompt for confirmation and wipe all user data.
   */
  resetAllData() {
    if (!confirm('⚠️ This will permanently delete ALL your devices, reports, and documents.\n\nAre you absolutely sure?')) return;
    if (!confirm('Last chance — this CANNOT be undone. Continue?')) return;
    storeReset();
    ui.renderDashboard();
    ui.renderDeviceTable();
    ui.showToast('All data reset to defaults', 4000);
  },

};


/* ============================================================
   OmniBackup — exportImport.js
   Export and import data as JSON files.
   Depends on: config.js, utils.js, store.js, ui.js
   ============================================================ */

const exportImport = {

  /**
   * Export all device records, reports, and documents as a
   * structured JSON file download.
   */
  exportAll() {
    const payload = {
      app:       APP_NAME,
      version:   APP_VERSION,
      exported:  new Date().toISOString(),
      devices:   state.devices,
      reports:   state.reports,
      documents: state.documents,
    };

    utils.downloadFile(
      JSON.stringify(payload, null, 2),
      `omnibackup-export-${utils.todayIso()}.json`,
      'application/json'
    );
    ui.showToast('All records exported as JSON');
  },

  /**
   * Import a previously exported OmniBackup JSON file.
   * New devices are merged in (deduplication by IMEI/serial).
   * Existing devices are not overwritten.
   */
  importFile() {
    const input  = document.createElement('input');
    input.type   = 'file';
    input.accept = '.json';

    input.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = evt => {
        try {
          const data = JSON.parse(evt.target.result);

          if (!data.devices || !Array.isArray(data.devices)) {
            ui.showToast('Invalid file — not an OmniBackup export');
            return;
          }

          let addedDevices = 0;
          data.devices.forEach(d => {
            const isDupe = state.devices.some(
              existing =>
                (d.imei   && existing.imei   === d.imei)   ||
                (d.serial && existing.serial === d.serial) ||
                existing.name === d.name
            );
            if (!isDupe) {
              d.id = state.nextDeviceId++;
              d.addedAt = new Date().toISOString();
              state.devices.push(d);
              addedDevices++;
            }
          });

          let addedDocs = 0;
          if (data.documents && Array.isArray(data.documents)) {
            data.documents.forEach(doc => {
              const isDupe = state.documents.some(d => d.name === doc.name);
              if (!isDupe) {
                doc.id = state.nextDocumentId++;
                state.documents.push(doc);
                addedDocs++;
              }
            });
          }

          saveDevices();
          saveDocuments();
          logActivity('add', `Imported ${addedDevices} device(s) from file`);

          ui.updateMetrics();
          ui.renderDashDevices();
          ui.renderDeviceTable();
          ui.renderDocuments();
          ui.showToast(
            `Imported ${addedDevices} device${addedDevices !== 1 ? 's' : ''}` +
            (addedDocs ? ` and ${addedDocs} document${addedDocs !== 1 ? 's' : ''}` : '')
          );

        } catch (err) {
          console.error('[Import] Parse error:', err);
          ui.showToast('Could not read file — make sure it is a valid OmniBackup export');
        }
      };

      reader.readAsText(file);
    });

    input.click();
  },

};
