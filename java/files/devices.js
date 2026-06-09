/**
 * ============================================================
 *  OmniBackup — devices.js
 *  Device management controller: add, edit, delete, form logic.
 *  Depends on: config.js, utils.js, store.js, ui.js
 * ============================================================
 */

'use strict';

const devices = {

  /* ----------------------------------------------------------
     Form field IDs
     ---------------------------------------------------------- */
  FIELDS: ['f-name', 'f-type', 'f-model', 'f-brand', 'f-imei',
           'f-serial', 'f-color', 'f-storage', 'f-date', 'f-warranty', 'f-notes'],

  /* ----------------------------------------------------------
     Open modal in ADD mode
     ---------------------------------------------------------- */

  /**
   * Open the Add Device modal, cleared for a brand new entry.
   */
  openAdd() {
    state.editingDeviceId = null;
    devices._clearForm();
    devices._setModalMode('add');
    ui.openModal('addDeviceModal');
  },

  /* ----------------------------------------------------------
     Open modal in EDIT mode
     ---------------------------------------------------------- */

  /**
   * Open the Add/Edit Device modal pre-filled with an existing device's data.
   * @param {number} deviceId
   */
  openEdit(deviceId) {
    const d = storeGetDevice(deviceId);
    if (!d) { ui.showToast('Device not found'); return; }

    state.editingDeviceId = deviceId;

    // Pre-fill form fields
    const setValue = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val || '';
    };
    setValue('f-name',     d.name);
    setValue('f-type',     d.type);
    setValue('f-model',    d.model);
    setValue('f-brand',    d.brand);
    setValue('f-imei',     d.imei);
    setValue('f-serial',   d.serial);
    setValue('f-color',    d.color);
    setValue('f-storage',  d.storage);
    setValue('f-date',     d.date);
    setValue('f-warranty', d.warranty);
    setValue('f-notes',    d.notes);

    devices._setModalMode('edit');
    ui.openModal('addDeviceModal');
  },

  /* ----------------------------------------------------------
     Submit form (add OR edit)
     ---------------------------------------------------------- */

  /**
   * Read the form, validate it, and either add a new device
   * or update an existing one depending on state.editingDeviceId.
   */
  submitForm() {
    const get = id => {
      const el = document.getElementById(id);
      return el ? el.value.trim() : '';
    };

    const name = get('f-name');
    if (!name) { ui.showToast('Please enter a device name'); return; }

    const imei = get('f-imei');
    if (imei && !utils.isValidImei(imei)) {
      // Warn but don't block — serial numbers are also valid
      console.info('[Devices] IMEI checksum invalid (may be a serial number):', imei);
    }

    const formData = {
      name,
      type:     get('f-type')     || 'phone',
      model:    get('f-model'),
      brand:    get('f-brand'),
      imei:     get('f-imei'),
      serial:   get('f-serial'),
      color:    get('f-color'),
      storage:  get('f-storage'),
      date:     get('f-date'),
      warranty: get('f-warranty'),
      notes:    get('f-notes'),
    };

    if (state.editingDeviceId !== null) {
      // ---- EDIT ----
      const updated = storeUpdateDevice(state.editingDeviceId, formData);
      if (updated) {
        ui.showToast(`"${name}" updated`);
      } else {
        ui.showToast('Device not found — could not update');
        return;
      }
    } else {
      // ---- ADD ----
      storeAddDevice(formData);
      ui.showToast(`"${name}" added to OmniBackup`);
    }

    ui.closeModal('addDeviceModal');
    devices._clearForm();
    ui.updateMetrics();
    ui.renderDashDevices();
    ui.renderDashWarranties();
    ui.renderDeviceTable();
  },

  /* ----------------------------------------------------------
     Delete
     ---------------------------------------------------------- */

  /**
   * Confirm and delete a device by ID.
   * @param {number} deviceId
   */
  remove(deviceId) {
    const d = storeGetDevice(deviceId);
    if (!d) return;

    if (!confirm(`Remove "${d.name}" from OmniBackup?\nThis cannot be undone.`)) return;

    storeDeleteDevice(deviceId);
    ui.updateMetrics();
    ui.renderDashDevices();
    ui.renderDashWarranties();
    ui.renderDeviceTable();
    ui.showToast(`"${d.name}" removed`);
  },

  /* ----------------------------------------------------------
     Private helpers
     ---------------------------------------------------------- */

  /** @private — reset every form field to empty */
  _clearForm() {
    devices.FIELDS.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      if (el.tagName === 'SELECT') {
        el.value = el.options[0]?.value || '';
      } else {
        el.value = '';
      }
    });
  },

  /** @private — update modal title and submit button label */
  _setModalMode(mode) {
    const titleEl  = document.querySelector('#addDeviceModal .modal-title');
    const submitEl = document.getElementById('device-form-submit');
    if (titleEl)  titleEl.textContent  = mode === 'edit' ? 'Edit device'   : 'Add new device';
    if (submitEl) submitEl.textContent = mode === 'edit' ? 'Update device' : 'Save device';
  },

};
