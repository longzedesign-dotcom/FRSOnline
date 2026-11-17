/**
 * Facility Repair System (FRS)
 * SystemService.gs
 * Version 2.3.19
 *
 * Handles system configuration, policies, integrations, and health monitoring
 * for Administrators and Super Admins.
 */

const SystemService = {
  props_() {
    return PropertiesService.getScriptProperties();
  },

  requireAdmin_(user) {
    if (!user || String(user.ROLE || '').toUpperCase() !== APP_CONFIG.ROLES.ADMIN) {
      throw new Error('ต้องมีสิทธิ์ระดับ Administrator เพื่อเข้าถึงการตั้งค่าส่วนนี้');
    }
  },

  getAllSettings(user) {
    this.requireAdmin_(user);
    const props = this.props_();

    return {
      GENERAL: {
        ORG_NAME: props.getProperty('CFG_ORG_NAME') || APP_CONFIG.APP_NAME || 'Facility Repair System (FRS)',
        SYSTEM_SUBTITLE: props.getProperty('CFG_SYSTEM_SUBTITLE') || 'ระบบแจ้งซ่อมบำรุงออนไลน์',
        SUPPORT_PHONE: props.getProperty('CFG_SUPPORT_PHONE') || '',
        SUPPORT_EMAIL: props.getProperty('CFG_SUPPORT_EMAIL') || ''
      },
      SECURITY: {
        REGISTRATION_ENABLED: props.getProperty('CFG_REGISTRATION_ENABLED') !== 'false',
        AUTO_APPROVE_REGISTRATION: props.getProperty('CFG_AUTO_APPROVE_REGISTRATION') === 'true',
        ALLOWED_EMAIL_DOMAINS: props.getProperty('CFG_ALLOWED_EMAIL_DOMAINS') || '',
        SESSION_TIMEOUT_HOURS: Utils.toNumber(props.getProperty('CFG_SESSION_TIMEOUT_HOURS'), 6),
        MAX_LOGIN_ATTEMPTS: Utils.toNumber(props.getProperty('CFG_MAX_LOGIN_ATTEMPTS'), APP_CONFIG.MAX_LOGIN_ATTEMPTS || 5)
      },
      WORKFLOW: {
        SLA_HOURS_CRITICAL: Utils.toNumber(props.getProperty('CFG_SLA_HOURS_CRITICAL'), 4),
        SLA_HOURS_HIGH: Utils.toNumber(props.getProperty('CFG_SLA_HOURS_HIGH'), 24),
        SLA_HOURS_NORMAL: Utils.toNumber(props.getProperty('CFG_SLA_HOURS_NORMAL'), 72),
        REQUIRE_PHOTO_BEFORE: props.getProperty('CFG_REQUIRE_PHOTO_BEFORE') === 'true',
        REQUIRE_PHOTO_AFTER: props.getProperty('CFG_REQUIRE_PHOTO_AFTER') === 'true',
        MAX_COST_APPROVAL_LIMIT: Utils.toNumber(props.getProperty('CFG_MAX_COST_APPROVAL_LIMIT'), 5000)
      },
      NOTIFICATIONS: {
        LINE_NOTIFY_TOKEN: props.getProperty('CFG_LINE_NOTIFY_TOKEN') ? '••••••••••••••••' : '',
        HAS_LINE_TOKEN: Boolean(props.getProperty('CFG_LINE_NOTIFY_TOKEN')),
        NOTIFY_LINE_ON_NEW: props.getProperty('CFG_NOTIFY_LINE_ON_NEW') === 'true',
        NOTIFY_LINE_ON_CLOSE: props.getProperty('CFG_NOTIFY_LINE_ON_CLOSE') === 'true',
        NOTIFY_EMAIL_ON_CLOSE: props.getProperty('CFG_NOTIFY_EMAIL_ON_CLOSE') === 'true',
        GOOGLE_LOGIN_ENABLED: props.getProperty('CFG_GOOGLE_LOGIN_ENABLED') !== 'false',
        LINE_LOGIN_ENABLED: props.getProperty('CFG_LINE_LOGIN_ENABLED') !== 'false'
      }
    };
  },

  saveSectionSettings(user, section, data) {
    this.requireAdmin_(user);
    const props = this.props_();
    const input = data || {};
    const sec = String(section || '').toUpperCase();

    if (sec === 'GENERAL') {
      if (input.ORG_NAME !== undefined) props.setProperty('CFG_ORG_NAME', Utils.normalizeText(input.ORG_NAME, 150));
      if (input.SYSTEM_SUBTITLE !== undefined) props.setProperty('CFG_SYSTEM_SUBTITLE', Utils.normalizeText(input.SYSTEM_SUBTITLE, 150));
      if (input.SUPPORT_PHONE !== undefined) props.setProperty('CFG_SUPPORT_PHONE', String(input.SUPPORT_PHONE || '').trim());
      if (input.SUPPORT_EMAIL !== undefined) props.setProperty('CFG_SUPPORT_EMAIL', String(input.SUPPORT_EMAIL || '').trim());
    } else if (sec === 'SECURITY') {
      props.setProperty('CFG_REGISTRATION_ENABLED', input.REGISTRATION_ENABLED ? 'true' : 'false');
      props.setProperty('CFG_AUTO_APPROVE_REGISTRATION', input.AUTO_APPROVE_REGISTRATION ? 'true' : 'false');
      props.setProperty('CFG_ALLOWED_EMAIL_DOMAINS', String(input.ALLOWED_EMAIL_DOMAINS || '').trim().toLowerCase());
      const sessHours = Math.max(1, Math.min(72, Utils.toNumber(input.SESSION_TIMEOUT_HOURS, 6)));
      props.setProperty('CFG_SESSION_TIMEOUT_HOURS', String(sessHours));
      const maxAttempts = Math.max(3, Math.min(10, Utils.toNumber(input.MAX_LOGIN_ATTEMPTS, 5)));
      props.setProperty('CFG_MAX_LOGIN_ATTEMPTS', String(maxAttempts));
    } else if (sec === 'WORKFLOW') {
      const crit = Math.max(1, Utils.toNumber(input.SLA_HOURS_CRITICAL, 4));
      const high = Math.max(1, Utils.toNumber(input.SLA_HOURS_HIGH, 24));
      const norm = Math.max(1, Utils.toNumber(input.SLA_HOURS_NORMAL, 72));
      props.setProperty('CFG_SLA_HOURS_CRITICAL', String(crit));
      props.setProperty('CFG_SLA_HOURS_HIGH', String(high));
      props.setProperty('CFG_SLA_HOURS_NORMAL', String(norm));
      props.setProperty('CFG_REQUIRE_PHOTO_BEFORE', input.REQUIRE_PHOTO_BEFORE ? 'true' : 'false');
      props.setProperty('CFG_REQUIRE_PHOTO_AFTER', input.REQUIRE_PHOTO_AFTER ? 'true' : 'false');
      const limit = Math.max(0, Utils.toNumber(input.MAX_COST_APPROVAL_LIMIT, 5000));
      props.setProperty('CFG_MAX_COST_APPROVAL_LIMIT', String(limit));
    } else if (sec === 'NOTIFICATIONS') {
      if (input.LINE_NOTIFY_TOKEN && input.LINE_NOTIFY_TOKEN !== '••••••••••••••••') {
        props.setProperty('CFG_LINE_NOTIFY_TOKEN', String(input.LINE_NOTIFY_TOKEN).trim());
      } else if (input.LINE_NOTIFY_TOKEN === '') {
        props.deleteProperty('CFG_LINE_NOTIFY_TOKEN');
      }
      props.setProperty('CFG_NOTIFY_LINE_ON_NEW', input.NOTIFY_LINE_ON_NEW ? 'true' : 'false');
      props.setProperty('CFG_NOTIFY_LINE_ON_CLOSE', input.NOTIFY_LINE_ON_CLOSE ? 'true' : 'false');
      props.setProperty('CFG_NOTIFY_EMAIL_ON_CLOSE', input.NOTIFY_EMAIL_ON_CLOSE ? 'true' : 'false');
      props.setProperty('CFG_GOOGLE_LOGIN_ENABLED', input.GOOGLE_LOGIN_ENABLED ? 'true' : 'false');
      props.setProperty('CFG_LINE_LOGIN_ENABLED', input.LINE_LOGIN_ENABLED ? 'true' : 'false');
    } else {
      throw new Error('ไม่พบหมวดการตั้งค่าที่ระบุ: ' + section);
    }

    return Utils.jsonSuccess(null, 'บันทึกการตั้งค่าหมวด ' + section + ' เรียบร้อยแล้ว');
  },

  flushCache(user) {
    this.requireAdmin_(user);
    try {
      DataService.invalidateAll();
      CacheService.getScriptCache().removeAll([
        'FRS_V220A2_MASTER_BOOTSTRAP',
        'FRS_V220A2_PUBLIC_REG_DATA'
      ]);
      return Utils.jsonSuccess(null, 'ล้างแคชระบบและหน่วยความจำชั่วคราวเรียบร้อยแล้ว');
    } catch (err) {
      return Utils.jsonError('ล้างแคชไม่สำเร็จ: ' + err.message);
    }
  },

  getSystemHealth(user) {
    this.requireAdmin_(user);

    let spreadsheetStatus = { ok: false, name: '-', rowCount: 0, sheets: [] };
    try {
      const ss = SpreadsheetApp.openById(APP_CONFIG.SPREADSHEET_ID);
      spreadsheetStatus.ok = true;
      spreadsheetStatus.name = ss.getName();
      spreadsheetStatus.url = ss.getUrl();

      const sheetsList = [];
      const sheetKeys = Object.keys(APP_CONFIG.SHEETS);
      sheetKeys.forEach((key) => {
        const sheetName = APP_CONFIG.SHEETS[key];
        const s = ss.getSheetByName(sheetName);
        if (s) {
          const lastRow = s.getLastRow();
          const rows = lastRow > 1 ? lastRow - 1 : 0;
          sheetsList.push({
            key: key,
            name: sheetName,
            exists: true,
            rows: rows,
            cols: s.getLastColumn()
          });
        } else {
          sheetsList.push({
            key: key,
            name: sheetName,
            exists: false,
            rows: 0,
            cols: 0
          });
        }
      });
      spreadsheetStatus.sheets = sheetsList;
    } catch (err) {
      spreadsheetStatus.error = err.message;
    }

    let driveStatus = { ok: false, name: '-', folderId: APP_CONFIG.UPLOAD_FOLDER_ID };
    try {
      const folder = DriveApp.getFolderById(APP_CONFIG.UPLOAD_FOLDER_ID);
      driveStatus.ok = true;
      driveStatus.name = folder.getName();
      driveStatus.url = folder.getUrl();
    } catch (err) {
      driveStatus.error = err.message;
    }

    return Utils.jsonSuccess({
      spreadsheet: spreadsheetStatus,
      drive: driveStatus,
      appVersion: APP_CONFIG.APP_VERSION,
      serverTime: Utils.now(),
      timezone: APP_CONFIG.TIMEZONE
    });
  }
};
