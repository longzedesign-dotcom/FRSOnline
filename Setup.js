/**
 * Facility Repair System (FRS)
 * Setup.gs
 * Version 2.3.03
 *
 * ขั้นตอนหลัก:
 * 1) ตั้งค่า SPREADSHEET_ID และ UPLOAD_FOLDER_ID ใน Config.gs
 * 2) ติดตั้งใหม่: รัน setupInitialDatabase()
 * 3) Upgrade จาก v1.1.1: รัน upgradeToV2()
 * 4) รัน verifyInstallation()
 */

const FRS_SCHEMA = Object.freeze({
  USERS: [
    'USER_ID', 'USERNAME', 'PASSWORD_HASH', 'FULL_NAME', 'PHONE', 'EMAIL',
    'DIVISION', 'DEPARTMENT', 'POSITION', 'ROLE', 'STATUS',
    'FAILED_LOGIN_COUNT', 'LOCKED_UNTIL', 'MUST_CHANGE_PASSWORD',
    'LAST_LOGIN', 'PASSWORD_CHANGED_AT', 'CREATED_AT', 'UPDATED_AT'
  ],
  USER_IDENTITIES: [
    'IDENTITY_ID', 'USER_ID', 'PROVIDER', 'PROVIDER_SUB', 'PROVIDER_EMAIL',
    'EMAIL_VERIFIED', 'DISPLAY_NAME', 'PROFILE_IMAGE_URL', 'LINKED_AT',
    'LAST_LOGIN_AT', 'STATUS', 'CREATED_AT', 'UPDATED_AT'
  ],
  REGISTRATION_REQUESTS: [
    'REGISTRATION_ID', 'REGISTRATION_TOKEN_HASH', 'TOKEN_EXPIRES_AT',
    'PROVIDER', 'PROVIDER_SUB', 'PROVIDER_EMAIL', 'EMAIL_VERIFIED',
    'DISPLAY_NAME', 'PROFILE_IMAGE_URL', 'USERNAME', 'PASSWORD_HASH',
    'FULL_NAME', 'PHONE', 'EMAIL', 'DIVISION', 'DEPARTMENT', 'POSITION',
    'CONSENT_VERSION', 'CONSENT_AT', 'REQUESTED_AT', 'APPROVAL_STATUS', 'APPROVED_BY', 'APPROVED_AT',
    'REJECT_REASON', 'CREATED_AT', 'UPDATED_AT'
  ],
  OAUTH_STATE_STORE: [
    'STATE_HASH', 'PROVIDER', 'NONCE', 'CODE_VERIFIER', 'INTENT',
    'LINK_USER_ID', 'RETURN_TAB', 'CREATED_AT', 'EXPIRES_AT',
    'USED_AT', 'STATUS'
  ],
  MASTER_STATUS: [
    'STATUS_CODE', 'STATUS_NAME_TH', 'STATUS_NAME_EN', 'SORT_ORDER', 'ACTIVE', 'DESCRIPTION'
  ],
  MASTER_SLA: [
    'PRIORITY_CODE', 'PRIORITY_NAME_TH', 'PRIORITY_NAME_EN', 'SLA_HOURS',
    'SLA_TEXT', 'ACTIVE', 'DESCRIPTION'
  ],
  MASTER_SYSTEMS: [
    'SYSTEM_CODE', 'SYSTEM_NAME_TH', 'SYSTEM_NAME_EN', 'DEFAULT_PRIORITY_CODE',
    'ACTIVE', 'DESCRIPTION'
  ],
  MASTER_LOCATIONS: [
    'LOCATION_ID', 'BUILDING', 'FLOOR', 'ROOM', 'LOCATION_FULL',
    'ACTIVE', 'QR_CODE_REF'
  ],
  MASTER_DEPARTMENTS: [
    'DEPARTMENT_ID', 'DIVISION', 'DEPARTMENT', 'ACTIVE', 'DESCRIPTION'
  ],
  REQUESTS: [
    'REQUEST_ID', 'REQUEST_DATE', 'REQUESTER_ID', 'REQUESTER_NAME', 'PHONE', 'EMAIL',
    'DIVISION', 'DEPARTMENT', 'SYSTEM_CODE', 'SYSTEM_NAME_TH', 'LOCATION_ID',
    'LOCATION_FULL', 'PROBLEM_DETAIL', 'PHOTO_REQUEST_FILE_ID', 'PHOTO_REQUEST_URL',
    'PRIORITY_CODE', 'PRIORITY_NAME_TH', 'SLA_HOURS', 'STATUS_CODE', 'STATUS_NAME_TH',
    'ASSIGNED_TO', 'RECEIVED_DATE', 'FIX_START_DATE', 'FIX_DONE_DATE',
    'SOLUTION_DETAIL', 'COST', 'PHOTO_BEFORE_FIX_FILE_ID', 'PHOTO_BEFORE_FIX_URL',
    'PHOTO_AFTER_FIX_FILE_ID', 'PHOTO_AFTER_FIX_URL', 'DURATION_HOURS', 'SLA_RESULT',
    'CLOSED_BY', 'REMARK', 'CREATED_AT', 'UPDATED_AT'
  ],
  REQUEST_STATUS_LOG: [
    'LOG_ID', 'REQUEST_ID', 'OLD_STATUS_CODE', 'NEW_STATUS_CODE',
    'ACTION_BY', 'ACTION_NAME', 'ACTION_DATE', 'NOTE'
  ],
  SESSION_STORE: [
    'SESSION_HASH', 'USER_ID', 'SESSION_JSON', 'CREATED_AT',
    'EXPIRES_AT', 'LAST_ACCESSED_AT', 'STATUS'
  ],
  LOGIN_AUDIT: [
    'AUDIT_ID', 'USERNAME', 'USER_ID', 'SUCCESS', 'REASON', 'USER_AGENT', 'CREATED_AT'
  ]
});

