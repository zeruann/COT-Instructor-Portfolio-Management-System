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
    DOC_APPROVE: 'document.approve',
    DOC_REJECT: 'document.reject',
    DOC_ARCHIVE: 'document.archive',
    // academic period and settings (admin now, possibly System Administrator later)
    PERIOD_SET: 'period.set',
    SETTING_UPDATE: 'settings.update',
    // future System Administrator features (not confirmed with the client)
    ROLE_ASSIGN: 'account.role_assign',
    INTEGRATION_TOGGLE: 'settings.integration_toggle',
  });
  
  module.exports = { CATEGORY, ACTION };
  