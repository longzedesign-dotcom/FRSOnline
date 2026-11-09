/**
 * Facility Repair System (FRS)
 * DashboardService.gs
 * Version 2.3.03
 *
 * Dashboard summary is aggregated in one pass after role scoping.
 * buildDashboard_() is reusable by the bootstrap endpoint so the client can
 * receive the initial dashboard without an additional Apps Script round-trip.
 */

const DashboardService = {
  getDashboard(user) {
    try {
      return Utils.jsonSuccess(this.buildDashboard_(user));
    } catch (err) {
      return Utils.jsonError(err.message);
    }
  },

  buildDashboard_(user, options) {
    const opts = options || {};
    const configuredLimit = APP_CONFIG.UX && APP_CONFIG.UX.BOOTSTRAP_LATEST_LIMIT;
    const latestLimit = Math.max(1, Math.min(20, Utils.toNumber(opts.latestLimit, configuredLimit || 10)));
    const all = DataService.getRows(APP_CONFIG.SHEETS.REQUESTS);
    const scoped = [];
    const summary = this.emptySummary_();
    const role = String(user.ROLE || '').toUpperCase();
    const alertRequestIds = Object.create(null);

    all.forEach(function(row) {
      if (!DashboardService.canViewInDashboard_(user, role, row)) return;

      scoped.push(row);
      summary.total++;

      const requestId = String(row.REQUEST_ID || '');
      const status = String(row.STATUS_CODE || '').toUpperCase();
      const summaryField = DashboardService.statusSummaryField_(status);
      if (summaryField) summary[summaryField]++;

      const isCritical = String(row.PRIORITY_CODE || '').toUpperCase() === 'CRITICAL';
      if (isCritical) {
        summary.critical++;
        if (requestId) alertRequestIds[requestId] = true;
      }

      const slaResult = String(row.SLA_RESULT || '').trim();
      if (slaResult === 'เกิน SLA') {
        summary.overSla++;
        summary.slaEvaluated++;
        if (requestId) alertRequestIds[requestId] = true;
      } else if (slaResult === 'อยู่ใน SLA') {
        summary.withinSla++;
        summary.slaEvaluated++;
      }

      const cost = Utils.toNumber(row.COST, 0);
      if (cost > 0) summary.totalCost += cost;
    });

    summary.alertCount = Object.keys(alertRequestIds).length;
    summary.slaCompliance = summary.slaEvaluated > 0
      ? Math.round((summary.withinSla / summary.slaEvaluated) * 100)
      : null;

    const visibleRequestIds = Object.create(null);
    scoped.forEach(function(row) {
      visibleRequestIds[String(row.REQUEST_ID || '')] = true;
    });

    // One log read powers both activity feed and accurate dashboard milestone dates.
    const visibleLogs = DataService.getRows(APP_CONFIG.SHEETS.REQUEST_STATUS_LOG)
      .filter(function(log) {
        return Boolean(visibleRequestIds[String(log.REQUEST_ID || '')]);
      });

    const workflowDatesByRequest = Object.create(null);
    visibleLogs
      .slice()
      .sort(function(a, b) {
        const first = new Date(a.ACTION_DATE || '').getTime() || 0;
        const second = new Date(b.ACTION_DATE || '').getTime() || 0;
        return first - second;
      })
      .forEach(function(log) {
        const requestId = String(log.REQUEST_ID || '');
        const status = String(log.NEW_STATUS_CODE || '').toUpperCase();
        if (!requestId || !status) return;
        if (!workflowDatesByRequest[requestId]) workflowDatesByRequest[requestId] = {};
        // Keep the first transition timestamp for each milestone.
        if (!workflowDatesByRequest[requestId][status] && log.ACTION_DATE) {
          workflowDatesByRequest[requestId][status] = log.ACTION_DATE;
        }
      });

    const latest = RequestService.enrichRows_(scoped)
      .sort(RequestService.sortNewest_)
      .slice(0, latestLimit)
      .map(function(row) {
        const copy = Object.assign({}, row);
        copy.WORKFLOW_DATES = Object.assign({}, workflowDatesByRequest[String(row.REQUEST_ID || '')] || {});
        return copy;
      });

    const activities = visibleLogs
      .slice()
      .sort(function(a, b) {
        const first = new Date(a.ACTION_DATE || '').getTime() || 0;
        const second = new Date(b.ACTION_DATE || '').getTime() || 0;
        return second - first;
      })
      .slice(0, 5)
      .map(function(log) {
        return {
          LOG_ID: log.LOG_ID || '',
          REQUEST_ID: log.REQUEST_ID || '',
          NEW_STATUS_CODE: log.NEW_STATUS_CODE || '',
          ACTION_NAME: log.ACTION_NAME || log.ACTION_BY || '',
          ACTION_DATE: log.ACTION_DATE || '',
          NOTE: log.NOTE || ''
        };
      });

    return {
      user: user,
      summary: summary,
      latest: latest,
      activities: activities,
      latestLimit: latestLimit,
      generatedAt: Utils.now()
    };
  },

  emptySummary_() {
    return {
      total: 0,
      new: 0,
      received: 0,
      assigned: 0,
      inProgress: 0,
      waitingPart: 0,
      outsource: 0,
      done: 0,
      closed: 0,
      cancelled: 0,
      critical: 0,
      overSla: 0,
      withinSla: 0,
      slaEvaluated: 0,
      slaCompliance: null,
      totalCost: 0,
      alertCount: 0
    };
  },

  canViewInDashboard_(user, role, row) {
    if (role === APP_CONFIG.ROLES.USER) {
      return String(row.REQUESTER_ID) === String(user.USER_ID);
    }

    if (role === APP_CONFIG.ROLES.TECHNICIAN) {
      const status = String(row.STATUS_CODE || '').toUpperCase();
      const assignedToMe = String(row.ASSIGNED_TO || '') === String(user.USER_ID);
      const openUnassigned = !row.ASSIGNED_TO && [APP_CONFIG.STATUS.NEW, APP_CONFIG.STATUS.RECEIVED].indexOf(status) !== -1;
      return assignedToMe || openUnassigned;
    }

    return true;
  },

  statusSummaryField_(statusCode) {
    switch (String(statusCode || '').toUpperCase()) {
      case APP_CONFIG.STATUS.NEW: return 'new';
      case APP_CONFIG.STATUS.RECEIVED: return 'received';
      case APP_CONFIG.STATUS.ASSIGNED: return 'assigned';
      case APP_CONFIG.STATUS.IN_PROGRESS: return 'inProgress';
      case APP_CONFIG.STATUS.WAITING_PART: return 'waitingPart';
      case APP_CONFIG.STATUS.OUTSOURCE: return 'outsource';
      case APP_CONFIG.STATUS.DONE: return 'done';
      case APP_CONFIG.STATUS.CLOSED: return 'closed';
      case APP_CONFIG.STATUS.CANCELLED: return 'cancelled';
      default: return '';
    }
  }
};
