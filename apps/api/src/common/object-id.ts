import { randomBytes } from 'crypto';

// A process-local counter, seeded randomly, like the MongoDB ObjectId spec.
let counter = Math.floor(Math.random() * 0xffffff);

/**
 * Generate a 24-char hex id with the same shape as a MongoDB ObjectId
 * (4-byte timestamp + 5 random bytes + 3-byte counter). Keeping this format
 * means the mobile app and shared types — which treat `id` as an opaque 24-hex
 * string and generate their own for offline creates — need no changes.
 */
export function newObjectId(): string {
  const ts = Math.floor(Date.now() / 1000)
    .toString(16)
    .padStart(8, '0');
  const rand = randomBytes(5).toString('hex'); // 10 hex chars
  counter = (counter + 1) % 0x1000000;
  const cnt = counter.toString(16).padStart(6, '0'); // 6 hex chars
  return ts + rand + cnt;
}

/** A 24-char hex string (the id format used throughout). */
export function isObjectId(value: string): boolean {
  return /^[a-f0-9]{24}$/i.test(value);
}
