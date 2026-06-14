import { ObjectLiteral, Repository } from 'typeorm';
import { newObjectId } from './object-id';

/** MySQL duplicate-key error (ER_DUP_ENTRY / errno 1062). */
function isDuplicateKey(e: unknown): boolean {
  const err = e as { code?: string; errno?: number };
  return err?.code === 'ER_DUP_ENTRY' || err?.errno === 1062;
}

/**
 * Create a row, optionally with a client-supplied id, idempotently.
 *
 * Offline clients generate the record id themselves and may replay a create
 * (e.g. the response was lost after the server already saved it). If a row with
 * that id already exists we return the existing one instead of throwing a
 * duplicate-key error, so outbox replays are safe.
 */
export async function createMaybeWithId<T extends ObjectLiteral>(
  repo: Repository<T>,
  doc: Record<string, unknown>,
  providedId?: string | null,
): Promise<T> {
  const id = providedId || newObjectId();
  try {
    await repo.insert({ id, ...doc } as never);
    return (await repo.findOneBy({ id } as never)) as T;
  } catch (e) {
    if (providedId && isDuplicateKey(e)) {
      const existing = await repo.findOneBy({ id } as never);
      if (existing) return existing;
    }
    throw e;
  }
}
