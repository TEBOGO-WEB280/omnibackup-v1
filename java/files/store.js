/**
 * ============================================================
 *  OmniBackup — store.js
 *  Centralised state management and LocalStorage persistence.
 *  Depends on: config.js, data.js
 * ============================================================
 */

'use strict';

/* ----------------------------------------------------------
   In-memory application state
   ---------------------------------------------------------- */
const state = {
  devices:          [],
  reports:          [],
  documents:        [],
  activity:         [],
  settings:         { ...DEFAULT_SETTINGS },
  nextDeviceId:     8,
  nextReportId:     2,
  nextDocumentId:   5,
  nextActivityId:   7,
  currentPage:      'dashboard',
  editingDeviceId:  null,     // null = add mode, number = edit mode
  toastTimer:       null,
  searchDebounce:   null,
};

/* ----------------------------------------------------------
   Load  —  hydrate state from localStorage (or seed data)
   ---------------------------------------------------------- */

/**
 * Load all persisted data from localStorage.
 * Falls back gracefully to seed data on first run or parse errors.
 */
function loadStore() {
  state.devices   = _loadKey(STORAGE_KEYS.DEVICES,   SEED_DEVICES);
  state.reports   = _loadKey(STORAGE_KEYS.REPORTS,   SEED_REPORTS);
  state.documents = _loadKey(STORAGE_KEYS.DOCUMENTS, SEED_DOCUMENTS);
  state.activity  = _loadKey(STORAGE_KEYS.ACTIVITY,  SEED_ACTIVITY);
  state.settings  = _loadSettings();

  // Re-calculate safe auto-increment IDs
  state.nextDeviceId   = _maxId(state.devices)   + 1;
  state.nextReportId   = _maxId(state.reports)   + 1;
  state.nextDocumentId = _maxId(state.documents) + 1;
  state.nextActivityId = _maxId(state.activity)  + 1;

  console.info(
    `[OmniBackup Store] Loaded — devices: ${state.devices.length}, ` +
    `reports: ${state.reports.length}, docs: ${state.documents.length}`
  );
}

/** @private */
function _loadKey(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [...fallback];
  } catch (err) {
    console.error(`[Store] Failed to parse "${key}":`, err);
    return [...fallback];
  }
}

/** @private */
function _loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/** @private — get the highest id in an array of objects */
function _maxId(arr) {
  return arr.reduce((max, item) => Math.max(max, item.id || 0), 0);
}

/* ----------------------------------------------------------
   Save  —  persist individual slices to localStorage
   ---------------------------------------------------------- */

function saveDevices()   { _saveKey(STORAGE_KEYS.DEVICES,   state.devices);   }
function saveReports()   { _saveKey(STORAGE_KEYS.REPORTS,   state.reports);   }
function saveDocuments() { _saveKey(STORAGE_KEYS.DOCUMENTS, state.documents); }
function saveActivity()  { _saveKey(STORAGE_KEYS.ACTIVITY,  state.activity);  }
function saveSettings()  { _saveKey(STORAGE_KEYS.SETTINGS,  state.settings);  }

/** @private */
function _saveKey(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`[Store] Failed to save "${key}":`, err);
  }
}

/** Save everything at once */
function saveAll() {
  saveDevices();
  saveReports();
  saveDocuments();
  saveActivity();
  saveSettings();
}

/* ----------------------------------------------------------
   Activity log helpers
   ---------------------------------------------------------- */

/**
 * Append a new activity entry to the activity log.
 * @param {'add'|'edit'|'upload'|'warn'|'report'|'delete'} type
 * @param {string} message
 */
function logActivity(type, message) {
  const entry = {
    id:        state.nextActivityId++,
    type,
    message,
    timestamp: new Date().toISOString(),
  };
  state.activity.unshift(entry);
  // Keep the log capped at 100 entries
  if (state.activity.length > 100) state.activity.pop();
  saveActivity();
  return entry;
}

/* ----------------------------------------------------------
   Device store operations
   ---------------------------------------------------------- */

/**
 * Add a new device to the store.
 * @param {object} deviceData  Fields from the add-device form
 * @returns {object} The created device
 */
function storeAddDevice(deviceData) {
  const device = {
    id:        state.nextDeviceId++,
    addedAt:   new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status:    utils.deriveStatus(deviceData.warranty, 'ok'),
    ...deviceData,
  };
  state.devices.unshift(device);
  saveDevices();
  logActivity('add', `${device.name} added to vault`);
  return device;
}

