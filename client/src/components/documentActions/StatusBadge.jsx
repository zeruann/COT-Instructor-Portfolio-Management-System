// client/src/components/documentActions/StatusBadge.jsx

const STATUS_CONFIG = {
  approved: {
    label: 'Approved',
    className: 'doc-status doc-status--completed',
  },
  pending_review: {
    label: 'Pending review',
    className: 'doc-status doc-status--pending',
  },
  draft: {
    label: 'Draft',
    className: 'doc-status doc-status--pending',
  },
  rejected: {
    label: 'Rejected',
    className: 'doc-status doc-status--rejected',
  },
  missing: {
    label: 'Not submitted',
    className: 'doc-status doc-status--pending',
  },
};

export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || {
    label: status ? status.replace(/_/g, ' ') : 'Not submitted',
    className: 'doc-status doc-status--pending',
  };

  return <span className={config.className}>{config.label}</span>;
}

