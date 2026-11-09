/**
 * Facility Repair System (FRS)
 * Auth.gs
 * Version 2.3.03
 */

const AuthService = {
  login(payload) {
    const input = payload || {};
    const username = Utils.normalizeText(input.username, 80).toLowerCase();
    const password = String(input.password || '').slice(0, 256);
    const userAgent = Utils.normalizeText(input.userAgent, 500);

    try {
      Utils.requireFields({ username: username, password: password }, ['username', 'password']);

      if (this.isUnknownUserRateLimited_(username)) {
        this.writeAudit_(username, '', false, 'RATE_LIMIT', userAgent);
        return Utils.jsonError('มีการพยายามเข้าสู่ระบบหลายครั้ง กรุณารอสักครู่แล้วลองใหม่');
      }

      const user = DataService.findOneCaseInsensitive(APP_CONFIG.SHEETS.USERS, 'USERNAME', username);

      if (!user) {
        this.bumpUnknownUserRate_(username);
        this.writeAudit_(username, '', false, 'USER_NOT_FOUND', userAgent);
        return Utils.jsonError('Username หรือ Password ไม่ถูกต้อง หรือบัญชีถูกปิดใช้งาน');
      }

      if (!Utils.isActive(user.STATUS)) {
        this.writeAudit_(username, user.USER_ID, false, 'ACCOUNT_INACTIVE', userAgent);
        return Utils.jsonError('Username หรือ Password ไม่ถูกต้อง หรือบัญชีถูกปิดใช้งาน');
      }

      if (user.LOCKED_UNTIL && !Utils.isExpired(user.LOCKED_UNTIL)) {
        this.writeAudit_(username, user.USER_ID, false, 'ACCOUNT_LOCKED', userAgent);
        return Utils.jsonError('บัญชีถูกล็อกชั่วคราว กรุณาลองใหม่ภายหลัง');
      }

      if (!this.isAllowedDomain_(user.EMAIL)) {
        this.writeAudit_(username, user.USER_ID, false, 'DOMAIN_NOT_ALLOWED', userAgent);
        return Utils.jsonError('บัญชีนี้ไม่ได้รับอนุญาตให้เข้าใช้งานระบบ');
      }

      if (!Utils.verifyPassword(password, user.PASSWORD_HASH)) {
        this.handleFailedLogin_(user);
        this.writeAudit_(username, user.USER_ID, false, 'INVALID_PASSWORD', userAgent);
        return Utils.jsonError('Username หรือ Password ไม่ถูกต้อง หรือบัญชีถูกปิดใช้งาน');
      }

      const now = Utils.now();
      DataService.updateRowByKey(APP_CONFIG.SHEETS.USERS, 'USER_ID', user.USER_ID, {
        FAILED_LOGIN_COUNT: 0,
        LOCKED_UNTIL: '',
        LAST_LOGIN: now,
        UPDATED_AT: now
      });

      const refreshedUser = DataService.findOne(APP_CONFIG.SHEETS.USERS, 'USER_ID', user.USER_ID) || user;
      try {
        IdentityService.link(refreshedUser.USER_ID, {
          provider: APP_CONFIG.IDENTITY_PROVIDERS.PASSWORD,
          providerSub: String(refreshedUser.USERNAME || '').toLowerCase(),
          email: refreshedUser.EMAIL || '',
          emailVerified: false,
          displayName: refreshedUser.FULL_NAME || refreshedUser.USERNAME,
          profileImageUrl: ''
        });
      } catch (identityError) {
        console.warn('PASSWORD_IDENTITY_SYNC', identityError.message);
      }
      const session = SessionService.create(refreshedUser);
      this.writeAudit_(username, user.USER_ID, true, 'LOGIN_SUCCESS', userAgent);

      return Utils.jsonSuccess(session, 'เข้าสู่ระบบสำเร็จ');
    } catch (err) {
      this.writeAudit_(username, '', false, 'SYSTEM_ERROR: ' + err.message, userAgent);
      return Utils.jsonError(err.message);
    }
  },

  createSessionForIdentity(user, provider, userAgent) {
    if (!user || !user.USER_ID) throw new Error('ไม่พบผู้ใช้งานที่เชื่อมกับบัญชีนี้');
    if (!Utils.isActive(user.STATUS)) {
      this.writeAudit_(user.USERNAME || '', user.USER_ID, false, provider + '_ACCOUNT_INACTIVE', userAgent || '');
      throw new Error('บัญชี FRS ถูกปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบ');
    }
    if (!this.isAllowedDomain_(user.EMAIL)) {
      this.writeAudit_(user.USERNAME || '', user.USER_ID, false, provider + '_DOMAIN_NOT_ALLOWED', userAgent || '');
      throw new Error('บัญชีนี้ไม่ได้รับอนุญาตให้เข้าใช้งานระบบ');
    }

    const now = Utils.now();
    DataService.updateRowByKey(APP_CONFIG.SHEETS.USERS, 'USER_ID', user.USER_ID, {
      LAST_LOGIN: now,
      UPDATED_AT: now
    });
    const refreshed = DataService.findOne(APP_CONFIG.SHEETS.USERS, 'USER_ID', user.USER_ID) || user;
    const session = SessionService.create(refreshed);
    this.writeAudit_(refreshed.USERNAME || '', refreshed.USER_ID, true, provider + '_LOGIN_SUCCESS', userAgent || '');
    return session;
  },

  getCurrentUser(token) {
    const user = SessionService.get(token);
    if (!user) return Utils.jsonError('Session หมดอายุ กรุณาเข้าสู่ระบบใหม่');
    return Utils.jsonSuccess(user);
  },

  requireLogin(token) {
    const user = SessionService.get(token);
    if (!user) throw new Error('Session หมดอายุ กรุณาเข้าสู่ระบบใหม่');
    return user;
  },

  requireRole(token, roles) {
    const user = this.requireLogin(token);
    const allowed = (Array.isArray(roles) ? roles : [roles]).map(function(role) {
      return String(role).toUpperCase();
    });

    if (allowed.indexOf(String(user.ROLE).toUpperCase()) === -1) {
      throw new Error('สิทธิ์ไม่เพียงพอสำหรับการทำรายการนี้');
    }

    return user;
  },

  handleFailedLogin_(user) {
    const failedCount = Utils.toNumber(user.FAILED_LOGIN_COUNT, 0) + 1;
    const patch = {
      FAILED_LOGIN_COUNT: failedCount,
      UPDATED_AT: Utils.now()
    };

    if (failedCount >= APP_CONFIG.MAX_LOGIN_ATTEMPTS) {
      patch.LOCKED_UNTIL = new Date(new Date().getTime() + APP_CONFIG.LOGIN_LOCK_MINUTES * 60 * 1000);
      patch.FAILED_LOGIN_COUNT = 0;
    }

    DataService.updateRowByKey(APP_CONFIG.SHEETS.USERS, 'USER_ID', user.USER_ID, patch);
  },

  isAllowedDomain_(email) {
    const allowed = APP_CONFIG.ALLOWED_EMAIL_DOMAINS || [];
    if (allowed.length === 0) return true;
    return allowed.map(function(item) { return String(item).toLowerCase(); })
      .indexOf(Utils.getEmailDomain(email)) !== -1;
  },

  rateKey_(username) {
    return 'FRS_LOGIN_RATE_' + Utils.sha256(username).slice(0, 32);
  },

  isUnknownUserRateLimited_(username) {
    const value = CacheService.getScriptCache().get(this.rateKey_(username));
    return Utils.toNumber(value, 0) >= APP_CONFIG.MAX_LOGIN_ATTEMPTS;
  },

  bumpUnknownUserRate_(username) {
    const cache = CacheService.getScriptCache();
    const key = this.rateKey_(username);
    const count = Utils.toNumber(cache.get(key), 0) + 1;
    cache.put(key, String(count), APP_CONFIG.LOGIN_LOCK_MINUTES * 60);
  },

  writeAudit_(username, userId, success, reason, userAgent) {
    try {
      DataService.appendRow(APP_CONFIG.SHEETS.LOGIN_AUDIT, {
        AUDIT_ID: Utils.uuid('LOGIN'),
        USERNAME: username,
        USER_ID: userId || '',
        SUCCESS: Boolean(success),
        REASON: reason || '',
        USER_AGENT: userAgent || '',
        CREATED_AT: Utils.now()
      });
    } catch (err) {
      console.error('LOGIN_AUDIT_ERROR', err);
    }
  }
};
