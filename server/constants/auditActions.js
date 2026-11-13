// Every loggable action, in one place. Use these constants instead of typing strings,
// so the log can be filtered reliably. Format: <category>.<action>
const CATEGORY = Object.freeze({
  AUTH: 'auth',
  ACCOUNT: 'account',
  INVITATION: 'invitation',
  DOCUMENT: 'document',
  PERIOD: 'period',
  SETTINGS: 'settings',
  SYSTEM: 'system',
});

const ACTION = Object.freeze({
  // auth
  LOGIN: 'auth.login',
  LOGIN_FAILED: 'auth.login_failed',
  LOGOUT: 'auth.logout',
  PASSWORD_RESET_REQUEST: 'auth.password_reset_request',
  PASSWORD_RESET: 'auth.password_reset',
  PASSWORD_CHANGE: 'auth.password_change',
  // profile & account management
  PROFILE_CREATE: 'account.profile_create',
  PROFILE_UPDATE: 'account.profile_update',
  // admin account management (sprints 1-2 features)
  ACCOUNT_DEACTIVATE: 'account.deactivate',
  ACCOUNT_REACTIVATE: 'account.reactivate',
  INVITE_SEND: 'invitation.send',
  INVITE_RESEND: 'invitation.resend',
  INVITE_CANCEL: 'invitation.cancel',
  INVITE_ACCEPT: 'invitation.accept',
  INVITE_REJECT: 'invitation.reject',
  // documents
  DOC_UPLOAD: 'document.upload',
  DOC_REUPLOAD: 'document.reupload',
  DOC_DELETE: 'document.delete',
  DOC_EDIT: 'document.edit',
  DOC_APPROVE: 'document.approve',
  DOC_REJECT: 'document.reject',
  DOC_ARCHIVE: 'document.archive',
  // academic period and settings (admin now, possibly System Administrator later)
  PERIOD_SET: 'period.set',
  PERIOD_CREATE: 'period.create',
  PERIOD_UPDATE: 'period.update',
  PERIOD_CLOSE: 'period.close',
  PERIOD_ARCHIVE: 'period.archive',
  SETTING_UPDATE: 'settings.update',
  SETTING_ACCESS: 'settings.access',
  SETTING_OTP_SEND: 'settings.otp_send',
  SETTING_OTP_VERIFY: 'settings.otp_verify',
  SETTING_PASSWORD_VERIFY: 'settings.password_verify',
  SETTING_MODE_CHANGE: 'settings.mode_change',
  SETTING_TEST_CONNECTION: 'settings.test_connection',
  SETTING_RESTORE_DEFAULTS: 'settings.restore_defaults',
  // future System Administrator features (not confirmed with the client)
  ROLE_ASSIGN: 'account.role_assign',
  INTEGRATION_TOGGLE: 'settings.integration_toggle',
});

module.exports = { CATEGORY, ACTION };
