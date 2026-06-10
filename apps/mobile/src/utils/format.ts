/** Formatting helpers shared across screens. */

interface CurrencyMeta {
  symbol: string;
  locale: string;
}

const CURRENCIES: Record<string, CurrencyMeta> = {
  INR: { symbol: '₹', locale: 'en-IN' },
  USD: { symbol: '$', locale: 'en-US' },
};

export function currencyMeta(currency = 'INR'): CurrencyMeta {
  return CURRENCIES[currency] ?? CURRENCIES.INR;
}

export function formatCurrency(amount: number, currency = 'INR'): string {
  const { symbol, locale } = currencyMeta(currency);
  const value = Number.isFinite(amount) ? amount : 0;
  return `${symbol}${value.toLocaleString(locale, { maximumFractionDigits: 2 })}`;
}

/** Strip an amount input down to a raw numeric string: digits + a single dot. */
export function sanitizeAmount(text: string): string {
  const cleaned = text.replace(/[^0-9.]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot === -1) return cleaned;
  // Keep only the first dot.
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
}

/** Format a raw numeric string with thousands grouping for the given currency. */
export function groupAmount(raw: string, currency = 'INR'): string {
  if (!raw) return '';
  const { locale } = currencyMeta(currency);
  const [intPart, ...rest] = raw.split('.');
  const hasDot = raw.includes('.');
  const intNum = parseInt(intPart || '0', 10);
  const groupedInt = Number.isNaN(intNum) ? intPart : intNum.toLocaleString(locale);
  return hasDot ? `${groupedInt}.${rest.join('')}` : groupedInt;
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
