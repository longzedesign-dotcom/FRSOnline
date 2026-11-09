/**
 * Facility Repair System (FRS)
 * RegistrationService.gs
 * Version 2.3.03
 */

const RegistrationService = {
  publicMasterData() {
    const status = SocialAuthConfig.publicStatus();
    const departments = status.registrationEnabled
      ? MasterService.getActiveRows(APP_CONFIG.SHEETS.MASTER_DEPARTMENTS, 'ACTIVE').map(function(row) {
          return {
            DEPARTMENT_ID: row.DEPARTMENT_ID,
            DIVISION: row.DIVISION,
            DEPARTMENT: row.DEPARTMENT
          };
        })
      : [];
    return Utils.jsonSuccess({
      config: status,
      departments: departments
    });
  },

  createSocialDraft(profile) {
    if (!APP_CONFIG.REGISTRATION_ENABLED) throw new Error('ระบบสมัครสมาชิกถูกปิดใช้งาน');
    this.cleanupExpiredDrafts();
    const provider = Utils.normalizeProvider(profile.provider);
    if ([APP_CONFIG.IDENTITY_PROVIDERS.GOOGLE, APP_CONFIG.IDENTITY_PROVIDERS.LINE].indexOf(provider) === -1) {
      throw new Error('Provider สำหรับสมัครสมาชิกไม่ถูกต้อง');
    }

    const existingPending = DataService.getRows(APP_CONFIG.SHEETS.REGISTRATION_REQUESTS).find(function(row) {
      return String(row.PROVIDER || '').toUpperCase() === provider &&
        String(row.PROVIDER_SUB || '') === String(profile.providerSub || '') &&
        String(row.APPROVAL_STATUS || '').toUpperCase() === APP_CONFIG.REGISTRATION_STATUS.PENDING;
    });
    if (existingPending) {
      return {
        pending: true,
        registrationId: existingPending.REGISTRATION_ID,
        provider: provider,
        message: 'คำขอสมัครสมาชิกอยู่ระหว่างรอผู้ดูแลระบบอนุมัติ'
      };
    }

    DataService.getRows(APP_CONFIG.SHEETS.REGISTRATION_REQUESTS).filter(function(row) {
      return String(row.PROVIDER || '').toUpperCase() === provider &&
        String(row.PROVIDER_SUB || '') === String(profile.providerSub || '') &&
        String(row.APPROVAL_STATUS || '').toUpperCase() === APP_CONFIG.REGISTRATION_STATUS.DRAFT;
    }).forEach(function(row) {
      DataService.updateRowByKey(APP_CONFIG.SHEETS.REGISTRATION_REQUESTS, 'REGISTRATION_ID', row.REGISTRATION_ID, {
        APPROVAL_STATUS: APP_CONFIG.REGISTRATION_STATUS.CANCELLED,
        UPDATED_AT: Utils.now()
      });
    });

    const rawToken = Utils.secureToken('REG');
    const now = Utils.now();
    const expiresAt = new Date(now.getTime() + APP_CONFIG.REGISTRATION_TOKEN_EXPIRE_SECONDS * 1000);
    const usernameSuggestion = this.suggestUsername_(profile.email, profile.displayName, provider);
    const registrationId = Utils.uuid('REG');

    DataService.appendRow(APP_CONFIG.SHEETS.REGISTRATION_REQUESTS, {
      REGISTRATION_ID: registrationId,
      REGISTRATION_TOKEN_HASH: Utils.sha256(rawToken),
      TOKEN_EXPIRES_AT: expiresAt,
      PROVIDER: provider,
      PROVIDER_SUB: profile.providerSub,
      PROVIDER_EMAIL: profile.email || '',
      EMAIL_VERIFIED: Boolean(profile.emailVerified),
      DISPLAY_NAME: profile.displayName || '',
      PROFILE_IMAGE_URL: profile.profileImageUrl || '',
      USERNAME: usernameSuggestion,
      PASSWORD_HASH: '',
      FULL_NAME: profile.displayName || '',
      PHONE: '',
      EMAIL: profile.email || '',
      DIVISION: '',
      DEPARTMENT: '',
      POSITION: '',
      CONSENT_VERSION: '',
      CONSENT_AT: '',
      REQUESTED_AT: '',
      APPROVAL_STATUS: APP_CONFIG.REGISTRATION_STATUS.DRAFT,
      APPROVED_BY: '',
      APPROVED_AT: '',
      REJECT_REASON: '',
      CREATED_AT: now,
      UPDATED_AT: now
    });

    return {
      pending: false,
      registrationToken: rawToken,
      registrationId: registrationId,
      profile: {
        provider: provider,
        email: profile.email || '',
        emailVerified: Boolean(profile.emailVerified),
        displayName: profile.displayName || '',
        profileImageUrl: profile.profileImageUrl || '',
        usernameSuggestion: usernameSuggestion
      }
    };
  },

  completeSocialRegistration(token, payload) {
    try {
      if (!APP_CONFIG.REGISTRATION_ENABLED) throw new Error('ระบบสมัครสมาชิกถูกปิดใช้งาน');
      const row = this.requireDraftToken_(token);
      const input = this.normalizeRegistrationInput_(payload, false);
      const verifiedProviderEmail = String(row.PROVIDER_EMAIL || '').trim().toLowerCase();
      if (Utils.isActive(row.EMAIL_VERIFIED) && verifiedProviderEmail && input.email !== verifiedProviderEmail) {
        throw new Error('อีเมลต้องตรงกับอีเมลที่ Provider ยืนยันแล้ว');
      }
      this.validateCommon_(input, row.PROVIDER, row.PROVIDER_SUB, row.REGISTRATION_ID);

      DataService.updateRowByKey(APP_CONFIG.SHEETS.REGISTRATION_REQUESTS, 'REGISTRATION_ID', row.REGISTRATION_ID, {
        REGISTRATION_TOKEN_HASH: '',
        TOKEN_EXPIRES_AT: '',
        USERNAME: input.username,
        FULL_NAME: input.fullName,
        PHONE: input.phone,
        EMAIL: input.email,
        DIVISION: input.division,
        DEPARTMENT: input.department,
        POSITION: input.position,
        CONSENT_VERSION: APP_CONFIG.PRIVACY_NOTICE_VERSION,
        CONSENT_AT: Utils.now(),
        REQUESTED_AT: Utils.now(),
        APPROVAL_STATUS: APP_CONFIG.REGISTRATION_STATUS.PENDING,
        UPDATED_AT: Utils.now()
      });

      return Utils.jsonSuccess({ registrationId: row.REGISTRATION_ID }, 'ส่งคำขอสมัครสมาชิกเรียบร้อย กรุณารอผู้ดูแลระบบอนุมัติ');
    } catch (err) {
      return Utils.jsonError(err.message);
    }
  },

  registerPassword(payload) {
    try {
      if (!APP_CONFIG.REGISTRATION_ENABLED) throw new Error('ระบบสมัครสมาชิกถูกปิดใช้งาน');
      const input = this.normalizeRegistrationInput_(payload, true);
      if (input.website) throw new Error('ไม่สามารถส่งคำขอสมัครสมาชิกได้');
      this.checkRateLimit_(input.username + '|' + input.email);
      this.validateCommon_(input, APP_CONFIG.IDENTITY_PROVIDERS.PASSWORD, input.username, '');

      const strength = Utils.validatePasswordStrength(input.password);
      if (!strength.ok) throw new Error('รหัสผ่านต้องมี ' + strength.errors.join(', '));

      const now = Utils.now();
      const registrationId = Utils.uuid('REG');
      DataService.appendRow(APP_CONFIG.SHEETS.REGISTRATION_REQUESTS, {
        REGISTRATION_ID: registrationId,
        REGISTRATION_TOKEN_HASH: '',
        TOKEN_EXPIRES_AT: '',
        PROVIDER: APP_CONFIG.IDENTITY_PROVIDERS.PASSWORD,
        PROVIDER_SUB: input.username,
        PROVIDER_EMAIL: input.email,
        EMAIL_VERIFIED: false,
        DISPLAY_NAME: input.fullName,
        PROFILE_IMAGE_URL: '',
        USERNAME: input.username,
        PASSWORD_HASH: Utils.hashPassword(input.password),
        FULL_NAME: input.fullName,
        PHONE: input.phone,
        EMAIL: input.email,
        DIVISION: input.division,
        DEPARTMENT: input.department,
        POSITION: input.position,
        CONSENT_VERSION: APP_CONFIG.PRIVACY_NOTICE_VERSION,
        CONSENT_AT: now,
        REQUESTED_AT: now,
        APPROVAL_STATUS: APP_CONFIG.REGISTRATION_STATUS.PENDING,
        APPROVED_BY: '',
        APPROVED_AT: '',
        REJECT_REASON: '',
        CREATED_AT: now,
        UPDATED_AT: now
      });

      return Utils.jsonSuccess({ registrationId: registrationId }, 'ส่งคำขอสมัครสมาชิกเรียบร้อย กรุณารอผู้ดูแลระบบอนุมัติ');
    } catch (err) {
      return Utils.jsonError(err.message);
    }
  },

  listPending() {
    try {
      const rows = DataService.getRows(APP_CONFIG.SHEETS.REGISTRATION_REQUESTS).filter(function(row) {
        return String(row.APPROVAL_STATUS || '').toUpperCase() === APP_CONFIG.REGISTRATION_STATUS.PENDING;
      }).sort(function(a, b) {
        return new Date(b.REQUESTED_AT || b.CREATED_AT).getTime() - new Date(a.REQUESTED_AT || a.CREATED_AT).getTime();
      }).map(function(row) {
        const copy = Object.assign({}, row);
        delete copy.REGISTRATION_TOKEN_HASH;
        delete copy.PASSWORD_HASH;
        delete copy.PROVIDER_SUB;
        return copy;
      });
      return Utils.jsonSuccess(rows);
    } catch (err) {
      return Utils.jsonError(err.message);
    }
  },

  approve(adminUser, payload) {
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      const registrationId = Utils.normalizeText(payload && payload.registrationId, 100);
      if (!registrationId) throw new Error('ไม่พบ Registration ID');
      const request = DataService.findOne(APP_CONFIG.SHEETS.REGISTRATION_REQUESTS, 'REGISTRATION_ID', registrationId);
      if (!request || String(request.APPROVAL_STATUS).toUpperCase() !== APP_CONFIG.REGISTRATION_STATUS.PENDING) {
        throw new Error('คำขอนี้ไม่ได้อยู่ในสถานะรออนุมัติ');
      }

      const username = String(request.USERNAME || '').trim().toLowerCase();
      const email = String(request.EMAIL || '').trim().toLowerCase();
      this.assertUnique_(username, email, request.PROVIDER, request.PROVIDER_SUB, registrationId);

      const userId = Utils.uuid('U');
      const now = Utils.now();
      DataService.appendRow(APP_CONFIG.SHEETS.USERS, {
        USER_ID: userId,
        USERNAME: username,
        PASSWORD_HASH: request.PASSWORD_HASH || '',
        FULL_NAME: request.FULL_NAME,
        PHONE: request.PHONE || '',
        EMAIL: email,
        DIVISION: request.DIVISION || '',
        DEPARTMENT: request.DEPARTMENT || '',
        POSITION: request.POSITION || '',
        ROLE: APP_CONFIG.ROLES.USER,
        STATUS: 'ACTIVE',
        FAILED_LOGIN_COUNT: 0,
        LOCKED_UNTIL: '',
        MUST_CHANGE_PASSWORD: false,
        LAST_LOGIN: '',
        PASSWORD_CHANGED_AT: request.PASSWORD_HASH ? now : '',
        CREATED_AT: now,
        UPDATED_AT: now
      });

      IdentityService.link(userId, {
        provider: request.PROVIDER,
        providerSub: request.PROVIDER_SUB || username,
        email: email,
        emailVerified: Utils.isActive(request.EMAIL_VERIFIED),
        displayName: request.FULL_NAME,
        profileImageUrl: request.PROFILE_IMAGE_URL || ''
      });

      DataService.updateRowByKey(APP_CONFIG.SHEETS.REGISTRATION_REQUESTS, 'REGISTRATION_ID', registrationId, {
        APPROVAL_STATUS: APP_CONFIG.REGISTRATION_STATUS.APPROVED,
        APPROVED_BY: adminUser.USER_ID,
        APPROVED_AT: now,
        REGISTRATION_TOKEN_HASH: '',
        TOKEN_EXPIRES_AT: '',
        PASSWORD_HASH: '',
        UPDATED_AT: now
      });

      return Utils.jsonSuccess({ userId: userId, username: username }, 'อนุมัติสมาชิกเรียบร้อย');
    } catch (err) {
      return Utils.jsonError(err.message);
    } finally {
      lock.releaseLock();
    }
  },

  reject(adminUser, payload) {
    try {
      const registrationId = Utils.normalizeText(payload && payload.registrationId, 100);
      const reason = Utils.normalizeText(payload && payload.reason, 1500);
      if (!registrationId || !reason) throw new Error('กรุณาระบุคำขอและเหตุผลการไม่อนุมัติ');
      const request = DataService.findOne(APP_CONFIG.SHEETS.REGISTRATION_REQUESTS, 'REGISTRATION_ID', registrationId);
      if (!request || String(request.APPROVAL_STATUS).toUpperCase() !== APP_CONFIG.REGISTRATION_STATUS.PENDING) {
        throw new Error('คำขอนี้ไม่ได้อยู่ในสถานะรออนุมัติ');
      }
      DataService.updateRowByKey(APP_CONFIG.SHEETS.REGISTRATION_REQUESTS, 'REGISTRATION_ID', registrationId, {
        APPROVAL_STATUS: APP_CONFIG.REGISTRATION_STATUS.REJECTED,
        APPROVED_BY: adminUser.USER_ID,
        APPROVED_AT: Utils.now(),
        REJECT_REASON: reason,
        REGISTRATION_TOKEN_HASH: '',
        TOKEN_EXPIRES_AT: '',
        PASSWORD_HASH: '',
        UPDATED_AT: Utils.now()
      });
      return Utils.jsonSuccess(null, 'บันทึกการไม่อนุมัติเรียบร้อย');
    } catch (err) {
      return Utils.jsonError(err.message);
    }
  },

  requireDraftToken_(token) {
    const hash = Utils.sha256(String(token || ''));
    const row = DataService.findOne(APP_CONFIG.SHEETS.REGISTRATION_REQUESTS, 'REGISTRATION_TOKEN_HASH', hash);
    if (!row || String(row.APPROVAL_STATUS).toUpperCase() !== APP_CONFIG.REGISTRATION_STATUS.DRAFT) {
      throw new Error('Registration Token ไม่ถูกต้องหรือถูกใช้งานแล้ว');
    }
    if (Utils.isExpired(row.TOKEN_EXPIRES_AT)) throw new Error('Registration Token หมดอายุ กรุณาเริ่มสมัครใหม่');
    return row;
  },

  normalizeRegistrationInput_(payload, requirePassword) {
    const input = payload || {};
    return {
      username: Utils.normalizeText(input.username, 80).toLowerCase(),
      password: requirePassword ? String(input.password || '').slice(0, 256) : '',
      fullName: Utils.normalizeText(input.fullName, 200),
      phone: Utils.normalizeThaiPhoneE164(input.phone, true),
      email: Utils.normalizeText(input.email, 200).toLowerCase(),
      division: Utils.normalizeText(input.division, 200),
      department: Utils.normalizeText(input.department, 200),
      position: Utils.normalizeText(input.position, 200),
      website: Utils.normalizeText(input.website, 200),
      consentAccepted: input.consentAccepted === true
    };
  },

  validateCommon_(input, provider, providerSub, excludeRegistrationId) {
    if (input.consentAccepted !== true) throw new Error('กรุณายอมรับเงื่อนไขและนโยบายความเป็นส่วนตัว');
    Utils.requireFields(input, ['username', 'fullName', 'email', 'division', 'department']);
    if (!/^[a-z0-9._-]{4,80}$/.test(input.username)) {
      throw new Error('Username ต้องมี 4-80 ตัว และใช้ a-z, 0-9, จุด, ขีดกลาง หรือขีดล่างเท่านั้น');
    }
    if (!Utils.isValidEmail(input.email)) throw new Error('รูปแบบอีเมลไม่ถูกต้อง');
    if (!AuthService.isAllowedDomain_(input.email)) throw new Error('Email Domain นี้ไม่ได้รับอนุญาต');

    const departmentExists = MasterService.getActiveRows(APP_CONFIG.SHEETS.MASTER_DEPARTMENTS, 'ACTIVE').some(function(row) {
      return String(row.DIVISION || '').trim() === input.division &&
        String(row.DEPARTMENT || '').trim() === input.department;
    });
    if (!departmentExists) throw new Error('ฝ่าย/แผนกไม่ถูกต้องหรือถูกปิดใช้งาน');

    this.assertUnique_(input.username, input.email, provider, providerSub, excludeRegistrationId);
  },

  assertUnique_(username, email, provider, providerSub, excludeRegistrationId) {
    if (DataService.findOneCaseInsensitive(APP_CONFIG.SHEETS.USERS, 'USERNAME', username)) {
      throw new Error('Username นี้มีผู้ใช้งานแล้ว');
    }
    if (DataService.getRows(APP_CONFIG.SHEETS.USERS).some(function(user) {
      return email && String(user.EMAIL || '').trim().toLowerCase() === email;
    })) {
      throw new Error('อีเมลนี้มีบัญชีในระบบแล้ว กรุณาเข้าสู่ระบบเดิมและเชื่อมบัญชีจากหน้าโปรไฟล์');
    }
    if (providerSub && IdentityService.findAny(provider, providerSub)) {
      throw new Error('บัญชีภายนอกนี้เชื่อมกับผู้ใช้ในระบบแล้ว');
    }

    const duplicatePending = DataService.getRows(APP_CONFIG.SHEETS.REGISTRATION_REQUESTS).some(function(row) {
      if (String(row.REGISTRATION_ID) === String(excludeRegistrationId || '')) return false;
      const status = String(row.APPROVAL_STATUS || '').toUpperCase();
      if ([APP_CONFIG.REGISTRATION_STATUS.DRAFT, APP_CONFIG.REGISTRATION_STATUS.PENDING].indexOf(status) === -1) return false;
      return String(row.USERNAME || '').trim().toLowerCase() === username ||
        (email && String(row.EMAIL || '').trim().toLowerCase() === email) ||
        (providerSub && String(row.PROVIDER || '').toUpperCase() === String(provider || '').toUpperCase() &&
          String(row.PROVIDER_SUB || '') === String(providerSub));
    });
    if (duplicatePending) throw new Error('มีคำขอสมัครสมาชิกด้วย Username, Email หรือบัญชีนี้อยู่แล้ว');
  },

  suggestUsername_(email, displayName, provider) {
    let base = String(email || '').split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '');
    if (base.length < 4) base = String(provider || 'user').toLowerCase() + '-' + Utils.sha256(displayName || Utils.uuid()).slice(0, 8);
    base = base.slice(0, 60);
    let candidate = base;
    let counter = 1;
    while (DataService.findOneCaseInsensitive(APP_CONFIG.SHEETS.USERS, 'USERNAME', candidate)) {
      candidate = base.slice(0, 55) + '-' + counter++;
    }
    return candidate;
  },


  cleanupExpiredDrafts() {
    let updated = 0;
    DataService.getRows(APP_CONFIG.SHEETS.REGISTRATION_REQUESTS).forEach(function(row) {
      if (String(row.APPROVAL_STATUS || '').toUpperCase() !== APP_CONFIG.REGISTRATION_STATUS.DRAFT) return;
      if (!Utils.isExpired(row.TOKEN_EXPIRES_AT)) return;
      DataService.updateRowByKey(APP_CONFIG.SHEETS.REGISTRATION_REQUESTS, 'REGISTRATION_ID', row.REGISTRATION_ID, {
        APPROVAL_STATUS: APP_CONFIG.REGISTRATION_STATUS.CANCELLED,
        REGISTRATION_TOKEN_HASH: '',
        TOKEN_EXPIRES_AT: '',
        PASSWORD_HASH: '',
        UPDATED_AT: Utils.now()
      });
      updated++;
    });
    return updated;
  },

  checkRateLimit_(keyValue) {
    const cache = CacheService.getScriptCache();
    const key = 'FRS_REG_RATE_' + Utils.sha256(keyValue).slice(0, 32);
    const count = Utils.toNumber(cache.get(key), 0) + 1;
    if (count > APP_CONFIG.REGISTRATION_RATE_LIMIT_MAX) {
      throw new Error('มีการส่งคำขอสมัครสมาชิกหลายครั้ง กรุณารอสักครู่แล้วลองใหม่');
    }
    cache.put(key, String(count), APP_CONFIG.REGISTRATION_RATE_LIMIT_MINUTES * 60);
  }
};
