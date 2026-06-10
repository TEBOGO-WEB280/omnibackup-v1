/* =========================================
   OmniBackup — App Logic with Firebase
   app.js
   ========================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, query, where, updateDoc } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

/* --- Firebase Config --- */
const firebaseConfig = {
  apiKey: "AIzaSyDGahjnB38YFp-uNrwt58g3Lx1hg1ioYYE",
  authDomain: "omnibackup-ec978.firebaseapp.com",
  projectId: "omnibackup-ec978",
  storageBucket: "omnibackup-ec978.firebasestorage.app",
  messagingSenderId: "992809410913",
  appId: "1:992809410913:web:bea489eddba070026ee520"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

/* --- State --- */
let devices = [];
let currentUser = null;

/* --- Device Icons --- */
const DEVICE_ICONS = {
  phone:  `<svg viewBox="0 0 24 24" style="width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>`,
  laptop: `<svg viewBox="0 0 24 24" style="width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="2" y1="20" x2="22" y2="20"/></svg>`,
  tablet: `<svg viewBox="0 0 24 24" style="width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>`,
  watch:  `<svg viewBox="0 0 24 24" style="width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round"><rect x="5" y="2" width="14" height="20" rx="7"/><circle cx="12" cy="12" r="3"/></svg>`,
  other:  `<svg viewBox="0 0 24 24" style="width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>`
};
const typeColors = { phone:'dt-phone', laptop:'dt-laptop', tablet:'dt-tablet', watch:'dt-watch', other:'dt-other' };

/* =========================================
   AUTH
   ========================================= */

window.showRegister = () => {
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('register-form').style.display = 'block';
};
window.showLogin = () => {
  document.getElementById('register-form').style.display = 'none';
  document.getElementById('login-form').style.display = 'block';
};

window.registerUser = async () => {
  const name     = document.getElementById('reg-name').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const errEl    = document.getElementById('reg-error');
  errEl.textContent = '';
  if (!name || !email || !password) { errEl.textContent = 'Please fill in all fields.'; return; }
  if (password.length < 6)          { errEl.textContent = 'Password must be at least 6 characters.'; return; }
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    showToast('Account created! Welcome to OmniBackup 🎉');
  } catch (e) {
    errEl.textContent = friendlyError(e.code);
  }
};

window.loginUser = async () => {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl    = document.getElementById('login-error');
  errEl.textContent = '';
  if (!email || !password) { errEl.textContent = 'Please enter your email and password.'; return; }
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (e) {
    errEl.textContent = friendlyError(e.code);
  }
};

window.logoutUser = async () => {
  await signOut(auth);
};

function friendlyError(code) {
  if (code === 'auth/email-already-in-use') return 'That email is already registered. Try signing in.';
  if (code === 'auth/invalid-email')        return 'Please enter a valid email address.';
  if (code === 'auth/invalid-credential')   return 'Incorrect email or password.';
  if (code === 'auth/weak-password')        return 'Password must be at least 6 characters.';
  return 'Something went wrong. Please try again.';
}

/* --- Auth state listener --- */
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app-screen').style.display  = 'block';
    updateProfileDisplay();
    await loadDevices();
    renderDashDevices();
    renderWarrantyList('dash-warranty-list');
    updateMetrics();
  } else {
    currentUser = null;
    devices     = [];
    document.getElementById('auth-screen').style.display = 'flex';
    document.getElementById('app-screen').style.display  = 'none';
  }
});

/* =========================================
   FIRESTORE — Load & Save
   ========================================= */

