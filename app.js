/* =========================================
   OmniBackup — App Logic
   app.js
   ========================================= */

/* --- Device Icon SVGs --- */
const DEVICE_ICONS = {
  phone:  `<svg viewBox="0 0 24 24" style="width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>`,
  laptop: `<svg viewBox="0 0 24 24" style="width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="2" y1="20" x2="22" y2="20"/></svg>`,
  tablet: `<svg viewBox="0 0 24 24" style="width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>`,
  watch:  `<svg viewBox="0 0 24 24" style="width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round"><rect x="5" y="2" width="14" height="20" rx="7"/><circle cx="12" cy="12" r="3"/></svg>`,
  other:  `<svg viewBox="0 0 24 24" style="width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>`
};

/* --- Load data from localStorage (empty on first launch) --- */
let devices      = JSON.parse(localStorage.getItem('omnibackup_devices') || '[]');
let stolenReports= JSON.parse(localStorage.getItem('omnibackup_stolen')  || '[]');
let nextId       = parseInt(localStorage.getItem('omnibackup_nextid')    || '1', 10);
let nextReportId = parseInt(localStorage.getItem('omnibackup_reportid')  || '1', 10);
let profile      = JSON.parse(localStorage.getItem('omnibackup_profile') || '{"name":"","email":""}');

const typeColors = { phone:'dt-phone', laptop:'dt-laptop', tablet:'dt-tablet', watch:'dt-watch', other:'dt-other' };

/* --- Save everything to localStorage --- */
function saveData() {
  localStorage.setItem('omnibackup_devices',  JSON.stringify(devices));
  localStorage.setItem('omnibackup_stolen',   JSON.stringify(stolenReports));
  localStorage.setItem('omnibackup_nextid',   String(nextId));
  localStorage.setItem('omnibackup_reportid', String(nextReportId));
  localStorage.setItem('omnibackup_profile',  JSON.stringify(profile));
}

/* --- Compute warranty info for a device --- */
function warrantyInfo(d) {
  if (!d.warranty) return null;
  const today    = new Date();
  const expDate  = new Date(d.warranty);
  const daysLeft = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
  const pct      = Math.max(0, Math.min(100, Math.round((daysLeft / 365) * 100)));
  let cls, pill, label;
  if (daysLeft < 0)        { cls = 'wb-exp';  pill = 'pill-exp';  label = 'Expired'; }
  else if (daysLeft <= 90) { cls = 'wb-warn'; pill = 'pill-warn'; label = daysLeft + ' days'; }
  else                     { cls = 'wb-ok';   pill = 'pill-ok';   label = 'Active'; }
  return {
    name:   d.name,
    type:   d.type,
    expiry: expDate.toLocaleDateString('en-ZA', { day:'numeric', month:'short', year:'numeric' }),
    daysLeft, pct, cls, pill, label
  };
}

/* --- Compute dashboard metrics from real data --- */
function getMetrics() {
  const today        = new Date();
  const total        = devices.length;
  const stolen       = devices.filter(d => d.status === 'stolen').length;
  const withWarranty = devices.filter(d => d.warranty);
  const active       = withWarranty.filter(d => new Date(d.warranty) >= today).length;
  const expiringSoon = withWarranty.filter(d => {
    const days = Math.ceil((new Date(d.warranty) - today) / (1000 * 60 * 60 * 24));
    return days >= 0 && days <= 90;
  }).length;
  return { total, stolen, active, expiringSoon };
}

/* --- Update metric counters and expiry banner --- */
function updateMetrics() {
  const m   = getMetrics();
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('m-total',    m.total);
  set('m-active',   m.active);
  set('m-expiring', m.expiringSoon);
  set('m-stolen',   m.stolen);
  set('nav-count',  m.total);

  // Show or hide expiry warning banner
  const banner     = document.getElementById('expiry-banner');
  const bannerText = document.getElementById('expiry-banner-text');
  if (banner && bannerText) {
    if (m.expiringSoon > 0) {
      const soon = devices
        .filter(d => d.warranty)
        .filter(d => { const days = Math.ceil((new Date(d.warranty) - new Date()) / 86400000); return days >= 0 && days <= 90; });
      const first = soon[0];
      const days  = Math.ceil((new Date(first.warranty) - new Date()) / 86400000);
      bannerText.innerHTML = `<strong>${m.expiringSoon} warranty${m.expiringSoon > 1 ? 'ies' : ''} expiring soon</strong> — ${first.name} expires in ${days} days. <a onclick="goTo('warranties', null)">View warranty tracker →</a>`;
      banner.style.display = 'flex';
    } else {
      banner.style.display = 'none';
    }
  }
}

