/** ₹ with Indian digit grouping. */
export const inr = (n?: number | null) => '₹' + (n ?? 0).toLocaleString('en-IN');

export const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const fmtDateTime = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

/**
 * Renewal countdown from a day count (negative = past), broken into months and
 * days: "in 12 months 10 days" / "1 month 2 days ago" / "in 5 days" / "today".
 * Months are counted as 30 days for this rough breakdown.
 */
export const renewLabel = (days: number | null) => {
  if (days === null) return '—';
  if (days === 0) return 'today';
  const past = days < 0;
  const n = Math.abs(days);
  const months = Math.floor(n / 30);
  const remDays = n % 30;
  const parts: string[] = [];
  if (months >= 1) parts.push(`${months} month${months === 1 ? '' : 's'}`);
  if (remDays >= 1) parts.push(`${remDays} day${remDays === 1 ? '' : 's'}`);
  const unit = parts.join(' ');
  return past ? `${unit} ago` : `in ${unit}`;
};
