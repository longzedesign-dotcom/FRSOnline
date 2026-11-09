/**
 * Facility Repair System (FRS)
 * FastUXTestFoundation.gs
 * Version 2.3.03
 *
 * Non-destructive verification for Phase 2 + Phase 3.
 * This function reads production sheets and temporarily writes to Script Cache,
 * but does not create, update, or delete spreadsheet rows.
 */

function verifyFastUxFoundation() {
  const report = {
    version: APP_CONFIG.APP_VERSION,
    checkedAt: Utils.formatDate(new Date()),
    ok: true,
    checks: [],
    diagnosticsBefore: DataService.getDiagnostics(),
    diagnosticsAfter: null
  };

  function addCheck(name, passed, detail) {
    report.checks.push({ name: name, passed: Boolean(passed), detail: detail || '' });
    if (!passed) report.ok = false;
  }

  let idempotencyContext = null;
  try {
    addCheck('Candidate version', APP_CONFIG.APP_VERSION === '2.2.0-alpha.2', APP_CONFIG.APP_VERSION);
    addCheck('Bootstrap API', typeof apiBootstrap === 'function' && typeof BootstrapService === 'object', 'apiBootstrap / BootstrapService');
    addCheck('Reusable data builders',
      typeof MasterService.buildAllMasterData_ === 'function' && typeof DashboardService.buildDashboard_ === 'function',
      'Master + Dashboard builders');

    const activeUser = DataService.getRows(APP_CONFIG.SHEETS.USERS).find(function(row) {
      return Utils.isActive(row.STATUS) && row.USER_ID;
    });
    addCheck('Active user available', Boolean(activeUser), activeUser ? activeUser.USER_ID : 'ไม่พบผู้ใช้ ACTIVE');

    if (activeUser) {
      const safeUser = SessionService.toSessionUser_(activeUser);
      const bootstrap = BootstrapService.get(safeUser);
      const data = bootstrap && bootstrap.data;
      addCheck('Bootstrap response', Boolean(bootstrap && bootstrap.ok && data), bootstrap && bootstrap.message);
      addCheck('Bootstrap master payload', Boolean(data && data.master && Array.isArray(data.master.systems)),
        data && data.master ? 'systems=' + data.master.systems.length : 'ไม่มี master');
      addCheck('Bootstrap dashboard payload', Boolean(data && data.dashboard && data.dashboard.summary && Array.isArray(data.dashboard.latest)),
        data && data.dashboard ? 'latest=' + data.dashboard.latest.length : 'ไม่มี dashboard');
      addCheck('Request list deferred', Boolean(data && data.requestListDeferred === true && data.requests === undefined),
        'ไม่ส่งรายการงานทั้งหมดใน bootstrap');
      addCheck('Permission payload', Boolean(data && data.permissions && typeof data.permissions.canViewAllRequests === 'boolean'),
        data && data.permissions ? JSON.stringify(data.permissions) : 'ไม่มี permissions');

      const clientId = 'VERIFY-' + Utilities.getUuid();
      idempotencyContext = RequestService.beginCreateRequest_(safeUser, clientId);
      let pendingBlocked = false;
      try {
        RequestService.beginCreateRequest_(safeUser, clientId);
      } catch (pendingError) {
        pendingBlocked = /กำลังถูกบันทึก/.test(String(pendingError.message || pendingError));
      }
      addCheck('Duplicate request pending guard', pendingBlocked, pendingBlocked ? 'บล็อกการส่งซ้ำระหว่างประมวลผล' : 'ไม่บล็อก');

      RequestService.completeCreateRequest_(idempotencyContext, 'FRS-VERIFY-NO-WRITE');
      const completed = RequestService.beginCreateRequest_(safeUser, clientId);
      addCheck('Completed idempotency reuse', Boolean(completed && completed.completed && completed.requestId === 'FRS-VERIFY-NO-WRITE'),
        completed ? completed.requestId : 'ไม่พบผลเดิม');
      CacheService.getScriptCache().remove(idempotencyContext.key);
      idempotencyContext = null;
    }

    const indexSource = HtmlService.createHtmlOutputFromFile('index').getContent();
    const scriptSource = HtmlService.createHtmlOutputFromFile('script').getContent();
    addCheck('Searchable select UI', indexSource.indexOf('data-select-filter="SYSTEM_CODE"') !== -1 && indexSource.indexOf('data-select-filter="LOCATION_ID"') !== -1,
      'System / Location search filters');
    addCheck('Request preview UI', indexSource.indexOf('requestPreviewModal') !== -1 && scriptSource.indexOf('showRequestPreview(payload)') !== -1,
      'Preview modal + client method');
    addCheck('Double-submit client guard', scriptSource.indexOf("acquireActionLock('createRequest')") !== -1 && scriptSource.indexOf('pendingRequestClientId') !== -1,
      'Action lock + persistent client request id');
    addCheck('Lazy request queue', scriptSource.indexOf('requestsLoaded: false') !== -1 && scriptSource.indexOf('requestListDeferred') === -1,
      'รายการงานโหลดเมื่อเปิดแท็บ');
    addCheck('Skeleton UI', scriptSource.indexOf('renderRequestListSkeleton') !== -1 && indexSource.indexOf('myRequestList') !== -1,
      'Skeleton list available');
  } catch (err) {
    addCheck('Fast UX verification', false, err.message);
  } finally {
    if (idempotencyContext && idempotencyContext.key) {
      CacheService.getScriptCache().remove(idempotencyContext.key);
    }
    report.diagnosticsAfter = DataService.getDiagnostics();
    const writesBefore = report.diagnosticsBefore.writes || 0;
    const writesAfter = report.diagnosticsAfter.writes || 0;
    addCheck('Verification is non-destructive', writesAfter === writesBefore,
      'sheet writes=' + (writesAfter - writesBefore));
  }

  console.log(JSON.stringify(report, null, 2));
  return report;
}