/* --- Update profile display in sidebar and settings --- */
function updateProfileDisplay() {
  const name    = profile.name  || 'Your Name';
  const email   = profile.email || 'Not set';
  const initials= profile.name ? profile.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?';

  const avatar = document.getElementById('user-avatar');
  const dispName = document.getElementById('user-display-name');
  const sName  = document.getElementById('s-name-display');
  const sEmail = document.getElementById('s-email-display');

  if (avatar)   avatar.textContent   = initials;
  if (dispName) dispName.textContent = name;
  if (sName)    sName.textContent    = profile.name  || 'Not set';
  if (sEmail)   sEmail.textContent   = profile.email || 'Not set';
}

/* --- Helper: Device Thumbnail HTML --- */
function deviceThumb(type) {
  return `<div class="device-thumb ${typeColors[type] || 'dt-other'}">${DEVICE_ICONS[type] || DEVICE_ICONS.other}</div>`;
}

/* --- Helper: Status Pill HTML --- */
function statusPill(s) {
  if (s === 'ok')     return `<span class="pill pill-ok">Active</span>`;
  if (s === 'warn')   return `<span class="pill pill-warn">Exp. soon</span>`;
  if (s === 'stolen') return `<span class="pill pill-stolen">Stolen</span>`;
  return `<span class="pill">—</span>`;
}

/* --- Render: Dashboard Device List --- */
function renderDashDevices() {
  const el = document.getElementById('dash-device-list');
  if (!el) return;
  if (!devices.length) {
    el.innerHTML = '<div class="empty-state"><svg viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg><p>No devices yet — tap "Add device" to get started.</p></div>';
    return;
  }
  el.innerHTML = devices.slice(0, 5).map(d => `
    <div class="device-row" onclick="goTo('devices', null)">
      ${deviceThumb(d.type)}
      <div class="device-info">
        <div class="device-name">${d.name}</div>
        <div class="device-meta">${d.imei || 'No IMEI'}</div>
      </div>
      <div class="status-dot ${d.status === 'ok' ? 'dot-ok' : d.status === 'warn' ? 'dot-warn' : 'dot-red'}"></div>
    </div>`).join('');
}

/* --- Render: Devices Table --- */
function renderDeviceTable() {
  const q        = (document.getElementById('device-search') || { value: '' }).value.toLowerCase();
  const filtered = devices.filter(d =>
    d.name.toLowerCase().includes(q) ||
    (d.imei  || '').toLowerCase().includes(q) ||
    (d.model || '').toLowerCase().includes(q)
  );
  const el = document.getElementById('device-table-body');
  if (!el) return;
  if (!filtered.length) {
    el.innerHTML = '<div class="empty-state"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><p>' + (devices.length ? 'No devices match your search.' : 'No devices yet — add your first device!') + '</p></div>';
    return;
  }
  el.innerHTML = filtered.map(d => `
    <div class="dt-row">
      <div class="dt-row-name">
        ${deviceThumb(d.type)}
        <div>
          <div class="device-name">${d.name}</div>
          <div class="device-meta" style="font-size:11px;color:var(--text-3)">${d.model || ''}</div>
        </div>
      </div>
      <div class="dt-mono col-hide">${d.imei || '—'}</div>
      <div class="col-hide" style="font-size:13px;color:var(--text-2)">${d.date || '—'}</div>
      <div style="font-size:12px;color:var(--text-2)">${d.warranty || '—'}</div>
      <div>${statusPill(d.status)}</div>
      <div class="dt-actions">
        <div class="action-icon" onclick="editDevice(${d.id})" title="Edit">
          <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z"/></svg>
        </div>
        <div class="action-icon" onclick="deleteDevice(${d.id})" title="Delete" style="color:var(--red)">
          <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
        </div>
      </div>
    </div>`).join('');
}

