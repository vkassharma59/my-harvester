import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { newObjectId } from './objectId';

export type OutboxEntity =
  | 'customer'
  | 'labour'
  | 'agent'
  | 'fuelPump'
  | 'plot'
  | 'expense'
  | 'payment'
  | 'attendanceWeek';

export type OutboxType = 'create' | 'update' | 'delete' | 'setWeek';

export interface OutboxOp {
  /** Unique id for this queued operation. */
  opId: string;
  entity: OutboxEntity;
  type: OutboxType;
  /** The record's id (client-generated for create; existing id otherwise). */
  recordId: string;
  /** The request payload sent to the API. */
  body: unknown;
  createdAt: number;
  attempts: number;
  lastError?: string;
}

export type NewOp = Omit<OutboxOp, 'opId' | 'createdAt' | 'attempts'>;

interface OutboxState {
  /** Pending operations, processed strictly in order. */
  ops: OutboxOp[];
  /** Operations that exhausted retries — surfaced to the user, not auto-sent. */
  failed: OutboxOp[];
  enqueue: (op: NewOp) => void;
  /** Remove a successfully-synced op. */
  remove: (opId: string) => void;
  /** Record a failed attempt; move to `failed` after too many tries. */
  recordError: (opId: string, error: string) => void;
  /** Re-queue everything that previously failed. */
  retryFailed: () => void;
  clearAll: () => void;
}

const MAX_ATTEMPTS = 5;

export const useOutbox = create<OutboxState>()(
  persist(
    (set) => ({
      ops: [],
      failed: [],
      enqueue: (op) =>
        set((s) => ({
          ops: [...s.ops, { ...op, opId: newObjectId(), createdAt: Date.now(), attempts: 0 }],
        })),
      remove: (opId) => set((s) => ({ ops: s.ops.filter((o) => o.opId !== opId) })),
      recordError: (opId, error) =>
        set((s) => {
          const op = s.ops.find((o) => o.opId === opId);
          if (!op) return s;
          const attempts = op.attempts + 1;
          if (attempts >= MAX_ATTEMPTS) {
            return {
              ops: s.ops.filter((o) => o.opId !== opId),
              failed: [...s.failed, { ...op, attempts, lastError: error }],
            };
          }
          return {
            ops: s.ops.map((o) => (o.opId === opId ? { ...o, attempts, lastError: error } : o)),
          };
        }),
      retryFailed: () =>
        set((s) => ({
          ops: [...s.ops, ...s.failed.map((o) => ({ ...o, attempts: 0, lastError: undefined }))],
          failed: [],
        })),
      clearAll: () => set({ ops: [], failed: [] }),
    }),
    { name: 'wh-outbox', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

/** Count of unsynced changes (pending + failed) — for the offline indicator. */
export const pendingCount = (s: OutboxState): number => s.ops.length + s.failed.length;
