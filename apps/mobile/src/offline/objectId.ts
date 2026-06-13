// A client-generated Mongo-style ObjectId (24 hex chars). Generating the id on
// the device means an offline-created record has its FINAL id immediately — a
// job logged for an offline-created customer references that same id, so there
// is no temp-id remapping on sync, and replaying a create upserts the same id
// (idempotent) instead of duplicating.
let counter = Math.floor(Math.random() * 0xffffff);

export function newObjectId(): string {
  const timestamp = Math.floor(Date.now() / 1000)
    .toString(16)
    .padStart(8, '0');
  const random = Math.floor(Math.random() * 0xffffffffff)
    .toString(16)
    .padStart(10, '0');
  counter = (counter + 1) % 0xffffff;
  const inc = counter.toString(16).padStart(6, '0');
  return (timestamp + random + inc).slice(0, 24);
}