/* --- Render: Warranty List --- */
function renderWarrantyList(targetId) {
  const el   = document.getElementById(targetId);
  if (!el) return;
  const data = devices.filter(d => d.warranty).map(warrantyInfo).filter(Boolean);
  if (!data.length) {
    el.innerHTML = '<div class="empty-state"><svg viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg><p>No warranty data yet — add devices with a warranty expiry date.</p></div>';
    return;
  }
  el.innerHTML = data.map(w => `
    <div class="warranty-row">
      <div class="w-icon ${typeColors[w.type] || 'dt-other'}">${DEVICE_ICONS[w.type] || DEVICE_ICONS.other}</div>
      <div style="flex:1;min-width:0">
        <div class="w-name">${w.name}</div>
        <div class="w-date">Expires ${w.expiry}</div>
      </div>
      <div class="w-bar-track" style="flex:1;max-width:100px">
        <div class="w-bar-fill ${w.cls}" style="width:${w.pct}%"></div>
      </div>
      <span class="pill ${w.pill}">${w.label}</span>
    </div>`).join('');
}

/* --- Render: Stolen Reports Page --- */
function renderStolenList() {
  const el = document.getElementById('stolen-list');
  if (!el) return;
  const stolen = devices.filter(d => d.status === 'stolen');
  if (!stolen.length) {
    el.innerHTML = '<div class="empty-state"><svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg><p>No stolen device reports. Stay safe!</p></div>';
    return;
  }
  el.innerHTML = stolen.map(d => {
    const report = stolenReports.find(r => r.deviceId === d.id) || {};
    return `
    <div class="report-card">
      <div class="report-status">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        Report active — Case #OB-${String(report.id || '???').padStart(4,'0')}
      </div>
      <div class="report-field"><div class="rf-label">Device</div><div class="rf-val">${d.name}</div></div>
      <div class="report-field"><div class="rf-label">IMEI</div><div class="rf-val rf-mono">${d.imei || '—'}</div></div>
      <div class="report-field"><div class="rf-label">Date reported</div><div class="rf-val">${report.date || '—'}</div></div>
      <div class="report-field"><div class="rf-label">Last known location</div><div class="rf-val">${report.location || '—'}</div></div>
      <div class="report-field"><div class="rf-label">Police reference</div><div class="rf-val">${report.police || '—'}</div></div>
      <div style="margin-top:16px;display:flex;gap:10px">
        <button class="btn btn-ghost" onclick="showToast('Download feature coming soon!')">
          <svg viewBox="0 0 24 24" style="width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Download report
        </button>
        <button class="btn btn-ghost" onclick="copyToClipboard('OB-${String(report.id || '').padStart(4,'0')}')">
          <svg viewBox="0 0 24 24" style="width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
          Copy case number
        </button>
      </div>
    </div>`;
  }).join('');
}