async function loadDevices() {
  if (!currentUser) return;
  devices = [];
  const q    = query(collection(db, 'devices'), where('uid', '==', currentUser.uid));
  const snap = await getDocs(q);
  snap.forEach(d => devices.push({ id: d.id, ...d.data() }));
  // Sort newest first
  devices.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

async function saveDevice(d) {
  const ref = await addDoc(collection(db, 'devices'), { ...d, uid: currentUser.uid, createdAt: Date.now() });
  return ref.id;
}

async function removeDevice(id) {
  await deleteDoc(doc(db, 'devices', id));
}

/* =========================================
   HELPERS
   ========================================= */

function deviceThumb(type) {
  return `<div class="device-thumb ${typeColors[type] || 'dt-other'}">${DEVICE_ICONS[type] || DEVICE_ICONS.other}</div>`;
}

function statusPill(s) {
  if (s === 'ok')     return `<span class="pill pill-ok">Active</span>`;
  if (s === 'warn')   return `<span class="pill pill-warn">Exp. soon</span>`;
  if (s === 'stolen') return `<span class="pill pill-stolen">Stolen</span>`;
  return `<span class="pill">—</span>`;
}

function warrantyInfo(d) {
  if (!d.warranty) return null;
  const today    = new Date();
  const expDate  = new Date(d.warranty);
  const daysLeft = Math.ceil((expDate - today) / 86400000);
  const pct      = Math.max(0, Math.min(100, Math.round((daysLeft / 365) * 100)));
  let cls, pill, label;
  if (daysLeft < 0)        { cls = 'wb-exp';  pill = 'pill-exp';  label = 'Expired'; }
  else if (daysLeft <= 90) { cls = 'wb-warn'; pill = 'pill-warn'; label = daysLeft + ' days'; }
  else                     { cls = 'wb-ok';   pill = 'pill-ok';   label = 'Active'; }
  return { name: d.name, type: d.type, expiry: expDate.toLocaleDateString('en-ZA', { day:'numeric', month:'short', year:'numeric' }), daysLeft, pct, cls, pill, label };
}

function getMetrics() {
  const today   = new Date();
  const total   = devices.length;
  const stolen  = devices.filter(d => d.status === 'stolen').length;
  const active  = devices.filter(d => d.warranty && new Date(d.warranty) >= today).length;
  const expiring= devices.filter(d => { if (!d.warranty) return false; const days = Math.ceil((new Date(d.warranty) - today) / 86400000); return days >= 0 && days <= 90; }).length;
  return { total, stolen, active, expiringSoon: expiring };
}

/* =========================================
   RENDER FUNCTIONS
   ========================================= */

function updateMetrics() {
  const m = getMetrics();
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('m-total', m.total); set('m-active', m.active);
  set('m-expiring', m.expiringSoon); set('m-stolen', m.stolen); set('nav-count', m.total);
  const banner = document.getElementById('expiry-banner');
  const bannerText = document.getElementById('expiry-banner-text');
  if (banner && bannerText) {
    if (m.expiringSoon > 0) {
      const soon  = devices.filter(d => { if (!d.warranty) return false; const days = Math.ceil((new Date(d.warranty) - new Date()) / 86400000); return days >= 0 && days <= 90; });
      const first = soon[0];
      const days  = Math.ceil((new Date(first.warranty) - new Date()) / 86400000);
      bannerText.innerHTML = `<strong>${m.expiringSoon} warranty${m.expiringSoon > 1 ? 'ies' : ''} expiring soon</strong> — ${first.name} expires in ${days} days. <a onclick="goTo('warranties', null)">View warranty tracker →</a>`;
      banner.style.display = 'flex';
    } else { banner.style.display = 'none'; }
  }
}

function updateProfileDisplay() {
  if (!currentUser) return;
  const name     = currentUser.displayName || 'User';
  const email    = currentUser.email       || '';
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('user-avatar', initials);
  set('user-display-name', name);
  set('user-email-display', email);
  set('s-name-display', name);
  set('s-email-display', email);
}

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

function renderDeviceTable() {
  const q        = (document.getElementById('device-search') || { value: '' }).value.toLowerCase();
  const filtered = devices.filter(d => d.name.toLowerCase().includes(q) || (d.imei||'').toLowerCase().includes(q) || (d.model||'').toLowerCase().includes(q));
  const el = document.getElementById('device-table-body');
  if (!el) return;
  if (!filtered.length) {
    el.innerHTML = '<div class="empty-state"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><p>' + (devices.length ? 'No devices match your search.' : 'No devices yet — add your first device!') + '</p></div>';
    return;
  }
  el.innerHTML = filtered.map(d => `
    <div class="dt-row">
      <div class="dt-row-name">${deviceThumb(d.type)}<div><div class="device-name">${d.name}</div><div class="device-meta" style="font-size:11px;color:var(--text-3)">${d.model||''}</div></div></div>
      <div class="dt-mono col-hide">${d.imei||'—'}</div>
      <div class="col-hide" style="font-size:13px;color:var(--text-2)">${d.date||'—'}</div>
      <div style="font-size:12px;color:var(--text-2)">${d.warranty||'—'}</div>
      <div>${statusPill(d.status)}</div>
      <div class="dt-actions">
        <div class="action-icon" onclick="deleteDevice('${d.id}')" title="Delete" style="color:var(--red)">
          <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
        </div>
      </div>
    </div>`).join('');
}

function renderWarrantyList(targetId) {
  const el   = document.getElementById(targetId);
  if (!el) return;
  const data = devices.filter(d => d.warranty).map(warrantyInfo).filter(Boolean);
  if (!data.length) { el.innerHTML = '<div class="empty-state"><svg viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg><p>No warranty data yet.</p></div>'; return; }
  el.innerHTML = data.map(w => `
    <div class="warranty-row">
      <div class="w-icon ${typeColors[w.type]||'dt-other'}">${DEVICE_ICONS[w.type]||DEVICE_ICONS.other}</div>
      <div style="flex:1;min-width:0"><div class="w-name">${w.name}</div><div class="w-date">Expires ${w.expiry}</div></div>
      <div class="w-bar-track" style="flex:1;max-width:100px"><div class="w-bar-fill ${w.cls}" style="width:${w.pct}%"></div></div>
      <span class="pill ${w.pill}">${w.label}</span>
    </div>`).join('');
}

function renderStolenList() {
  const el     = document.getElementById('stolen-list');
  if (!el) return;
  const stolen = devices.filter(d => d.status === 'stolen');
  if (!stolen.length) { el.innerHTML = '<div class="empty-state"><svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg><p>No stolen device reports. Stay safe!</p></div>'; return; }
  el.innerHTML = stolen.map(d => `
    <div class="report-card">
      <div class="report-status"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>Stolen report active</div>
      <div class="report-field"><div class="rf-label">Device</div><div class="rf-val">${d.name}</div></div>
      <div class="report-field"><div class="rf-label">IMEI</div><div class="rf-val rf-mono">${d.imei||'—'}</div></div>
      <div class="report-field"><div class="rf-label">Location</div><div class="rf-val">${d.stolenLocation||'—'}</div></div>
      <div class="report-field"><div class="rf-label">Police ref</div><div class="rf-val">${d.stolenPolice||'—'}</div></div>
    </div>`).join('');
}

function renderSecurity() {
  const el = document.getElementById('security-content');
  if (!el) return;
  if (!devices.length) { el.innerHTML = '<div class="empty-state"><svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg><p>Add devices to see your security score.</p></div>'; return; }
  const total = devices.length;
  const withImei = devices.filter(d => d.imei).length;
  const withWarranty = devices.filter(d => d.warranty).length;
  const withDate = devices.filter(d => d.date).length;
  const score = Math.round(((withImei + withWarranty + withDate) / (total * 3)) * 100);
  const scoreColor = score >= 70 ? 'var(--green)' : score >= 40 ? 'var(--amber)' : 'var(--red)';
  const scoreLabel = score >= 70 ? 'Good' : score >= 40 ? 'Fair — a few improvements available' : 'Needs attention';
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:24px;margin-bottom:16px">
      <div style="text-align:center"><div style="font-size:48px;font-weight:300;color:${scoreColor};line-height:1">${score}</div><div style="font-size:12px;color:var(--text-3)">out of 100</div></div>
      <div style="flex:1"><div style="font-size:13px;font-weight:500;color:var(--text);margin-bottom:6px">${scoreLabel}</div><div style="background:var(--bg);height:8px;border-radius:4px;overflow:hidden"><div style="background:${scoreColor};height:8px;border-radius:4px;width:${score}%;transition:.4s"></div></div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      ${checkItem(withImei===total,'IMEI recorded',withImei+' of '+total+' devices')}
      ${checkItem(withWarranty===total,'Warranty dates set',withWarranty+' of '+total+' devices')}
      ${checkItem(withDate===total,'Purchase dates set',withDate+' of '+total+' devices')}
    </div>`;
}

function checkItem(ok, label, sub) {
  return `<div style="padding:12px;background:var(--bg);border-radius:var(--radius);display:flex;align-items:center;gap:10px"><span style="color:${ok?'var(--green)':'var(--amber)'};font-size:18px">${ok?'✓':'!'}</span><div><div style="font-size:12px;font-weight:500;color:var(--text)">${label}</div><div style="font-size:11px;color:var(--text-3)">${sub}</div></div></div>`;
}

function renderAbout() {
  const withWarranty = devices.filter(d => d.warranty).length;
  const ad = document.getElementById('about-devices');
  const aw = document.getElementById('about-warranties');
  if (ad) ad.textContent = devices.length;
  if (aw) aw.textContent = withWarranty;
}

/* =========================================
   NAVIGATION
   ========================================= */

window.goTo = (page, el) => {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  if (el) { el.classList.add('active'); }
  else { document.querySelectorAll('.nav-item').forEach(i => { if (i.getAttribute('onclick') && i.getAttribute('onclick').includes("'"+page+"'")) i.classList.add('active'); }); }
  const titles = { dashboard:'Dashboard', devices:'My devices', stolen:'Stolen reports', security:'Security', documents:'Documents', warranties:'Warranties', settings:'Settings', about:'About' };
  document.getElementById('page-title').textContent = titles[page] || page;
  if (page === 'devices')    renderDeviceTable();
  if (page === 'warranties') renderWarrantyList('warranty-full-list');
  if (page === 'stolen')     renderStolenList();
  if (page === 'security')   renderSecurity();
  if (page === 'about')      renderAbout();
};

/* =========================================
   DEVICE ACTIONS
   ========================================= */

window.openModal  = (id) => { if (id === 'stolenModal') populateStolenDropdown(); document.getElementById(id).classList.add('open'); };
window.closeModal = (id) => document.getElementById(id).classList.remove('open');

window.addDevice = async () => {
  const name = document.getElementById('f-name').value.trim();
  if (!name) { showToast('Please enter a device name'); return; }
  const warrantyDate = document.getElementById('f-warranty').value;
  let status = 'ok';
  if (warrantyDate) { const days = Math.ceil((new Date(warrantyDate) - new Date()) / 86400000); if (days >= 0 && days <= 90) status = 'warn'; }
  const d = { name, type: document.getElementById('f-type').value, model: document.getElementById('f-model').value || name, imei: document.getElementById('f-imei').value, date: document.getElementById('f-date').value, warranty: warrantyDate, notes: document.getElementById('f-notes').value, status };
  const id = await saveDevice(d);
  devices.unshift({ id, ...d });
  ['f-name','f-model','f-imei','f-date','f-warranty','f-notes'].forEach(i => { document.getElementById(i).value = ''; });
  closeModal('addDeviceModal');
  updateMetrics(); renderDashDevices(); renderWarrantyList('dash-warranty-list');
  showToast('Device "' + name + '" added successfully');
};

window.deleteDevice = async (id) => {
  if (!confirm('Remove this device from OmniBackup?')) return;
  await removeDevice(id);
  devices = devices.filter(d => d.id !== id);
  updateMetrics(); renderDashDevices(); renderDeviceTable(); renderWarrantyList('dash-warranty-list');
  showToast('Device removed');
};

window.fileReport = async () => {
  const deviceName = document.getElementById('sr-device').value;
  if (!deviceName) { showToast('Please select a device'); return; }
  const d = devices.find(x => x.name === deviceName);
  if (d) {
    d.status = 'stolen';
    d.stolenLocation = document.getElementById('sr-location').value;
    d.stolenPolice   = document.getElementById('sr-police').value;
    await updateDoc(doc(db, 'devices', d.id), { status: 'stolen', stolenLocation: d.stolenLocation, stolenPolice: d.stolenPolice });
  }
  ['sr-date','sr-location','sr-police','sr-desc'].forEach(id => { document.getElementById(id).value = ''; });
  closeModal('stolenModal');
  updateMetrics(); renderDashDevices();
  showToast('Stolen report filed for ' + deviceName);
};

function populateStolenDropdown() {
  const sel = document.getElementById('sr-device');
  if (!sel) return;
  const active = devices.filter(d => d.status !== 'stolen');
  sel.innerHTML = active.length ? active.map(d => `<option value="${d.name}">${d.name}</option>`).join('') : '<option value="">No devices registered yet</option>';
}

window.exportRecords = () => {
  if (!devices.length) { showToast('No devices to export yet'); return; }
  const data = JSON.stringify({ exported: new Date().toISOString(), user: currentUser?.email, devices }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = 'omnibackup-records.json';
  a.click();
  showToast('Records exported');
};

/* =========================================
   TOAST
   ========================================= */
let toastTimer;
window.showToast = (msg) => {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
};
