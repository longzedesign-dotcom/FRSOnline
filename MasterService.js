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
  }
};
