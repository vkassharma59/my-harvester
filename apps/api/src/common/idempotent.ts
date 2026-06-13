import { Model, Types } from 'mongoose';

/**
 * Create a document, optionally with a client-supplied id, idempotently.
 *
 * Offline clients generate the record id themselves and may replay a create
 * (e.g. the response was lost after the server already saved it). If a record
 * with that id already exists we return the existing one instead of throwing a
 * duplicate-key error, so outbox replays are safe.
 */
export async function createMaybeWithId(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: Model<any>,
  doc: Record<string, unknown>,
  providedId?: string | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  if (!providedId) return model.create(doc);

  const _id = new Types.ObjectId(providedId);
  try {
    return await model.create({ _id, ...doc });
  } catch (e) {
    if ((e as { code?: number })?.code === 11000) {
      const existing = await model.findById(_id).exec();
      if (existing) return existing;
    }
    throw e;
  }
}