function setupInitialDatabase() {
  return prepareDatabaseV2_('INSTALL');
}

/**
 * Upgrade แบบไม่ลบข้อมูลเดิมจาก FRS v1.1.1
 * เพิ่ม/ตรวจ Header, Master Data และรูปแบบ Sheet เท่านั้น
 */
function upgradeToV2() {
  return prepareDatabaseV2_('UPGRADE');
}

/**
 * Upgrade from FRS v2.0.1 to v2.0.2 without deleting existing data.
 * Adds Social Login/Registration sheets and seeds PASSWORD identities.
 */
function upgradeToV202() {
  return prepareDatabaseV2_('UPGRADE_V2_0_2');
}

function prepareDatabaseV2_(mode) {
  const ss = DataService.ss();
  ss.setSpreadsheetTimeZone(APP_CONFIG.TIMEZONE);

  Object.keys(APP_CONFIG.SHEETS).forEach(function(key) {
    const sheetName = APP_CONFIG.SHEETS[key];
    const headers = FRS_SCHEMA[key];
    if (!headers) throw new Error('ไม่พบ Schema สำหรับ Sheet: ' + sheetName);
    ensureSheetSchema_(ss, sheetName, headers);
  });

  seedMasterData_();
  seedDemoUsers_(false);
  const passwordIdentitiesCreated = IdentityService.seedPasswordIdentities();
  formatAllSheets_();
  cleanupLegacyPlaceholders_();
  SessionService.cleanupExpired();
  OAuthStateService.cleanup();
  RegistrationService.cleanupExpiredDrafts();

  SpreadsheetApp.flush();
  // Setup contains direct Sheet formatting/schema writes. Clear all runtime/master caches
  // before verification so every check reads the committed spreadsheet state.
  DataService.invalidateAll();
  const report = verifyInstallation();
  report.mode = mode || 'INSTALL';
  report.passwordIdentitiesCreated = passwordIdentitiesCreated;
  return report;
}

