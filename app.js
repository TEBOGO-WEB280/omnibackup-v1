/* =========================================
   OmniBackup — App Logic with Firebase
   app.js
   ========================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile,
sendEmailVerification } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, query, where, updateDoc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

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
let justRegistered = false;
let isPro = false;
let navHistory = ['dashboard'];
let omnibotStarted = false;

/* --- Security helpers --- */
function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function validatePassword(pw) {
  const checks = {
    length: pw.length >= 8,
    upper:  /[A-Z]/.test(pw),
    lower:  /[a-z]/.test(pw),
    number: /[0-9]/.test(pw),
    symbol: /[^A-Za-z0-9]/.test(pw)
  };
  const passedCount = Object.values(checks).filter(Boolean).length;
  const valid = Object.values(checks).every(Boolean);
  return { checks, valid, passedCount };
}

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

window.checkPasswordStrength = () => {
  const pw = document.getElementById('reg-password').value;
  const { checks, passedCount } = validatePassword(pw);
  const set = (id, ok) => { const el = document.getElementById(id); if (el) el.classList.toggle('met', ok); };
  set('pw-req-length', checks.length);
  set('pw-req-upper',  checks.upper);
  set('pw-req-lower',  checks.lower);
  set('pw-req-number', checks.number);
  set('pw-req-symbol', checks.symbol);
  const fill = document.getElementById('pw-meter-fill');
  if (fill) {
    fill.className = 'pw-meter-fill';
    if (pw.length > 0) {
      const level = passedCount <= 2 ? 'weak' : passedCount === 3 ? 'fair' : passedCount === 4 ? 'good' : 'strong';
      fill.classList.add(level);
    }
  }
};

window.registerUser = async () => {
  const name     = document.getElementById('reg-name').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const errEl    = document.getElementById('reg-error');
  errEl.textContent = '';
  if (!name || !email || !password) { errEl.textContent = 'Please fill in all fields.'; return; }
  const { valid } = validatePassword(password);
  if (!valid) { errEl.textContent = 'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a symbol.'; return; }
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    await sendEmailVerification(cred.user);
    await setDoc(doc(db, 'users', cred.user.uid), {
      name,
      email,
      termsAccepted: false,
      createdAt: serverTimestamp()
    });
    justRegistered = true;
    showToast('Account created! Welcome to OmniBackup');
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
    if (justRegistered) {
      document.getElementById('auth-screen').style.display  = 'none';
      document.getElementById('app-screen').style.display   = 'none';
      document.getElementById('terms-screen').style.display = 'flex';
      return;
    }
    if (!currentUser.emailVerified) {
      showVerifyScreen();
      return;
    }
    await enterApp();
  } else {
    currentUser = null;
    devices     = [];
    document.getElementById('auth-screen').style.display  = 'flex';
    document.getElementById('terms-screen').style.display = 'none';
    document.getElementById('verify-screen').style.display = 'none';
    document.getElementById('app-screen').style.display   = 'none';
  }
});

async function enterApp() {
  document.getElementById('auth-screen').style.display  = 'none';
  document.getElementById('terms-screen').style.display = 'none';
  document.getElementById('verify-screen').style.display = 'none';
  document.getElementById('app-screen').style.display   = 'block';
  updateProfileDisplay();
  syncThemeUI();
  navHistory = ['dashboard'];
  updateBackBtn();
  await loadUserProfile();
  updatePlanUI();
  await loadDevices();
  renderDashDevices();
  renderWarrantyList('dash-warranty-list');
  updateMetrics();
}

/* =========================================
   USER PROFILE / PRO PLAN
   ========================================= */

async function loadUserProfile() {
  if (!currentUser) return;
  try {
    const snap = await getDoc(doc(db, 'users', currentUser.uid));
    isPro = !!(snap.exists() && snap.data().isPro);
  } catch (e) {
    isPro = false;
  }
}

function updatePlanUI() {
  const desc = document.getElementById('s-plan-desc');
  const btn  = document.getElementById('upgrade-btn');
  if (desc) desc.textContent = isPro ? 'Pro' : 'Beta — Free';
  if (btn) {
    if (isPro) {
      btn.textContent = 'Active';
      btn.disabled = true;
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-ghost');
    } else {
      btn.textContent = 'Upgrade to Pro';
      btn.disabled = false;
      btn.classList.add('btn-primary');
      btn.classList.remove('btn-ghost');
    }
  }
}

