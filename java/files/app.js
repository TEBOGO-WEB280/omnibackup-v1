/**
 * ============================================================
 *  OmniBackup — app.js
 *  Main entry point. Boots the application, wires all events,
 *  and coordinates all modules.
 *
 *  REQUIRED LOAD ORDER (add these <script> tags to index.html):
 *    1.  config.js        — constants & icons
 *    2.  data.js          — seed data
 *    3.  store.js         — state management & localStorage
 *    4.  utils.js         — pure helper functions
 *    5.  ui.js            — DOM rendering & navigation
 *    6.  devices.js       — device CRUD controller
 *    7.  reports.js       — stolen report controller
 *    8.  modules.js       — docs, settings, export/import controllers
 *    9.  app.js           — THIS FILE — boot & event wiring
 * ============================================================
 */

'use strict';

/* ----------------------------------------------------------
   Boot sequence
   ---------------------------------------------------------- */

/**
 * Main application initialiser.
 * Called automatically when the DOM is ready.
 */
function initApp() {
  console.info(`[OmniBackup] Starting ${APP_NAME} v${APP_VERSION}`);

  // 1 ── Load persisted data (or seed data on first run)
  loadStore();

  // 2 ── Render initial dashboard
  ui.renderDashboard();

  // 3 ── Wire up all event listeners
  _wireEvents();

  // 4 ── Set up keyboard shortcuts
  _wireKeyboard();

  // 5 ── Highlight the correct nav item for the initial page
  ui.goTo('dashboard', document.querySelector('.nav-item.active'));

  console.info(
    `[OmniBackup] Ready — ` +
    `${state.devices.length} devices, ` +
    `${state.reports.length} reports, ` +
    `${state.documents.length} documents`
  );
}

/* ----------------------------------------------------------
   Event wiring
   ---------------------------------------------------------- */

/**
 * Wire every persistent event listener that doesn't live
 * inline in the HTML.
 * @private
 */
function _wireEvents() {

  // ── Search input (devices page) — debounced
  const searchEl = document.getElementById('device-search');
  if (searchEl) {
    searchEl.addEventListener('input', () => {
      clearTimeout(state.searchDebounce);
      state.searchDebounce = setTimeout(() => ui.renderDeviceTable(), 200);
    });
  }

  // ── Close modals when clicking the backdrop
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  });

  // ── Topbar "Add device" button
  const topAddBtn = document.getElementById('add-device-btn');
  if (topAddBtn) topAddBtn.addEventListener('click', () => devices.openAdd());

  // ── Device form submit button
  const devSubmitBtn = document.getElementById('device-form-submit');
  if (devSubmitBtn) devSubmitBtn.addEventListener('click', () => devices.submitForm());

  // ── Stolen report form submit button
  const reportSubmitBtn = document.getElementById('report-form-submit');
  if (reportSubmitBtn) reportSubmitBtn.addEventListener('click', () => reports.submitForm());

  // ── "File new report" button
  const newReportBtn = document.getElementById('new-report-btn');
  if (newReportBtn) newReportBtn.addEventListener('click', () => reports.openForm());

  // ── Upload document button
  const uploadDocBtn = document.getElementById('upload-doc-btn');
  if (uploadDocBtn) uploadDocBtn.addEventListener('click', () => docs.openUpload());

  // ── Export records button (topbar or settings)
  document.querySelectorAll('[data-action="export"]').forEach(btn => {
    btn.addEventListener('click', () => exportImport.exportAll());
  });

  // ── Import records button (settings)
  document.querySelectorAll('[data-action="import"]').forEach(btn => {
    btn.addEventListener('click', () => exportImport.importFile());
  });

  // ── Settings toggles
  _wireToggle('toggle-warranty', 'warrantyAlerts');
  _wireToggle('toggle-digest',   'securityDigest');
  _wireToggle('toggle-login',    'loginAlerts');

  // ── Settings profile save
  const saveProfileBtn = document.getElementById('save-profile-btn');
  if (saveProfileBtn) saveProfileBtn.addEventListener('click', () => settings.saveProfile());

  // ── Reset all data button
  const resetBtn = document.getElementById('reset-data-btn');
  if (resetBtn) resetBtn.addEventListener('click', () => settings.resetAllData());

  // ── Quick action cards (dashboard)
  _wireQuickAction('qa-add-device',    () => devices.openAdd());
  _wireQuickAction('qa-report-stolen', () => reports.openForm());
  _wireQuickAction('qa-upload-doc',    () => docs.openUpload());
  _wireQuickAction('qa-export',        () => exportImport.exportAll());
  _wireQuickAction('qa-import',        () => exportImport.importFile());
}

