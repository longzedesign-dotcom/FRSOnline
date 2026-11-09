/**
 * Facility Repair System (FRS)
 * Utils.gs
 * Version 2.3.03
 */

const Utils = {
  now() {
    return new Date();
  },

  formatDate(date, pattern) {
    if (!date) return '';
    return Utilities.formatDate(new Date(date), APP_CONFIG.TIMEZONE, pattern || 'yyyy-MM-dd HH:mm:ss');
  },

  uuid(prefix) {
    const id = Utilities.getUuid();
    return prefix ? prefix + '-' + id : id;
  },

  secureToken(prefix) {
    const raw = [
      Utilities.getUuid(),
      Utilities.getUuid(),
      String(new Date().getTime()),
      String(Math.random())
    ].join(':');
    const token = this.sha256(raw) + this.sha256(raw.split('').reverse().join(''));
    return prefix ? prefix + '-' + token : token;
  },

  sha256(text) {
    const rawHash = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      String(text),
      Utilities.Charset.UTF_8
    );

    return rawHash.map(function(byte) {
      const value = byte < 0 ? byte + 256 : byte;
      return ('0' + value.toString(16)).slice(-2);
    }).join('');
  },

  generateSalt() {
    return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 16);
  },

  hashPassword(password, salt, iterations) {
    const rounds = Number(iterations || APP_CONFIG.PASSWORD_HASH_ITERATIONS);
    const passwordSalt = salt || this.generateSalt();
    let digest = passwordSalt + ':' + String(password);

    for (let i = 0; i < rounds; i++) {
      digest = this.sha256(digest);
    }

    return ['v2', rounds, passwordSalt, digest].join('$');
  },

  verifyPassword(password, storedHash) {
    const value = String(storedHash || '');

    if (/^[a-f0-9]{64}$/i.test(value)) {
      // รองรับ Hash เดิมของ FRS v1.1 เพื่อให้ Upgrade ได้
      return this.constantTimeEquals(this.sha256(password), value.toLowerCase());
    }

    const parts = value.split('$');
    if (parts.length !== 4 || parts[0] !== 'v2') return false;

    const rounds = Number(parts[1]);
    if (!rounds || rounds < 1 || rounds > 50000) return false;

    const calculated = this.hashPassword(password, parts[2], rounds);
    return this.constantTimeEquals(calculated, value);
  },

  constantTimeEquals(a, b) {
    const first = String(a || '');
    const second = String(b || '');
    let mismatch = first.length ^ second.length;
    const length = Math.max(first.length, second.length);

    for (let i = 0; i < length; i++) {
      mismatch |= (first.charCodeAt(i) || 0) ^ (second.charCodeAt(i) || 0);
    }

    return mismatch === 0;
  },

  jsonSuccess(data, message) {
    return {
      ok: true,
      message: message || 'success',
      data: this.serializeForClient(data)
    };
  },

  jsonError(message, details) {
    return {
      ok: false,
      message: message || 'เกิดข้อผิดพลาด',
      details: this.serializeForClient(details === undefined ? null : details)
    };
  },

  serializeForClient(value) {
    if (value === null || value === undefined) return value === undefined ? null : value;

    if (Object.prototype.toString.call(value) === '[object Date]') {
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date.toISOString();
    }

    if (Array.isArray(value)) {
      return value.map(this.serializeForClient.bind(this));
    }

    if (typeof value === 'object') {
      const output = {};
      Object.keys(value).forEach(function(key) {
        if (key === '_rowNumber') return;
        const item = value[key];
        if (typeof item !== 'function') output[key] = Utils.serializeForClient(item);
      });
      return output;
    }

    return value;
  },

  normalizeText(value, maxLength) {
    const text = String(value || '').trim();
    return maxLength ? text.slice(0, maxLength) : text;
  },

  requireFields(payload, fields) {
    const source = payload || {};
    const missing = [];

    fields.forEach(function(field) {
      if (source[field] === undefined || source[field] === null || String(source[field]).trim() === '') {
        missing.push(field);
      }
    });

    if (missing.length > 0) {
      throw new Error('กรุณากรอกข้อมูลให้ครบ: ' + missing.join(', '));
    }
  },

  toNumber(value, defaultValue) {
    const n = Number(value);
    return isNaN(n) ? (defaultValue === undefined ? 0 : defaultValue) : n;
  },

  safeParseJson(text, defaultValue) {
    try {
      return JSON.parse(text);
    } catch (err) {
      return defaultValue === undefined ? null : defaultValue;
    }
  },

  isActive(value) {
    return value === true || ['TRUE', 'ACTIVE', '1', 'YES'].indexOf(String(value || '').toUpperCase()) !== -1;
  },

  isExpired(dateValue) {
    if (!dateValue) return false;
    const date = new Date(dateValue);
    return isNaN(date.getTime()) || date.getTime() <= new Date().getTime();
  },

  sanitizeSheetValue(value) {
    if (typeof value !== 'string') return value;
    const text = value;

    // ป้องกัน Spreadsheet Formula Injection สำหรับข้อมูลที่มาจากผู้ใช้
    if (/^[=+@]/.test(text) || /^-[0-9=]/.test(text)) {
      return "'" + text;
    }

    return text;
  },


  randomUrlSafeToken() {
    const raw = [
      Utilities.getUuid(),
      Utilities.getUuid(),
      Utilities.getUuid(),
      String(new Date().getTime())
    ].join(':');
    return Utilities.base64EncodeWebSafe(raw, Utilities.Charset.UTF_8).replace(/=+$/g, '');
  },

  sha256Bytes(text) {
    return Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      String(text),
      Utilities.Charset.UTF_8
    );
  },

  base64UrlFromBytes(bytes) {
    return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/g, '');
  },

  randomPkceVerifier() {
    // SHA-256 output encoded as Base64URL is 43 characters, within RFC 7636 / LINE 43-128 requirement.
    const entropy = this.randomUrlSafeToken() + ':' + Utilities.getUuid() + ':' + String(new Date().getTime());
    return this.base64UrlFromBytes(this.sha256Bytes(entropy));
  },

  pkceChallenge(verifier) {
    return this.base64UrlFromBytes(this.sha256Bytes(verifier));
  },

  hmacSha256(text, secret) {
    const bytes = Utilities.computeHmacSha256Signature(
      String(text),
      String(secret),
      Utilities.Charset.UTF_8
    );
    return this.base64UrlFromBytes(bytes);
  },

  hmacSha256Hex(text, secret) {
    const bytes = Utilities.computeHmacSha256Signature(
      String(text),
      String(secret),
      Utilities.Charset.UTF_8
    );
    return bytes.map(function(byte) {
      const value = byte < 0 ? byte + 256 : byte;
      return ('0' + value.toString(16)).slice(-2);
    }).join('');
  },



  normalizeThaiPhoneE164(value, allowEmpty) {
    const raw = String(value || '').trim();
    if (!raw) {
      if (allowEmpty !== false) return '';
      throw new Error('กรุณาระบุเบอร์โทรศัพท์');
    }
    let digits = raw.replace(/\D/g, '');
    if (digits.indexOf('0066') === 0) digits = digits.slice(4);
    else if (digits.indexOf('66') === 0) digits = digits.slice(2);
    if (digits.indexOf('0') === 0) digits = digits.slice(1);
    if (!/^[2-9]\d{7,8}$/.test(digits)) {
      throw new Error('รูปแบบเบอร์โทรศัพท์ไทยไม่ถูกต้อง');
    }
    return '+66' + digits;
  },

  formatThaiPhoneDisplay(value) {
    let digits = String(value || '').replace(/\D/g, '');
    if (digits.indexOf('0066') === 0) digits = digits.slice(4);
    else if (digits.indexOf('66') === 0) digits = digits.slice(2);
    if (digits.indexOf('0') === 0) digits = digits.slice(1);
    digits = digits.slice(0, 9);
    if (!digits) return '';
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return digits.slice(0, 2) + ' ' + digits.slice(2);
    return digits.slice(0, 2) + ' ' + digits.slice(2, 5) + ' ' + digits.slice(5);
  },

  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
  },

  validatePasswordStrength(password) {
    const value = String(password || '');
    const errors = [];
    if (value.length < 10) errors.push('อย่างน้อย 10 ตัวอักษร');
    if (!/[a-z]/.test(value)) errors.push('ตัวอักษรพิมพ์เล็ก');
    if (!/[A-Z]/.test(value)) errors.push('ตัวอักษรพิมพ์ใหญ่');
    if (!/[0-9]/.test(value)) errors.push('ตัวเลข');
    if (!/[^A-Za-z0-9]/.test(value)) errors.push('อักขระพิเศษ');
    return { ok: errors.length === 0, errors: errors };
  },

  normalizeProvider(value) {
    const provider = String(value || '').trim().toUpperCase();
    const allowed = Object.keys(APP_CONFIG.IDENTITY_PROVIDERS).map(function(key) {
      return APP_CONFIG.IDENTITY_PROVIDERS[key];
    });
    return allowed.indexOf(provider) !== -1 ? provider : '';
  },

  encodeQuery(params) {
    return Object.keys(params || {}).filter(function(key) {
      return params[key] !== undefined && params[key] !== null && params[key] !== '';
    }).map(function(key) {
      return encodeURIComponent(key) + '=' + encodeURIComponent(String(params[key]));
    }).join('&');
  },

  safeJsonForHtml(value) {
    return JSON.stringify(value === undefined ? null : value)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/&/g, '\\u0026')
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029');
  },

  getEmailDomain(email) {
    const parts = String(email || '').toLowerCase().split('@');
    return parts.length === 2 ? parts[1] : '';
  }
};
