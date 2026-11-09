/**
 * Facility Repair System (FRS)
 * SocialAuthConfig.gs
 * Version 2.3.03
 */

const SocialAuthConfig = {
  props_() {
    return PropertiesService.getScriptProperties();
  },

  get_(name) {
    return String(this.props_().getProperty(name) || '').trim();
  },

  getWebAppUrl() {
    const configured = this.get_(APP_CONFIG.SCRIPT_PROPERTIES.WEB_APP_URL);
    const discovered = ScriptApp.getService().getUrl() || '';
    const value = configured || discovered;
    if (!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/i.test(value)) {
      throw new Error('ยังไม่ได้ตั้งค่า FRS_WEB_APP_URL เป็น URL Deployment ที่ลงท้ายด้วย /exec ใน Script Properties');
    }
    return value;
  },

  google() {
    return {
      clientId: this.get_(APP_CONFIG.SCRIPT_PROPERTIES.GOOGLE_CLIENT_ID),
      clientSecret: this.get_(APP_CONFIG.SCRIPT_PROPERTIES.GOOGLE_CLIENT_SECRET),
      allowedHd: this.get_(APP_CONFIG.SCRIPT_PROPERTIES.GOOGLE_ALLOWED_HD)
        .split(',').map(function(item) { return item.trim().toLowerCase(); }).filter(Boolean)
    };
  },

  line() {
    return {
      channelId: this.get_(APP_CONFIG.SCRIPT_PROPERTIES.LINE_CHANNEL_ID),
      channelSecret: this.get_(APP_CONFIG.SCRIPT_PROPERTIES.LINE_CHANNEL_SECRET),
      emailScopeEnabled: ['TRUE', '1', 'YES'].indexOf(
        this.get_(APP_CONFIG.SCRIPT_PROPERTIES.LINE_EMAIL_SCOPE_ENABLED).toUpperCase()
      ) !== -1
    };
  },

  signingSecret() {
    const name = APP_CONFIG.SCRIPT_PROPERTIES.OAUTH_SIGNING_SECRET;
    let value = this.get_(name);
    if (!value) {
      value = Utils.secureToken('OAUTH');
      this.props_().setProperty(name, value);
    }
    return value;
  },

  isGoogleReady() {
    const cfg = this.google();
    try {
      return Boolean(APP_CONFIG.SOCIAL_AUTH_ENABLED && cfg.clientId && cfg.clientSecret && this.getWebAppUrl());
    } catch (err) {
      return false;
    }
  },

  isLineReady() {
    const cfg = this.line();
    try {
      return Boolean(APP_CONFIG.SOCIAL_AUTH_ENABLED && cfg.channelId && cfg.channelSecret && this.getWebAppUrl());
    } catch (err) {
      return false;
    }
  },

  publicStatus() {
    return {
      socialAuthEnabled: Boolean(APP_CONFIG.SOCIAL_AUTH_ENABLED),
      registrationEnabled: Boolean(APP_CONFIG.REGISTRATION_ENABLED),
      googleEnabled: this.isGoogleReady(),
      lineEnabled: this.isLineReady()
    };
  },

  verify() {
    const checks = [];
    function add(name, ok, detail) {
      checks.push({ name: name, passed: Boolean(ok), detail: detail || '' });
    }

    let webAppUrl = '';
    try {
      webAppUrl = this.getWebAppUrl();
      add('FRS_WEB_APP_URL', true, webAppUrl);
    } catch (err) {
      add('FRS_WEB_APP_URL', false, err.message);
    }

    const google = this.google();
    add('Google Client ID', Boolean(google.clientId), google.clientId ? 'ตั้งค่าแล้ว' : 'ยังไม่ได้ตั้งค่า');
    add('Google Client Secret', Boolean(google.clientSecret), google.clientSecret ? 'ตั้งค่าแล้ว' : 'ยังไม่ได้ตั้งค่า');

    const line = this.line();
    add('LINE Channel ID', Boolean(line.channelId), line.channelId ? 'ตั้งค่าแล้ว' : 'ยังไม่ได้ตั้งค่า');
    add('LINE Channel Secret', Boolean(line.channelSecret), line.channelSecret ? 'ตั้งค่าแล้ว' : 'ยังไม่ได้ตั้งค่า');
    add('OAuth Signing Secret', Boolean(this.signingSecret()), 'พร้อมใช้งาน');

    return {
      version: APP_CONFIG.APP_VERSION,
      ok: checks.every(function(item) { return item.passed; }),
      callbackUrl: webAppUrl,
      checks: checks
    };
  }
};

function verifySocialAuthConfiguration() {
  const report = SocialAuthConfig.verify();
  console.log(JSON.stringify(report, null, 2));
  return report;
}
