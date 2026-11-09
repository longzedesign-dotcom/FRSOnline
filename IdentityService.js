/**
 * Facility Repair System (FRS)
 * IdentityService.gs
 * Version 2.3.03
 */

const IdentityService = {
  findAny(provider, providerSub) {
    const normalizedProvider = Utils.normalizeProvider(provider);
    const subject = String(providerSub || '');
    return DataService.getRows(APP_CONFIG.SHEETS.USER_IDENTITIES).find(function(row) {
      return String(row.PROVIDER || '').toUpperCase() === normalizedProvider &&
        String(row.PROVIDER_SUB || '') === subject;
    }) || null;
  },

  find(provider, providerSub) {
    const row = this.findAny(provider, providerSub);
    return row && Utils.isActive(row.STATUS) ? row : null;
  },

  listForUser(userId) {
    return DataService.getRows(APP_CONFIG.SHEETS.USER_IDENTITIES).filter(function(row) {
      return String(row.USER_ID || '') === String(userId || '') && Utils.isActive(row.STATUS);
    }).map(function(row) {
      return {
        IDENTITY_ID: row.IDENTITY_ID,
        PROVIDER: row.PROVIDER,
        PROVIDER_EMAIL: row.PROVIDER_EMAIL || '',
        EMAIL_VERIFIED: Utils.isActive(row.EMAIL_VERIFIED),
        DISPLAY_NAME: row.DISPLAY_NAME || '',
        PROFILE_IMAGE_URL: row.PROFILE_IMAGE_URL || '',
        LINKED_AT: row.LINKED_AT || '',
        LAST_LOGIN_AT: row.LAST_LOGIN_AT || '',
        STATUS: row.STATUS
      };
    }).sort(function(a, b) {
      return String(a.PROVIDER).localeCompare(String(b.PROVIDER));
    });
  },

  link(userId, profile) {
    const provider = Utils.normalizeProvider(profile.provider);
    const subject = String(profile.providerSub || '');
    if (!userId || !provider || !subject) throw new Error('ข้อมูลสำหรับเชื่อมบัญชีไม่ครบ');

    const existing = this.findAny(provider, subject);
    if (existing && String(existing.USER_ID) !== String(userId)) {
      throw new Error('บัญชีนี้เคยเชื่อมกับผู้ใช้อื่นอยู่แล้ว กรุณาติดต่อผู้ดูแลระบบ');
    }
    if (existing) {
      DataService.updateRowByKey(APP_CONFIG.SHEETS.USER_IDENTITIES, 'IDENTITY_ID', existing.IDENTITY_ID, {
        STATUS: 'ACTIVE',
        UPDATED_AT: Utils.now()
      });
      this.touch(existing.IDENTITY_ID, profile);
      return DataService.findOne(APP_CONFIG.SHEETS.USER_IDENTITIES, 'IDENTITY_ID', existing.IDENTITY_ID) || existing;
    }

    const now = Utils.now();
    const row = {
      IDENTITY_ID: Utils.uuid('IDENTITY'),
      USER_ID: userId,
      PROVIDER: provider,
      PROVIDER_SUB: subject,
      PROVIDER_EMAIL: profile.email || '',
      EMAIL_VERIFIED: Boolean(profile.emailVerified),
      DISPLAY_NAME: profile.displayName || '',
      PROFILE_IMAGE_URL: profile.profileImageUrl || '',
      LINKED_AT: now,
      LAST_LOGIN_AT: now,
      STATUS: 'ACTIVE',
      CREATED_AT: now,
      UPDATED_AT: now
    };
    DataService.appendRow(APP_CONFIG.SHEETS.USER_IDENTITIES, row);
    return row;
  },

  touch(identityId, profile) {
    DataService.updateRowByKey(APP_CONFIG.SHEETS.USER_IDENTITIES, 'IDENTITY_ID', identityId, {
      PROVIDER_EMAIL: profile.email || '',
      EMAIL_VERIFIED: Boolean(profile.emailVerified),
      DISPLAY_NAME: profile.displayName || '',
      PROFILE_IMAGE_URL: profile.profileImageUrl || '',
      LAST_LOGIN_AT: Utils.now(),
      UPDATED_AT: Utils.now()
    });
  },

  seedPasswordIdentities() {
    let created = 0;
    DataService.getRows(APP_CONFIG.SHEETS.USERS).forEach((user) => {
      if (!user.USER_ID || !user.USERNAME || !user.PASSWORD_HASH) return;
      const existing = this.findAny(APP_CONFIG.IDENTITY_PROVIDERS.PASSWORD, String(user.USERNAME).toLowerCase());
      if (existing) {
        if (String(existing.USER_ID) === String(user.USER_ID) && !Utils.isActive(existing.STATUS)) {
          DataService.updateRowByKey(APP_CONFIG.SHEETS.USER_IDENTITIES, 'IDENTITY_ID', existing.IDENTITY_ID, {
            STATUS: 'ACTIVE', UPDATED_AT: Utils.now()
          });
        }
        return;
      }
      const now = Utils.now();
      DataService.appendRow(APP_CONFIG.SHEETS.USER_IDENTITIES, {
        IDENTITY_ID: Utils.uuid('IDENTITY'),
        USER_ID: user.USER_ID,
        PROVIDER: APP_CONFIG.IDENTITY_PROVIDERS.PASSWORD,
        PROVIDER_SUB: String(user.USERNAME).toLowerCase(),
        PROVIDER_EMAIL: user.EMAIL || '',
        EMAIL_VERIFIED: false,
        DISPLAY_NAME: user.FULL_NAME || user.USERNAME,
        PROFILE_IMAGE_URL: '',
        LINKED_AT: now,
        LAST_LOGIN_AT: user.LAST_LOGIN || '',
        STATUS: 'ACTIVE',
        CREATED_AT: now,
        UPDATED_AT: now
      });
      created++;
    });
    return created;
  },

  unlink(userId, identityId) {
    const rows = DataService.getRows(APP_CONFIG.SHEETS.USER_IDENTITIES).filter(function(row) {
      return String(row.USER_ID) === String(userId) && Utils.isActive(row.STATUS);
    });
    const target = rows.find(function(row) { return String(row.IDENTITY_ID) === String(identityId); });
    if (!target) throw new Error('ไม่พบบัญชีที่ต้องการยกเลิกการเชื่อม');
    if (String(target.PROVIDER).toUpperCase() === APP_CONFIG.IDENTITY_PROVIDERS.PASSWORD) {
      throw new Error('ไม่สามารถยกเลิก Username/Password จากหน้านี้ได้');
    }
    if (rows.length <= 1) throw new Error('ต้องมีวิธีเข้าสู่ระบบอย่างน้อยหนึ่งวิธี');

    DataService.updateRowByKey(APP_CONFIG.SHEETS.USER_IDENTITIES, 'IDENTITY_ID', identityId, {
      STATUS: 'DISABLED', UPDATED_AT: Utils.now()
    });
    return true;
  }
};
