/**
 * Facility Repair System (FRS)
 * SocialAuthService.gs
 * Version 2.3.03
 */

const SocialAuthService = {
  begin(provider, intent, user, returnTab) {
    try {
      if (!APP_CONFIG.SOCIAL_AUTH_ENABLED) throw new Error('Social Login ถูกปิดใช้งาน');
      const normalizedProvider = Utils.normalizeProvider(provider);
      const normalizedIntent = String(intent || 'LOGIN').trim().toUpperCase();
      const linkUserId = normalizedIntent === 'LINK' ? (user && user.USER_ID) : '';
      const flow = OAuthStateService.create(normalizedProvider, normalizedIntent, linkUserId, returnTab);

      let url = '';
      if (normalizedProvider === APP_CONFIG.IDENTITY_PROVIDERS.GOOGLE) {
        url = GoogleAuthService.authorizationUrl(flow);
      } else if (normalizedProvider === APP_CONFIG.IDENTITY_PROVIDERS.LINE) {
        url = LineAuthService.authorizationUrl(flow);
      } else {
        throw new Error('Provider ไม่ถูกต้อง');
      }

      return Utils.jsonSuccess({ url: url }, 'กำลังเปิดหน้าตรวจสอบตัวตน');
    } catch (err) {
      return Utils.jsonError(err.message);
    }
  },

  handleCallback(e) {
    const params = (e && e.parameter) || {};
    let result;
    let stateRow = null;

    try {
      stateRow = OAuthStateService.consume(params.state);
      if (params.error) {
        throw new Error('ผู้ใช้ยกเลิกหรือ Provider ปฏิเสธการเข้าสู่ระบบ: ' +
          Utils.normalizeText(params.error_description || params.error, 500));
      }
      if (!params.code) throw new Error('ไม่พบ Authorization Code');

      let profile;
      if (String(stateRow.PROVIDER).toUpperCase() === APP_CONFIG.IDENTITY_PROVIDERS.GOOGLE) {
        profile = GoogleAuthService.exchangeAndVerify(params.code, stateRow);
      } else if (String(stateRow.PROVIDER).toUpperCase() === APP_CONFIG.IDENTITY_PROVIDERS.LINE) {
        profile = LineAuthService.exchangeAndVerify(params.code, stateRow);
      } else {
        throw new Error('Provider ใน OAuth state ไม่ถูกต้อง');
      }

      if (String(stateRow.INTENT).toUpperCase() === 'LINK') {
        result = this.processLink_(stateRow, profile);
      } else {
        result = this.processLogin_(profile);
      }
    } catch (err) {
      result = {
        action: 'ERROR',
        message: err.message || 'Social Login ไม่สำเร็จ',
        returnTab: stateRow && stateRow.RETURN_TAB ? stateRow.RETURN_TAB : 'login'
      };
    }

    return this.renderResult_(result);
  },

  processLogin_(profile) {
    const identityAny = IdentityService.findAny(profile.provider, profile.providerSub);
    if (identityAny && !Utils.isActive(identityAny.STATUS)) {
      throw new Error('บัญชีภายนอกนี้เคยถูกยกเลิกการเชื่อม กรุณาเข้าสู่ระบบเดิมหรือแจ้งผู้ดูแลระบบ');
    }
    const identity = identityAny;
    if (identity) {
      const user = DataService.findOne(APP_CONFIG.SHEETS.USERS, 'USER_ID', identity.USER_ID);
      const session = AuthService.createSessionForIdentity(user, profile.provider, 'OAuth Callback');
      IdentityService.touch(identity.IDENTITY_ID, profile);
      return {
        action: 'LOGIN_SUCCESS',
        token: session.token,
        message: 'เข้าสู่ระบบด้วย ' + profile.provider + ' สำเร็จ',
        returnTab: 'dashboard'
      };
    }

    if (profile.email && DataService.getRows(APP_CONFIG.SHEETS.USERS).some(function(user) {
      return String(user.EMAIL || '').trim().toLowerCase() === String(profile.email).toLowerCase();
    })) {
      throw new Error('อีเมลนี้มีบัญชี FRS อยู่แล้ว กรุณาเข้าสู่ระบบด้วย Username/Password แล้วเชื่อมบัญชีจากหน้าโปรไฟล์');
    }

    const draft = RegistrationService.createSocialDraft(profile);
    if (draft.pending) {
      return {
        action: 'REGISTRATION_PENDING',
        message: draft.message,
        registrationId: draft.registrationId,
        returnTab: 'login'
      };
    }

    return {
      action: 'REGISTRATION_REQUIRED',
      message: 'ยืนยันตัวตนสำเร็จ กรุณากรอกข้อมูลเพิ่มเติมเพื่อส่งคำขอสมัครสมาชิก',
      registrationToken: draft.registrationToken,
      registrationId: draft.registrationId,
      profile: draft.profile,
      returnTab: 'registerSocial'
    };
  },

  processLink_(stateRow, profile) {
    const user = DataService.findOne(APP_CONFIG.SHEETS.USERS, 'USER_ID', stateRow.LINK_USER_ID);
    if (!user || !Utils.isActive(user.STATUS)) throw new Error('ไม่พบผู้ใช้สำหรับเชื่อมบัญชี');

    const existing = IdentityService.find(profile.provider, profile.providerSub);
    if (existing && String(existing.USER_ID) !== String(user.USER_ID)) {
      throw new Error('บัญชีนี้เชื่อมกับผู้ใช้อื่นอยู่แล้ว');
    }

    IdentityService.link(user.USER_ID, profile);
    return {
      action: 'LINK_SUCCESS',
      message: 'เชื่อมบัญชี ' + profile.provider + ' เรียบร้อยแล้ว',
      returnTab: stateRow.RETURN_TAB || 'profile'
    };
  },

  renderResult_(result) {
    const baseUrl = SocialAuthConfig.getWebAppUrl();
    const payload = {
      action: result.action || 'ERROR',
      message: result.message || '',
      returnTab: result.returnTab || 'login',
      registrationId: result.registrationId || '',
      profile: result.profile || null,
      token: result.token || '',
      registrationToken: result.registrationToken || ''
    };

    let storageScript = '';
    if (result.token) {
      storageScript += 'sessionStorage.setItem("FRS_SESSION_TOKEN", ' + Utils.safeJsonForHtml(result.token) + ');';
    }
    if (result.registrationToken) {
      payload.registrationToken = result.registrationToken;
      storageScript += 'sessionStorage.setItem("FRS_REGISTRATION_CONTEXT", JSON.stringify(result));';
    }
    storageScript += 'sessionStorage.setItem("FRS_OAUTH_RESULT", JSON.stringify(result));';

    const title = result.action === 'ERROR'
      ? 'ไม่สามารถเข้าสู่ระบบได้'
      : result.action === 'REGISTRATION_PENDING'
        ? 'ส่งคำขอเรียบร้อยแล้ว'
        : result.action === 'REGISTRATION_REQUIRED'
          ? 'ยืนยันตัวตนสำเร็จ'
          : 'ดำเนินการเรียบร้อย';

    const html = '<!doctype html><html lang="th"><head><meta charset="utf-8">' +
      '<base target="_top">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>FRS Authentication</title><style>' +
      'body{margin:0;padding:20px;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;background:#f5f7fb;color:#0f172a;display:grid;place-items:center;min-height:100vh;box-sizing:border-box}' +
      '.card{width:min(100%,420px);background:white;border:1px solid #e2e8f0;border-radius:22px;padding:28px;text-align:center;box-shadow:0 18px 45px rgba(15,23,42,.12)}' +
      '.icon{width:52px;height:52px;margin:0 auto 16px;border-radius:50%;display:grid;place-items:center;background:#eff6ff;color:#2563eb;font-size:26px;font-weight:900}' +
      'h1{font-size:20px;margin:0 0 10px}p{margin:0 0 20px;color:#64748b;line-height:1.6;white-space:pre-wrap}' +
      '.btn{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 20px;border-radius:12px;background:#2563eb;color:white;text-decoration:none;font-weight:800;box-shadow:0 8px 18px rgba(37,99,235,.22)}' +
      '.hint{margin-top:14px;font-size:12px;color:#94a3b8}' +
      '</style></head><body><div class="card"><div class="icon">✓</div>' +
      '<h1 id="resultTitle"></h1><p id="resultMessage"></p>' +
      '<a id="continueLink" class="btn" href="#">กลับเข้าสู่ระบบ FRS</a>' +
      '<div class="hint">กรุณากดปุ่มเพื่อกลับเข้าสู่หน้าหลักอย่างปลอดภัย</div></div>' +
      '<script>const result=' + Utils.safeJsonForHtml(payload) + ';' +
      'const baseUrl=' + Utils.safeJsonForHtml(baseUrl) + ';' +
      'try{' + storageScript + '}catch(e){}' +
      'document.getElementById("resultTitle").textContent=' + Utils.safeJsonForHtml(title) + ';' +
      'document.getElementById("resultMessage").textContent=result.message||"";' +
      'const fallbackUrl=baseUrl+"#frs_oauth="+encodeURIComponent(JSON.stringify(result));' +
      'const continueLink=document.getElementById("continueLink");' +
      'continueLink.href=fallbackUrl;' +
      'continueLink.addEventListener("click",function(event){' +
      'try{if(window.opener&&!window.opener.closed){event.preventDefault();' +
      'window.opener.postMessage({type:"FRS_OAUTH_CALLBACK",result:result},"*");' +
      'window.opener.focus();setTimeout(function(){window.close();},250);}}catch(e){}});' +
      '<\/script></body></html>';

    return HtmlService.createHtmlOutput(html)
      .setTitle('FRS Authentication')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
};
