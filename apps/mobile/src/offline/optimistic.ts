import { queryClient } from '@/api/queryClient';
import { OutboxEntity } from './outbox';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

/**
 * Best-effort: drop an offline-created record into its list cache so it shows
 * immediately (and is pickable in dropdowns) before it syncs. Server-computed
 * fields (bills, totals) default to 0 until the next sync recomputes them.
 */
export function optimisticInsert(entity: OutboxEntity, record: Record<string, unknown>): void {
  switch (entity) {
    case 'customer':
      queryClient.setQueriesData({ queryKey: ['customers'] }, (old: Any) => {
        if (!old || !Array.isArray(old.items)) return old;
        return {
          ...old,
          items: [{ totalBill: 0, amountPaid: 0, outstanding: 0, ...record }, ...old.items],
          total: (old.total ?? 0) + 1,
        };
      });
      break;
    case 'labour':
      queryClient.setQueriesData({ queryKey: ['labour'] }, (old: Any) =>
        Array.isArray(old)
          ? [{ totalBill: 0, amountPaid: 0, remaining: 0, totalWorkingDays: 0, ...record }, ...old]
          : old,
      );
      break;
    case 'agent':
      queryClient.setQueriesData({ queryKey: ['agents'] }, (old: Any) =>
        Array.isArray(old) ? [record, ...old] : old,
      );
      break;
    case 'fuelPump':
      queryClient.setQueriesData({ queryKey: ['fuel-pumps'] }, (old: Any) =>
        Array.isArray(old) ? [record, ...old] : old,
      );
      break;
    case 'expense':
      queryClient.setQueriesData({ queryKey: ['expenses'] }, (old: Any) =>
        Array.isArray(old) ? [record, ...old] : old,
      );
      break;
    // Jobs (plots) and payments feed aggregated screens (ledgers/dashboard) that
    // are recomputed server-side, so they refresh on sync rather than optimistically.
    default:
      break;
  }
}
