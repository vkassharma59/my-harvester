import { useCurrency } from '@/hooks/useCurrency';
import { groupAmount, sanitizeAmount } from '@/utils/format';
import { TextField } from './TextField';

interface AmountFieldProps {
  label: string;
  /** Raw numeric string (no separators), e.g. "100000" or "1500.5". */
  value: string;
  onChangeText: (raw: string) => void;
  placeholder?: string;
  error?: string;
}

/**
 * A numeric input that shows thousands separators per the tenant's currency
 * (₹ uses Indian grouping, $ uses Western) while storing a raw numeric string.
 */
export function AmountField({ label, value, onChangeText, placeholder, error }: AmountFieldProps) {
  const currency = useCurrency();
  return (
    <TextField
      label={label}
      value={groupAmount(value, currency)}
      onChangeText={(t) => onChangeText(sanitizeAmount(t))}
      keyboardType="numeric"
      placeholder={placeholder}
      error={error}
    />
  );
}
