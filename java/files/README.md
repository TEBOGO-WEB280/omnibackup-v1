# OmniBackup — JavaScript Source Files

## File Overview

| File | Purpose |
|------|---------|
| `config.js` | All constants, icons, device types, status codes |
| `data.js` | Seed data for devices, reports, documents, activity |
| `store.js` | In-memory state + localStorage persistence |
| `utils.js` | Pure helper functions (formatting, validation, HTML builders) |
| `ui.js` | All DOM rendering, navigation, modals, toast system |
| `devices.js` | Device CRUD controller (add, edit, delete) |
| `reports.js` | Stolen report controller (file, download) |
| `modules.js` | Documents, Settings, Export/Import controllers |
| `app.js` | **Main entry point** — boots app, wires all events |

---

## Required Load Order

Add these `<script>` tags to your HTML `<body>` **in this exact order**:

```html
<script src="js/config.js"></script>
<script src="js/data.js"></script>
<script src="js/store.js"></script>
<script src="js/utils.js"></script>
<script src="js/ui.js"></script>
<script src="js/devices.js"></script>
<script src="js/reports.js"></script>
<script src="js/modules.js"></script>
<script src="js/app.js"></script>
```

---

## What Each File Does

### `config.js`
- App name, version, and storage key constants
- SVG icon strings for each device type (`DEVICE_ICONS`)
- CSS class maps (`DEVICE_TYPE_CLASS`, `STATUS_PILL_MAP`)
- Page titles, warranty thresholds, default settings

### `data.js`
- 7 realistic seed devices shown on first launch
- 1 seed stolen report
- 4 seed documents
- 6 seed activity log entries

### `store.js`
- `state` object — the single source of truth for all app data
- `loadStore()` — hydrates state from localStorage or falls back to seed data
- `saveDevices()`, `saveReports()`, `saveDocuments()`, `saveSettings()` — persist to localStorage
- `storeAddDevice()`, `storeUpdateDevice()`, `storeDeleteDevice()` — device CRUD
- `storeAddReport()` — file a stolen report and mark device as stolen
- `storeAddDocument()`, `storeDeleteDocument()` — document management
- `storeToggleSetting()`, `storeSetting()` — settings management
- `logActivity()` — append to the activity feed
- `storeReset()` — wipe all data and reload seed data

### `utils.js`
- `utils.escapeHtml(val)` — XSS-safe HTML encoding
- `utils.formatDate(str)` — YYYY-MM-DD → "15 Jan 2026"
- `utils.timeAgo(iso)` — ISO → "2 days ago"
- `utils.daysUntil(str)` — days until a date (negative = expired)
- `utils.warrantyMeta(date)` — pill class, bar %, and label from warranty date
- `utils.deriveStatus(warranty, current)` — auto-calculates ok/warn from warranty
- `utils.calcSecurityScore(devices)` — 0–100 completeness score
- `utils.deviceThumb(type)` — builds thumbnail HTML
- `utils.statusPill(status)` — builds pill badge HTML
- `utils.activityIcon(type)` — builds activity feed icon HTML
- `utils.isValidImei(imei)` — Luhn algorithm IMEI validation
- `utils.isValidEmail(email)` — basic email format check
- `utils.copyToClipboard(text)` — clipboard copy with toast feedback
- `utils.downloadFile(content, name)` — browser file download

### `ui.js`
- `ui.showToast(msg)` — bottom toast notification
- `ui.goTo(page, el)` — navigate between pages
- `ui.openModal(id)` / `ui.closeModal(id)` / `ui.closeAllModals()`
- `ui.renderDashboard()` — renders dashboard devices, warranties, activity, metrics
- `ui.renderDeviceTable()` — filtered devices table
- `ui.renderWarrantyList(targetId, limit)` — warranty tracker rows
- `ui.renderStolenReports()` — stolen report cards
- `ui.renderSecurityScore()` — security panel with live score
- `ui.renderDocuments()` — documents list
- `ui.renderSettings()` — settings page values
- `ui.updateMetrics()` — recalculates all 4 metric cards + nav badge

### `devices.js`
- `devices.openAdd()` — open modal in add mode
- `devices.openEdit(id)` — open modal pre-filled for editing
- `devices.submitForm()` — validate + save (add or update)
- `devices.remove(id)` — confirm + delete

### `reports.js`
- `reports.openForm()` — open stolen report modal
- `reports.submitForm()` — validate + file a new report
- `reports.download(id)` — download report as .txt file

### `modules.js` (contains 3 controllers)
- **`docs`** — `docs.openUpload()`, `docs.upload()`, `docs.remove(id)`
- **`settings`** — `settings.toggle(key, el)`, `settings.saveProfile()`, `settings.resetAllData()`
- **`exportImport`** — `exportImport.exportAll()`, `exportImport.importFile()`

### `app.js`
- `initApp()` — boots the whole application in the correct order
- Wires all event listeners: search, modals, buttons, quick actions
- Registers keyboard shortcuts (N=new device, D=dashboard, E=export, etc.)
- Exposes global bridge functions for HTML `onclick` attributes

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `N` | Add new device |
| `D` | Go to Dashboard |
| `M` | Go to My Devices |
| `W` | Go to Warranties |
| `S` | Go to Security |
| `R` | Go to Stolen Reports |
| `E` | Export records |
| `Ctrl+E` | Export records |
| `Ctrl+I` | Import records |
| `Escape` | Close open modal |

---

## Data Flow

```
User action
    │
    ▼
devices / reports / docs / settings / exportImport
    │  (controller validates input)
    ▼
store.js  (mutates state + saves to localStorage)
    │
    ▼
ui.js  (re-renders affected DOM sections)
    │
    ▼
utils.js  (pure functions used by ui.js for formatting)
```

---

## localStorage Keys

| Key | Contents |
|-----|----------|
| `omnibackup_devices` | Array of device objects |
| `omnibackup_reports` | Array of stolen report objects |
| `omnibackup_documents` | Array of document records |
| `omnibackup_activity` | Array of activity log entries |
| `omnibackup_settings` | User settings object |
