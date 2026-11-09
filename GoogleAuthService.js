/**
 * Facility Repair System (FRS)
 * GoogleAuthService.gs
 * Version 2.3.03
 */

const GoogleAuthService = {
  authorizationUrl(flow) {
    const cfg = SocialAuthConfig.google();
    if (!cfg.clientId || !cfg.clientSecret) throw new Error('Google Login ยังไม่ได้ตั้งค่า Client ID/Secret');

    const params = {
      client_id: cfg.clientId,
      redirect_uri: SocialAuthConfig.getWebAppUrl(),
      response_type: 'code',
      scope: 'openid email profile',
      state: flow.state,
      nonce: flow.nonce,
      prompt: 'select_account'
    };

    if (cfg.allowedHd.length === 1) params.hd = cfg.allowedHd[0];
    return 'https://accounts.google.com/o/oauth2/v2/auth?' + Utils.encodeQuery(params);
  },

  exchangeAndVerify(code, stateRow) {
    const cfg = SocialAuthConfig.google();
    const response = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
      method: 'post',
      contentType: 'application/x-www-form-urlencoded',
      payload: {
        code: String(code || ''),
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        redirect_uri: SocialAuthConfig.getWebAppUrl(),
        grant_type: 'authorization_code'
      },
      muteHttpExceptions: true
    });

    const status = response.getResponseCode();
    const token = Utils.safeParseJson(response.getContentText(), {});
    if (status < 200 || status >= 300 || !token.id_token) {
      throw new Error('Google Token Exchange ไม่สำเร็จ: ' + (token.error_description || token.error || status));
    }

    const verifyResponse = UrlFetchApp.fetch(
      'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token.id_token),
      { muteHttpExceptions: true }
    );
    const claims = Utils.safeParseJson(verifyResponse.getContentText(), {});
    if (verifyResponse.getResponseCode() !== 200 || claims.error_description || claims.error) {
      throw new Error('ตรวจสอบ Google ID Token ไม่สำเร็จ');
    }

    const issuer = String(claims.iss || '');
    if (['https://accounts.google.com', 'accounts.google.com'].indexOf(issuer) === -1) {
      throw new Error('Google issuer ไม่ถูกต้อง');
    }
    if (String(claims.aud || '') !== String(cfg.clientId)) throw new Error('Google audience ไม่ถูกต้อง');
    if (!claims.sub) throw new Error('Google ID Token ไม่มี subject');
    if (Number(claims.exp || 0) * 1000 <= new Date().getTime()) throw new Error('Google ID Token หมดอายุ');
    if (!Utils.constantTimeEquals(String(claims.nonce || ''), String(stateRow.NONCE || ''))) {
      throw new Error('Google nonce ไม่ถูกต้อง');
    }

    if (cfg.allowedHd.length > 0) {
      const hd = String(claims.hd || '').toLowerCase();
      if (!hd || cfg.allowedHd.indexOf(hd) === -1) throw new Error('Google Workspace Domain นี้ไม่ได้รับอนุญาต');
    }

    return {
      provider: APP_CONFIG.IDENTITY_PROVIDERS.GOOGLE,
      providerSub: String(claims.sub),
      email: String(claims.email || '').trim().toLowerCase(),
      emailVerified: String(claims.email_verified || '').toLowerCase() === 'true',
      displayName: Utils.normalizeText(claims.name, 200),
      profileImageUrl: Utils.normalizeText(claims.picture, 1000),
      hostedDomain: Utils.normalizeText(claims.hd, 200)
    };
  }
};
