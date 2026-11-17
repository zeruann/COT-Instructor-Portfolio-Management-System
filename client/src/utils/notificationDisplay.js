// Shared notification title + timestamp helpers for dashboard and notifications page.

export function getNotificationTitle(notif) {
  const stored = (notif?.title || '').trim();
  const vagueTitles = new Set(['', 'notification', 'approved', 'notice']);

  if (stored && !vagueTitles.has(stored.toLowerCase())) return stored;

  switch (notif?.type) {
    case 'approved':
    case 'document_approved':
      return 'Document Approved';
    case 'resubmission':
    case 'document_rejected':
      return 'Resubmission Requested';
    case 'document_submitted':
      return notif?.requirementName || notif?.documentName
        ? `Added: ${notif.requirementName || notif.documentName}`
        : 'Document Added';
    case 'document_updated':
      return notif?.requirementName || notif?.documentName
        ? `Updated: ${notif.requirementName || notif.documentName}`
        : 'Document Updated';
    case 'document_missing':
      return notif?.requirementName || notif?.documentName
        ? `Requested: ${notif.requirementName || notif.documentName}`
        : 'Document Requested';
    case 'reminder':
      return 'Reminder';
    case 'notice':
      return 'System Notice';
    default:
      return 'Portfolio Update';
  }
}

export function formatNotificationTimestamp(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';

  const diffDays = Math.floor((new Date() - date) / (1000 * 60 * 60 * 24));
  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  if (diffDays === 0) return `Today, ${time}`;
  if (diffDays === 1) return `Yesterday, ${time}`;
  return `${date.toLocaleDateString('en-US', { month: 'short' })} ${date.getDate()}, ${time}`;
}