/* --- Render: Security Page --- */
function renderSecurity() {
  const el = document.getElementById('security-content');
  if (!el) return;
  if (!devices.length) {
    el.innerHTML = '<div class="empty-state"><svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg><p>Add devices to see your security score.</p></div>';
    return;
  }
  const total        = devices.length;
  const withImei     = devices.filter(d => d.imei).length;
  const withWarranty = devices.filter(d => d.warranty).length;
  const withDate     = devices.filter(d => d.date).length;
  const score        = Math.round(((withImei + withWarranty + withDate) / (total * 3)) * 100);
  const scoreColor   = score >= 70 ? 'var(--green)' : score >= 40 ? 'var(--amber)' : 'var(--red)';
  const scoreLabel   = score >= 70 ? 'Good' : score >= 40 ? 'Fair — a few improvements available' : 'Needs attention';

  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:24px;margin-bottom:16px">
      <div style="text-align:center">
        <div style="font-size:48px;font-weight:300;color:${scoreColor};line-height:1">${score}</div>
        <div style="font-size:12px;color:var(--text-3)">out of 100</div>
      </div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:500;color:var(--text);margin-bottom:6px">${scoreLabel}</div>
        <div style="background:var(--bg);height:8px;border-radius:4px;overflow:hidden">
          <div style="background:${scoreColor};height:8px;border-radius:4px;width:${score}%;transition:.4s"></div>
        </div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      ${checkItem(withImei === total, 'IMEI recorded', withImei + ' of ' + total + ' devices')}
      ${checkItem(withWarranty === total, 'Warranty dates set', withWarranty + ' of ' + total + ' devices')}
      ${checkItem(withDate === total, 'Purchase dates set', withDate + ' of ' + total + ' devices')}
    </div>`;
}

function checkItem(ok, label, sub) {
  return `<div style="padding:12px;background:var(--bg);border-radius:var(--radius);display:flex;align-items:center;gap:10px">
    <span style="color:${ok ? 'var(--green)' : 'var(--amber)'};font-size:18px">${ok ? '✓' : '!'}</span>
    <div>
      <div style="font-size:12px;font-weight:500;color:var(--text)">${label}</div>
      <div style="font-size:11px;color:var(--text-3)">${sub}</div>
    </div>
  </div>`;
}

/* --- Render: About Page stats --- */
function renderAbout() {
  const withWarranty = devices.filter(d => d.warranty).length;
  const ad = document.getElementById('about-devices');
  const aw = document.getElementById('about-warranties');
  if (ad) ad.textContent = devices.length;
  if (aw) aw.textContent = withWarranty;
}

/* --- Navigation --- */
function goTo(page, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');

  if (el) {
    el.classList.add('active');
  } else {
    document.querySelectorAll('.nav-item').forEach(i => {
      if (i.getAttribute('onclick') && i.getAttribute('onclick').includes("'" + page + "'"))
        i.classList.add('active');
    });
  }

  const titles = {
    dashboard: 'Dashboard', devices: 'My devices',
    stolen: 'Stolen reports', security: 'Security',
    documents: 'Documents', warranties: 'Warranties',
    settings: 'Settings', about: 'About'
  };
  document.getElementById('page-title').textContent = titles[page] || page;

  if (page === 'devices')    renderDeviceTable();
  if (page === 'warranties') renderWarrantyList('warranty-full-list');
  if (page === 'stolen')     renderStolenList();
  if (page === 'security')   renderSecurity();
  if (page === 'about')      renderAbout();
}

/* --- Modal Helpers --- */
function openModal(id)  {
  if (id === 'stolenModal') populateStolenDropdown();
  document.getElementById(id).classList.add('open');
}
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

/* --- Add / Save Device --- */
function addDevice() {
  const name = document.getElementById('f-name').value.trim();
  if (!name) { showToast('Please enter a device name'); return; }

  const warrantyDate = document.getElementById('f-warranty').value;
  let status = 'ok';
  if (warrantyDate) {
    const days = Math.ceil((new Date(warrantyDate) - new Date()) / 86400000);
    if (days >= 0 && days <= 90) status = 'warn';
  }

  const d = {
    id:       nextId++,
    name,
    type:     document.getElementById('f-type').value,
    model:    document.getElementById('f-model').value || name,
    imei:     document.getElementById('f-imei').value,
    date:     document.getElementById('f-date').value,
    warranty: warrantyDate,
    notes:    document.getElementById('f-notes').value,
    status
  };

  devices.unshift(d);
  saveData();

  ['f-name', 'f-model', 'f-imei', 'f-date', 'f-warranty', 'f-notes'].forEach(id => {
    document.getElementById(id).value = '';
  });

  closeModal('addDeviceModal');
  updateMetrics();
  renderDashDevices();
  renderWarrantyList('dash-warranty-list');
  showToast('Device "' + d.name + '" added successfully');
}

/* --- Delete Device --- */
function deleteDevice(id) {
  if (!confirm('Remove this device from OmniBackup?')) return;
  devices = devices.filter(d => d.id !== id);
  saveData();
  updateMetrics();
  renderDashDevices();
  renderDeviceTable();
  renderWarrantyList('dash-warranty-list');
  showToast('Device removed');
}

/* --- Edit Device (prefill modal) --- */
function editDevice(id) {
  const d = devices.find(x => x.id === id);
  if (!d) return;
  document.getElementById('f-name').value     = d.name;
  document.getElementById('f-type').value     = d.type;
  document.getElementById('f-model').value    = d.model;
  document.getElementById('f-imei').value     = d.imei     || '';
  document.getElementById('f-date').value     = d.date     || '';
  document.getElementById('f-warranty').value = d.warranty || '';
  document.getElementById('f-notes').value    = d.notes    || '';
  openModal('addDeviceModal');
}

/* --- File Stolen Report --- */
function fileReport() {
  const deviceName = document.getElementById('sr-device').value;
  if (!deviceName) { showToast('Please select a device'); return; }

  const d = devices.find(x => x.name === deviceName);
  if (d) { d.status = 'stolen'; }

  const report = {
    id:       nextReportId++,
    deviceId: d ? d.id : null,
    device:   deviceName,
    date:     document.getElementById('sr-date').value || new Date().toLocaleDateString('en-ZA'),
    location: document.getElementById('sr-location').value,
    police:   document.getElementById('sr-police').value,
    desc:     document.getElementById('sr-desc').value
  };
  stolenReports.push(report);
  saveData();

  ['sr-date', 'sr-location', 'sr-police', 'sr-desc'].forEach(id => {
    document.getElementById(id).value = '';
  });

  closeModal('stolenModal');
  updateMetrics();
  renderDashDevices();
  showToast('Stolen report filed for ' + deviceName);
}

/* --- Populate stolen report dropdown from real devices --- */
function populateStolenDropdown() {
  const sel = document.getElementById('sr-device');
  if (!sel) return;
  const active = devices.filter(d => d.status !== 'stolen');
  if (!active.length) {
    sel.innerHTML = '<option value="">No devices registered yet</option>';
    return;
  }
  sel.innerHTML = active.map(d => `<option value="${d.name}">${d.name}</option>`).join('');
}

/* --- Profile: Save Name --- */
function saveName() {
  const val = document.getElementById('edit-name').value.trim();
  if (!val) { showToast('Please enter a name'); return; }
  profile.name = val;
  saveData();
  updateProfileDisplay();
  closeModal('editNameModal');
  document.getElementById('edit-name').value = '';
  showToast('Name updated');
}

/* --- Profile: Save Email --- */
function saveEmail() {
  const val = document.getElementById('edit-email').value.trim();
  if (!val) { showToast('Please enter an email'); return; }
  profile.email = val;
  saveData();
  updateProfileDisplay();
  closeModal('editEmailModal');
  document.getElementById('edit-email').value = '';
  showToast('Email updated');
}

/* --- Export Records --- */
function exportRecords() {
  if (!devices.length) { showToast('No devices to export yet'); return; }
  const data = JSON.stringify({ exported: new Date().toISOString(), profile, devices, stolenReports }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = 'omnibackup-records.json';
  a.click();
  showToast('Records exported as JSON');
}

/* --- Clear All Data --- */
function clearAllData() {
  if (!confirm('This will delete ALL your devices and data. Are you sure?')) return;
  devices       = [];
  stolenReports = [];
  nextId        = 1;
  nextReportId  = 1;
  profile       = { name: '', email: '' };
  saveData();
  updateMetrics();
  updateProfileDisplay();
  renderDashDevices();
  renderWarrantyList('dash-warranty-list');
  showToast('All data cleared');
}

/* --- Copy to clipboard --- */
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => showToast('Copied: ' + text));
}

/* --- Toast Notification --- */
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

/* --- Init on page load --- */
updateMetrics();
updateProfileDisplay();
renderDashDevices();
renderWarrantyList('dash-warranty-list');
