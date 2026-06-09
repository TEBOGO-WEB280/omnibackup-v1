/**
 * ============================================================
 *  OmniBackup — ui.js
 *  All DOM rendering, navigation, modals, and toast system.
 *  Depends on: config.js, utils.js, store.js
 * ============================================================
 */

'use strict';

const ui = {

  /* ----------------------------------------------------------
     Toast notifications
     ---------------------------------------------------------- */

  /**
   * Show a temporary toast notification at the bottom of the screen.
   * @param {string} message
   * @param {number} [duration=2800]  Auto-dismiss in ms
   */
  showToast(message, duration = 2800) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => toast.classList.remove('show'), duration);
  },

  /* ----------------------------------------------------------
     Navigation
     ---------------------------------------------------------- */

  /**
   * Navigate to a named page.
   * Hides all other pages, updates nav active states, updates topbar title,
   * and triggers the correct per-page render function.
   * @param {string}           page       Key matching PAGE_TITLES
   * @param {HTMLElement|null} clickedEl  Nav item that was clicked (optional)
   */
  goTo(page, clickedEl) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    // Remove active class from all nav items
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    // Show the target page
    const pageEl = document.getElementById('page-' + page);
    if (!pageEl) {
      console.warn('[OmniBackup UI] Page element not found:', 'page-' + page);
      return;
    }
    pageEl.classList.add('active');

    // Highlight the correct nav item
    if (clickedEl) {
      clickedEl.classList.add('active');
    } else {
      document.querySelectorAll('.nav-item').forEach(item => {
        const attr = item.getAttribute('onclick') || '';
        if (attr.includes(`'${page}'`)) item.classList.add('active');
      });
    }

    // Update topbar title
    const titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.textContent = PAGE_TITLES[page] || page;

    // Update state and trigger page-specific renders
    state.currentPage = page;
    switch (page) {
      case 'devices':    ui.renderDeviceTable();         break;
      case 'warranties': ui.renderWarrantyList('warranty-full-list'); break;
      case 'stolen':     ui.renderStolenReports();       break;
      case 'security':   ui.renderSecurityScore();       break;
      case 'documents':  ui.renderDocuments();            break;
      case 'settings':   ui.renderSettings();             break;
      case 'dashboard':  ui.renderDashboard();            break;
    }
  },

  /* ----------------------------------------------------------
     Modal controls
     ---------------------------------------------------------- */

  /** Open a modal overlay by element ID. */
  openModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.add('open');
  },

  /** Close a modal overlay by element ID. */
  closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.remove('open');
  },

  /** Close all open modals at once (e.g. on Escape key). */
  closeAllModals() {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
  },

  /* ----------------------------------------------------------
     Dashboard
     ---------------------------------------------------------- */

  /** Render all dynamic dashboard sections. */
  renderDashboard() {
    ui.renderDashDevices();
    ui.renderDashWarranties();
    ui.renderActivityFeed();
    ui.updateMetrics();
  },

  /**
   * Render the first 5 devices in the dashboard device-list panel.
   */
  renderDashDevices() {
    const el = document.getElementById('dash-device-list');
    if (!el) return;

    if (!state.devices.length) {
      el.innerHTML = `<div class="empty-state">
        ${DEVICE_ICONS.other}
        <p>No devices yet — add your first device!</p>
      </div>`;
      return;
    }

    el.innerHTML = state.devices.slice(0, 5).map(d => {
      const dotCls = { ok: 'dot-ok', warn: 'dot-warn', stolen: 'dot-red' }[d.status] || 'dot-ok';
      return `
        <div class="device-row" onclick="ui.goTo('devices', null)" title="View all devices">
          ${utils.deviceThumb(d.type)}
          <div class="device-info">
            <div class="device-name">${utils.escapeHtml(d.name)}</div>
            <div class="device-meta">${utils.escapeHtml(d.imei || d.serial || 'No IMEI recorded')}</div>
          </div>
          <div class="status-dot ${dotCls}"></div>
        </div>`;
    }).join('');
  },

  /**
   * Render up to 5 warranty rows in the dashboard warranty panel.
   */
  renderDashWarranties() {
    ui.renderWarrantyList('dash-warranty-list', 5);
  },

  /**
   * Render the activity feed (recent 6 entries).
   */
  renderActivityFeed() {
    const el = document.getElementById('activity-feed');
    if (!el) return;

    const entries = state.activity.slice(0, 6);
    if (!entries.length) {
      el.innerHTML = `<div class="empty-state"><p>No activity yet.</p></div>`;
      return;
    }

    el.innerHTML = entries.map(entry => `
      <div class="activity-row">
        ${utils.activityIcon(entry.type)}
        <div class="act-text">${utils.escapeHtml(entry.message)}</div>
        <div class="act-time">${utils.shortDate(entry.timestamp)}</div>
      </div>`).join('');
  },

  /* ----------------------------------------------------------
     Metrics cards
     ---------------------------------------------------------- */

  /**
   * Recalculate and update all metric card values and nav badge.
   */
  updateMetrics() {
    const total        = state.devices.length;
    const underWarranty = state.devices.filter(d => {
      const days = utils.daysUntil(d.warranty);
      return days !== null && days > 0;
    }).length;
    const expiringSoon = state.devices.filter(d => {
      const days = utils.daysUntil(d.warranty);
      return days !== null && days > 0 && days <= WARRANTY_THRESHOLDS.WARNING;
    }).length;
    const stolenActive = state.reports.filter(r => r.status === 'active').length;

    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    set('m-total',    total);
    set('m-warranty', underWarranty);
    set('m-expiring', expiringSoon);
    set('m-stolen',   stolenActive);
    set('nav-count',  total);

    // Show/hide dashboard alert banner
    const banner = document.getElementById('warranty-alert-banner');
    if (banner) {
      banner.style.display = expiringSoon > 0 ? 'flex' : 'none';
      const msg = document.getElementById('warranty-alert-msg');
      if (msg && expiringSoon > 0) {
        msg.textContent =
          `${expiringSoon} warranty${expiringSoon > 1 ? 'ies' : 'y'} expiring within 90 days. `;
      }
    }
  },

  /* ----------------------------------------------------------
     Devices table
     ---------------------------------------------------------- */

  /**
   * Render the devices table, filtered by the current search query.
   */
  renderDeviceTable() {
    const searchEl = document.getElementById('device-search');
    const query    = (searchEl ? searchEl.value : '').toLowerCase().trim();

    const filtered = state.devices.filter(d =>
      d.name.toLowerCase().includes(query)            ||
      (d.imei   || '').toLowerCase().includes(query)  ||
      (d.serial || '').toLowerCase().includes(query)  ||
      (d.model  || '').toLowerCase().includes(query)  ||
      (d.brand  || '').toLowerCase().includes(query)
    );

    const tbody = document.getElementById('device-table-body');
    if (!tbody) return;

    if (!filtered.length) {
      tbody.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" style="width:36px;height:36px;fill:none;stroke:currentColor;stroke-width:1.5;display:block;margin:0 auto 10px">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <p>${query ? 'No devices match your search.' : 'No devices added yet.'}</p>
        </div>`;
      return;
    }

    tbody.innerHTML = filtered.map(d => `
      <div class="dt-row">
        <div class="dt-row-name">
          ${utils.deviceThumb(d.type)}
          <div>
            <div class="device-name">${utils.escapeHtml(d.name)}</div>
            <div class="device-meta" style="font-size:11px;color:var(--text-3)">
              ${utils.escapeHtml(d.brand || d.model || '')}
            </div>
          </div>
        </div>
        <div class="dt-mono col-hide">${utils.escapeHtml(d.imei || d.serial || '—')}</div>
        <div class="col-hide" style="font-size:13px;color:var(--text-2)">${utils.formatDate(d.date)}</div>
        <div style="font-size:12px;color:var(--text-2)">${utils.formatDate(d.warranty)}</div>
        <div>${utils.statusPill(d.status)}</div>
        <div class="dt-actions">
          <div class="action-icon" onclick="devices.openEdit(${d.id})" title="Edit">
            <svg viewBox="0 0 24 24" style="width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z"/>
            </svg>
          </div>
          <div class="action-icon" onclick="devices.remove(${d.id})" title="Delete" style="color:var(--red)">
            <svg viewBox="0 0 24 24" style="width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/>
              <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
            </svg>
          </div>
        </div>
      </div>`).join('');
  },

  /* ----------------------------------------------------------
     Warranty tracker
     ---------------------------------------------------------- */

  /**
   * Render warranty rows into a target container element.
   * @param {string}  targetId  DOM element id
   * @param {number}  [limit]   Max rows to render
   */
  renderWarrantyList(targetId, limit) {
    const el = document.getElementById(targetId);
    if (!el) return;

    let list = state.devices.filter(d => d.warranty);
    // Sort: soonest expiry first
    list.sort((a, b) => new Date(a.warranty) - new Date(b.warranty));
    if (limit) list = list.slice(0, limit);

    if (!list.length) {
      el.innerHTML = `<div class="empty-state"><p>No warranty records found.</p></div>`;
      return;
    }

    el.innerHTML = list.map(d => {
      const meta     = utils.warrantyMeta(d.warranty);
      const typeCls  = DEVICE_TYPE_CLASS[d.type] || 'dt-other';
      const icon     = DEVICE_ICONS[d.type]       || DEVICE_ICONS.other;
      return `
        <div class="warranty-row">
          <div class="w-icon ${typeCls}">${icon}</div>
          <div style="flex:1;min-width:0">
            <div class="w-name">${utils.escapeHtml(d.name)}</div>
            <div class="w-date">Expires ${utils.formatDate(d.warranty)}</div>
          </div>
          <div class="w-bar-track" style="flex:1;max-width:110px">
            <div class="w-bar-fill ${meta.barClass}" style="width:${meta.pct}%"></div>
          </div>
          <span class="pill ${meta.pillClass}">${utils.escapeHtml(meta.label)}</span>
        </div>`;
    }).join('');
  },

  /* ----------------------------------------------------------
     Stolen reports
     ---------------------------------------------------------- */

  /**
   * Render all filed stolen reports.
   */
  renderStolenReports() {
    const el = document.getElementById('stolen-reports-list');
    if (!el) return;

    if (!state.reports.length) {
      el.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" style="width:36px;height:36px;fill:none;stroke:currentColor;stroke-width:1.5;display:block;margin:0 auto 10px">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <p>No stolen device reports filed.</p>
        </div>`;
      return;
    }

    el.innerHTML = state.reports.map(r => `
      <div class="report-card" id="report-card-${r.id}">
        <div class="report-status">
          <svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;flex-shrink:0">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          Report active — Case #${utils.escapeHtml(r.caseNumber)}
        </div>
        <div class="report-field">
          <div class="rf-label">Device</div>
          <div class="rf-val">${utils.escapeHtml(r.deviceName)}</div>
        </div>
        <div class="report-field">
          <div class="rf-label">IMEI</div>
          <div class="rf-val rf-mono">${utils.escapeHtml(r.imei || '—')}</div>
        </div>
        <div class="report-field">
          <div class="rf-label">Date reported</div>
          <div class="rf-val">${utils.formatDate(r.dateReported)}</div>
        </div>
        <div class="report-field">
          <div class="rf-label">Last location</div>
          <div class="rf-val">${utils.escapeHtml(r.lastLocation || '—')}</div>
        </div>
        <div class="report-field">
          <div class="rf-label">Police ref</div>
          <div class="rf-val">${utils.escapeHtml(r.policeRef || '—')}</div>
        </div>
        <div class="report-field">
          <div class="rf-label">Insurance claim</div>
          <div class="rf-val">${utils.escapeHtml(r.insuranceClaim || 'Not filed')}</div>
        </div>
        ${r.description ? `
        <div class="report-field">
          <div class="rf-label">Description</div>
          <div class="rf-val" style="font-weight:400">${utils.escapeHtml(r.description)}</div>
        </div>` : ''}
        <div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn btn-ghost" onclick="reports.download(${r.id})" style="font-size:12px">
            <svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download report
          </button>
          <button class="btn btn-ghost" onclick="utils.copyToClipboard('${utils.escapeHtml(r.caseNumber)}', 'Case number copied!')" style="font-size:12px">
            <svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round">
              <rect x="9" y="9" width="13" height="13" rx="2"/>
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
            </svg>
            Copy case #
          </button>
        </div>
      </div>`).join('');
  },

  /* ----------------------------------------------------------
     Security score
     ---------------------------------------------------------- */

  /**
   * Render the security score panel with live calculations.
   */
  renderSecurityScore() {
    const score = utils.calcSecurityScore(state.devices);
    const theme = utils.scoreTheme(score);

    const scoreEl = document.getElementById('security-score-val');
    const barEl   = document.getElementById('security-score-bar');
    const descEl  = document.getElementById('security-score-desc');

    if (scoreEl) { scoreEl.textContent = score; scoreEl.style.color = theme.cssVar; }
    if (barEl)   { barEl.style.width = score + '%'; barEl.style.background = theme.cssVar; }
    if (descEl)  {
      descEl.textContent = theme.label === 'Good'
        ? 'Your records are in great shape. A few more receipts would be perfect.'
        : theme.label === 'Fair'
        ? 'Add IMEI numbers and purchase receipts to improve your score.'
        : 'Your records need attention. Fill in device details to protect your assets.';
    }

    const total = state.devices.length || 1;
    const set   = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    set('sec-imei-stat',    `${state.devices.filter(d => d.imei || d.serial).length} of ${total}`);
    set('sec-date-stat',    `${state.devices.filter(d => d.date).length} of ${total}`);
    set('sec-warranty-stat',`${state.devices.filter(d => d.warranty).length} of ${total}`);
    set('sec-notes-stat',   `${state.devices.filter(d => d.notes).length} of ${total}`);
  },

  /* ----------------------------------------------------------
     Documents
     ---------------------------------------------------------- */

  /**
   * Render the documents list.
   */
  renderDocuments() {
    const el = document.getElementById('docs-list');
    if (!el) return;

    if (!state.documents.length) {
      el.innerHTML = `<div class="empty-state"><p>No documents uploaded yet.</p></div>`;
      return;
    }

    const catPill = {
      Receipt:   'pill-ok',
      Warranty:  'pill-ok',
      Insurance: 'pill-blue',
      Manual:    'pill-blue',
      Other:     'pill-warn',
    };

    el.innerHTML = state.documents.map(doc => `
      <div class="device-row">
        <div class="device-thumb dt-laptop">
          <svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
            <polyline points="14,2 14,8 20,8"/>
          </svg>
        </div>
        <div class="device-info">
          <div class="device-name">${utils.escapeHtml(doc.name)}</div>
          <div class="device-meta">${doc.fileType} · ${doc.fileSize} · Added ${utils.formatDate(doc.addedAt?.slice(0,10))}</div>
        </div>
        <span class="pill ${catPill[doc.category] || 'pill-warn'}">${utils.escapeHtml(doc.category)}</span>
        <div class="action-icon" onclick="docs.remove(${doc.id})" title="Remove" style="margin-left:8px;color:var(--red)">
          <svg viewBox="0 0 24 24" style="width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
          </svg>
        </div>
      </div>`).join('');
  },

  /* ----------------------------------------------------------
     Settings
     ---------------------------------------------------------- */

  /**
   * Render settings values into the settings page.
   */
  renderSettings() {
    const set = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    set('settings-name',    state.settings.userName  || '—');
    set('settings-email',   state.settings.userEmail || '—');
    set('settings-plan',    state.settings.plan      || 'Beta');

    // Update toggle states
    const toggleMap = {
      'toggle-warranty': 'warrantyAlerts',
      'toggle-digest':   'securityDigest',
      'toggle-login':    'loginAlerts',
    };
    Object.entries(toggleMap).forEach(([elId, settingKey]) => {
      const el = document.getElementById(elId);
      if (el) el.classList.toggle('on', !!state.settings[settingKey]);
    });

    // Storage bar
    const usage   = utils.estimateStorage(state.documents.length);
    const pct     = Math.min(100, Math.round((usage.total / (state.settings.storageLimit || 500)) * 100));
    const barEl   = document.getElementById('settings-storage-bar');
    const labelEl = document.getElementById('settings-storage-label');
    if (barEl)   barEl.style.width = pct + '%';
    if (labelEl) labelEl.textContent = `${usage.total} MB of ${state.settings.storageLimit} MB used`;
  },

};
