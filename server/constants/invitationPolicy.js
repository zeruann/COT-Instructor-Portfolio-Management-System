// Rules for who may receive an instructor invitation.
//
// 🔧 CONFIG: @student.buksu.edu.ph is allowed temporarily.
// Set this to `false` to stop student accounts from receiving invitations,
// leaving only @buksu.edu.ph (faculty/instructor institutional accounts).
// It can also be overridden without touching code by adding
// ALLOW_STUDENT_EMAIL_INVITES=false to server/.env.
const ALLOW_STUDENT_EMAIL_INVITES_DEFAULT = true;

const ALLOW_STUDENT_EMAIL_INVITES = process.env.ALLOW_STUDENT_EMAIL_INVITES
  ? process.env.ALLOW_STUDENT_EMAIL_INVITES.toLowerCase() === 'true'
  : ALLOW_STUDENT_EMAIL_INVITES_DEFAULT;

const INVITATION_EMAIL_DOMAINS = [
  'buksu.edu.ph',
  ...(ALLOW_STUDENT_EMAIL_INVITES ? ['student.buksu.edu.ph'] : []),
];

// Exact domain match so look-alikes such as @buksu.edu.ph.evil.com are rejected.
const isAllowedInvitationEmail = (email) => {
  if (typeof email !== 'string') return false;
  const normalized = email.trim().toLowerCase();
  const at = normalized.lastIndexOf('@');
  if (at <= 0 || at === normalized.length - 1) return false;
  const domain = normalized.slice(at + 1);
  return INVITATION_EMAIL_DOMAINS.includes(domain);
};

const invitationDomainMessage = () =>
  `Invitations can only be sent to institutional email addresses (${INVITATION_EMAIL_DOMAINS.map(
    (d) => `@${d}`
  ).join(' or ')}).`;

module.exports = {
  ALLOW_STUDENT_EMAIL_INVITES,
  INVITATION_EMAIL_DOMAINS,
  isAllowedInvitationEmail,
  invitationDomainMessage,
};
