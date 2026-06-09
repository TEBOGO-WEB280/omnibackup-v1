/**
 * ============================================================
 *  OmniBackup — data.js
 *  Seed / default data used on first launch.
 *  Loaded AFTER config.js.
 * ============================================================
 */

'use strict';

/* ----------------------------------------------------------
   Seed devices
   ---------------------------------------------------------- */
const SEED_DEVICES = [
  {
    id:        1,
    name:      'Samsung Galaxy S24',
    type:      'phone',
    model:     'Samsung Galaxy S24 Ultra',
    brand:     'Samsung',
    imei:      '352999009876543',
    serial:    'R5CT300ABCD',
    color:     'Titanium Black',
    storage:   '256GB',
    date:      '2024-01-15',
    warranty:  '2026-01-15',
    notes:     'Personal phone — insured with Discovery.',
    status:    'ok',
    addedAt:   '2024-01-16T09:00:00.000Z',
    updatedAt: '2024-01-16T09:00:00.000Z',
  },
  {
    id:        2,
    name:      'MacBook Pro 14"',
    type:      'laptop',
    model:     'Apple MacBook Pro 14-inch M3',
    brand:     'Apple',
    imei:      '',
    serial:    'C02ZB1TZMD6T',
    color:     'Space Grey',
    storage:   '512GB SSD',
    date:      '2023-08-10',
    warranty:  '2026-07-01',
    notes:     'Work laptop provided by company.',
    status:    'warn',
    addedAt:   '2023-08-12T08:30:00.000Z',
    updatedAt: '2023-08-12T08:30:00.000Z',
  },
  {
    id:        3,
    name:      'iPad Air 5',
    type:      'tablet',
    model:     'Apple iPad Air 5th Gen',
    brand:     'Apple',
    imei:      'DMPXF1ABCD12',
    serial:    'DMPXF1ABCD12',
    color:     'Starlight',
    storage:   '64GB',
    date:      '2022-11-20',
    warranty:  '2026-11-20',
    notes:     'Used by kids for school.',
    status:    'ok',
    addedAt:   '2022-11-21T14:00:00.000Z',
    updatedAt: '2022-11-21T14:00:00.000Z',
  },
  {
    id:        4,
    name:      'Apple Watch Series 9',
    type:      'watch',
    model:     'Apple Watch Series 9 GPS 45mm',
    brand:     'Apple',
    imei:      'GH7X92KLAB01',
    serial:    'GH7X92KLAB01',
    color:     'Midnight Aluminium',
    storage:   '32GB',
    date:      '2024-09-14',
    warranty:  '2026-09-14',
    notes:     '',
    status:    'warn',
    addedAt:   '2024-09-15T10:00:00.000Z',
    updatedAt: '2024-09-15T10:00:00.000Z',
  },
  {
    id:        5,
    name:      'Nokia 3310 (Work)',
    type:      'phone',
    model:     'Nokia 3310 3G',
    brand:     'Nokia',
    imei:      '490154203237518',
    serial:    'NKA3310WRK',
    color:     'Warm Red',
    storage:   '16MB',
    date:      '2023-03-10',
    warranty:  '2025-03-10',
    notes:     'Secondary work phone.',
    status:    'stolen',
    addedAt:   '2023-03-11T07:00:00.000Z',
    updatedAt: '2026-06-02T11:00:00.000Z',
  },
  {
    id:        6,
    name:      'Lenovo Tab P11',
    type:      'tablet',
    model:     'Lenovo Tab P11 Pro Gen 2',
    brand:     'Lenovo',
    imei:      '862741051234567',
    serial:    'LNV862741051',
    color:     'Storm Grey',
    storage:   '128GB',
    date:      '2024-05-01',
    warranty:  '2026-05-01',
    notes:     '',
    status:    'ok',
    addedAt:   '2024-05-02T12:00:00.000Z',
    updatedAt: '2024-05-02T12:00:00.000Z',
  },
  {
    id:        7,
    name:      'Samsung Galaxy Watch 4',
    type:      'watch',
    model:     'Samsung Galaxy Watch 4 Classic 46mm',
    brand:     'Samsung',
    imei:      '353469112345678',
    serial:    'R8AN103ABCD',
    color:     'Black',
    storage:   '16GB',
    date:      '2023-12-25',
    warranty:  '2025-12-25',
    notes:     'Christmas gift from family.',
    status:    'ok',
    addedAt:   '2023-12-26T11:00:00.000Z',
    updatedAt: '2023-12-26T11:00:00.000Z',
  },
];

