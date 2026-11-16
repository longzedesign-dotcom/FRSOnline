/**
 * Facility Repair System (FRS)
 * MasterService.gs
 * Version 2.3.03
 */

const MasterService = {
  getAllMasterData() {
    return Utils.jsonSuccess(this.buildAllMasterData_());
  },

  buildAllMasterData_() {
    return {
      systems: this.getActiveRows(APP_CONFIG.SHEETS.MASTER_SYSTEMS, 'ACTIVE'),
      locations: this.getActiveRows(APP_CONFIG.SHEETS.MASTER_LOCATIONS, 'ACTIVE'),
      departments: this.getActiveRows(APP_CONFIG.SHEETS.MASTER_DEPARTMENTS, 'ACTIVE'),
      sla: this.getActiveRows(APP_CONFIG.SHEETS.MASTER_SLA, 'ACTIVE'),
      status: this.getActiveRows(APP_CONFIG.SHEETS.MASTER_STATUS, 'ACTIVE')
    };
  },

  getActiveRows(sheetName, activeField) {
    return DataService.getRowsCached(sheetName).filter(function(row) {
      if (!activeField || row[activeField] === undefined || row[activeField] === '') return true;
      return Utils.isActive(row[activeField]);
    });
  },

  getActiveTechnicians() {
    return DataService.findAllCaseInsensitive(APP_CONFIG.SHEETS.USERS, 'ROLE', APP_CONFIG.ROLES.TECHNICIAN).filter(function(user) {
      return Utils.isActive(user.STATUS);
    }).map(this.toPublicUser_).sort(function(a, b) {
      return String(a.FULL_NAME || '').localeCompare(String(b.FULL_NAME || ''), 'th');
    });
  },

  findTechnician(userId) {
    const user = DataService.findOne(APP_CONFIG.SHEETS.USERS, 'USER_ID', userId);
    if (!user || !Utils.isActive(user.STATUS)) return null;
    if (String(user.ROLE || '').toUpperCase() !== APP_CONFIG.ROLES.TECHNICIAN) return null;
    return user;
  },

  getPublicUser(userId) {
    const user = DataService.findOne(APP_CONFIG.SHEETS.USERS, 'USER_ID', userId);
    return user ? this.toPublicUser_(user) : null;
  },

  getUserNameMap() {
    const map = Object.create(null);
    DataService.getRows(APP_CONFIG.SHEETS.USERS).forEach(function(user) {
      map[String(user.USER_ID)] = user.FULL_NAME || user.USERNAME || user.USER_ID;
    });
    return map;
  },

  toPublicUser_(user) {
    return {
      USER_ID: user.USER_ID,
      USERNAME: user.USERNAME,
      FULL_NAME: user.FULL_NAME,
      PHONE: user.PHONE,
      EMAIL: user.EMAIL,
      DIVISION: user.DIVISION,
      DEPARTMENT: user.DEPARTMENT,
      POSITION: user.POSITION,
      ROLE: String(user.ROLE || '').toUpperCase(),
      STATUS: user.STATUS
    };
  },

  findSystem(systemCode) {
    return DataService.findOneCached(APP_CONFIG.SHEETS.MASTER_SYSTEMS, 'SYSTEM_CODE', systemCode);
  },

  findLocation(locationId) {
    return DataService.findOneCached(APP_CONFIG.SHEETS.MASTER_LOCATIONS, 'LOCATION_ID', locationId);
  },

  findSla(priorityCode) {
    return DataService.findOneCached(APP_CONFIG.SHEETS.MASTER_SLA, 'PRIORITY_CODE', priorityCode);
  },

  findStatus(statusCode) {
    return DataService.findOneCached(APP_CONFIG.SHEETS.MASTER_STATUS, 'STATUS_CODE', statusCode);
  },

  MASTER_CATEGORIES: {
    systems: {
      sheet: 'MASTER_SYSTEMS',
      pk: 'SYSTEM_CODE',
      label: 'ระบบ/อุปกรณ์',
      checkInUse(key) {
        return Boolean(DataService.findOne(APP_CONFIG.SHEETS.REQUESTS, 'SYSTEM_CODE', key));
      }
    },
    locations: {
      sheet: 'MASTER_LOCATIONS',
      pk: 'LOCATION_ID',
      label: 'สถานที่',
      checkInUse(key) {
        return Boolean(DataService.findOne(APP_CONFIG.SHEETS.REQUESTS, 'LOCATION_ID', key));
      }
    },
    departments: {
      sheet: 'MASTER_DEPARTMENTS',
      pk: 'DEPARTMENT_ID',
      label: 'ฝ่าย/แผนก',
      checkInUse(key) {
        const dept = DataService.findOne(APP_CONFIG.SHEETS.MASTER_DEPARTMENTS, 'DEPARTMENT_ID', key);
        const name = dept ? (dept.DEPARTMENT || dept.DEPARTMENT_ID) : key;
        const inReq = DataService.findOne(APP_CONFIG.SHEETS.REQUESTS, 'DEPARTMENT', name);
        const inUser = DataService.findOne(APP_CONFIG.SHEETS.USERS, 'DEPARTMENT', name);
        return Boolean(inReq || inUser);
      }
    },
    sla: {
      sheet: 'MASTER_SLA',
      pk: 'PRIORITY_CODE',
      label: 'SLA (ระดับความเร่งด่วน)',
      checkInUse(key) {
        const inReq = DataService.findOne(APP_CONFIG.SHEETS.REQUESTS, 'PRIORITY_CODE', key);
        const inSys = DataService.findOne(APP_CONFIG.SHEETS.MASTER_SYSTEMS, 'DEFAULT_PRIORITY_CODE', key);
        return Boolean(inReq || inSys);
      }
    },
    status: {
      sheet: 'MASTER_STATUS',
      pk: 'STATUS_CODE',
      label: 'สถานะงาน',
      checkInUse(key) {
        return Boolean(DataService.findOne(APP_CONFIG.SHEETS.REQUESTS, 'STATUS_CODE', key));
      }
    }
  },

  getAdminMasterCategory(category) {
    const cfg = this.MASTER_CATEGORIES[category];
    if (!cfg) throw new Error('ไม่พบหมวดหมู่ข้อมูล: ' + category);
    const sheetName = APP_CONFIG.SHEETS[cfg.sheet];
    const rows = DataService.getRows(sheetName);
    return Utils.jsonSuccess({
      category: category,
      label: cfg.label,
      pk: cfg.pk,
      rows: rows
    });
  },

  saveMasterCategoryItem(category, item) {
    const cfg = this.MASTER_CATEGORIES[category];
    if (!cfg) throw new Error('ไม่พบหมวดหมู่ข้อมูล: ' + category);
    if (!item || typeof item !== 'object') throw new Error('ข้อมูลไม่ถูกต้อง');

    const sheetName = APP_CONFIG.SHEETS[cfg.sheet];
    const pkField = cfg.pk;
    const pkValue = String(item[pkField] || '').trim();
    if (!pkValue) throw new Error('กรุณาระบุรหัส ' + pkField);

    const cleanItem = Object.assign({}, item);
    cleanItem[pkField] = pkValue;
    cleanItem.ACTIVE = Utils.isActive(cleanItem.ACTIVE);

    if (category === 'systems') {
      cleanItem.SYSTEM_NAME_TH = String(cleanItem.SYSTEM_NAME_TH || '').trim();
      cleanItem.SYSTEM_NAME_EN = String(cleanItem.SYSTEM_NAME_EN || '').trim();
      cleanItem.DEFAULT_PRIORITY_CODE = String(cleanItem.DEFAULT_PRIORITY_CODE || 'NORMAL').trim();
      cleanItem.DESCRIPTION = String(cleanItem.DESCRIPTION || '').trim();
    } else if (category === 'locations') {
      cleanItem.BUILDING = String(cleanItem.BUILDING || '').trim();
      cleanItem.FLOOR = String(cleanItem.FLOOR || '').trim();
      cleanItem.ROOM = String(cleanItem.ROOM || '').trim();
      if (!cleanItem.LOCATION_FULL) {
        cleanItem.LOCATION_FULL = [
          cleanItem.BUILDING,
          cleanItem.FLOOR ? ('ชั้น ' + cleanItem.FLOOR) : '',
          cleanItem.ROOM
        ].filter(Boolean).join(' ');
      }
      cleanItem.QR_CODE_REF = String(cleanItem.QR_CODE_REF || '').trim();
    } else if (category === 'departments') {
      cleanItem.DIVISION = String(cleanItem.DIVISION || '').trim();
      cleanItem.DEPARTMENT = String(cleanItem.DEPARTMENT || '').trim();
      cleanItem.DESCRIPTION = String(cleanItem.DESCRIPTION || '').trim();
    } else if (category === 'sla') {
      cleanItem.PRIORITY_NAME_TH = String(cleanItem.PRIORITY_NAME_TH || '').trim();
      cleanItem.PRIORITY_NAME_EN = String(cleanItem.PRIORITY_NAME_EN || '').trim();
      cleanItem.SLA_HOURS = Number(cleanItem.SLA_HOURS || 0);
      cleanItem.SLA_TEXT = String(cleanItem.SLA_TEXT || '').trim();
      cleanItem.DESCRIPTION = String(cleanItem.DESCRIPTION || '').trim();
    } else if (category === 'status') {
      cleanItem.STATUS_NAME_TH = String(cleanItem.STATUS_NAME_TH || '').trim();
      cleanItem.STATUS_NAME_EN = String(cleanItem.STATUS_NAME_EN || '').trim();
      cleanItem.SORT_ORDER = Number(cleanItem.SORT_ORDER || 0);
      cleanItem.DESCRIPTION = String(cleanItem.DESCRIPTION || '').trim();
    }

    const existing = DataService.findOne(sheetName, pkField, pkValue);
    if (existing) {
      DataService.updateRowByKey(sheetName, pkField, pkValue, cleanItem);
    } else {
      DataService.appendRow(sheetName, cleanItem);
    }

    SpreadsheetApp.flush();
    DataService.invalidate(sheetName);
    DataService.invalidateAll();

    return Utils.jsonSuccess(cleanItem, 'บันทึกข้อมูลเรียบร้อยแล้ว');
  },

  deleteMasterCategoryItem(category, keyValue) {
    const cfg = this.MASTER_CATEGORIES[category];
    if (!cfg) throw new Error('ไม่พบหมวดหมู่ข้อมูล: ' + category);
    const pkValue = String(keyValue || '').trim();
    if (!pkValue) throw new Error('กรุณาระบุรหัสข้อมูลที่ต้องการลบ');

    if (cfg.checkInUse && cfg.checkInUse(pkValue)) {
      throw new Error('ไม่สามารถลบข้อมูลนี้ได้เนื่องจากมีข้อมูลงานซ่อมหรือผู้ใช้งานอ้างอิงอยู่ แนะนำให้แก้ไขสถานะเป็น "ปิดใช้งาน" (ACTIVE = FALSE) แทน');
    }

    const sheetName = APP_CONFIG.SHEETS[cfg.sheet];
    const deletedCount = DataService.deleteRowsWhere(sheetName, function(row) {
      return String(row[cfg.pk] || '').trim() === pkValue;
    });

    if (deletedCount === 0) throw new Error('ไม่พบข้อมูลที่ต้องการลบ');

    SpreadsheetApp.flush();
    DataService.invalidate(sheetName);
    DataService.invalidateAll();

    return Utils.jsonSuccess({ deletedKey: pkValue }, 'ลบข้อมูลเรียบร้อยแล้ว');
  }
};
