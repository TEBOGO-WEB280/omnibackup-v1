/**
 * ============================================================
 *  OmniBackup — config.js
 *  All application-wide constants, icons, and configuration.
 *  Load this file FIRST before any other OmniBackup script.
 * ============================================================
 */

'use strict';

/* ----------------------------------------------------------
   App metadata
   ---------------------------------------------------------- */
const APP_NAME    = 'OmniBackup';
const APP_VERSION = '1.0.0-beta';
const APP_AUTHOR  = 'OmniBackup Team';

/* ----------------------------------------------------------
   LocalStorage keys
   ---------------------------------------------------------- */
const STORAGE_KEYS = {
  DEVICES:   'omnibackup_devices',
  REPORTS:   'omnibackup_reports',
  DOCUMENTS: 'omnibackup_documents',
  SETTINGS:  'omnibackup_settings',
  ACTIVITY:  'omnibackup_activity',
};

/* ----------------------------------------------------------
   Device types
   ---------------------------------------------------------- */
const DEVICE_TYPES = ['phone', 'laptop', 'tablet', 'watch', 'other'];

/** CSS colour classes per device type (used on thumbnail divs) */
const DEVICE_TYPE_CLASS = {
  phone:  'dt-phone',
  laptop: 'dt-laptop',
  tablet: 'dt-tablet',
  watch:  'dt-watch',
  other:  'dt-other',
};

/** Human-readable labels for each device type */
const DEVICE_TYPE_LABELS = {
  phone:  'Phone',
  laptop: 'Laptop',
  tablet: 'Tablet',
  watch:  'Watch',
  other:  'Other',
};

/* ----------------------------------------------------------
   SVG icons — one per device type
   ---------------------------------------------------------- */
const DEVICE_ICONS = {
  phone: `<svg viewBox="0 0 24 24" aria-hidden="true"
              style="width:18px;height:18px;fill:none;stroke:currentColor;
                     stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round">
            <rect x="5" y="2" width="14" height="20" rx="2"/>
            <line x1="12" y1="18" x2="12.01" y2="18"/>
          </svg>`,

  laptop: `<svg viewBox="0 0 24 24" aria-hidden="true"
               style="width:18px;height:18px;fill:none;stroke:currentColor;
                      stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round">
             <rect x="2" y="3" width="20" height="14" rx="2"/>
             <line x1="2" y1="20" x2="22" y2="20"/>
           </svg>`,

  tablet: `<svg viewBox="0 0 24 24" aria-hidden="true"
               style="width:18px;height:18px;fill:none;stroke:currentColor;
                      stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round">
             <rect x="4" y="2" width="16" height="20" rx="2"/>
             <line x1="12" y1="18" x2="12.01" y2="18"/>
           </svg>`,

  watch: `<svg viewBox="0 0 24 24" aria-hidden="true"
              style="width:18px;height:18px;fill:none;stroke:currentColor;
                     stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round">
            <rect x="5" y="2" width="14" height="20" rx="7"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>`,

  other: `<svg viewBox="0 0 24 24" aria-hidden="true"
              style="width:18px;height:18px;fill:none;stroke:currentColor;
                     stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round">
            <rect x="2" y="7" width="20" height="14" rx="2"/>
            <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
          </svg>`,
};

/* ----------------------------------------------------------
   Device status config
   ---------------------------------------------------------- */
const DEVICE_STATUS = {
  OK:     'ok',
  WARN:   'warn',
  STOLEN: 'stolen',
};

/** Maps a status code → pill HTML */
const STATUS_PILL_MAP = {
  ok:     '<span class="pill pill-ok">Active</span>',
  warn:   '<span class="pill pill-warn">Exp. soon</span>',
  stolen: '<span class="pill pill-stolen">Stolen</span>',
};

/* ----------------------------------------------------------
   Warranty thresholds (days)
   ---------------------------------------------------------- */
const WARRANTY_THRESHOLDS = {
  CRITICAL: 30,   // red  — less than 30 days
  WARNING:  90,   // amber — less than 90 days
};

/* ----------------------------------------------------------
   Page titles (used in topbar)
   ---------------------------------------------------------- */
const PAGE_TITLES = {
  dashboard:  'Dashboard',
  devices:    'My Devices',
  stolen:     'Stolen Reports',
  security:   'Security',
  documents:  'Documents',
  warranties: 'Warranties',
  settings:   'Settings',
};

/* ----------------------------------------------------------
   Default user settings
   ---------------------------------------------------------- */
const DEFAULT_SETTINGS = {
  userName:        'John Doe',
  userEmail:       'john.doe@example.com',
  plan:            'Beta',
  storageLimit:    500,        // MB
  warrantyAlerts:  true,
  securityDigest:  true,
  loginAlerts:     false,
  theme:           'light',
};

/* ----------------------------------------------------------
   Document categories
   ---------------------------------------------------------- */
const DOC_CATEGORIES = ['Receipt', 'Warranty', 'Insurance', 'Manual', 'Other'];
