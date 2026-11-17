// Single source of truth for the privacy notice.
// Bump PRIVACY_NOTICE_VERSION whenever the text changes so acknowledgements
// recorded on accepted invitations stay meaningful.
// TODO: confirm the DPO contact below with the College before publishing.

export const PRIVACY_NOTICE_VERSION = '1.0';
export const PRIVACY_NOTICE_EFFECTIVE_DATE = 'November 2026';

export const PRIVACY_ORGANIZATION = 'Bukidnon State University — College of Technologies';
export const PRIVACY_DPO_EMAIL = 'dpo@buksu.edu.ph';
export const PRIVACY_ADDRESS = 'Bukidnon State University, Malaybalay City, Bukidnon, Philippines';

// Short, plain-language points shown before an invitee accepts (Layer 1).
export const PRIVACY_SUMMARY = [
  'We collect your name, institutional email, department, rank, contact details, education history, and the portfolio documents you upload.',
  'We use these to create and maintain your faculty e-portfolio, verify submitted requirements, and generate College compliance reports.',
  'Only you, College administrators and assigned reviewers, and system administrators can see your data. It is never made public.',
  'Data is stored in our secured database and in the University’s Google Workspace (Drive and Sheets) used for report generation.',
  'You may ask to access, correct, or delete your data anytime through the College Data Protection Officer.',
];
