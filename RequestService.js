/**
 * Facility Repair System (FRS)
 * RequestService.gs
 * Version 2.3.03
 */

const RequestService = {
  createRequest(user, payload) {
    let uploadedFile = null;
    let idempotencyContext = null;
    let requestCommitted = false;

    try {
      const input = payload || {};
      Utils.requireFields(input, ['SYSTEM_CODE', 'LOCATION_ID', 'PROBLEM_DETAIL', 'PRIORITY_CODE']);

      idempotencyContext = this.beginCreateRequest_(user, input.CLIENT_REQUEST_ID);
      if (idempotencyContext && idempotencyContext.completed) {
        const existingRequest = DataService.findOne(APP_CONFIG.SHEETS.REQUESTS, 'REQUEST_ID', idempotencyContext.requestId);
        return Utils.jsonSuccess({
          requestId: idempotencyContext.requestId,
          request: existingRequest || null,
          duplicate: true
        }, 'รายการแจ้งซ่อมนี้ถูกบันทึกเรียบร้อยแล้ว');
      }

      const systemCode = Utils.normalizeText(input.SYSTEM_CODE, 30);
      const locationId = Utils.normalizeText(input.LOCATION_ID, 50);
      const priorityCode = Utils.normalizeText(input.PRIORITY_CODE, 30);
      const problemDetail = Utils.normalizeText(input.PROBLEM_DETAIL, 3000);
      const remark = Utils.normalizeText(input.REMARK, 1000);
      const phone = Utils.normalizeThaiPhoneE164(input.PHONE, true);

      const system = MasterService.findSystem(systemCode);
      const location = MasterService.findLocation(locationId);
      const sla = MasterService.findSla(priorityCode);
      const status = MasterService.findStatus(APP_CONFIG.DEFAULT_STATUS);

      if (!system || !Utils.isActive(system.ACTIVE)) throw new Error('ไม่พบระบบ/อุปกรณ์ที่เลือก');
      if (!location || !Utils.isActive(location.ACTIVE)) throw new Error('ไม่พบสถานที่ที่เลือก');
      if (!sla || !Utils.isActive(sla.ACTIVE)) throw new Error('ไม่พบ SLA ของระดับความเร่งด่วนที่เลือก');
      if (!status || !Utils.isActive(status.ACTIVE)) throw new Error('ไม่พบสถานะเริ่มต้นของระบบ');

      const requestId = this.reserveRequestId_();

      if (input.PHOTO_BASE64) {
        uploadedFile = UploadService.saveBase64Image(input.PHOTO_BASE64, requestId, 'request');
      }

      const now = Utils.now();
      const request = {
        REQUEST_ID: requestId,
        REQUEST_DATE: now,
        REQUESTER_ID: user.USER_ID,
        REQUESTER_NAME: user.FULL_NAME,
        PHONE: phone,
        EMAIL: user.EMAIL || '',
        DIVISION: user.DIVISION || '',
        DEPARTMENT: user.DEPARTMENT || '',
        SYSTEM_CODE: system.SYSTEM_CODE,
        SYSTEM_NAME_TH: system.SYSTEM_NAME_TH,
        LOCATION_ID: location.LOCATION_ID,
        LOCATION_FULL: location.LOCATION_FULL,
        PROBLEM_DETAIL: problemDetail,
        PHOTO_REQUEST_FILE_ID: uploadedFile ? uploadedFile.fileId : '',
        PHOTO_REQUEST_URL: uploadedFile ? uploadedFile.fileUrl : '',
        PRIORITY_CODE: sla.PRIORITY_CODE,
        PRIORITY_NAME_TH: sla.PRIORITY_NAME_TH,
        SLA_HOURS: sla.SLA_HOURS,
        STATUS_CODE: APP_CONFIG.DEFAULT_STATUS,
        STATUS_NAME_TH: status.STATUS_NAME_TH,
        ASSIGNED_TO: '',
        RECEIVED_DATE: '',
        FIX_START_DATE: '',
        FIX_DONE_DATE: '',
        SOLUTION_DETAIL: '',
        COST: '',
        PHOTO_BEFORE_FIX_FILE_ID: '',
        PHOTO_BEFORE_FIX_URL: '',
        PHOTO_AFTER_FIX_FILE_ID: '',
        PHOTO_AFTER_FIX_URL: '',
        DURATION_HOURS: '',
        SLA_RESULT: '',
        CLOSED_BY: '',
        REMARK: remark,
        CREATED_AT: now,
        UPDATED_AT: now
      };

      const lock = LockService.getScriptLock();
      let requestSaved = false;
      lock.waitLock(20000);
      try {
        if (DataService.findOne(APP_CONFIG.SHEETS.REQUESTS, 'REQUEST_ID', requestId)) {
          throw new Error('พบเลขแจ้งซ่อมซ้ำ กรุณาลองใหม่');
        }

        DataService.appendRow(APP_CONFIG.SHEETS.REQUESTS, request);
        requestSaved = true;
        this.addStatusLog({
          REQUEST_ID: requestId,
          OLD_STATUS_CODE: '',
          NEW_STATUS_CODE: APP_CONFIG.DEFAULT_STATUS,
          ACTION_BY: user.USER_ID,
          ACTION_NAME: user.FULL_NAME,
          NOTE: 'สร้างใบแจ้งซ่อมใหม่'
        });
      } catch (transactionError) {
        if (requestSaved) {
          DataService.deleteRowsWhere(APP_CONFIG.SHEETS.REQUESTS, function(row) {
            return String(row.REQUEST_ID) === String(requestId);
          });
        }
        throw transactionError;
      } finally {
        lock.releaseLock();
      }

      requestCommitted = true;
      this.completeCreateRequest_(idempotencyContext, requestId);
      return Utils.jsonSuccess({ requestId: requestId, request: request, duplicate: false }, 'บันทึกใบแจ้งซ่อมเรียบร้อย');
    } catch (err) {
      this.clearCreateRequest_(idempotencyContext);
      if (!requestCommitted && uploadedFile && uploadedFile.fileId) UploadService.trashFile(uploadedFile.fileId);
      return Utils.jsonError(err.message);
    }
  },

  beginCreateRequest_(user, clientRequestId) {
    const normalized = Utils.normalizeText(clientRequestId, 100);
    if (!normalized) return null;

    const cache = CacheService.getScriptCache();
    const key = 'FRS_CREATE_REQUEST_' + Utils.sha256(String(user.USER_ID) + '|' + normalized).slice(0, 48);
    const pendingSeconds = Math.max(30, Utils.toNumber(
      APP_CONFIG.UX && APP_CONFIG.UX.CREATE_REQUEST_PENDING_SECONDS,
      120
    ));
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);

    try {
      const existing = Utils.safeParseJson(cache.get(key), null);
      if (existing && existing.state === 'DONE' && existing.requestId) {
        return { key: key, clientRequestId: normalized, completed: true, requestId: existing.requestId };
      }

      if (existing && existing.state === 'PENDING') {
        throw new Error('รายการแจ้งซ่อมนี้กำลังถูกบันทึก กรุณารอสักครู่');
      }

      cache.put(key, JSON.stringify({
        state: 'PENDING',
        createdAt: new Date().toISOString()
      }), pendingSeconds);

      return { key: key, clientRequestId: normalized, completed: false, requestId: '' };
    } finally {
      lock.releaseLock();
    }
  },

  completeCreateRequest_(context, requestId) {
    if (!context || !context.key) return;
    try {
      const ttl = Math.max(120, Utils.toNumber(
        APP_CONFIG.UX && APP_CONFIG.UX.CREATE_REQUEST_IDEMPOTENCY_SECONDS,
        600
      ));
      CacheService.getScriptCache().put(context.key, JSON.stringify({
        state: 'DONE',
        requestId: requestId,
        completedAt: new Date().toISOString()
      }), ttl);
    } catch (cacheError) {
      console.warn('CREATE_REQUEST_IDEMPOTENCY_COMPLETE', cacheError.message);
    }
  },

  clearCreateRequest_(context) {
    if (!context || !context.key || context.completed) return;
    CacheService.getScriptCache().remove(context.key);
  },

  reserveRequestId_() {
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);

    try {
      const monthKey = Utilities.formatDate(new Date(), APP_CONFIG.TIMEZONE, 'yyyy_MM');
      const prefix = 'FRS-' + Utilities.formatDate(new Date(), APP_CONFIG.TIMEZONE, 'yyyy-MM');
      const propertyKey = 'FRS_REQUEST_COUNTER_' + monthKey;
      const properties = PropertiesService.getScriptProperties();
      let current = Utils.toNumber(properties.getProperty(propertyKey), 0);

      DataService.getRows(APP_CONFIG.SHEETS.REQUESTS).forEach(function(row) {
        const id = String(row.REQUEST_ID || '');
        if (id.indexOf(prefix + '-') === 0) {
          const last = Number(id.split('-').pop());
          if (!isNaN(last) && last > current) current = last;
        }
      });

      const next = current + 1;
      properties.setProperty(propertyKey, String(next));
      return prefix + '-' + String(next).padStart(4, '0');
    } finally {
      lock.releaseLock();
    }
  },

  getMyRequests(user) {
    try {
      const rows = DataService.getRows(APP_CONFIG.SHEETS.REQUESTS).filter(function(row) {
        return String(row.REQUESTER_ID) === String(user.USER_ID);
      });
      return Utils.jsonSuccess(this.enrichRows_(rows).sort(this.sortNewest_));
    } catch (err) {
      return Utils.jsonError(err.message);
    }
  },

  getAllRequests(user) {
    try {
      let rows = DataService.getRows(APP_CONFIG.SHEETS.REQUESTS);

      if (user.ROLE === APP_CONFIG.ROLES.TECHNICIAN) {
        rows = rows.filter(function(row) {
          const status = String(row.STATUS_CODE || '').toUpperCase();
          const assignedToMe = String(row.ASSIGNED_TO || '') === String(user.USER_ID);
          const openUnassigned = !row.ASSIGNED_TO && [APP_CONFIG.STATUS.NEW, APP_CONFIG.STATUS.RECEIVED].indexOf(status) !== -1;
          return assignedToMe || openUnassigned;
        });
      }

      return Utils.jsonSuccess(this.enrichRows_(rows).sort(this.sortNewest_));
    } catch (err) {
      return Utils.jsonError(err.message);
    }
  },

  enrichRows_(rows) {
    const userMap = MasterService.getUserNameMap();

    return rows.map(function(row) {
      const copy = Object.assign({}, row);
      copy.ASSIGNED_TO_NAME = copy.ASSIGNED_TO ? (userMap[String(copy.ASSIGNED_TO)] || copy.ASSIGNED_TO) : '';
      return ProgressService.enrich(copy);
    });
  },

  sortNewest_(a, b) {
    const first = new Date(a.UPDATED_AT || a.CREATED_AT || a.REQUEST_DATE).getTime() || 0;
    const second = new Date(b.UPDATED_AT || b.CREATED_AT || b.REQUEST_DATE).getTime() || 0;
    return second - first;
  },

  addStatusLog(log) {
    DataService.appendRow(APP_CONFIG.SHEETS.REQUEST_STATUS_LOG, {
      LOG_ID: Utils.uuid('LOG'),
      REQUEST_ID: log.REQUEST_ID,
      OLD_STATUS_CODE: log.OLD_STATUS_CODE || '',
      NEW_STATUS_CODE: log.NEW_STATUS_CODE || '',
      ACTION_BY: log.ACTION_BY || '',
      ACTION_NAME: log.ACTION_NAME || '',
      ACTION_DATE: Utils.now(),
      NOTE: log.NOTE || ''
    });
  }
};