/**
 * Wire a settings toggle element to a state key.
 * @private
 * @param {string} elementId
 * @param {string} settingKey
 */
function _wireToggle(elementId, settingKey) {
  const el = document.getElementById(elementId);
  if (!el) return;
  // Set initial visual state from loaded settings
  el.classList.toggle('on', !!state.settings[settingKey]);
  el.addEventListener('click', () => settings.toggle(settingKey, el));
}

/**
 * Wire a quick-action card element to a callback.
 * @private
 * @param {string}   elementId
 * @param {Function} callback
 */
function _wireQuickAction(elementId, callback) {
  const el = document.getElementById(elementId);
  if (el) el.addEventListener('click', callback);
}

/* ----------------------------------------------------------
   Keyboard shortcuts
   ---------------------------------------------------------- */

/**
 * Register global keyboard shortcut handlers.
 * @private
 */
function _wireKeyboard() {
  document.addEventListener('keydown', e => {

    // Escape — close all open modals
    if (e.key === 'Escape') {
      ui.closeAllModals();
      return;
    }

    // Don't fire shortcuts when typing in inputs
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    // Shortcut map: key → action
    const shortcuts = {
      'n': () => devices.openAdd(),         // N — New device
      'd': () => ui.goTo('dashboard', null), // D — Dashboard
      'm': () => ui.goTo('devices', null),   // M — My Devices
      'w': () => ui.goTo('warranties', null),// W — Warranties
      's': () => ui.goTo('security', null),  // S — Security
      'r': () => ui.goTo('stolen', null),    // R — Reports
      'e': () => exportImport.exportAll(),   // E — Export
    };

    if (e.ctrlKey || e.metaKey) {
      // Ctrl/Cmd + key combos
      const ctrlShortcuts = {
        'e': () => { e.preventDefault(); exportImport.exportAll(); },
        'i': () => { e.preventDefault(); exportImport.importFile(); },
      };
      if (ctrlShortcuts[e.key]) { ctrlShortcuts[e.key](); return; }
    }

    if (!e.ctrlKey && !e.metaKey && !e.altKey && shortcuts[e.key]) {
      shortcuts[e.key]();
    }

  });
}

/* ----------------------------------------------------------
   Global functions expected by HTML onclick attributes
   ---------------------------------------------------------- */

// These thin wrappers bridge the gap between inline HTML onclick=""
// attributes and the module methods, keeping the module objects clean.

/** Navigate to a page (called from sidebar nav items). */
function goTo(page, el)          { ui.goTo(page, el); }

/** Open the Add Device modal (called from topbar button). */
function openAddDevice()         { devices.openAdd(); }

/** Open the modal by ID (called inline from HTML). */
function openModal(id)           { ui.openModal(id); }

/** Close a modal by ID (called inline from HTML). */
function closeModal(id)          { ui.closeModal(id); }

/** Submit the device form (called from modal Save button). */
function submitDeviceForm()      { devices.submitForm(); }

/** Open edit mode for a device (called from table action icon). */
function openEditDevice(id)      { devices.openEdit(id); }

/** Delete a device (called from table action icon). */
function deleteDevice(id)        { devices.remove(id); }

/** Open the stolen report form. */
function openStolenForm()        { reports.openForm(); }

/** Submit the stolen report form. */
function fileReport()            { reports.submitForm(); }

/** Download a specific report. */
function downloadReport(id)      { reports.download(id); }

/** Export all records. */
function exportRecords()         { exportImport.exportAll(); }

/** Import from file. */
function importRecords()         { exportImport.importFile(); }

/** Show a toast notification. */
function showToast(msg)          { ui.showToast(msg); }

/* ----------------------------------------------------------
   DOMContentLoaded — start the app
   ---------------------------------------------------------- */

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  // DOM already ready (script loaded with defer or at end of body)
  initApp();
}
