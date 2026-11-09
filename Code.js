/**
 * Facility Repair System (FRS)
 * Code.gs
 * Version 2.3.03
 */

function doGet(e) {
  const params = (e && e.parameter) || {};
  if (params.state && (params.code || params.error)) {
    return SocialAuthService.handleCallback(e);
  }

  const template = HtmlService.createTemplateFromFile('index');
  template.appName = APP_CONFIG.APP_NAME;
  template.appVersion = APP_CONFIG.APP_VERSION;

  return template.evaluate()
    .setTitle(APP_CONFIG.APP_NAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function apiGetPublicRegistrationData() {
  return RegistrationService.publicMasterData();
}

function apiBeginSocialAuth(provider, intent, token, returnTab) {
  const normalizedIntent = String(intent || 'LOGIN').trim().toUpperCase();
  const user = normalizedIntent === 'LINK' ? AuthService.requireLogin(token) : null;
  return SocialAuthService.begin(provider, normalizedIntent, user, returnTab);
}

function apiRegisterPassword(payload) {
  return RegistrationService.registerPassword(payload);
}

function apiCompleteSocialRegistration(registrationToken, payload) {
  return RegistrationService.completeSocialRegistration(registrationToken, payload);
}

function apiGetLinkedIdentities(token) {
  const user = AuthService.requireLogin(token);
  return Utils.jsonSuccess(IdentityService.listForUser(user.USER_ID));
}

function apiUnlinkIdentity(token, identityId) {
  const user = AuthService.requireLogin(token);
  try {
    IdentityService.unlink(user.USER_ID, identityId);
    return Utils.jsonSuccess(null, 'ยกเลิกการเชื่อมบัญชีเรียบร้อย');
  } catch (err) {
    return Utils.jsonError(err.message);
  }
}

function apiGetPendingRegistrations(token) {
  AuthService.requireRole(token, [APP_CONFIG.ROLES.ADMIN, APP_CONFIG.ROLES.MANAGER]);
  return RegistrationService.listPending();
}

function apiApproveRegistration(token, payload) {
  const user = AuthService.requireRole(token, [APP_CONFIG.ROLES.ADMIN, APP_CONFIG.ROLES.MANAGER]);
  return RegistrationService.approve(user, payload);
}

function apiRejectRegistration(token, payload) {
  const user = AuthService.requireRole(token, [APP_CONFIG.ROLES.ADMIN, APP_CONFIG.ROLES.MANAGER]);
  return RegistrationService.reject(user, payload);
}

function apiLogin(payload) {
  return AuthService.login(payload);
}

function apiLogout(token) {
  return SessionService.destroy(token);
}

function apiGetCurrentUser(token) {
  return AuthService.getCurrentUser(token);
}

function apiBootstrap(token) {
  const user = AuthService.requireLogin(token);
  return BootstrapService.get(user);
}

function apiGetDashboard(token) {
  const user = AuthService.requireLogin(token);
  return DashboardService.getDashboard(user);
}

function apiGetMasterData(token) {
  AuthService.requireLogin(token);
  return MasterService.getAllMasterData();
}

function apiCreateRequest(token, payload) {
  const user = AuthService.requireLogin(token);
  return RequestService.createRequest(user, payload);
}

function apiGetMyRequests(token) {
  const user = AuthService.requireLogin(token);
  return RequestService.getMyRequests(user);
}

function apiGetAllRequests(token) {
  const user = AuthService.requireRole(token, [
    APP_CONFIG.ROLES.ADMIN,
    APP_CONFIG.ROLES.TECHNICIAN,
    APP_CONFIG.ROLES.MANAGER
  ]);
  return RequestService.getAllRequests(user);
}

function apiGetRequestDetail(token, requestId) {
  const user = AuthService.requireLogin(token);
  return WorkflowService.getRequestDetail(user, requestId);
}

function apiReceiveRequest(token, payload) {
  const user = AuthService.requireRole(token, [APP_CONFIG.ROLES.ADMIN, APP_CONFIG.ROLES.MANAGER]);
  return WorkflowService.receiveRequest(user, payload);
}

function apiClaimRequest(token, payload) {
  const user = AuthService.requireRole(token, APP_CONFIG.ROLES.TECHNICIAN);
  return WorkflowService.claimRequest(user, payload);
}

function apiAssignRequest(token, payload) {
  const user = AuthService.requireRole(token, [
    APP_CONFIG.ROLES.ADMIN,
    APP_CONFIG.ROLES.TECHNICIAN,
    APP_CONFIG.ROLES.MANAGER
  ]);
  return WorkflowService.assignRequest(user, payload);
}

function apiStartRequest(token, payload) {
  const user = AuthService.requireRole(token, [
    APP_CONFIG.ROLES.ADMIN,
    APP_CONFIG.ROLES.TECHNICIAN,
    APP_CONFIG.ROLES.MANAGER
  ]);
  return WorkflowService.startRequest(user, payload);
}

function apiSetWorkStatus(token, payload) {
  const user = AuthService.requireRole(token, [
    APP_CONFIG.ROLES.ADMIN,
    APP_CONFIG.ROLES.TECHNICIAN,
    APP_CONFIG.ROLES.MANAGER
  ]);
  return WorkflowService.setWorkStatus(user, payload);
}

function apiCompleteRequest(token, payload) {
  const user = AuthService.requireRole(token, [
    APP_CONFIG.ROLES.ADMIN,
    APP_CONFIG.ROLES.TECHNICIAN,
    APP_CONFIG.ROLES.MANAGER
  ]);
  return WorkflowService.completeRequest(user, payload);
}

function apiCloseRequest(token, payload) {
  const user = AuthService.requireRole(token, [APP_CONFIG.ROLES.ADMIN, APP_CONFIG.ROLES.MANAGER]);
  return WorkflowService.closeRequest(user, payload);
}

function apiCancelRequest(token, payload) {
  const user = AuthService.requireRole(token, [APP_CONFIG.ROLES.ADMIN, APP_CONFIG.ROLES.MANAGER]);
  return WorkflowService.cancelRequest(user, payload);
}