function verifyInstallation() {
  const report = {
    version: APP_CONFIG.APP_VERSION,
    checkedAt: Utils.formatDate(new Date()),
    ok: true,
    checks: []
  };

  function addCheck(name, passed, detail) {
    report.checks.push({ name: name, passed: Boolean(passed), detail: detail || '' });
    if (!passed) report.ok = false;
  }

  try {
    const ss = DataService.ss();
    addCheck('Spreadsheet', Boolean(ss.getId()), ss.getName());

    Object.keys(APP_CONFIG.SHEETS).forEach(function(key) {
      const sheetName = APP_CONFIG.SHEETS[key];
      const sh = ss.getSheetByName(sheetName);
      addCheck('Sheet ' + sheetName, Boolean(sh), sh ? 'พบ Sheet' : 'ไม่พบ Sheet');

      if (sh) {
        const actualHeaders = DataService.getHeaders(sheetName);
        const missing = FRS_SCHEMA[key].filter(function(header) {
          return actualHeaders.indexOf(header) === -1;
        });
        addCheck('Schema ' + sheetName, missing.length === 0, missing.length ? 'ขาด: ' + missing.join(', ') : 'ครบ');
      }
    });

    const demoUser = DataService.findOneCaseInsensitive(APP_CONFIG.SHEETS.USERS, 'USERNAME', 'user01');
    addCheck('Demo user hash', Boolean(demoUser && Utils.verifyPassword('User@1234', demoUser.PASSWORD_HASH)),
      demoUser ? 'ตรวจสอบ Hash แล้ว' : 'ไม่พบ user01');

    const statuses = DataService.getRows(APP_CONFIG.SHEETS.MASTER_STATUS);
    const sla = DataService.getRows(APP_CONFIG.SHEETS.MASTER_SLA);
    const systems = DataService.getRows(APP_CONFIG.SHEETS.MASTER_SYSTEMS);
    addCheck('Master Status', statuses.length >= 9, 'จำนวน ' + statuses.length);
    addCheck('Master SLA', sla.length >= 5, 'จำนวน ' + sla.length);
    addCheck('Master Systems', systems.length >= 10, 'จำนวน ' + systems.length);

    const requiredWorkflowStatuses = ['NEW', 'RECEIVED', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_PART', 'OUTSOURCE', 'DONE', 'CLOSED', 'CANCELLED'];
    const statusCodes = statuses.map(function(row) { return String(row.STATUS_CODE); });
    const missingWorkflow = requiredWorkflowStatuses.filter(function(code) { return statusCodes.indexOf(code) === -1; });
    addCheck('Workflow Status v2.0', missingWorkflow.length === 0, missingWorkflow.length ? 'ขาด: ' + missingWorkflow.join(', ') : 'ครบ 9 สถานะ');

    const technicians = MasterService.getActiveTechnicians();
    addCheck('Active Technicians', technicians.length > 0, 'จำนวน ' + technicians.length);

    const workflowFunctions = [
      ['apiGetRequestDetail', typeof apiGetRequestDetail === 'function'],
      ['apiReceiveRequest', typeof apiReceiveRequest === 'function'],
      ['apiClaimRequest', typeof apiClaimRequest === 'function'],
      ['apiAssignRequest', typeof apiAssignRequest === 'function'],
      ['apiStartRequest', typeof apiStartRequest === 'function'],
      ['apiSetWorkStatus', typeof apiSetWorkStatus === 'function'],
      ['apiCompleteRequest', typeof apiCompleteRequest === 'function'],
      ['apiCloseRequest', typeof apiCloseRequest === 'function'],
      ['apiCancelRequest', typeof apiCancelRequest === 'function']
    ];
    const missingFunctions = workflowFunctions.filter(function(item) { return !item[1]; }).map(function(item) { return item[0]; });
    addCheck('Workflow API v2.0', missingFunctions.length === 0, missingFunctions.length ? 'ขาด: ' + missingFunctions.join(', ') : 'ครบ');

    const socialFunctions = [
      ['apiGetPublicRegistrationData', typeof apiGetPublicRegistrationData === 'function'],
      ['apiBeginSocialAuth', typeof apiBeginSocialAuth === 'function'],
      ['apiRegisterPassword', typeof apiRegisterPassword === 'function'],
      ['apiCompleteSocialRegistration', typeof apiCompleteSocialRegistration === 'function'],
      ['apiGetLinkedIdentities', typeof apiGetLinkedIdentities === 'function'],
      ['apiGetPendingRegistrations', typeof apiGetPendingRegistrations === 'function']
    ];
    const missingSocialFunctions = socialFunctions.filter(function(item) { return !item[1]; }).map(function(item) { return item[0]; });
    addCheck('Social Auth API v2.0.2', missingSocialFunctions.length === 0,
      missingSocialFunctions.length ? 'ขาด: ' + missingSocialFunctions.join(', ') : 'ครบ');

    const passwordIdentityCount = DataService.getRows(APP_CONFIG.SHEETS.USER_IDENTITIES).filter(function(row) {
      return String(row.PROVIDER || '').toUpperCase() === APP_CONFIG.IDENTITY_PROVIDERS.PASSWORD;
    }).length;
    addCheck('Password Identities', passwordIdentityCount > 0, 'จำนวน ' + passwordIdentityCount);

    if (!APP_CONFIG.UPLOAD_FOLDER_ID || APP_CONFIG.UPLOAD_FOLDER_ID === 'PUT_YOUR_UPLOAD_FOLDER_ID_HERE') {
      addCheck('Upload Folder', false, 'ยังไม่ได้ตั้งค่า UPLOAD_FOLDER_ID');
    } else {
      const folder = DriveApp.getFolderById(APP_CONFIG.UPLOAD_FOLDER_ID);
      addCheck('Upload Folder', Boolean(folder.getId()), folder.getName());
    }
  } catch (err) {
    addCheck('System check', false, err.message);
  }

  console.log(JSON.stringify(report, null, 2));
  return report;
}

function verifyWorkflowConfiguration() {
  const statuses = DataService.getRows(APP_CONFIG.SHEETS.MASTER_STATUS).map(function(row) {
    return row.STATUS_CODE;
  });
  const required = ['NEW', 'RECEIVED', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_PART', 'OUTSOURCE', 'DONE', 'CLOSED', 'CANCELLED'];
  const missing = required.filter(function(code) { return statuses.indexOf(code) === -1; });
  const technicians = MasterService.getActiveTechnicians();

  const report = {
    version: APP_CONFIG.APP_VERSION,
    ok: missing.length === 0 && technicians.length > 0,
    missingStatuses: missing,
    activeTechnicians: technicians.map(function(user) {
      return { USER_ID: user.USER_ID, FULL_NAME: user.FULL_NAME };
    })
  };
  console.log(JSON.stringify(report, null, 2));
  return report;
}

function resetDemoUsers() {
  seedDemoUsers_(true);
  return 'รีเซ็ตรหัสผ่าน Demo User เรียบร้อยแล้ว กรุณาเปลี่ยนก่อนใช้งานจริง';
}

function cleanupExpiredSessions() {
  return SessionService.cleanupExpired();
}

function cleanupExpiredAuthData() {
  return {
    sessions: SessionService.cleanupExpired(),
    oauthStates: OAuthStateService.cleanup(),
    registrationDrafts: RegistrationService.cleanupExpiredDrafts()
  };
}

function ensureSheetSchema_(ss, sheetName, expectedHeaders) {
  let sh = ss.getSheetByName(sheetName);
  if (!sh) sh = ss.insertSheet(sheetName);

  if (sh.getLastRow() === 0 || sh.getLastColumn() === 0) {
    sh.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
  } else {
    const existingHeaders = sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0].map(String);
    const duplicates = existingHeaders.filter(function(value, index, array) {
      return value && array.indexOf(value) !== index;
    });
    if (duplicates.length) throw new Error('พบ Header ซ้ำใน Sheet ' + sheetName + ': ' + duplicates.join(', '));

    const missing = expectedHeaders.filter(function(header) {
      return existingHeaders.indexOf(header) === -1;
    });

    if (missing.length) {
      sh.getRange(1, sh.getLastColumn() + 1, 1, missing.length).setValues([missing]);
    }
  }

  sh.setFrozenRows(1);
}

function seedMasterData_() {
  seedRowsByKey_(APP_CONFIG.SHEETS.MASTER_STATUS, 'STATUS_CODE', [
    { STATUS_CODE: 'NEW', STATUS_NAME_TH: 'รอรับเรื่อง', STATUS_NAME_EN: 'New', SORT_ORDER: 1, ACTIVE: true, DESCRIPTION: 'ผู้ใช้ส่งเรื่องเข้ามาใหม่' },
    { STATUS_CODE: 'RECEIVED', STATUS_NAME_TH: 'รับเรื่องแล้ว', STATUS_NAME_EN: 'Received', SORT_ORDER: 2, ACTIVE: true, DESCRIPTION: 'Admin ตรวจสอบและรับเรื่อง' },
    { STATUS_CODE: 'ASSIGNED', STATUS_NAME_TH: 'มอบหมายช่างแล้ว', STATUS_NAME_EN: 'Assigned', SORT_ORDER: 3, ACTIVE: true, DESCRIPTION: 'มีผู้รับผิดชอบงาน' },
    { STATUS_CODE: 'IN_PROGRESS', STATUS_NAME_TH: 'กำลังดำเนินการ', STATUS_NAME_EN: 'In Progress', SORT_ORDER: 4, ACTIVE: true, DESCRIPTION: 'ช่างเริ่มดำเนินการ' },
    { STATUS_CODE: 'WAITING_PART', STATUS_NAME_TH: 'รออะไหล่/รอจัดซื้อ', STATUS_NAME_EN: 'Waiting Part', SORT_ORDER: 5, ACTIVE: true, DESCRIPTION: 'รออะไหล่หรือการจัดซื้อ' },
    { STATUS_CODE: 'OUTSOURCE', STATUS_NAME_TH: 'ส่งซ่อมภายนอก', STATUS_NAME_EN: 'Outsource', SORT_ORDER: 6, ACTIVE: true, DESCRIPTION: 'ส่งผู้รับจ้างหรือศูนย์บริการภายนอก' },
    { STATUS_CODE: 'DONE', STATUS_NAME_TH: 'ดำเนินการแล้วเสร็จ', STATUS_NAME_EN: 'Done', SORT_ORDER: 7, ACTIVE: true, DESCRIPTION: 'ช่างดำเนินการเสร็จ รอตรวจสอบ' },
    { STATUS_CODE: 'CLOSED', STATUS_NAME_TH: 'ปิดงาน', STATUS_NAME_EN: 'Closed', SORT_ORDER: 8, ACTIVE: true, DESCRIPTION: 'Admin หรือ Manager ตรวจสอบและปิดงาน' },
    { STATUS_CODE: 'CANCELLED', STATUS_NAME_TH: 'ยกเลิก', STATUS_NAME_EN: 'Cancelled', SORT_ORDER: 9, ACTIVE: true, DESCRIPTION: 'ยกเลิกรายการพร้อมระบุเหตุผล' }
  ]);

  seedRowsByKey_(APP_CONFIG.SHEETS.MASTER_SLA, 'PRIORITY_CODE', [
    { PRIORITY_CODE: 'LOW', PRIORITY_NAME_TH: 'ต่ำ', PRIORITY_NAME_EN: 'Low', SLA_HOURS: 240, SLA_TEXT: 'ภายใน 10 วัน', ACTIVE: true, DESCRIPTION: 'งานปรับปรุงหรืองานไม่เร่งด่วน' },
    { PRIORITY_CODE: 'NORMAL', PRIORITY_NAME_TH: 'ปกติ', PRIORITY_NAME_EN: 'Normal', SLA_HOURS: 168, SLA_TEXT: 'ภายใน 5-7 วัน', ACTIVE: true, DESCRIPTION: 'งานทั่วไป ไม่กระทบการให้บริการหลัก' },
    { PRIORITY_CODE: 'HIGH', PRIORITY_NAME_TH: 'ด่วน', PRIORITY_NAME_EN: 'High Priority', SLA_HOURS: 72, SLA_TEXT: 'ภายใน 1-3 วัน', ACTIVE: true, DESCRIPTION: 'กระทบผู้ใช้งานหลายคนหรือพื้นที่สำคัญ' },
    { PRIORITY_CODE: 'CRITICAL', PRIORITY_NAME_TH: 'ด่วนที่สุด', PRIORITY_NAME_EN: 'Critical', SLA_HOURS: 24, SLA_TEXT: 'ภายใน 1 วัน', ACTIVE: true, DESCRIPTION: 'กระทบความปลอดภัยหรือระบบหลักหยุดทำงาน' },
    { PRIORITY_CODE: 'PM', PRIORITY_NAME_TH: 'งาน PM', PRIORITY_NAME_EN: 'Preventive Maintenance', SLA_HOURS: 720, SLA_TEXT: 'ภายในรอบแผน PM', ACTIVE: true, DESCRIPTION: 'งานตรวจเชิงป้องกันตามรอบ' }
  ]);

  seedRowsByKey_(APP_CONFIG.SHEETS.MASTER_SYSTEMS, 'SYSTEM_CODE', [
    { SYSTEM_CODE: 'EE', SYSTEM_NAME_TH: 'ระบบไฟฟ้า', SYSTEM_NAME_EN: 'Electrical', DEFAULT_PRIORITY_CODE: 'HIGH', ACTIVE: true, DESCRIPTION: 'หลอดไฟ ไฟฟ้าขัดข้อง เบรกเกอร์ ปลั๊กไฟ' },
    { SYSTEM_CODE: 'PL', SYSTEM_NAME_TH: 'ระบบประปาและสุขาภิบาล', SYSTEM_NAME_EN: 'Plumbing', DEFAULT_PRIORITY_CODE: 'HIGH', ACTIVE: true, DESCRIPTION: 'ก๊อกน้ำ ท่อรั่ว ท่ออุดตัน ห้องน้ำ' },
    { SYSTEM_CODE: 'AC', SYSTEM_NAME_TH: 'ระบบปรับอากาศ', SYSTEM_NAME_EN: 'Air Condition', DEFAULT_PRIORITY_CODE: 'NORMAL', ACTIVE: true, DESCRIPTION: 'แอร์ไม่เย็น น้ำหยด เสียงดัง' },
    { SYSTEM_CODE: 'CCTV', SYSTEM_NAME_TH: 'ระบบกล้องวงจรปิด', SYSTEM_NAME_EN: 'CCTV', DEFAULT_PRIORITY_CODE: 'HIGH', ACTIVE: true, DESCRIPTION: 'กล้องภาพดับ ภาพไม่ชัด DVR/NVR' },
    { SYSTEM_CODE: 'MEETING', SYSTEM_NAME_TH: 'ระบบห้องประชุม', SYSTEM_NAME_EN: 'Meeting Room System', DEFAULT_PRIORITY_CODE: 'HIGH', ACTIVE: true, DESCRIPTION: 'โปรเจคเตอร์ ไมค์ จอภาพ ระบบเสียง' },
    { SYSTEM_CODE: 'ACCESS', SYSTEM_NAME_TH: 'ระบบเข้า-ออกอาคาร', SYSTEM_NAME_EN: 'Access Control', DEFAULT_PRIORITY_CODE: 'CRITICAL', ACTIVE: true, DESCRIPTION: 'ประตู คีย์การ์ด เครื่องสแกน ระบบไม้กั้น' },
    { SYSTEM_CODE: 'FM', SYSTEM_NAME_TH: 'งานอาคารและสาธารณูปโภค', SYSTEM_NAME_EN: 'Facility Management', DEFAULT_PRIORITY_CODE: 'NORMAL', ACTIVE: true, DESCRIPTION: 'ประตู หน้าต่าง พื้น ฝ้า งานอาคารทั่วไป' },
    { SYSTEM_CODE: 'ITNET', SYSTEM_NAME_TH: 'ระบบเครือข่าย', SYSTEM_NAME_EN: 'Network', DEFAULT_PRIORITY_CODE: 'HIGH', ACTIVE: true, DESCRIPTION: 'LAN Wi-Fi Internet และอุปกรณ์เครือข่าย' },
    { SYSTEM_CODE: 'FUR', SYSTEM_NAME_TH: 'เฟอร์นิเจอร์', SYSTEM_NAME_EN: 'Furniture', DEFAULT_PRIORITY_CODE: 'NORMAL', ACTIVE: true, DESCRIPTION: 'โต๊ะ เก้าอี้ ตู้ และอุปกรณ์สำนักงาน' },
    { SYSTEM_CODE: 'OTHER', SYSTEM_NAME_TH: 'อื่นๆ', SYSTEM_NAME_EN: 'Other', DEFAULT_PRIORITY_CODE: 'NORMAL', ACTIVE: true, DESCRIPTION: 'งาน Facility อื่นที่ไม่อยู่ในหมวดหลัก' }
  ]);

  seedRowsByKey_(APP_CONFIG.SHEETS.MASTER_LOCATIONS, 'LOCATION_ID', [
    { LOCATION_ID: 'LOC-001', BUILDING: 'อาคาร A', FLOOR: '1', ROOM: 'โถงกลาง', LOCATION_FULL: 'อาคาร A ชั้น 1 โถงกลาง', ACTIVE: true, QR_CODE_REF: 'FRS-QR-LOC-001' },
    { LOCATION_ID: 'LOC-002', BUILDING: 'อาคาร A', FLOOR: '2', ROOM: 'ห้องประชุม 201', LOCATION_FULL: 'อาคาร A ชั้น 2 ห้องประชุม 201', ACTIVE: true, QR_CODE_REF: 'FRS-QR-LOC-002' },
    { LOCATION_ID: 'LOC-003', BUILDING: 'อาคาร B', FLOOR: '1', ROOM: 'ห้องน้ำชาย', LOCATION_FULL: 'อาคาร B ชั้น 1 ห้องน้ำชาย', ACTIVE: true, QR_CODE_REF: 'FRS-QR-LOC-003' },
    { LOCATION_ID: 'LOC-004', BUILDING: 'อาคาร B', FLOOR: '3', ROOM: 'ห้อง Server', LOCATION_FULL: 'อาคาร B ชั้น 3 ห้อง Server', ACTIVE: true, QR_CODE_REF: 'FRS-QR-LOC-004' },
    { LOCATION_ID: 'LOC-005', BUILDING: 'ลานจอดรถ', FLOOR: '-', ROOM: 'ประตูทางเข้า', LOCATION_FULL: 'ลานจอดรถ ประตูทางเข้า', ACTIVE: true, QR_CODE_REF: 'FRS-QR-LOC-005' },
    { LOCATION_ID: 'LOC-006', BUILDING: 'อาคาร C', FLOOR: '4', ROOM: 'ห้องประชุมใหญ่', LOCATION_FULL: 'อาคาร C ชั้น 4 ห้องประชุมใหญ่', ACTIVE: true, QR_CODE_REF: 'FRS-QR-LOC-006' }
  ]);

  seedRowsByKey_(APP_CONFIG.SHEETS.MASTER_DEPARTMENTS, 'DEPARTMENT_ID', [
    { DEPARTMENT_ID: 'DEP-001', DIVISION: 'ฝ่ายอำนวยการ', DEPARTMENT: 'งานอาคารสถานที่', ACTIVE: true, DESCRIPTION: 'ดูแลงาน Facility และอาคาร' },
    { DEPARTMENT_ID: 'DEP-002', DIVISION: 'ฝ่ายเทคโนโลยีสารสนเทศ', DEPARTMENT: 'งานระบบเครือข่าย', ACTIVE: true, DESCRIPTION: 'ดูแล Network, CCTV และ Server' },
    { DEPARTMENT_ID: 'DEP-003', DIVISION: 'ฝ่ายบริหารทั่วไป', DEPARTMENT: 'งานธุรการ', ACTIVE: true, DESCRIPTION: 'หน่วยงานผู้ใช้งานทั่วไป' },
    { DEPARTMENT_ID: 'DEP-004', DIVISION: 'ฝ่ายประชุมและพิธีการ', DEPARTMENT: 'งานห้องประชุม', ACTIVE: true, DESCRIPTION: 'ดูแลห้องประชุมและอุปกรณ์ประชุม' },
    { DEPARTMENT_ID: 'DEP-005', DIVISION: 'ฝ่ายรักษาความปลอดภัย', DEPARTMENT: 'งานควบคุมการเข้าออก', ACTIVE: true, DESCRIPTION: 'ดูแล Access Control และความปลอดภัย' }
  ]);
}

function seedRowsByKey_(sheetName, keyField, rows) {
  rows.forEach(function(row) {
    const existing = DataService.findOne(sheetName, keyField, row[keyField]);
    if (!existing) DataService.appendRow(sheetName, row);
  });
}

function seedDemoUsers_(forceReset) {
  const now = Utils.now();
  const users = [
    { USER_ID: 'U-ADMIN-001', USERNAME: 'admin', PASSWORD: 'Admin@1234', FULL_NAME: 'ผู้ดูแลระบบ FRS', PHONE: '0800000001', EMAIL: 'admin@example.com', DIVISION: 'ฝ่ายอำนวยการ', DEPARTMENT: 'งานอาคารสถานที่', POSITION: 'Admin', ROLE: 'ADMIN' },
    { USER_ID: 'U-USER-001', USERNAME: 'user01', PASSWORD: 'User@1234', FULL_NAME: 'สมชาย แจ้งซ่อม', PHONE: '0800000002', EMAIL: 'user01@example.com', DIVISION: 'ฝ่ายบริหารทั่วไป', DEPARTMENT: 'งานธุรการ', POSITION: 'เจ้าหน้าที่', ROLE: 'USER' },
    { USER_ID: 'U-TECH-001', USERNAME: 'tech01', PASSWORD: 'Tech@1234', FULL_NAME: 'ช่าง Facility 01', PHONE: '0800000003', EMAIL: 'tech01@example.com', DIVISION: 'ฝ่ายอำนวยการ', DEPARTMENT: 'งานอาคารสถานที่', POSITION: 'ช่างซ่อมบำรุง', ROLE: 'TECHNICIAN' },
    { USER_ID: 'U-TECH-002', USERNAME: 'tech02', PASSWORD: 'Tech@1234', FULL_NAME: 'ช่างระบบไฟฟ้า', PHONE: '0800000005', EMAIL: 'tech02@example.com', DIVISION: 'ฝ่ายอำนวยการ', DEPARTMENT: 'งานอาคารสถานที่', POSITION: 'ช่างไฟฟ้า', ROLE: 'TECHNICIAN' },
    { USER_ID: 'U-MANAGER-001', USERNAME: 'manager01', PASSWORD: 'Manager@1234', FULL_NAME: 'หัวหน้างานอาคาร', PHONE: '0800000004', EMAIL: 'manager01@example.com', DIVISION: 'ฝ่ายอำนวยการ', DEPARTMENT: 'งานอาคารสถานที่', POSITION: 'Manager', ROLE: 'MANAGER' }
  ];

  users.forEach(function(item) {
    const existing = DataService.findOne(APP_CONFIG.SHEETS.USERS, 'USER_ID', item.USER_ID);
    const passwordHash = Utils.hashPassword(item.PASSWORD);

    if (!existing) {
      DataService.appendRow(APP_CONFIG.SHEETS.USERS, {
        USER_ID: item.USER_ID,
        USERNAME: item.USERNAME,
        PASSWORD_HASH: passwordHash,
        FULL_NAME: item.FULL_NAME,
        PHONE: item.PHONE,
        EMAIL: item.EMAIL,
        DIVISION: item.DIVISION,
        DEPARTMENT: item.DEPARTMENT,
        POSITION: item.POSITION,
        ROLE: item.ROLE,
        STATUS: 'ACTIVE',
        FAILED_LOGIN_COUNT: 0,
        LOCKED_UNTIL: '',
        MUST_CHANGE_PASSWORD: false,
        LAST_LOGIN: '',
        PASSWORD_CHANGED_AT: now,
        CREATED_AT: now,
        UPDATED_AT: now
      });
    } else {
      const isPlaceholder = /^<SHA256_HASH_/i.test(String(existing.PASSWORD_HASH || ''));
      if (forceReset || isPlaceholder || !existing.PASSWORD_HASH) {
        DataService.updateRowByKey(APP_CONFIG.SHEETS.USERS, 'USER_ID', item.USER_ID, {
          USERNAME: item.USERNAME,
          PASSWORD_HASH: passwordHash,
          FAILED_LOGIN_COUNT: 0,
          LOCKED_UNTIL: '',
          PASSWORD_CHANGED_AT: now,
          UPDATED_AT: now
        });
      }
    }
  });
}

function cleanupLegacyPlaceholders_() {
  DataService.getRows(APP_CONFIG.SHEETS.USERS).forEach(function(user) {
    if (/^<SHA256_HASH_/i.test(String(user.PASSWORD_HASH || ''))) {
      console.warn('พบ Password Placeholder ที่ USER_ID: ' + user.USER_ID + ' กรุณารัน resetDemoUsers() หรือกำหนดรหัสผ่านใหม่');
    }
  });
}

function formatAllSheets_() {
  const ss = DataService.ss();
  Object.keys(APP_CONFIG.SHEETS).forEach(function(key) {
    const name = APP_CONFIG.SHEETS[key];
    const sh = ss.getSheetByName(name);
    if (!sh) return;

    const lastCol = sh.getLastColumn();
    if (!lastCol) return;

    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, lastCol)
      .setBackground('#1f4e79')
      .setFontColor('#ffffff')
      .setFontWeight('bold')
      .setHorizontalAlignment('center')
      .setWrap(true);

    sh.autoResizeColumns(1, lastCol);
    for (let col = 1; col <= lastCol; col++) {
      if (sh.getColumnWidth(col) > 320) sh.setColumnWidth(col, 320);
      if (sh.getColumnWidth(col) < 90) sh.setColumnWidth(col, 90);
    }
  });

  setDateFormats_(APP_CONFIG.SHEETS.USERS, ['LOCKED_UNTIL', 'LAST_LOGIN', 'PASSWORD_CHANGED_AT', 'CREATED_AT', 'UPDATED_AT']);
  setDateFormats_(APP_CONFIG.SHEETS.REQUESTS, ['REQUEST_DATE', 'RECEIVED_DATE', 'FIX_START_DATE', 'FIX_DONE_DATE', 'CREATED_AT', 'UPDATED_AT']);
  setDateFormats_(APP_CONFIG.SHEETS.REQUEST_STATUS_LOG, ['ACTION_DATE']);
  setDateFormats_(APP_CONFIG.SHEETS.SESSION_STORE, ['CREATED_AT', 'EXPIRES_AT', 'LAST_ACCESSED_AT']);
  setDateFormats_(APP_CONFIG.SHEETS.LOGIN_AUDIT, ['CREATED_AT']);
  setDateFormats_(APP_CONFIG.SHEETS.USER_IDENTITIES, ['LINKED_AT', 'LAST_LOGIN_AT', 'CREATED_AT', 'UPDATED_AT']);
  setDateFormats_(APP_CONFIG.SHEETS.REGISTRATION_REQUESTS, ['TOKEN_EXPIRES_AT', 'CONSENT_AT', 'REQUESTED_AT', 'APPROVED_AT', 'CREATED_AT', 'UPDATED_AT']);
  setDateFormats_(APP_CONFIG.SHEETS.OAUTH_STATE_STORE, ['CREATED_AT', 'EXPIRES_AT', 'USED_AT']);
}

function setDateFormats_(sheetName, fields) {
  const sh = DataService.sheet(sheetName);
  const headers = DataService.getHeaders(sheetName);
  const maxRows = Math.max(sh.getMaxRows() - 1, 1);

  fields.forEach(function(field) {
    const index = headers.indexOf(field);
    if (index !== -1) {
      sh.getRange(2, index + 1, maxRows, 1).setNumberFormat('dd/MM/yyyy HH:mm:ss');
    }
  });
}
