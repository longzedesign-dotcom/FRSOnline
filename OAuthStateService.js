/**
 * Facility Repair System (FRS)
 * OAuthStateService.gs
 * Version 2.3.03
 */

const OAuthStateService = {
  create(provider, intent, linkUserId, returnTab) {
    this.cleanup();

    const normalizedProvider = Utils.normalizeProvider(provider);
    if ([APP_CONFIG.IDENTITY_PROVIDERS.GOOGLE, APP_CONFIG.IDENTITY_PROVIDERS.LINE].indexOf(normalizedProvider) === -1) {
      throw new Error('ผู้ให้บริการเข้าสู่ระบบไม่ถูกต้อง');
    }

    const normalizedIntent = String(intent || 'LOGIN').trim().toUpperCase();
    if (['LOGIN', 'LINK'].indexOf(normalizedIntent) === -1) throw new Error('OAuth intent ไม่ถูกต้อง');
    if (normalizedIntent === 'LINK' && !linkUserId) throw new Error('ไม่พบผู้ใช้สำหรับเชื่อมบัญชี');

    // LINE recommends an alphanumeric state value. Use 96 hexadecimal characters.
    const stateRandom = Utils.sha256(Utils.randomUrlSafeToken());
    const stateSignature = Utils.hmacSha256Hex(stateRandom, SocialAuthConfig.signingSecret()).slice(0, 32);
    const state = stateRandom + stateSignature;
    const nonce = Utils.sha256(Utils.randomUrlSafeToken() + ':' + Utils.uuid());
    const codeVerifier = Utils.randomPkceVerifier();
    if (codeVerifier.length < 43 || codeVerifier.length > 128) {
      throw new Error('PKCE code_verifier มีความยาวไม่ถูกต้อง');
    }
    const now = Utils.now();
    const expiresAt = new Date(now.getTime() + APP_CONFIG.OAUTH_STATE_EXPIRE_SECONDS * 1000);

    DataService.appendRow(APP_CONFIG.SHEETS.OAUTH_STATE_STORE, {
      STATE_HASH: Utils.sha256(state),
      PROVIDER: normalizedProvider,
      NONCE: nonce,
      CODE_VERIFIER: codeVerifier,
      INTENT: normalizedIntent,
      LINK_USER_ID: linkUserId || '',
      RETURN_TAB: Utils.normalizeText(returnTab || 'profile', 40),
      CREATED_AT: now,
      EXPIRES_AT: expiresAt,
      USED_AT: '',
      STATUS: 'ACTIVE'
    });

    return {
      state: state,
      nonce: nonce,
      codeVerifier: codeVerifier,
      provider: normalizedProvider,
      intent: normalizedIntent
    };
  },

  consume(state) {
    const value = String(state || '').trim();
    if (!/^[a-f0-9]{96}$/i.test(value)) throw new Error('OAuth state ไม่ถูกต้อง');

    const random = value.slice(0, 64);
    const signature = value.slice(64);
    const expected = Utils.hmacSha256Hex(random, SocialAuthConfig.signingSecret()).slice(0, 32);
    if (!Utils.constantTimeEquals(signature, expected)) throw new Error('OAuth state signature ไม่ถูกต้อง');

    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      const stateHash = Utils.sha256(value);
      const row = DataService.findOne(APP_CONFIG.SHEETS.OAUTH_STATE_STORE, 'STATE_HASH', stateHash);
      if (!row) throw new Error('ไม่พบ OAuth state หรือรายการหมดอายุแล้ว');
      if (String(row.STATUS || '').toUpperCase() !== 'ACTIVE') throw new Error('OAuth state ถูกใช้งานแล้ว');
      if (Utils.isExpired(row.EXPIRES_AT)) {
        DataService.updateRowByKey(APP_CONFIG.SHEETS.OAUTH_STATE_STORE, 'STATE_HASH', stateHash, {
          STATUS: 'EXPIRED', USED_AT: Utils.now()
        });
        throw new Error('OAuth state หมดอายุ กรุณาเริ่มเข้าสู่ระบบใหม่');
      }

      DataService.updateRowByKey(APP_CONFIG.SHEETS.OAUTH_STATE_STORE, 'STATE_HASH', stateHash, {
        STATUS: 'USED', USED_AT: Utils.now()
      });
      return row;
    } finally {
      lock.releaseLock();
    }
  },

  cleanup() {
    try {
      const cutoff = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);
      return DataService.deleteRowsWhere(APP_CONFIG.SHEETS.OAUTH_STATE_STORE, function(row) {
        const expires = new Date(row.EXPIRES_AT || 0);
        const used = new Date(row.USED_AT || 0);
        return (expires.getTime() && expires.getTime() < cutoff.getTime()) ||
          (used.getTime() && used.getTime() < cutoff.getTime());
      });
    } catch (err) {
      return 0;
    }
  }
};
