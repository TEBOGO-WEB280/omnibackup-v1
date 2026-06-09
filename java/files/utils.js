/**
 * ============================================================
 *  OmniBackup — utils.js
 *  Pure utility functions: formatting, calculations,
 *  HTML builders, security score. No DOM side-effects.
 *  Depends on: config.js
 * ============================================================
 */

'use strict';

const utils = {

  /* ----------------------------------------------------------
     String & HTML helpers
     ---------------------------------------------------------- */

  /**
   * Escape special HTML characters to prevent XSS injection.
   * Always call this before inserting user data into innerHTML.
   * @param {*} value  Any value — converted to string first
   * @returns {string}
   */
  escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g,  '&amp;')
      .replace(/</g,  '&lt;')
      .replace(/>/g,  '&gt;')
      .replace(/"/g,  '&quot;')
      .replace(/'/g,  '&#39;')
      .replace(/`/g,  '&#96;');
  },

  /**
   * Truncate a string to a maximum length, adding an ellipsis if truncated.
   * @param {string} str
   * @param {number} maxLen
   * @returns {string}
   */
  truncate(str, maxLen = 40) {
    if (!str) return '';
    return str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str;
  },

  /**
   * Convert a camelCase key into a human-readable label.
   * e.g. 'warrantyAlerts' → 'Warranty Alerts'
   * @param {string} key
   * @returns {string}
   */
  labelFromKey(key) {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, ch => ch.toUpperCase())
      .trim();
  },

  /* ----------------------------------------------------------
     Date helpers
     ---------------------------------------------------------- */

  /**
   * Format a YYYY-MM-DD date string to a localised, human-readable label.
   * @param {string} dateStr
   * @returns {string}  e.g. "15 Jan 2026"
   */
  formatDate(dateStr) {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-ZA', {
        day:   'numeric',
        month: 'short',
        year:  'numeric',
      });
    } catch {
      return dateStr;
    }
  },

  /**
   * Format an ISO timestamp to a relative label like "2 days ago".
   * @param {string} isoString
   * @returns {string}
   */
  timeAgo(isoString) {
    if (!isoString) return '—';
    const diff  = Date.now() - new Date(isoString).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(mins  / 60);
    const days  = Math.floor(hours / 24);
    const months = Math.floor(days / 30);

    if (mins  <  1)   return 'just now';
    if (mins  < 60)   return `${mins}m ago`;
    if (hours < 24)   return `${hours}h ago`;
    if (days  <  7)   return `${days}d ago`;
    if (days  < 30)   return `${Math.floor(days / 7)}w ago`;
    if (months < 12)  return `${months}mo ago`;
    return `${Math.floor(months / 12)}y ago`;
  },

  /**
   * Get the short month+day label for a date — used in activity feed.
   * @param {string} isoString
   * @returns {string}  e.g. "Jun 2"
   */
  shortDate(isoString) {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
    } catch {
      return '—';
    }
  },

  /**
   * Calculate the number of calendar days until a date.
   * Returns negative numbers if the date has already passed.
   * @param {string} dateStr  YYYY-MM-DD
   * @returns {number|null}  null if no date provided
   */
  daysUntil(dateStr) {
    if (!dateStr) return null;
    const today  = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr + 'T00:00:00');
    return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
  },

  /**
   * Get today's date as a YYYY-MM-DD string (for date input default values).
   * @returns {string}
   */
  todayIso() {
    return new Date().toISOString().slice(0, 10);
  },

  /* ----------------------------------------------------------
     Warranty helpers
     ---------------------------------------------------------- */

  /**
   * Calculate warranty display metadata from an expiry date.
   * @param {string} warrantyDate  YYYY-MM-DD
   * @returns {{ label: string, pillClass: string, barClass: string, pct: number, days: number|null }}
   */
  warrantyMeta(warrantyDate) {
    const days = this.daysUntil(warrantyDate);

    if (days === null) {
      return { label: 'No date', pillClass: 'pill-exp', barClass: 'wb-exp', pct: 0, days: null };
    }
    if (days <= 0) {
      return { label: 'Expired', pillClass: 'pill-exp', barClass: 'wb-exp', pct: 2, days };
    }
    if (days <= WARRANTY_THRESHOLDS.CRITICAL) {
      return {
        label:     `${days} day${days === 1 ? '' : 's'}`,
        pillClass: 'pill-exp',
        barClass:  'wb-exp',
        pct:       Math.max(3, Math.round((days / 365) * 100)),
        days,
      };
    }
    if (days <= WARRANTY_THRESHOLDS.WARNING) {
      return {
        label:     `${days} days`,
        pillClass: 'pill-warn',
        barClass:  'wb-warn',
        pct:       Math.max(8, Math.round((days / 365) * 100)),
        days,
      };
    }
    return {
      label:     'Active',
      pillClass: 'pill-ok',
      barClass:  'wb-ok',
      pct:       Math.min(95, Math.round((days / 730) * 100)),
      days,
    };
  },

  /**
   * Derive a device's status string based on its warranty expiry date.
   * Preserves 'stolen' status regardless of warranty.
   * @param {string} warrantyDate
   * @param {string} currentStatus  existing status value
   * @returns {'ok'|'warn'|'stolen'}
   */
  deriveStatus(warrantyDate, currentStatus) {
    if (currentStatus === DEVICE_STATUS.STOLEN) return DEVICE_STATUS.STOLEN;
    const days = this.daysUntil(warrantyDate);
    if (days === null || days > WARRANTY_THRESHOLDS.WARNING) return DEVICE_STATUS.OK;
    return DEVICE_STATUS.WARN;
  },

  /* ----------------------------------------------------------
     Security score
     ---------------------------------------------------------- */

  /**
   * Calculate an overall security/completeness score (0–100)
   * based on how much data has been filled in across all devices.
   *
   * Scoring per device (adds up to 100):
   *   IMEI or serial present   → 30 pts
   *   Purchase date present    → 20 pts
   *   Warranty date present    → 20 pts
   *   Model/brand filled in    → 15 pts
   *   Notes filled in          → 15 pts
   *
   * @param {object[]} devices
   * @returns {number}  0–100
   */
  calcSecurityScore(devices) {
    if (!devices || !devices.length) return 0;
    let total = 0;
    devices.forEach(d => {
      let pts = 0;
      if (d.imei || d.serial) pts += 30;
      if (d.date)             pts += 20;
      if (d.warranty)         pts += 20;
      if (d.model || d.brand) pts += 15;
      if (d.notes)            pts += 15;
      total += pts;
    });
    return Math.round(total / devices.length);
  },

  /**
   * Returns colour and label metadata for a security score.
   * @param {number} score  0–100
   * @returns {{ color: string, label: string, cssVar: string }}
   */
  scoreTheme(score) {
    if (score >= 70) return { label: 'Good',      cssVar: 'var(--green)', textClass: 'score-good' };
    if (score >= 40) return { label: 'Fair',       cssVar: 'var(--amber)', textClass: 'score-fair' };
    return             { label: 'Needs work',   cssVar: 'var(--red)',   textClass: 'score-poor' };
  },

  /* ----------------------------------------------------------
     Unique ID & case number generators
     ---------------------------------------------------------- */

  /**
   * Generate a unique OmniBackup stolen-device case number.
   * Format: OB-YYYY-XXXX
   * @param {number} sequence  Current report sequence number
   * @returns {string}  e.g. "OB-2026-0062"
   */
  generateCaseNumber(sequence) {
    const year = new Date().getFullYear();
    const seq  = String(sequence + 60).padStart(4, '0');
    return `OB-${year}-${seq}`;
  },

  /* ----------------------------------------------------------
     HTML building blocks (return strings, never touch DOM)
     ---------------------------------------------------------- */

  /**
   * Build the device-type thumbnail HTML.
   * @param {string} type  e.g. 'phone'
   * @returns {string} HTML string
   */
  deviceThumb(type) {
    const cls  = DEVICE_TYPE_CLASS[type] || 'dt-other';
    const icon = DEVICE_ICONS[type]      || DEVICE_ICONS.other;
    return `<div class="device-thumb ${cls}">${icon}</div>`;
  },

  /**
   * Build a device status pill badge.
   * @param {string} status  ok | warn | stolen
   * @returns {string} HTML string
   */
  statusPill(status) {
    return STATUS_PILL_MAP[status] || '<span class="pill">—</span>';
  },

  /**
   * Build the activity icon container HTML.
   * @param {'add'|'edit'|'upload'|'warn'|'report'|'delete'} type
   * @returns {string} HTML string
   */
  activityIcon(type) {
    const configs = {
      add: {
        cls: 'act-add',
        svg: `<svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>`,
      },
      edit: {
        cls: 'act-edit',
        svg: `<svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z"/>
              </svg>`,
      },
      upload: {
        cls: 'act-edit',
        svg: `<svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>`,
      },
      warn: {
        cls: 'act-warn',
        svg: `<svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>`,
      },
      report: {
        cls: 'act-report',
        svg: `<svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>`,
      },
      delete: {
        cls: 'act-report',
        svg: `<svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
              </svg>`,
      },
    };
    const cfg = configs[type] || configs.edit;
    return `<div class="act-icon ${cfg.cls}">${cfg.svg}</div>`;
  },

  /* ----------------------------------------------------------
     Storage usage estimate (mock)
     ---------------------------------------------------------- */

  /**
   * Estimate storage usage split across photos, documents, receipts.
   * In a real app this would come from a storage API.
   * @param {number} docCount  Number of documents stored
   * @returns {{ photos: number, documents: number, receipts: number, total: number }}
   */
  estimateStorage(docCount) {
    const docs     = docCount * 2.1;      // ~2.1 MB avg per doc
    const photos   = docCount * 3.8;      // ~3.8 MB avg per photo
    const receipts = docCount * 0.8;
    return {
      photos:    Math.round(photos   * 10) / 10,
      documents: Math.round(docs     * 10) / 10,
      receipts:  Math.round(receipts * 10) / 10,
      total:     Math.round((photos + docs + receipts) * 10) / 10,
    };
  },

  /* ----------------------------------------------------------
     Clipboard
     ---------------------------------------------------------- */

  /**
   * Copy text to the system clipboard, with a toast fallback.
   * @param {string} text
   * @param {string} [successMsg]
   * @returns {Promise<void>}
   */
  async copyToClipboard(text, successMsg = 'Copied to clipboard') {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers
        const el = document.createElement('textarea');
        el.value = text;
        el.style.position = 'fixed';
        el.style.opacity  = '0';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      ui.showToast(successMsg);
    } catch (err) {
      ui.showToast('Could not copy — please copy manually: ' + text);
    }
  },

  /* ----------------------------------------------------------
     File download helper
     ---------------------------------------------------------- */

  /**
   * Trigger a file download in the browser.
   * @param {string} content   File text content
   * @param {string} filename  Suggested filename
   * @param {string} [mimeType='text/plain']
   */
  downloadFile(content, filename, mimeType = 'text/plain') {
    const blob = new Blob([content], { type: mimeType });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /* ----------------------------------------------------------
     Validation
     ---------------------------------------------------------- */

  /**
   * Validate an IMEI number (15 digits, Luhn algorithm).
   * @param {string} imei
   * @returns {boolean}
   */
  isValidImei(imei) {
    if (!imei) return false;
    const digits = imei.replace(/\D/g, '');
    if (digits.length !== 15) return false;
    let sum = 0;
    for (let i = 0; i < 15; i++) {
      let d = parseInt(digits[i], 10);
      if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
      sum += d;
    }
    return sum % 10 === 0;
  },

  /**
   * Basic email format check.
   * @param {string} email
   * @returns {boolean}
   */
  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

};
