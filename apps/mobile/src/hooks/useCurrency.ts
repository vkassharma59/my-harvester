import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '@/api/endpoints';

/** The tenant's currency code (defaults INR). Reuses the cached settings query. */
export function useCurrency(): string {
  const { data } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get });
  return data?.currency ?? 'INR';
}
