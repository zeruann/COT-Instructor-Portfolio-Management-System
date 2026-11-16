// src/components/portfolio/CompletionStatusCard.jsx
//
// The "Completion Status" card: one big percentage and a short message.
// It only DISPLAYS the percentage it is given. Completion counts approved documents only.
//
// Props:
//   percent   number from 0 to 100
//   message   text under the percentage (optional)
//   className extra classes, e.g. a grid column span from the page

function CompletionStatusCard({ percent = 0, message, className = '' }) {
  const value = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));

  return (
    <section
      className={`flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white p-5 text-center shadow-sm ${className}`}
      aria-label="Completion Status"
    >
      <h2 className="text-lg font-semibold text-indigo-900">Completion Status</h2>

      <p className="mt-2 text-6xl font-bold leading-none text-[#5cab5f]">
        <span aria-hidden="true">{value}%</span>
        <span className="sr-only">{value} percent complete</span>
      </p>

      {message && <p className="mt-3 text-sm text-gray-500">{message}</p>}
    </section>
  );
}

export default CompletionStatusCard;
