/** Formatting helpers shared across screens. */

export function formatCurrency(amount: number, currency = 'INR'): string {
  const symbol = currency === 'INR' ? '₹' : '';
  const value = Number.isFinite(amount) ? amount : 0;
  return `${symbol}${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export function formatDate(input: string | Date): string {
  const d = typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Title-cases an enum value like HARVESTER_DRIVER -> "Harvester Driver". */
export function labelFromEnum(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
