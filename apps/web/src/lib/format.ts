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

/** "in 12 days" / "5 days ago" / "today" from a day count (negative = past). */
export const daysLabel = (days: number | null) => {
  if (days === null) return '—';
  if (days === 0) return 'today';
  if (days > 0) return `in ${days} day${days === 1 ? '' : 's'}`;
  const n = Math.abs(days);
  return `${n} day${n === 1 ? '' : 's'} ago`;
};
