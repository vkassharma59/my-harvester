import i18n from '@/i18n';
import { isOnline } from './connectivity';
import { newObjectId } from './objectId';
import { optimisticInsert } from './optimistic';
import { OutboxEntity, useOutbox } from './outbox';
import { offlineEntryEnabled } from './prefs';
import { flushOutbox } from './sync';

function triggerFlush(): void {
  if (isOnline()) void flushOutbox();
}

/**
 * Offline data entry is opt-in (off by default). While offline and disabled,
 * block the enqueue so the form surfaces an error instead of silently queueing
 * a change the user never agreed to make without a connection.
 */
function assertOfflineEntryAllowed(): void {
  if (!isOnline() && !offlineEntryEnabled()) {
    throw new Error(i18n.t('offline.entryDisabledError'));
  }
}

/**
 * Queue a create and return the record with its client-generated id straight
 * away (optimistic). The real POST happens in the background flush; the id is
 * already final, so anything referencing this record offline stays valid.
 */
export function offlineCreate<T extends object>(entity: OutboxEntity, body: T): T & { id: string } {
  assertOfflineEntryAllowed();
  const id = newObjectId();
  const record = { ...body, id };
  useOutbox.getState().enqueue({ entity, type: 'create', recordId: id, body: record });
  // Online, the quick flush + invalidate refreshes the list; only show an
  // optimistic row when offline (and there's no server round-trip coming).
  if (!isOnline()) optimisticInsert(entity, record as unknown as Record<string, unknown>);
  triggerFlush();
  return record;
}

export function offlineUpdate(entity: OutboxEntity, recordId: string, body: unknown): void {
  assertOfflineEntryAllowed();
  useOutbox.getState().enqueue({ entity, type: 'update', recordId, body });
  triggerFlush();
}

export function offlineRemove(entity: OutboxEntity, recordId: string): void {
  assertOfflineEntryAllowed();
  useOutbox.getState().enqueue({ entity, type: 'delete', recordId, body: null });
  triggerFlush();
}

/** Attendance is replace-a-week, so it's naturally idempotent on replay. */
export function offlineSetAttendanceWeek(labourId: string, weekStart: string, days: string[]): void {
  assertOfflineEntryAllowed();
  useOutbox.getState().enqueue({
    entity: 'attendanceWeek',
    type: 'setWeek',
    recordId: labourId,
    body: { labourId, weekStart, days },
  });
  triggerFlush();
}
