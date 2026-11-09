/**
 * Facility Repair System (FRS)
 * LineAuthService.gs
 * Version 2.3.03
 */

const LineAuthService = {
  authorizationUrl(flow) {
    const cfg = SocialAuthConfig.line();
    if (!cfg.channelId || !cfg.channelSecret) throw new Error('LINE Login ยังไม่ได้ตั้งค่า Channel ID/Secret');

    const scopes = ['openid', 'profile'];
    if (cfg.emailScopeEnabled) scopes.push('email');

    return 'https://access.line.me/oauth2/v2.1/authorize?' + Utils.encodeQuery({
      response_type: 'code',
      client_id: cfg.channelId,
      redirect_uri: SocialAuthConfig.getWebAppUrl(),
      state: flow.state,
      scope: scopes.join(' '),
      nonce: flow.nonce,
      code_challenge: Utils.pkceChallenge(flow.codeVerifier),
      code_challenge_method: 'S256'
    });
  },

  exchangeAndVerify(code, stateRow) {
    const cfg = SocialAuthConfig.line();
    const response = UrlFetchApp.fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'post',
      contentType: 'application/x-www-form-urlencoded',
      payload: {
        grant_type: 'authorization_code',
        code: String(code || ''),
        redirect_uri: SocialAuthConfig.getWebAppUrl(),
        client_id: cfg.channelId,
        client_secret: cfg.channelSecret,
        code_verifier: String(stateRow.CODE_VERIFIER || '')
      },
      muteHttpExceptions: true
    });

    const status = response.getResponseCode();
    const token = Utils.safeParseJson(response.getContentText(), {});
    if (status < 200 || status >= 300 || !token.id_token) {
      throw new Error('LINE Token Exchange ไม่สำเร็จ: ' + (token.error_description || token.error || status));
    }

    const verifyResponse = UrlFetchApp.fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'post',
      contentType: 'application/x-www-form-urlencoded',
      payload: {
        id_token: token.id_token,
        client_id: cfg.channelId,
        nonce: String(stateRow.NONCE || '')
      },
      muteHttpExceptions: true
    });
    const claims = Utils.safeParseJson(verifyResponse.getContentText(), {});
    if (verifyResponse.getResponseCode() !== 200 || claims.error_description || claims.error) {
      throw new Error('ตรวจสอบ LINE ID Token ไม่สำเร็จ: ' + (claims.error_description || claims.error || 'invalid token'));
    }
    if (!claims.sub) throw new Error('LINE ID Token ไม่มี subject');
    if (claims.aud && String(claims.aud) !== String(cfg.channelId)) throw new Error('LINE audience ไม่ถูกต้อง');
    if (claims.exp && Number(claims.exp) * 1000 <= new Date().getTime()) throw new Error('LINE ID Token หมดอายุ');

    return {
      provider: APP_CONFIG.IDENTITY_PROVIDERS.LINE,
      providerSub: String(claims.sub),
      email: String(claims.email || '').trim().toLowerCase(),
      emailVerified: Boolean(claims.email),
      displayName: Utils.normalizeText(claims.name, 200),
      profileImageUrl: Utils.normalizeText(claims.picture, 1000),
      hostedDomain: ''
    };
  }
};
