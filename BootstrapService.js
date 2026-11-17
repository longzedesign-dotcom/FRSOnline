/**
 * Facility Repair System (FRS)
 * BootstrapService.gs
 * Version 2.3.03
 *
 * Returns the minimum data required for the first authenticated screen in one
 * Apps Script execution. The full request queue is intentionally deferred until
 * the user opens the queue tab.
 */

const BootstrapService = {
  get(user) {
    try {
      const master = MasterService.buildAllMasterData_();
      const dashboard = DashboardService.buildDashboard_(user, {
        latestLimit: (APP_CONFIG.UX && APP_CONFIG.UX.BOOTSTRAP_LATEST_LIMIT) || 8
      });
      const role = String(user.ROLE || '').toUpperCase();

      // Ensure user has valid standard EMPLOYEE_ID (E0001 - E9999)
      if (!user.EMPLOYEE_ID || !Utils.isValidEmployeeId(user.EMPLOYEE_ID)) {
        const fixedMap = {
          'admin': 'E0001',
          'user01': 'E0002',
          'tech01': 'E0003',
          'tech02': 'E0004',
          'manager01': 'E0005',
          'chaloemporn.th': 'E0006'
        };
        const username = String(user.USERNAME || '').trim().toLowerCase();
        const assigned = fixedMap[username] || RegistrationService.getNextEmployeeId_();
        try {
          DataService.updateRowByKey(APP_CONFIG.SHEETS.USERS, 'USER_ID', user.USER_ID, {
            EMPLOYEE_ID: assigned,
            UPDATED_AT: Utils.now()
          });
          user.EMPLOYEE_ID = assigned;
        } catch (_) {}
      }

      return Utils.jsonSuccess({
        user: user,
        master: master,
        dashboard: dashboard,
        permissions: {
          canApproveRegistrations: [APP_CONFIG.ROLES.ADMIN, APP_CONFIG.ROLES.MANAGER].indexOf(role) !== -1,
          canViewAllRequests: [APP_CONFIG.ROLES.ADMIN, APP_CONFIG.ROLES.MANAGER, APP_CONFIG.ROLES.TECHNICIAN].indexOf(role) !== -1,
          canManageWorkflow: [APP_CONFIG.ROLES.ADMIN, APP_CONFIG.ROLES.MANAGER, APP_CONFIG.ROLES.TECHNICIAN].indexOf(role) !== -1
        },
        requestListDeferred: true,
        serverTime: Utils.now(),
        version: APP_CONFIG.APP_VERSION
      });
    } catch (err) {
      return Utils.jsonError(err.message);
    }
  }
};
