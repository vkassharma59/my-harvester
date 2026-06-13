import { onlineManager } from '@tanstack/react-query';
import axios from 'axios';
import { apiErrorMessage } from '@/api/client';
import {
  agentsApi,
  attendanceApi,
  customersApi,
  expensesApi,
  fuelPumpsApi,
  labourApi,
  paymentsApi,
  plotsApi,
} from '@/api/endpoints';
import { queryClient } from '@/api/queryClient';
import { isOnline } from './connectivity';
import { OutboxOp, useOutbox } from './outbox';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Body = any;

/** Send a single queued operation to the server. */
async function runOp(op: OutboxOp): Promise<void> {
  const { entity, type, recordId, body } = op;
  switch (entity) {
    case 'customer':
      if (type === 'create') await customersApi.create(body as Body);
      else if (type === 'update') await customersApi.update(recordId, body as Body);
      return;
    case 'labour':
      if (type === 'create') await labourApi.create(body as Body);
      else if (type === 'update') await labourApi.update(recordId, body as Body);
      else if (type === 'delete') await labourApi.remove(recordId);
      return;
    case 'agent':
      if (type === 'create') await agentsApi.create(body as Body);
      else if (type === 'update') await agentsApi.update(recordId, body as Body);
      else if (type === 'delete') await agentsApi.remove(recordId);
      return;
    case 'fuelPump':
      if (type === 'create') await fuelPumpsApi.create(body as Body);
      else if (type === 'update') await fuelPumpsApi.update(recordId, body as Body);
      else if (type === 'delete') await fuelPumpsApi.remove(recordId);
      return;
    case 'plot':
      if (type === 'create') await plotsApi.create(body as Body);
      else if (type === 'update') await plotsApi.update(recordId, body as Body);
      else if (type === 'delete') await plotsApi.remove(recordId);
      return;
    case 'expense':
      if (type === 'create') await expensesApi.create(body as Body);
      else if (type === 'update') await expensesApi.update(recordId, body as Body);
      else if (type === 'delete') await expensesApi.remove(recordId);
      return;
    case 'payment':
      if (type === 'create') await paymentsApi.create(body as Body);
      else if (type === 'update') await paymentsApi.update(recordId, body as Body);
      else if (type === 'delete') await paymentsApi.remove(recordId);
      return;
    case 'attendanceWeek': {
      const b = body as { labourId: string; weekStart: string; days: string[] };
      await attendanceApi.setWeek(b.labourId, b.weekStart, b.days);
      return;
    }
  }
}

let flushing = false;

/**
 * Process the outbox head-of-queue in order. Strict ordering keeps dependent
 * records (e.g. a job after its customer) correct. A network error pauses the
 * flush until reconnect; a duplicate (already synced) is treated as success;
 * other server errors are retried a few times, then parked in `failed`.
 */
export async function flushOutbox(): Promise<void> {
  if (flushing || !isOnline()) return;
  flushing = true;
  let didWork = false;
  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const op = useOutbox.getState().ops[0];
      if (!op) break;
      try {
        await runOp(op);
        useOutbox.getState().remove(op.opId);
        didWork = true;
      } catch (e) {
        if (axios.isAxiosError(e) && e.response) {
          const status = e.response.status;
          // 409 = already created with this id → idempotent success.
          if (status === 409) {
            useOutbox.getState().remove(op.opId);
            didWork = true;
            continue;
          }
          // Any other server response means this op won't succeed by retrying
          // right now; record it and stop so we preserve order.
          useOutbox.getState().recordError(op.opId, apiErrorMessage(e));
          if (status >= 400 && status < 500) {
            // Client/validation error: keep parking via attempts; stop the flush.
            break;
          }
          break;
        }
        // No response = offline / unreachable → stop and wait for reconnect.
        break;
      }
    }
  } finally {
    flushing = false;
    if (didWork) void queryClient.invalidateQueries();
  }
}

/** Start background sync: flush now, and whenever connectivity returns. */
export function initSync(): void {
  onlineManager.subscribe((online) => {
    if (online) void flushOutbox();
  });
  void flushOutbox();
}
