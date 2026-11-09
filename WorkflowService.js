/**
 * Facility Repair System (FRS)
 * WorkflowService.gs
 * Version 2.3.03
 *
 * Admin/Technician Workflow พร้อม State Transition, RBAC และ Audit Trail
 */

const WorkflowService = {
  getRequestDetail(user, requestId) {
    try {
      const id = Utils.normalizeText(requestId, 50);
      if (!id) throw new Error('ไม่พบเลขแจ้งซ่อม');

      const request = this.getRequest_(id);
      this.assertCanView_(user, request);

      const logs = DataService.getRows(APP_CONFIG.SHEETS.REQUEST_STATUS_LOG).filter(function(log) {
        return String(log.REQUEST_ID) === String(id);
      }).sort(function(a, b) {
        return (new Date(a.ACTION_DATE).getTime() || 0) - (new Date(b.ACTION_DATE).getTime() || 0);
      });

      const assignedUser = request.ASSIGNED_TO ? MasterService.getPublicUser(request.ASSIGNED_TO) : null;
      const detail = ProgressService.enrich(Object.assign({}, request, {
        ASSIGNED_TO_NAME: assignedUser ? assignedUser.FULL_NAME : ''
      }));

      const allowedActions = this.getAllowedActions_(user, request);
      return Utils.jsonSuccess({
        request: detail,
        logs: logs,
        assignedUser: assignedUser ? {
          USER_ID: assignedUser.USER_ID,
          FULL_NAME: assignedUser.FULL_NAME,
          POSITION: assignedUser.POSITION
        } : null,
        technicians: allowedActions.assign ? MasterService.getActiveTechnicians() : [],
        allowedActions: allowedActions
      });
    } catch (err) {
      return Utils.jsonError(err.message);
    }
  },

  receiveRequest(user, payload) {
    return this.runSimpleAction_(user, payload, function(request, input, now) {
      this.assertRole_(user, [APP_CONFIG.ROLES.ADMIN, APP_CONFIG.ROLES.MANAGER]);
      this.assertStatus_(request, [APP_CONFIG.STATUS.NEW], 'รับเรื่อง');
      return {
        patch: {
          STATUS_CODE: APP_CONFIG.STATUS.RECEIVED,
          STATUS_NAME_TH: this.statusName_(APP_CONFIG.STATUS.RECEIVED),
          RECEIVED_DATE: request.RECEIVED_DATE || now,
          UPDATED_AT: now
        },
        newStatus: APP_CONFIG.STATUS.RECEIVED,
        note: Utils.normalizeText(input.NOTE, APP_CONFIG.MAX_WORKFLOW_NOTE_LENGTH) || 'รับเรื่องแจ้งซ่อม'
      };
    });
  },

  claimRequest(user, payload) {
    return this.runSimpleAction_(user, payload, function(request, input, now) {
      this.assertRole_(user, APP_CONFIG.ROLES.TECHNICIAN);
      this.assertStatus_(request, [APP_CONFIG.STATUS.NEW, APP_CONFIG.STATUS.RECEIVED], 'รับงาน');
      if (request.ASSIGNED_TO) throw new Error('งานนี้มีผู้รับผิดชอบแล้ว กรุณาโหลดข้อมูลใหม่');

      return {
        patch: {
          STATUS_CODE: APP_CONFIG.STATUS.ASSIGNED,
          STATUS_NAME_TH: this.statusName_(APP_CONFIG.STATUS.ASSIGNED),
          ASSIGNED_TO: user.USER_ID,
          RECEIVED_DATE: request.RECEIVED_DATE || now,
          UPDATED_AT: now
        },
        newStatus: APP_CONFIG.STATUS.ASSIGNED,
        note: Utils.normalizeText(input.NOTE, APP_CONFIG.MAX_WORKFLOW_NOTE_LENGTH) || 'ช่างรับงานด้วยตนเอง: ' + user.FULL_NAME
      };
    });
  },

  assignRequest(user, payload) {
    return this.runSimpleAction_(user, payload, function(request, input, now) {
      const technicianId = Utils.normalizeText(input.TECHNICIAN_ID, 80);
      if (!technicianId) throw new Error('กรุณาเลือกช่างผู้รับผิดชอบ');

      const target = MasterService.findTechnician(technicianId);
      if (!target) throw new Error('ไม่พบช่างที่เลือก หรือบัญชีถูกปิดใช้งาน');
      if (String(request.ASSIGNED_TO || '') === String(target.USER_ID) &&
          [APP_CONFIG.STATUS.NEW, APP_CONFIG.STATUS.RECEIVED].indexOf(String(request.STATUS_CODE)) === -1) {
        throw new Error('งานนี้มอบหมายให้ช่างคนนี้อยู่แล้ว');
      }

      const role = String(user.ROLE || '').toUpperCase();
      const isAdmin = [APP_CONFIG.ROLES.ADMIN, APP_CONFIG.ROLES.MANAGER].indexOf(role) !== -1;
      const isCurrentTechnician = role === APP_CONFIG.ROLES.TECHNICIAN && String(request.ASSIGNED_TO || '') === String(user.USER_ID);

      if (!isAdmin && !isCurrentTechnician) {
        throw new Error('คุณไม่มีสิทธิ์มอบหมายหรือส่งต่องานนี้');
      }

      this.assertStatus_(request, [
        APP_CONFIG.STATUS.NEW,
        APP_CONFIG.STATUS.RECEIVED,
        APP_CONFIG.STATUS.ASSIGNED,
        APP_CONFIG.STATUS.IN_PROGRESS,
        APP_CONFIG.STATUS.WAITING_PART,
        APP_CONFIG.STATUS.OUTSOURCE
      ], 'มอบหมาย/ส่งต่องาน');

      const oldAssignee = request.ASSIGNED_TO ? MasterService.getPublicUser(request.ASSIGNED_TO) : null;
      let nextStatus = String(request.STATUS_CODE || '');
      if ([APP_CONFIG.STATUS.NEW, APP_CONFIG.STATUS.RECEIVED].indexOf(nextStatus) !== -1) {
        nextStatus = APP_CONFIG.STATUS.ASSIGNED;
      }

      const noteInput = Utils.normalizeText(input.NOTE, APP_CONFIG.MAX_WORKFLOW_NOTE_LENGTH);
      const noteParts = [];
      if (oldAssignee) noteParts.push('จาก ' + oldAssignee.FULL_NAME);
      noteParts.push('ไปยัง ' + target.FULL_NAME);
      if (noteInput) noteParts.push(noteInput);

      return {
        patch: {
          STATUS_CODE: nextStatus,
          STATUS_NAME_TH: this.statusName_(nextStatus),
          ASSIGNED_TO: target.USER_ID,
          RECEIVED_DATE: request.RECEIVED_DATE || now,
          UPDATED_AT: now
        },
        newStatus: nextStatus,
        note: (oldAssignee ? 'ส่งต่องาน ' : 'มอบหมายงาน ') + noteParts.join(' | ')
      };
    });
  },

  startRequest(user, payload) {
    return this.runSimpleAction_(user, payload, function(request, input, now) {
      this.assertCanOperate_(user, request);
      this.assertStatus_(request, [APP_CONFIG.STATUS.ASSIGNED, APP_CONFIG.STATUS.WAITING_PART, APP_CONFIG.STATUS.OUTSOURCE], 'เริ่ม/ดำเนินงานต่อ');

      return {
        patch: {
          STATUS_CODE: APP_CONFIG.STATUS.IN_PROGRESS,
          STATUS_NAME_TH: this.statusName_(APP_CONFIG.STATUS.IN_PROGRESS),
          FIX_START_DATE: request.FIX_START_DATE || now,
          UPDATED_AT: now
        },
        newStatus: APP_CONFIG.STATUS.IN_PROGRESS,
        note: Utils.normalizeText(input.NOTE, APP_CONFIG.MAX_WORKFLOW_NOTE_LENGTH) ||
          (request.STATUS_CODE === APP_CONFIG.STATUS.ASSIGNED ? 'เริ่มดำเนินการ' : 'กลับมาดำเนินการต่อ')
      };
    });
  },

  setWorkStatus(user, payload) {
    return this.runSimpleAction_(user, payload, function(request, input, now) {
      this.assertCanOperate_(user, request);
      this.assertStatus_(request, [APP_CONFIG.STATUS.IN_PROGRESS, APP_CONFIG.STATUS.WAITING_PART, APP_CONFIG.STATUS.OUTSOURCE], 'เปลี่ยนสถานะงาน');

      const targetStatus = Utils.normalizeText(input.STATUS_CODE, 30).toUpperCase();
      if ([APP_CONFIG.STATUS.WAITING_PART, APP_CONFIG.STATUS.OUTSOURCE, APP_CONFIG.STATUS.IN_PROGRESS].indexOf(targetStatus) === -1) {
        throw new Error('สถานะงานที่เลือกไม่ถูกต้อง');
      }
      if (targetStatus === String(request.STATUS_CODE)) throw new Error('งานอยู่ในสถานะนี้แล้ว');

      const note = Utils.normalizeText(input.NOTE, APP_CONFIG.MAX_WORKFLOW_NOTE_LENGTH);
      if ([APP_CONFIG.STATUS.WAITING_PART, APP_CONFIG.STATUS.OUTSOURCE].indexOf(targetStatus) !== -1 && !note) {
        throw new Error('กรุณาระบุรายละเอียดหรือเหตุผล');
      }

      return {
        patch: {
          STATUS_CODE: targetStatus,
          STATUS_NAME_TH: this.statusName_(targetStatus),
          FIX_START_DATE: request.FIX_START_DATE || now,
          UPDATED_AT: now
        },
        newStatus: targetStatus,
        note: note || 'เปลี่ยนสถานะเป็น ' + this.statusName_(targetStatus)
      };
    });
  },

  completeRequest(user, payload) {
    const input = payload || {};
    const uploaded = [];

    try {
      const requestId = Utils.normalizeText(input.REQUEST_ID, 50);
      const solution = Utils.normalizeText(input.SOLUTION_DETAIL, APP_CONFIG.MAX_SOLUTION_LENGTH);
      if (!requestId) throw new Error('ไม่พบเลขแจ้งซ่อม');
      if (!solution) throw new Error('กรุณาระบุวิธีการแก้ไข/ผลการดำเนินงาน');

      const cost = this.parseCost_(input.COST);
      const beforeFile = input.PHOTO_BEFORE_BASE64 ? UploadService.saveBase64Image(input.PHOTO_BEFORE_BASE64, requestId, 'before_fix') : null;
      if (beforeFile) uploaded.push(beforeFile);
      const afterFile = input.PHOTO_AFTER_BASE64 ? UploadService.saveBase64Image(input.PHOTO_AFTER_BASE64, requestId, 'after_fix') : null;
      if (afterFile) uploaded.push(afterFile);

      const result = this.withRequestLock_(requestId, function(request, now) {
        this.assertCanOperate_(user, request);
        this.assertStatus_(request, [APP_CONFIG.STATUS.IN_PROGRESS, APP_CONFIG.STATUS.WAITING_PART, APP_CONFIG.STATUS.OUTSOURCE], 'ดำเนินการเสร็จสิ้น');

        const metrics = this.calculateMetrics_(request, now);
        const patch = {
          STATUS_CODE: APP_CONFIG.STATUS.DONE,
          STATUS_NAME_TH: this.statusName_(APP_CONFIG.STATUS.DONE),
          FIX_START_DATE: request.FIX_START_DATE || now,
          FIX_DONE_DATE: now,
          SOLUTION_DETAIL: solution,
          COST: cost,
          DURATION_HOURS: metrics.durationHours,
          SLA_RESULT: metrics.slaResult,
          UPDATED_AT: now
        };

        if (beforeFile) {
          patch.PHOTO_BEFORE_FIX_FILE_ID = beforeFile.fileId;
          patch.PHOTO_BEFORE_FIX_URL = beforeFile.fileUrl;
        }
        if (afterFile) {
          patch.PHOTO_AFTER_FIX_FILE_ID = afterFile.fileId;
          patch.PHOTO_AFTER_FIX_URL = afterFile.fileUrl;
        }

        const note = Utils.normalizeText(input.NOTE, APP_CONFIG.MAX_WORKFLOW_NOTE_LENGTH);
        this.applyPatchWithLog_(request, patch, user, APP_CONFIG.STATUS.DONE,
          'ดำเนินการแล้วเสร็จ' + (note ? ' | ' + note : ''));
        return this.getRequest_(requestId);
      }.bind(this));

      return Utils.jsonSuccess(result, 'บันทึกผลซ่อมเรียบร้อย รอตรวจสอบและปิดงาน');
    } catch (err) {
      uploaded.forEach(function(file) { UploadService.trashFile(file.fileId); });
      return Utils.jsonError(err.message);
    }
  },

  closeRequest(user, payload) {
    return this.runSimpleAction_(user, payload, function(request, input, now) {
      this.assertRole_(user, [APP_CONFIG.ROLES.ADMIN, APP_CONFIG.ROLES.MANAGER]);
      this.assertStatus_(request, [APP_CONFIG.STATUS.DONE], 'ปิดงาน');

      const endDate = request.FIX_DONE_DATE ? new Date(request.FIX_DONE_DATE) : now;
      const metrics = this.calculateMetrics_(request, endDate);
      return {
        patch: {
          STATUS_CODE: APP_CONFIG.STATUS.CLOSED,
          STATUS_NAME_TH: this.statusName_(APP_CONFIG.STATUS.CLOSED),
          FIX_DONE_DATE: request.FIX_DONE_DATE || now,
          DURATION_HOURS: request.DURATION_HOURS || metrics.durationHours,
          SLA_RESULT: request.SLA_RESULT || metrics.slaResult,
          CLOSED_BY: user.USER_ID,
          UPDATED_AT: now
        },
        newStatus: APP_CONFIG.STATUS.CLOSED,
        note: Utils.normalizeText(input.NOTE, APP_CONFIG.MAX_WORKFLOW_NOTE_LENGTH) || 'ตรวจสอบและปิดงาน'
      };
    });
  },

  cancelRequest(user, payload) {
    return this.runSimpleAction_(user, payload, function(request, input, now) {
      this.assertRole_(user, [APP_CONFIG.ROLES.ADMIN, APP_CONFIG.ROLES.MANAGER]);
      this.assertStatus_(request, [
        APP_CONFIG.STATUS.NEW,
        APP_CONFIG.STATUS.RECEIVED,
        APP_CONFIG.STATUS.ASSIGNED,
        APP_CONFIG.STATUS.IN_PROGRESS,
        APP_CONFIG.STATUS.WAITING_PART,
        APP_CONFIG.STATUS.OUTSOURCE,
        APP_CONFIG.STATUS.DONE
      ], 'ยกเลิกงาน');

      const reason = Utils.normalizeText(input.NOTE, APP_CONFIG.MAX_WORKFLOW_NOTE_LENGTH);
      if (!reason) throw new Error('กรุณาระบุเหตุผลการยกเลิก');

      return {
        patch: {
          STATUS_CODE: APP_CONFIG.STATUS.CANCELLED,
          STATUS_NAME_TH: this.statusName_(APP_CONFIG.STATUS.CANCELLED),
          UPDATED_AT: now
        },
        newStatus: APP_CONFIG.STATUS.CANCELLED,
        note: 'ยกเลิกงาน: ' + reason
      };
    });
  },

  runSimpleAction_(user, payload, builder) {
    try {
      const input = payload || {};
      const requestId = Utils.normalizeText(input.REQUEST_ID, 50);
      if (!requestId) throw new Error('ไม่พบเลขแจ้งซ่อม');

      const updated = this.withRequestLock_(requestId, function(request, now) {
        const action = builder.call(this, request, input, now);
        this.applyPatchWithLog_(request, action.patch, user, action.newStatus, action.note);
        return this.getRequest_(requestId);
      }.bind(this));

      return Utils.jsonSuccess(updated, 'ดำเนินการเรียบร้อย');
    } catch (err) {
      return Utils.jsonError(err.message);
    }
  },

  withRequestLock_(requestId, callback) {
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      const request = this.getRequest_(requestId);
      return callback(request, Utils.now());
    } finally {
      lock.releaseLock();
    }
  },

  applyPatchWithLog_(request, patch, user, newStatus, note) {
    const oldStatus = String(request.STATUS_CODE || '');
    const rollback = {};
    Object.keys(patch).forEach(function(key) {
      rollback[key] = request[key] === undefined ? '' : request[key];
    });

    const updated = DataService.updateRowByKey(APP_CONFIG.SHEETS.REQUESTS, 'REQUEST_ID', request.REQUEST_ID, patch);
    if (!updated) throw new Error('ไม่พบรายการแจ้งซ่อม กรุณาโหลดข้อมูลใหม่');

    try {
      RequestService.addStatusLog({
        REQUEST_ID: request.REQUEST_ID,
        OLD_STATUS_CODE: oldStatus,
        NEW_STATUS_CODE: newStatus,
        ACTION_BY: user.USER_ID,
        ACTION_NAME: user.FULL_NAME,
        NOTE: note || ''
      });
    } catch (err) {
      DataService.updateRowByKey(APP_CONFIG.SHEETS.REQUESTS, 'REQUEST_ID', request.REQUEST_ID, rollback);
      throw new Error('บันทึกประวัติสถานะไม่สำเร็จ ระบบยกเลิกการเปลี่ยนแปลงแล้ว: ' + err.message);
    }
  },

  getRequest_(requestId) {
    const request = DataService.findOne(APP_CONFIG.SHEETS.REQUESTS, 'REQUEST_ID', requestId);
    if (!request) throw new Error('ไม่พบรายการแจ้งซ่อม: ' + requestId);
    return request;
  },

  assertCanView_(user, request) {
    const role = String(user.ROLE || '').toUpperCase();
    if ([APP_CONFIG.ROLES.ADMIN, APP_CONFIG.ROLES.MANAGER].indexOf(role) !== -1) return;

    if (role === APP_CONFIG.ROLES.USER && String(request.REQUESTER_ID) === String(user.USER_ID)) return;

    if (role === APP_CONFIG.ROLES.TECHNICIAN) {
      const assignedToMe = String(request.ASSIGNED_TO || '') === String(user.USER_ID);
      const openUnassigned = !request.ASSIGNED_TO && [APP_CONFIG.STATUS.NEW, APP_CONFIG.STATUS.RECEIVED].indexOf(String(request.STATUS_CODE)) !== -1;
      if (assignedToMe || openUnassigned) return;
    }

    throw new Error('คุณไม่มีสิทธิ์เปิดดูรายการนี้');
  },

  assertCanOperate_(user, request) {
    const role = String(user.ROLE || '').toUpperCase();
    if ([APP_CONFIG.ROLES.ADMIN, APP_CONFIG.ROLES.MANAGER].indexOf(role) !== -1) return;

    if (role === APP_CONFIG.ROLES.TECHNICIAN && String(request.ASSIGNED_TO || '') === String(user.USER_ID)) return;

    throw new Error('เฉพาะช่างผู้รับผิดชอบ หรือผู้ดูแลระบบเท่านั้นที่ดำเนินงานนี้ได้');
  },

  assertRole_(user, roles) {
    const allowed = (Array.isArray(roles) ? roles : [roles]).map(function(role) {
      return String(role).toUpperCase();
    });
    if (allowed.indexOf(String(user.ROLE || '').toUpperCase()) === -1) {
      throw new Error('สิทธิ์ไม่เพียงพอสำหรับการทำรายการนี้');
    }
  },

  assertStatus_(request, allowedStatuses, actionName) {
    const current = String(request.STATUS_CODE || '').toUpperCase();
    if (allowedStatuses.indexOf(current) === -1) {
      throw new Error('ไม่สามารถ' + actionName + 'ได้ เนื่องจากสถานะปัจจุบันคือ ' + (request.STATUS_NAME_TH || current));
    }
  },

  statusName_(statusCode) {
    const status = MasterService.findStatus(statusCode);
    if (!status) throw new Error('ไม่พบ Master Status: ' + statusCode);
    return status.STATUS_NAME_TH;
  },

  parseCost_(value) {
    if (value === '' || value === null || value === undefined) return 0;
    const cost = Number(String(value).replace(/,/g, ''));
    if (!isFinite(cost) || cost < 0) throw new Error('ค่าใช้จ่ายต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป');
    if (cost > APP_CONFIG.MAX_COST) throw new Error('ค่าใช้จ่ายเกินขอบเขตที่ระบบกำหนด');
    return Math.round(cost * 100) / 100;
  },

  calculateMetrics_(request, endDate) {
    const requestDate = new Date(request.REQUEST_DATE || request.CREATED_AT);
    const startDate = new Date(request.FIX_START_DATE || request.RECEIVED_DATE || request.REQUEST_DATE || request.CREATED_AT);
    const end = new Date(endDate || new Date());
    const durationHours = (!isNaN(startDate.getTime()) && !isNaN(end.getTime()))
      ? Math.max(0, Math.round(((end.getTime() - startDate.getTime()) / 3600000) * 100) / 100)
      : '';

    const slaHours = Utils.toNumber(request.SLA_HOURS, 0);
    const elapsedFromRequest = (!isNaN(requestDate.getTime()) && !isNaN(end.getTime()))
      ? (end.getTime() - requestDate.getTime()) / 3600000
      : 0;
    const slaResult = slaHours > 0 && elapsedFromRequest > slaHours ? 'เกิน SLA' : 'อยู่ใน SLA';

    return { durationHours: durationHours, slaResult: slaResult };
  },

  getAllowedActions_(user, request) {
    const role = String(user.ROLE || '').toUpperCase();
    const status = String(request.STATUS_CODE || '').toUpperCase();
    const isAdmin = [APP_CONFIG.ROLES.ADMIN, APP_CONFIG.ROLES.MANAGER].indexOf(role) !== -1;
    const isTechnician = role === APP_CONFIG.ROLES.TECHNICIAN;
    const assignedToMe = String(request.ASSIGNED_TO || '') === String(user.USER_ID);
    const canOperate = isAdmin || (isTechnician && assignedToMe);
    const openStatuses = [
      APP_CONFIG.STATUS.NEW,
      APP_CONFIG.STATUS.RECEIVED,
      APP_CONFIG.STATUS.ASSIGNED,
      APP_CONFIG.STATUS.IN_PROGRESS,
      APP_CONFIG.STATUS.WAITING_PART,
      APP_CONFIG.STATUS.OUTSOURCE
    ];

    return {
      receive: isAdmin && status === APP_CONFIG.STATUS.NEW,
      claim: isTechnician && !request.ASSIGNED_TO && [APP_CONFIG.STATUS.NEW, APP_CONFIG.STATUS.RECEIVED].indexOf(status) !== -1,
      assign: (isAdmin && openStatuses.indexOf(status) !== -1) ||
        (isTechnician && assignedToMe && [APP_CONFIG.STATUS.ASSIGNED, APP_CONFIG.STATUS.IN_PROGRESS, APP_CONFIG.STATUS.WAITING_PART, APP_CONFIG.STATUS.OUTSOURCE].indexOf(status) !== -1),
      start: canOperate && [APP_CONFIG.STATUS.ASSIGNED, APP_CONFIG.STATUS.WAITING_PART, APP_CONFIG.STATUS.OUTSOURCE].indexOf(status) !== -1,
      waitingPart: canOperate && status === APP_CONFIG.STATUS.IN_PROGRESS,
      outsource: canOperate && status === APP_CONFIG.STATUS.IN_PROGRESS,
      resume: canOperate && [APP_CONFIG.STATUS.WAITING_PART, APP_CONFIG.STATUS.OUTSOURCE].indexOf(status) !== -1,
      complete: canOperate && [APP_CONFIG.STATUS.IN_PROGRESS, APP_CONFIG.STATUS.WAITING_PART, APP_CONFIG.STATUS.OUTSOURCE].indexOf(status) !== -1,
      close: isAdmin && status === APP_CONFIG.STATUS.DONE,
      cancel: isAdmin && [APP_CONFIG.STATUS.CLOSED, APP_CONFIG.STATUS.CANCELLED].indexOf(status) === -1
    };
  }
};
