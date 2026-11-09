/**
 * Facility Repair System (FRS)
 * Session.gs
 * Version 2.3.03
 *
 * ใช้ CacheService เพื่อความเร็ว และ SESSION_STORE เพื่อคงสถานะ/เพิกถอน Session
 */

const SessionService = {
  create(user) {
    this.cleanupExpired();

    const token = Utils.secureToken('SESS');
    const tokenHash = Utils.sha256(token);
    const now = Utils.now();
    const expiresAt = new Date(now.getTime() + APP_CONFIG.SESSION_EXPIRE_SECONDS * 1000);
    const sessionUser = this.toSessionUser_(user);
    const cachePayload = {
      user: sessionUser,
      expiresAt: expiresAt.toISOString()
    };

    DataService.appendRow(APP_CONFIG.SHEETS.SESSION_STORE, {
      SESSION_HASH: tokenHash,
      USER_ID: user.USER_ID,
      SESSION_JSON: JSON.stringify(sessionUser),
      CREATED_AT: now,
      EXPIRES_AT: expiresAt,
      LAST_ACCESSED_AT: now,
      STATUS: 'ACTIVE'
    });

    CacheService.getScriptCache().put(
      APP_CONFIG.SESSION_CACHE_PREFIX + tokenHash,
      JSON.stringify(cachePayload),
      Math.min(APP_CONFIG.SESSION_EXPIRE_SECONDS, 21600)
    );

    return {
      token: token,
      user: sessionUser,
      expiresIn: APP_CONFIG.SESSION_EXPIRE_SECONDS,
      expiresAt: expiresAt
    };
  },

  get(token) {
    if (!token) return null;

    const tokenHash = Utils.sha256(token);
    const cacheKey = APP_CONFIG.SESSION_CACHE_PREFIX + tokenHash;
    const cache = CacheService.getScriptCache();
    const cached = Utils.safeParseJson(cache.get(cacheKey), null);
    let sessionUser = null;
    let expiresAt = null;

    if (cached && cached.user && cached.expiresAt && !Utils.isExpired(cached.expiresAt)) {
      sessionUser = cached.user;
      expiresAt = cached.expiresAt;
    } else {
      const stored = DataService.findOne(APP_CONFIG.SHEETS.SESSION_STORE, 'SESSION_HASH', tokenHash);
      if (!stored || String(stored.STATUS).toUpperCase() !== 'ACTIVE' || Utils.isExpired(stored.EXPIRES_AT)) {
        cache.remove(cacheKey);
        return null;
      }

      sessionUser = Utils.safeParseJson(stored.SESSION_JSON, null);
      expiresAt = new Date(stored.EXPIRES_AT).toISOString();
      if (!sessionUser) return null;

      const remaining = Math.floor((new Date(expiresAt).getTime() - new Date().getTime()) / 1000);
      if (remaining > 0) {
        cache.put(cacheKey, JSON.stringify({ user: sessionUser, expiresAt: expiresAt }), Math.min(remaining, 21600));
      }
    }

    // ตรวจสถานะบัญชีทุกครั้ง เพื่อให้การปิดบัญชีมีผลทันที
    const currentUser = DataService.findOne(APP_CONFIG.SHEETS.USERS, 'USER_ID', sessionUser.USER_ID);
    if (!currentUser || !Utils.isActive(currentUser.STATUS)) {
      this.destroy(token);
      return null;
    }

    return this.toSessionUser_(currentUser);
  },

  destroy(token) {
    if (token) {
      const tokenHash = Utils.sha256(token);
      CacheService.getScriptCache().remove(APP_CONFIG.SESSION_CACHE_PREFIX + tokenHash);
      DataService.updateRowByKey(APP_CONFIG.SHEETS.SESSION_STORE, 'SESSION_HASH', tokenHash, {
        STATUS: 'REVOKED',
        LAST_ACCESSED_AT: Utils.now()
      });
    }

    return Utils.jsonSuccess(null, 'ออกจากระบบเรียบร้อย');
  },

  cleanupExpired() {
    try {
      return DataService.deleteRowsWhere(APP_CONFIG.SHEETS.SESSION_STORE, function(row) {
        return String(row.STATUS).toUpperCase() !== 'ACTIVE' || Utils.isExpired(row.EXPIRES_AT);
      });
    } catch (err) {
      return 0;
    }
  },

  toSessionUser_(user) {
    return {
      USER_ID: user.USER_ID,
      USERNAME: user.USERNAME,
      FULL_NAME: user.FULL_NAME,
      EMAIL: user.EMAIL,
      PHONE: user.PHONE,
      DIVISION: user.DIVISION,
      DEPARTMENT: user.DEPARTMENT,
      ROLE: String(user.ROLE || '').toUpperCase()
    };
  }
};
