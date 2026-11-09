/**
 * Facility Repair System (FRS)
 * PerformanceTestFoundation.gs
 * Version 2.3.03
 *
 * Non-destructive verification for Phase 1 + Phase 5 foundation.
 * Run verifyPerformanceFoundation() from the Apps Script editor after installing
 * the candidate in a copied project.
 */

function verifyPerformanceFoundation() {
  const report = {
    version: APP_CONFIG.APP_VERSION,
    checkedAt: Utils.formatDate(new Date()),
    ok: true,
    checks: [],
    diagnostics: null
  };

  function addCheck(name, passed, detail) {
    report.checks.push({ name: name, passed: Boolean(passed), detail: detail || '' });
    if (!passed) report.ok = false;
  }

  try {
    const performanceConfig = APP_CONFIG.PERFORMANCE || {};
    const cacheableSheets = DataService._cacheableSheets_();
    addCheck('Candidate version', ['2.1.0', '2.2.0-alpha.1', '2.2.0-alpha.2'].indexOf(APP_CONFIG.APP_VERSION) !== -1, APP_CONFIG.APP_VERSION);
    addCheck('Performance config', Boolean(APP_CONFIG.PERFORMANCE),
      APP_CONFIG.PERFORMANCE ? 'พบ PERFORMANCE config' : 'ใช้ค่า Default จาก DataService');
    addCheck('Master cache enabled', performanceConfig.ENABLE_SCRIPT_CACHE !== false,
      'TTL ' + (performanceConfig.MASTER_CACHE_SECONDS || 300) + ' วินาที');
    addCheck('Cacheable master sheets', cacheableSheets.length >= 5,
      cacheableSheets.join(', '));

    addCheck('DataService runtime cache API',
      typeof DataService.getRowsCached === 'function' &&
      typeof DataService.findOneCached === 'function' &&
      typeof DataService.invalidate === 'function' &&
      typeof DataService.getDiagnostics === 'function',
      'API พร้อมใช้งาน');

    DataService.resetRuntimeForTest_();

    const before = DataService.getDiagnostics();
    const systemsFirst = MasterService.getActiveRows(APP_CONFIG.SHEETS.MASTER_SYSTEMS, 'ACTIVE');
    const afterFirst = DataService.getDiagnostics();
    const systemsSecond = MasterService.getActiveRows(APP_CONFIG.SHEETS.MASTER_SYSTEMS, 'ACTIVE');
    const afterSecond = DataService.getDiagnostics();

    addCheck('Master data readable', systemsFirst.length > 0, 'จำนวน ' + systemsFirst.length);
    addCheck('Runtime row cache hit',
      afterSecond.sheetReads === afterFirst.sheetReads && afterSecond.runtimeRowHits > afterFirst.runtimeRowHits,
      'sheetReads ' + afterFirst.sheetReads + ' → ' + afterSecond.sheetReads +
      ', runtimeHits ' + afterFirst.runtimeRowHits + ' → ' + afterSecond.runtimeRowHits);
    addCheck('Master result stable', systemsFirst.length === systemsSecond.length,
      systemsFirst.length + ' / ' + systemsSecond.length);

    const sampleCode = systemsFirst[0] && systemsFirst[0].SYSTEM_CODE;
    const beforeIndex = DataService.getDiagnostics();
    const lookup1 = sampleCode ? MasterService.findSystem(sampleCode) : null;
    const afterIndex1 = DataService.getDiagnostics();
    const lookup2 = sampleCode ? MasterService.findSystem(sampleCode) : null;
    const afterIndex2 = DataService.getDiagnostics();

    addCheck('Master index lookup', Boolean(lookup1 && lookup2), sampleCode || 'ไม่มีข้อมูลตัวอย่าง');
    addCheck('Runtime index reused',
      afterIndex2.indexBuilds === afterIndex1.indexBuilds && afterIndex2.indexHits > afterIndex1.indexHits,
      'indexBuilds ' + afterIndex1.indexBuilds + ' → ' + afterIndex2.indexBuilds +
      ', indexHits ' + afterIndex1.indexHits + ' → ' + afterIndex2.indexHits);

    const statusMappings = [
      [APP_CONFIG.STATUS.NEW, 'new'],
      [APP_CONFIG.STATUS.RECEIVED, 'received'],
      [APP_CONFIG.STATUS.ASSIGNED, 'assigned'],
      [APP_CONFIG.STATUS.IN_PROGRESS, 'inProgress'],
      [APP_CONFIG.STATUS.WAITING_PART, 'waitingPart'],
      [APP_CONFIG.STATUS.OUTSOURCE, 'outsource'],
      [APP_CONFIG.STATUS.DONE, 'done'],
      [APP_CONFIG.STATUS.CLOSED, 'closed'],
      [APP_CONFIG.STATUS.CANCELLED, 'cancelled']
    ];
    const badMapping = statusMappings.filter(function(item) {
      return DashboardService.statusSummaryField_(item[0]) !== item[1];
    });
    addCheck('Dashboard status map', badMapping.length === 0,
      badMapping.length ? 'ผิด: ' + JSON.stringify(badMapping) : 'ครบ 9 สถานะ');

    const requiredApis = [
      ['apiLogin', typeof apiLogin === 'function'],
      ['apiGetCurrentUser', typeof apiGetCurrentUser === 'function'],
      ['apiBootstrap', typeof apiBootstrap === 'function'],
      ['apiGetDashboard', typeof apiGetDashboard === 'function'],
      ['apiGetMasterData', typeof apiGetMasterData === 'function'],
      ['apiCreateRequest', typeof apiCreateRequest === 'function'],
      ['apiGetMyRequests', typeof apiGetMyRequests === 'function'],
      ['apiGetAllRequests', typeof apiGetAllRequests === 'function'],
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
    const missingApis = requiredApis.filter(function(item) {
      return !item[1];
    }).map(function(item) { return item[0]; });
    addCheck('Core API regression', missingApis.length === 0,
      missingApis.length ? 'ขาด: ' + missingApis.join(', ') : 'ครบ');

    const finalDiagnostics = DataService.getDiagnostics();
    addCheck('Verification is non-destructive', finalDiagnostics.writes === before.writes,
      'writes = ' + (finalDiagnostics.writes - before.writes));
    report.diagnostics = finalDiagnostics;
  } catch (err) {
    addCheck('Performance foundation verification', false, err.message);
  }

  console.log(JSON.stringify(report, null, 2));
  return report;
}


/** Clear execution and master Script Cache after manually editing master sheets. */
function clearPerformanceCaches() {
  DataService.invalidateAll();
  return {
    success: true,
    message: 'ล้าง Performance Cache เรียบร้อย',
    version: APP_CONFIG.APP_VERSION,
    clearedAt: Utils.formatDate(new Date())
  };
}

/** Return counters for the current Apps Script execution. */
function getPerformanceDiagnostics() {
  return DataService.getDiagnostics();
}
