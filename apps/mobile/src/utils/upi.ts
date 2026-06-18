/** Build a UPI deep link (`upi://pay?...`) the payer's UPI app understands.
 *  Encode in a QR for in-person scanning, or share the string for remote pay. */
export function buildUpiUri(opts: {
  /** Payee VPA, e.g. "name@okaxis". */
  vpa: string;
  /** Payee display name (the firm). */
  payeeName?: string;
  /** Amount in INR; omitted lets the payer enter it. */
  amount?: number;
  /** Transaction note shown in the payer's app. */
  note?: string;
}): string {
  const q = [`pa=${encodeURIComponent(opts.vpa.trim())}`, 'cu=INR'];
  if (opts.payeeName?.trim()) q.push(`pn=${encodeURIComponent(opts.payeeName.trim())}`);
  if (opts.amount && opts.amount > 0) q.push(`am=${opts.amount.toFixed(2)}`);
  if (opts.note?.trim()) q.push(`tn=${encodeURIComponent(opts.note.trim())}`);
  return `upi://pay?${q.join('&')}`;
}

/** Loose VPA check (something@handle) — enough to catch obvious typos. */
export function isValidVpa(vpa: string): boolean {
  return /^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(vpa.trim());
}