/* ----------------------------------------------------------
   Seed stolen reports
   ---------------------------------------------------------- */
const SEED_REPORTS = [
  {
    id:             1,
    caseNumber:     'OB-2026-0061',
    deviceId:       5,
    deviceName:     'Nokia 3310 (Work)',
    imei:           '490154203237518',
    dateReported:   '2026-06-02',
    lastLocation:   'Polokwane, Limpopo, ZA',
    policeRef:      'CAS 204/06/2026',
    insuranceClaim: 'Pending',
    description:    'Phone was stolen from my jacket pocket at the Polokwane Mall food court.',
    status:         'active',
    createdAt:      '2026-06-02T11:00:00.000Z',
  },
];

/* ----------------------------------------------------------
   Seed documents
   ---------------------------------------------------------- */
const SEED_DOCUMENTS = [
  {
    id:         1,
    deviceId:   2,
    deviceName: 'MacBook Pro 14"',
    name:       'MacBook Pro — Purchase receipt',
    category:   'Receipt',
    fileSize:   '245 KB',
    fileType:   'PDF',
    addedAt:    '2023-08-12T10:00:00.000Z',
  },
  {
    id:         2,
    deviceId:   1,
    deviceName: 'Samsung Galaxy S24',
    name:       'Samsung Galaxy S24 — Warranty card',
    category:   'Warranty',
    fileSize:   '112 KB',
    fileType:   'PDF',
    addedAt:    '2024-01-17T09:00:00.000Z',
  },
  {
    id:         3,
    deviceId:   3,
    deviceName: 'iPad Air 5',
    name:       'iPad Air — Insurance certificate',
    category:   'Insurance',
    fileSize:   '390 KB',
    fileType:   'PDF',
    addedAt:    '2022-11-25T14:00:00.000Z',
  },
  {
    id:         4,
    deviceId:   6,
    deviceName: 'Lenovo Tab P11',
    name:       'Lenovo Tab P11 — User manual',
    category:   'Manual',
    fileSize:   '4.2 MB',
    fileType:   'PDF',
    addedAt:    '2024-05-03T08:00:00.000Z',
  },
];

/* ----------------------------------------------------------
   Seed activity log
   ---------------------------------------------------------- */
const SEED_ACTIVITY = [
  {
    id:        1,
    type:      'report',
    message:   'Nokia 3310 (Work) reported as stolen',
    timestamp: '2026-06-02T11:00:00.000Z',
  },
  {
    id:        2,
    type:      'add',
    message:   'Apple Watch Series 9 added to vault',
    timestamp: '2024-09-15T10:00:00.000Z',
  },
  {
    id:        3,
    type:      'upload',
    message:   'Receipt uploaded for Samsung Galaxy S24',
    timestamp: '2024-01-17T09:00:00.000Z',
  },
  {
    id:        4,
    type:      'warn',
    message:   'MacBook Pro warranty expiring soon',
    timestamp: '2026-05-25T08:00:00.000Z',
  },
  {
    id:        5,
    type:      'add',
    message:   'iPad Air 5 added to vault',
    timestamp: '2022-11-21T14:00:00.000Z',
  },
  {
    id:        6,
    type:      'edit',
    message:   'MacBook Pro purchase date updated',
    timestamp: '2023-08-12T08:30:00.000Z',
  },
];
