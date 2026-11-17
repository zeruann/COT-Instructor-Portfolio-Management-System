/**
 * Formats any date string or Date object into "Month Day, Year" format.
 * Example: "2025-08-25" -> "Aug. 25, 2025" or "Aug 25, 2025"
 * Returns '—' if date is falsy or invalid.
 */
export function formatDate(dateInput) {
  if (!dateInput) return '—';

  // If input is YYYY-MM-DD string, handle local date parts to prevent timezone shifts
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    const [year, month, day] = dateInput.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const monthShort = date.toLocaleDateString('en-US', { month: 'short' });
    return `${monthShort}. ${day}, ${year}`;
  }

  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return String(dateInput);

  const monthShort = date.toLocaleDateString('en-US', { month: 'short' });
  const day = date.getDate();
  const year = date.getFullYear();

  return `${monthShort}. ${day}, ${year}`;
}