window.upgradeToPro = async () => {
  if (!currentUser) return;
  try {
    await setDoc(doc(db, 'users', currentUser.uid), { isPro: true }, { merge: true });
  } catch (e) {
    showToast('Could not upgrade right now. Try again shortly.');
    return;
  }
  isPro = true;
  updatePlanUI();
  omnibotStarted = false;
  renderOmniBotBody();
  showToast('Welcome to OmniBackup Pro! (demo upgrade — no payment was taken)');
};

function showVerifyScreen() {
  document.getElementById('auth-screen').style.display   = 'none';
  document.getElementById('terms-screen').style.display  = 'none';
  document.getElementById('app-screen').style.display    = 'none';
  document.getElementById('verify-screen').style.display = 'flex';
  const disp = document.getElementById('verify-email-display');
  if (disp) disp.textContent = currentUser?.email || '';
}

window.checkVerification = async () => {
  const errEl = document.getElementById('verify-error');
  errEl.textContent = '';
  if (!currentUser) return;
  try {
    await currentUser.reload();
    if (currentUser.emailVerified) {
      await enterApp();
    } else {
      errEl.textContent = "Still not verified — click the link in the email first, then try again.";
    }
  } catch (e) {
    errEl.textContent = 'Something went wrong. Please try again.';
  }
};

window.resendVerification = async () => {
  if (!currentUser) return;
  try {
    await sendEmailVerification(currentUser);
    showToast('Verification email sent — check your inbox');
  } catch (e) {
    showToast('Could not send verification email. Try again shortly.');
  }
};

window.toggleTermsButton = () => {
  const checked = document.getElementById('terms-checkbox').checked;
  document.getElementById('terms-continue-btn').disabled = !checked;
};

