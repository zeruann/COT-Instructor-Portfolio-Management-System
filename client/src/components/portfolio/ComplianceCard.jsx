// src/components/portfolio/ComplianceCard.jsx
//
// The "Compliance" card shown at the top of every portfolio requirement page:
// a stacked progress bar, a legend with counts and a short message.
// It only DISPLAYS the numbers it is given. The page (later, the server) works them out.
// Only approved documents count as complete; the other segments are for information.
//
// Props:
//   counts    { approved, pendingReview, rejected, notSubmitted }   (missing keys count as 0)
//   message   text under the legend (optional)
//   title     card heading (default "Compliance")
//   className extra classes, e.g. a grid column span from the page

const SEGMENTS = [
  { key: 'approved', label: 'Approved', color: '#5cab5f' },
  { key: 'pendingReview', label: 'Pending Review', color: '#f5a30f' },
  { key: 'rejected', label: 'Rejected', color: '#f56a14' },
  { key: 'notSubmitted', label: 'Not Yet Submitted', color: '#c4c4cc' },
];

function ComplianceCard({ counts = {}, message, title = 'Compliance', className = '' }) {
  const values = SEGMENTS.map((segment) => ({ ...segment, count: counts[segment.key] ?? 0 }));
  const total = values.reduce((sum, segment) => sum + segment.count, 0);
  const summary = values.map((segment) => `${segment.count} ${segment.label}`).join(', ');

  return (
    <section
      className={`rounded-lg border border-gray-200 bg-white p-5 shadow-sm ${className}`}
      aria-label={title}
    >
      <h2 className="text-lg font-semibold text-indigo-900">{title}</h2>
      <hr className="mt-3 border-gray-200" />

      {/* The grey track is the "not yet submitted" part, so only the other segments are drawn. */}
      <div
        role="img"
        aria-label={summary}
        className="mt-5 flex h-4 w-full overflow-hidden rounded-full bg-gray-200"
      >
        {total > 0 &&
          values
            .filter((segment) => segment.key !== 'notSubmitted' && segment.count > 0)
            .map((segment) => (
              <div
                key={segment.key}
                style={{ width: `${(segment.count / total) * 100}%`, backgroundColor: segment.color }}
              />
            ))}
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
        {values.map((segment) => (
          <li key={segment.key} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: segment.color }}
            />
            ({segment.count}) {segment.label}
          </li>
        ))}
      </ul>

      {message && <p className="mt-4 text-sm text-gray-600">{message}</p>}
    </section>
  );
}

export default ComplianceCard;
