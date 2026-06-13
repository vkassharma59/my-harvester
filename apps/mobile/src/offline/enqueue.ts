import { isOnline } from './connectivity';
import { newObjectId } from './objectId';
import { OutboxEntity, useOutbox } from './outbox';
import { flushOutbox } from './sync';

function triggerFlush(): void {
  if (isOnline()) void flushOutbox();
}

/**
 * Queue a create and return the record with its client-generated id straight
 * away (optimistic). The real POST happens in the background flush; the id is
 * already final, so anything referencing this record offline stays valid.
 */
export function offlineCreate<T extends Record<string, unknown>>(
  entity: OutboxEntity,
  body: T,
): T & { id: string } {
  const id = newObjectId();
  const record = { ...body, id };
  useOutbox.getState().enqueue({ entity, type: 'create', recordId: id, body: record });
  triggerFlush();
  return record;
}

export function offlineUpdate(entity: OutboxEntity, recordId: string, body: unknown): void {
  useOutbox.getState().enqueue({ entity, type: 'update', recordId, body });
  triggerFlush();
}

export function offlineRemove(entity: OutboxEntity, recordId: string): void {
  useOutbox.getState().enqueue({ entity, type: 'delete', recordId, body: null });
  triggerFlush();
}

/** Attendance is replace-a-week, so it's naturally idempotent on replay. */
export function offlineSetAttendanceWeek(labourId: string, weekStart: string, days: string[]): void {
  useOutbox.getState().enqueue({
    entity: 'attendanceWeek',
    type: 'setWeek',
    recordId: labourId,
    body: { labourId, weekStart, days },
  });
  triggerFlush();
}