window.acceptTerms = async () => {
  const errEl = document.getElementById('terms-error');
  errEl.textContent = '';
  const checked = document.getElementById('terms-checkbox').checked;
  if (!checked) { errEl.textContent = 'You must accept the Terms & Conditions to continue.'; return; }
  if (!currentUser) return;
  try {
    await updateDoc(doc(db, 'users', currentUser.uid), {
      termsAccepted: true,
      termsAcceptedAt: serverTimestamp()
    });
    justRegistered = false;
    if (!currentUser.emailVerified) {
      showVerifyScreen();
    } else {
      await enterApp();
    }
  } catch (e) {
    errEl.textContent = 'Something went wrong. Please try again.';
  }
};

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
  return { name: escapeHTML(d.name), type: d.type, expiry: expDate.toLocaleDateString('en-ZA', { day:'numeric', month:'short', year:'numeric' }), daysLeft, pct, cls, pill, label };
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
      bannerText.innerHTML = `<strong>${m.expiringSoon} warranty${m.expiringSoon > 1 ? 'ies' : ''} expiring soon</strong> — ${escapeHTML(first.name)} expires in ${days} days. <a onclick="goTo('warranties', null)">View warranty tracker →</a>`;
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
        <div class="device-name">${escapeHTML(d.name)}</div>
        <div class="device-meta">${escapeHTML(d.imei) || 'No IMEI'}</div>
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
      <div class="dt-row-name">${deviceThumb(d.type)}<div><div class="device-name">${escapeHTML(d.name)}</div><div class="device-meta" style="font-size:11px;color:var(--text-3)">${escapeHTML(d.model)||''}</div></div></div>
      <div class="dt-mono col-hide">${escapeHTML(d.imei)||'—'}</div>
      <div class="col-hide" style="font-size:13px;color:var(--text-2)">${escapeHTML(d.date)||'—'}</div>
      <div style="font-size:12px;color:var(--text-2)">${escapeHTML(d.warranty)||'—'}</div>
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
      <div class="report-field"><div class="rf-label">Device</div><div class="rf-val">${escapeHTML(d.name)}</div></div>
      <div class="report-field"><div class="rf-label">IMEI</div><div class="rf-val rf-mono">${escapeHTML(d.imei)||'—'}</div></div>
      <div class="report-field"><div class="rf-label">Date stolen</div><div class="rf-val">${escapeHTML(d.stolenDate)||'—'}</div></div>
      <div class="report-field"><div class="rf-label">Location</div><div class="rf-val">${escapeHTML(d.stolenLocation)||'—'}</div></div>
      <div class="report-field"><div class="rf-label">Police ref</div><div class="rf-val">${escapeHTML(d.stolenPolice)||'—'}</div></div>
      <div class="report-field"><div class="rf-label">Description</div><div class="rf-val">${escapeHTML(d.stolenDesc)||'—'}</div></div>
    </div>`).join('');
}

async function renderSecurity() {
  const el = document.getElementById('security-content');
  if (!el) return;
  if (!devices.length) { el.innerHTML = '<div class="empty-state"><svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg><p>Add devices to see your security score.</p></div>'; return; }

  const total         = devices.length;
  const withImei       = devices.filter(d => d.imei).length;
  const withWarranty   = devices.filter(d => d.warranty).length;
  const withDate       = devices.filter(d => d.date).length;
  const emailVerified  = !!(currentUser && currentUser.emailVerified);

  let withDoc = 0;
  for (const d of devices) {
    const docs = await getDocumentsForDevice(d.id);
    if (docs.length) withDoc++;
  }

  // Device-level completeness (4 checks per device) blended with account-level checks.
  const deviceScore  = ((withImei + withWarranty + withDate + withDoc) / (total * 4)) * 100;
  const accountScore = emailVerified ? 100 : 0;
  const score = Math.round(deviceScore * 0.8 + accountScore * 0.2);

  const scoreColor = score >= 70 ? 'var(--green)' : score >= 40 ? 'var(--amber)' : 'var(--red)';
  const scoreLabel = score >= 100 ? 'Fully secured' : score >= 70 ? 'Good' : score >= 40 ? 'Fair — a few improvements available' : 'Needs attention';
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:24px;margin-bottom:16px">
      <div style="text-align:center"><div style="font-size:48px;font-weight:300;color:${scoreColor};line-height:1">${score}</div><div style="font-size:12px;color:var(--text-3)">out of 100</div></div>
      <div style="flex:1"><div style="font-size:13px;font-weight:500;color:var(--text);margin-bottom:6px">${scoreLabel}</div><div style="background:var(--bg);height:8px;border-radius:4px;overflow:hidden"><div style="background:${scoreColor};height:8px;border-radius:4px;width:${score}%;transition:.4s"></div></div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      ${checkItem(emailVerified,'Email verified',emailVerified ? 'Verified' : 'Not verified yet')}
      ${checkItem(withImei===total,'IMEI recorded',withImei+' of '+total+' devices')}
      ${checkItem(withWarranty===total,'Warranty dates set',withWarranty+' of '+total+' devices')}
      ${checkItem(withDate===total,'Purchase dates set',withDate+' of '+total+' devices')}
      ${checkItem(withDoc===total,'Supporting document uploaded',withDoc+' of '+total+' devices')}
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
   THEME (DARK / LIGHT)
   ========================================= */

window.toggleTheme = () => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  if (isDark) {
    document.documentElement.removeAttribute('data-theme');
    try { localStorage.setItem('omni-theme', 'light'); } catch (e) {}
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    try { localStorage.setItem('omni-theme', 'dark'); } catch (e) {}
  }
  syncThemeUI();
};

function syncThemeUI() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const toggle = document.getElementById('dark-mode-toggle');
  const icon   = document.getElementById('theme-icon');
  if (toggle) toggle.classList.toggle('on', isDark);
  if (icon) {
    icon.innerHTML = isDark
      ? '<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>'
      : '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
  }
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
  const titles = { dashboard:'Dashboard', devices:'My devices', stolen:'Stolen reports', security:'Security', emergency:'Emergency numbers', documents:'Documents', warranties:'Warranties', settings:'Settings', about:'About' };
  document.getElementById('page-title').textContent = titles[page] || page;
  if (navHistory[navHistory.length - 1] !== page) navHistory.push(page);
  updateBackBtn();
  closeMobileSidebar();
  if (page === 'devices')    renderDeviceTable();
  if (page === 'warranties') renderWarrantyList('warranty-full-list');
  if (page === 'stolen')     renderStolenList();
  if (page === 'security')   renderSecurity();
  if (page === 'emergency')  renderEmergencyNumbers();
  if (page === 'documents')  renderDocuments();
  if (page === 'about')      renderAbout();
};

window.goBack = () => {
  if (navHistory.length <= 1) return;
  navHistory.pop();
  const prev = navHistory.pop();
  goTo(prev, null);
};

function updateBackBtn() {
  const btn = document.getElementById('back-btn');
  if (btn) btn.style.display = navHistory.length > 1 ? 'flex' : 'none';
}

window.toggleMobileSidebar = () => {
  const sb = document.querySelector('.sidebar');
  if (!sb) return;
  if (sb.classList.contains('mobile-open')) closeMobileSidebar();
  else openMobileSidebar();
};

function openMobileSidebar() {
  const sb = document.querySelector('.sidebar');
  if (!sb || sb.classList.contains('mobile-open')) return;
  sb.classList.add('mobile-open');
  // Push a history entry so the phone's back button closes the menu instead of leaving the app.
  history.pushState({ omniSidebarOpen: true }, '');
}

function closeMobileSidebar() {
  const sb = document.querySelector('.sidebar');
  if (sb) sb.classList.remove('mobile-open');
  if (history.state && history.state.omniSidebarOpen) history.back();
}
window.closeMobileSidebar = closeMobileSidebar;

window.addEventListener('popstate', () => {
  const sb = document.querySelector('.sidebar');
  if (sb) sb.classList.remove('mobile-open');
});

/* =========================================
   DEVICE ACTIONS
   ========================================= */

window.openModal  = (id) => {
  if (id === 'stolenModal') populateStolenDropdown();
  if (id === 'uploadDocModal') populateUploadDeviceDropdown();
  document.getElementById(id).classList.add('open');
};
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
    d.status         = 'stolen';
    d.stolenDate      = document.getElementById('sr-date').value;
    d.stolenLocation = document.getElementById('sr-location').value;
    d.stolenPolice   = document.getElementById('sr-police').value;
    d.stolenDesc     = document.getElementById('sr-desc').value;
    await updateDoc(doc(db, 'devices', d.id), {
      status: 'stolen',
      stolenDate: d.stolenDate,
      stolenLocation: d.stolenLocation,
      stolenPolice: d.stolenPolice,
      stolenDesc: d.stolenDesc
    });
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
  sel.innerHTML = active.length ? active.map(d => `<option value="${escapeHTML(d.name)}">${escapeHTML(d.name)}</option>`).join('') : '<option value="">No devices registered yet</option>';
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
   LOCAL DOCUMENT STORAGE (IndexedDB)
   Files stay in this browser only — nothing is sent to Firebase.
   ========================================= */

const DOC_DB_NAME = 'omnibackup-docs';
const DOC_STORE    = 'documents';

function openDocDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DOC_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const dbx = req.result;
      if (!dbx.objectStoreNames.contains(DOC_STORE)) {
        const store = dbx.createObjectStore(DOC_STORE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('deviceId', 'deviceId', { unique: false });
        store.createIndex('uid', 'uid', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function addDocumentRecord(record) {
  const dbx = await openDocDB();
  return new Promise((resolve, reject) => {
    const tx  = dbx.transaction(DOC_STORE, 'readwrite');
    const req = tx.objectStore(DOC_STORE).add(record);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function getDocumentsForDevice(deviceId) {
  if (!currentUser) return [];
  const dbx = await openDocDB();
  return new Promise((resolve, reject) => {
    const tx  = dbx.transaction(DOC_STORE, 'readonly');
    const req = tx.objectStore(DOC_STORE).index('deviceId').getAll(deviceId);
    req.onsuccess = () => resolve((req.result || []).filter(r => r.uid === currentUser.uid));
    req.onerror   = () => reject(req.error);
  });
}

async function getAllDocuments() {
  if (!currentUser) return [];
  const dbx = await openDocDB();
  return new Promise((resolve, reject) => {
    const tx  = dbx.transaction(DOC_STORE, 'readonly');
    const req = tx.objectStore(DOC_STORE).getAll();
    req.onsuccess = () => resolve((req.result || []).filter(r => r.uid === currentUser.uid));
    req.onerror   = () => reject(req.error);
  });
}

async function deleteDocumentRecord(id) {
  const dbx = await openDocDB();
  return new Promise((resolve, reject) => {
    const tx = dbx.transaction(DOC_STORE, 'readwrite');
    tx.objectStore(DOC_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function populateUploadDeviceDropdown() {
  const sel = document.getElementById('ud-device');
  if (!sel) return;
  sel.innerHTML = devices.length
    ? devices.map(d => `<option value="${d.id}">${escapeHTML(d.name)}</option>`).join('')
    : '<option value="">No devices registered yet</option>';
}

window.uploadDocument = async () => {
  const deviceId   = document.getElementById('ud-device').value;
  const label      = document.getElementById('ud-label').value.trim();
  const fileInput  = document.getElementById('ud-file');
  const file       = fileInput.files[0];
  if (!deviceId) { showToast('Please select a device'); return; }
  if (!file)     { showToast('Please choose a file'); return; }
  if (file.size > 5 * 1024 * 1024) { showToast('File is too large — max 5MB'); return; }
  try {
    const dataUrl = await fileToBase64(file);
    const device  = devices.find(d => d.id === deviceId);
    await addDocumentRecord({
      uid: currentUser.uid,
      deviceId,
      deviceName: device ? device.name : 'Unknown device',
      label: label || file.name,
      fileName: file.name,
      size: file.size,
      dataUrl,
      createdAt: Date.now()
    });
    document.getElementById('ud-label').value = '';
    fileInput.value = '';
    closeModal('uploadDocModal');
    showToast('Document uploaded');
    renderDocuments();
    if (document.getElementById('page-security').classList.contains('active')) renderSecurity();
  } catch (e) {
    showToast('Could not save that file. Try a smaller file.');
  }
};

window.deleteDocument = async (id) => {
  if (!confirm('Delete this document?')) return;
  await deleteDocumentRecord(id);
  renderDocuments();
  showToast('Document removed');
  if (document.getElementById('page-security').classList.contains('active')) renderSecurity();
};

async function renderDocuments() {
  const el = document.getElementById('documents-list');
  if (!el) return;
  const docsList = await getAllDocuments();
  if (!docsList.length) {
    el.innerHTML = '<div class="empty-state"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg><p>No documents yet — upload receipts, warranties or insurance certificates.</p></div>';
    return;
  }
  docsList.sort((a, b) => b.createdAt - a.createdAt);
  el.innerHTML = docsList.map(d => `
    <div class="doc-row">
      <div class="doc-icon"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg></div>
      <div class="doc-info">
        <div class="doc-name">${escapeHTML(d.label)}</div>
        <div class="doc-meta">${escapeHTML(d.deviceName)} · ${(d.size/1024).toFixed(0)}KB</div>
      </div>
      <div class="dt-actions">
        <a class="action-icon" href="${d.dataUrl}" download="${escapeHTML(d.fileName)}" title="Download"><svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></a>
        <div class="action-icon" onclick="deleteDocument(${d.id})" title="Delete" style="color:var(--red)"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg></div>
      </div>
    </div>`).join('');
}

/* =========================================
   EMERGENCY / REPORTING NUMBERS (South Africa)
   Note: numbers can change — worth confirming with the provider directly.
   ========================================= */

const EMERGENCY_NUMBERS = [
  { name: 'SAPS Emergency (landline)', number: '10111', tel: '10111', desc: 'For emergencies or to report a crime' },
  { name: 'SAPS Emergency (cellphone)', number: '112', tel: '112', desc: 'Emergency number from any cellphone' },
  { name: 'SAPS Crime Stop', number: '08600 10111', tel: '0860010111', desc: 'Anonymous tip-offs, 24 hours' },
  { name: 'Vodacom', number: '082 135', tel: '082135', desc: 'Report & blacklist a stolen device' },
  { name: 'MTN', number: '135', tel: '135', desc: 'From an MTN number to report & blacklist' },
  { name: 'Cell C', number: '084 135', tel: '084135', desc: 'Report & blacklist a stolen device' },
  { name: 'Telkom Mobile', number: '081 180', tel: '081180', desc: 'Report & blacklist a stolen device' }
];

function renderEmergencyNumbers() {
  const el = document.getElementById('emergency-list');
  if (!el) return;
  el.innerHTML = EMERGENCY_NUMBERS.map(e => `
    <div class="emergency-card">
      <div class="emergency-icon"><svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg></div>
      <div>
        <div class="emergency-name">${escapeHTML(e.name)}</div>
        <div class="emergency-num"><a href="tel:${e.tel}">${escapeHTML(e.number)}</a></div>
        <div class="emergency-desc">${escapeHTML(e.desc)}</div>
      </div>
    </div>`).join('');
}

/* =========================================
   OMNIBOT (Pro) — rule-based device assistant
   ========================================= */

const OMNIBOT_CHIPS = [
  { label: 'My device was stolen', q: 'my device was stolen' },
  { label: 'I think I have a virus', q: 'i think i have a virus' },
  { label: 'Black screen', q: 'black screen won\'t turn on' },
  { label: 'How do I track my device?', q: 'how do i track my device' },
  { label: 'Protect my devices', q: 'how do i protect my devices' }
];

window.toggleOmniBot = () => {
  const panel = document.getElementById('omnibot-panel');
  if (!panel) return;
  const opening = !panel.classList.contains('open');
  panel.classList.toggle('open');
  if (opening) renderOmniBotBody();
};

function renderOmniBotBody() {
  const body = document.getElementById('omnibot-body');
  if (!body) return;

  if (!isPro) {
    body.innerHTML = `
      <div class="omnibot-locked">
        <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        <p>OmniBot is a <strong>Pro</strong> feature. It already knows every device you've saved, and gives instant answers on stolen devices, viruses, tracking and protection.</p>
        <button class="btn btn-primary" style="width:100%;justify-content:center" onclick="upgradeToPro()">Upgrade to Pro</button>
      </div>`;
    return;
  }

  body.innerHTML = `
    <div class="omnibot-messages" id="omnibot-messages"></div>
    <div class="omnibot-suggestions" id="omnibot-suggestions"></div>
    <div class="omnibot-input-row">
      <input type="text" id="omnibot-input" placeholder="Ask about a stolen device, virus, tracking…" onkeydown="if(event.key==='Enter')sendOmniBotMessage()">
      <button class="omnibot-send" onclick="sendOmniBotMessage()"><svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>
    </div>`;

  renderOmniBotSuggestions();

  if (!omnibotStarted) {
    omnibotStarted = true;
    const firstName = currentUser && currentUser.displayName ? ' ' + currentUser.displayName.split(' ')[0] : '';
    addOmniBotMessage('bot', `Hi${firstName}! I'm OmniBot. I know about ${devices.length} device${devices.length === 1 ? '' : 's'} you've saved. Ask me about a stolen device, a virus, a black screen, tracking tips, or how to protect your devices.`);
  }
}

function renderOmniBotSuggestions() {
  const el = document.getElementById('omnibot-suggestions');
  if (!el) return;
  el.innerHTML = OMNIBOT_CHIPS.map((c, i) => `<div class="ob-chip" onclick="askOmniBotChip(${i})">${escapeHTML(c.label)}</div>`).join('');
}

window.askOmniBotChip = (i) => {
  const c = OMNIBOT_CHIPS[i];
  if (!c) return;
  const input = document.getElementById('omnibot-input');
  if (input) input.value = c.q;
  sendOmniBotMessage();
};

window.sendOmniBotMessage = () => {
  const input = document.getElementById('omnibot-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  addOmniBotMessage('user', text);
  input.value = '';
  const reply = getOmniBotReply(text);
  setTimeout(() => addOmniBotMessage('bot', reply), 300);
};

function addOmniBotMessage(who, text) {
  const el = document.getElementById('omnibot-messages');
  if (!el) return;
  const div = document.createElement('div');
  div.className = 'ob-msg ' + (who === 'user' ? 'ob-user' : 'ob-bot');
  div.textContent = text; // textContent only — never innerHTML, so user input can't inject markup
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
}

function getOmniBotReply(raw) {
  const q = raw.toLowerCase();

  if (/(what|which|list).*(device|devices)|my devices/.test(q)) {
    if (!devices.length) return 'You haven\'t added any devices yet. Tap "Add device" to save your first one — then I can give you tailored advice for it.';
    const names = devices.map(d => d.name).join(', ');
    return `You've got ${devices.length} device${devices.length === 1 ? '' : 's'} saved: ${names}. Ask me about any of them if something goes wrong.`;
  }

  if (/stol(en|e)|robbed|snatched|missing|lost my (phone|laptop|tablet|device|watch)/.test(q)) {
    const stolen = devices.filter(d => d.status === 'stolen');
    const ref = stolen.length
      ? ` I can see you've already filed a stolen report for ${stolen.map(d => d.name).join(', ')} — good, that's the right first step.`
      : ' If this just happened, file a stolen report in the app now (Stolen reports → File new report) so your IMEI and details are on record.';
    return `Sorry to hear that.${ref} Do this next: 1) Call your network provider immediately to block the SIM and blacklist the device using its IMEI — check the Emergency numbers page for the right number. 2) Report it at your nearest police station or via SAPS Crime Stop (08600 10111) and get a case number, since insurers need this. 3) If it's a phone or laptop, use Find My iPhone / Find My Device to try to locate, lock or remotely erase it. 4) Change passwords for any accounts that were logged in on the device.`;
  }

  if (/track/.test(q)) {
    return `To track a device, location tracking needs to be switched on *before* it goes missing: iPhone → Find My; Android → Find My Device; Windows laptop → Find My Device in Settings; Mac → Find My Mac. If a device goes missing, sign into the relevant app or website from another device and you'll see its last known location, if it still has signal. Worth switching this on for every device today, just in case.`;
  }

  if (/virus|malware|hacked|pop\s*-?up|slow(ing)? down|ransomware/.test(q)) {
    return `Signs of a virus: pop-ups you didn't trigger, the device running hot or slow, apps you don't remember installing, or unusual data/battery use. What to do: 1) Disconnect from Wi-Fi/mobile data so nothing more gets sent or downloaded. 2) Run a scan with a trusted security app (Windows Defender, Malwarebytes, or your phone's built-in scanner). 3) Delete anything the scan flags, plus any apps you don't recognise. 4) Change your passwords from a different, clean device. 5) If it keeps happening, a full factory reset — after backing up your real files — is the most reliable fix.`;
  }

  if (/black screen|won'?t turn on|not switching on|dead screen|frozen|unresponsive/.test(q)) {
    return `For a black screen: 1) Force restart — hold the power button (plus volume-down, on most phones) for 10-20 seconds. 2) Plug it in and wait 15 minutes in case it's just a flat battery, then try again. 3) On iPhone, try a force restart: press volume up, then volume down, then hold the side button. 4) If nothing happens after 20-30 minutes on charge, it likely needs a technician — avoid DIY screen or battery fixes if it's still under warranty, since opening it up can void that.`;
  }

  if (/protect|secure|prevent|safety|safe\b/.test(q)) {
    return `A few habits that actually make a difference: 1) Turn on Find My / Find My Device now, before anything happens. 2) Use a real PIN, password or biometric lock. 3) Enable automatic backups (iCloud, Google, OneDrive) so losing the device doesn't mean losing your data too. 4) Keep IMEI, purchase date and warranty saved here in OmniBackup so you're not scrambling for details later. 5) Avoid leaving devices visible in cars or unattended in public — most theft is opportunistic, not targeted.`;
  }

  if (/warrant/.test(q)) {
    const expiring = devices.filter(d => {
      if (!d.warranty) return false;
      const days = Math.ceil((new Date(d.warranty) - new Date()) / 86400000);
      return days >= 0 && days <= 90;
    });
    if (expiring.length) return `Heads up — ${expiring.map(d => d.name).join(', ')} ${expiring.length === 1 ? 'has' : 'have'} a warranty expiring within 90 days. Check the Warranties page for exact dates.`;
    return `You can see all your warranty expiry dates on the Warranties page — I'll flag anything expiring within 90 days automatically.`;
  }

  if (/^(hi|hello|hey|sup|yo)\b/.test(q)) {
    return `Hey! Ask me about a stolen device, a virus, a black screen, tracking, or how to protect your devices — I'll give you a straight answer.`;
  }

  return `I can help with stolen devices, viruses/malware, black screens, tracking a lost device, and general protection tips. Try asking something like "my phone was stolen" or "how do I track my laptop".`;
}

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
