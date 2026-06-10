import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { AppModule } from '../app.module';

/**
 * One-off: normalise customer phones to digits, then de-duplicate per tenant by
 * phone — keeping the OLDEST record and re-pointing any plots/payments from the
 * duplicates to it (so nothing is orphaned) before deleting the extras.
 *
 *   npm run dedupe:customers -w @wh/api
 */
async function run(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const conn = app.get<Connection>(getConnectionToken());

  try {
    const customers = conn.collection('customers');
    const plots = conn.collection('plots');
    const payments = conn.collection('payments');

    // 1. Normalise every phone to digits only.
    let normalised = 0;
    for (const c of await customers.find({}).toArray()) {
      const norm = String(c.phone ?? '').replace(/\D/g, '');
      if (norm !== c.phone) {
        await customers.updateOne({ _id: c._id }, { $set: { phone: norm } });
        normalised++;
      }
    }

    // 2. Group by tenant + phone.
    const groups = new Map<string, any[]>();
    for (const c of await customers.find({}).toArray()) {
      const key = `${String(c.tenantId)}|${String(c.phone)}`;
      const arr = groups.get(key) ?? [];
      arr.push(c);
      groups.set(key, arr);
    }

    // 3. For each duplicate group: keep oldest, merge references, delete the rest.
    let dupGroups = 0;
    let removed = 0;
    let rePointed = 0;
    for (const docs of groups.values()) {
      if (docs.length < 2) continue;
      dupGroups++;
      docs.sort(
        (a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime(),
      );
      const keep = docs[0];
      const dups = docs.slice(1);
      // eslint-disable-next-line no-console
      console.log(
        `phone ${keep.phone}: keep "${keep.name}" — removing ${dups.length}: ${dups.map((d) => d.name).join(', ')}`,
      );
      for (const d of dups) {
        const r1 = await plots.updateMany({ customerId: d._id }, { $set: { customerId: keep._id } });
        const r2 = await plots.updateMany(
          { bhusaBuyerId: d._id },
          { $set: { bhusaBuyerId: keep._id } },
        );
        const r3 = await payments.updateMany(
          { partyId: d._id, partyType: { $in: ['CUSTOMER', 'BHUSA_BUYER'] } },
          { $set: { partyId: keep._id } },
        );
        rePointed += (r1.modifiedCount ?? 0) + (r2.modifiedCount ?? 0) + (r3.modifiedCount ?? 0);
        await customers.deleteOne({ _id: d._id });
        removed++;
      }
    }

    // eslint-disable-next-line no-console
    console.log(
      `\n✓ Done. phones normalised: ${normalised}; duplicate groups: ${dupGroups}; customers removed: ${removed}; references re-pointed: ${rePointed}`,
    );
  } finally {
    await app.close();
  }
}

void run();