/**
 * Update an existing device in the store.
 * @param {number} id
 * @param {object} updates  Partial device fields to merge
 * @returns {object|null} The updated device, or null if not found
 */
function storeUpdateDevice(id, updates) {
  const idx = state.devices.findIndex(d => d.id === id);
  if (idx === -1) return null;

  state.devices[idx] = {
    ...state.devices[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
    status: utils.deriveStatus(
      updates.warranty || state.devices[idx].warranty,
      state.devices[idx].status
    ),
  };
  saveDevices();
  logActivity('edit', `${state.devices[idx].name} details updated`);
  return state.devices[idx];
}

/**
 * Delete a device and its associated reports from the store.
 * @param {number} id
 * @returns {boolean} true if deleted, false if not found
 */
function storeDeleteDevice(id) {
  const device = state.devices.find(d => d.id === id);
  if (!device) return false;

  state.devices = state.devices.filter(d => d.id !== id);
  state.reports = state.reports.filter(r => r.deviceId !== id);
  saveDevices();
  saveReports();
  logActivity('delete', `${device.name} removed from vault`);
  return true;
}

/**
 * Find and return a single device by ID.
 * @param {number} id
 * @returns {object|undefined}
 */
function storeGetDevice(id) {
  return state.devices.find(d => d.id === id);
}

/* ----------------------------------------------------------
   Report store operations
   ---------------------------------------------------------- */

/**
 * File a new stolen report and mark the linked device as stolen.
 * @param {object} reportData  Fields from the stolen-report form
 * @returns {object} The created report
 */
function storeAddReport(reportData) {
  const caseNumber = utils.generateCaseNumber(state.nextReportId);
  const report = {
    id:             state.nextReportId++,
    caseNumber,
    status:         'active',
    insuranceClaim: 'Pending',
    createdAt:      new Date().toISOString(),
    ...reportData,
  };
  state.reports.unshift(report);

  // Mark the device stolen
  if (report.deviceId) {
    const idx = state.devices.findIndex(d => d.id === report.deviceId);
    if (idx !== -1) {
      state.devices[idx].status    = DEVICE_STATUS.STOLEN;
      state.devices[idx].updatedAt = new Date().toISOString();
    }
  }

  saveReports();
  saveDevices();
  logActivity('report', `${report.deviceName} reported as stolen — Case #${caseNumber}`);
  return report;
}

/* ----------------------------------------------------------
   Document store operations
   ---------------------------------------------------------- */

/**
 * Add a document record to the store.
 * @param {object} docData
 * @returns {object} The created document record
 */
function storeAddDocument(docData) {
  const doc = {
    id:      state.nextDocumentId++,
    addedAt: new Date().toISOString(),
    ...docData,
  };
  state.documents.unshift(doc);
  saveDocuments();
  logActivity('upload', `Document uploaded for ${doc.deviceName}`);
  return doc;
}

/**
 * Delete a document record by ID.
 * @param {number} id
 */
function storeDeleteDocument(id) {
  const doc = state.documents.find(d => d.id === id);
  state.documents = state.documents.filter(d => d.id !== id);
  saveDocuments();
  if (doc) logActivity('delete', `Document "${doc.name}" removed`);
}

/* ----------------------------------------------------------
   Settings operations
   ---------------------------------------------------------- */

/**
 * Update a single setting key and persist.
 * @param {string} key
 * @param {*} value
 */
function storeSetting(key, value) {
  state.settings[key] = value;
  saveSettings();
}

/**
 * Toggle a boolean setting.
 * @param {string} key
 * @returns {boolean} The new value
 */
function storeToggleSetting(key) {
  state.settings[key] = !state.settings[key];
  saveSettings();
  return state.settings[key];
}

/* ----------------------------------------------------------
   Reset / clear
   ---------------------------------------------------------- */

/**
 * Wipe all user data from localStorage and reset state to seed data.
 * Use with confirmation prompt only.
 */
function storeReset() {
  Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
  state.devices   = [...SEED_DEVICES];
  state.reports   = [...SEED_REPORTS];
  state.documents = [...SEED_DOCUMENTS];
  state.activity  = [...SEED_ACTIVITY];
  state.settings  = { ...DEFAULT_SETTINGS };
  state.nextDeviceId   = _maxId(state.devices)   + 1;
  state.nextReportId   = _maxId(state.reports)   + 1;
  state.nextDocumentId = _maxId(state.documents) + 1;
  state.nextActivityId = _maxId(state.activity)  + 1;
  saveAll();
  console.info('[Store] All data reset to defaults.');
}
