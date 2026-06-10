import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { AppModule } from '../app.module';

/**
 * One-time migration: assign all pre-tenancy records to the original owner.
 *
 *   npm run migrate:tenant -w @wh/api
 *
 * Safe to run once on a single-owner database. Aborts if more than one
 * SUPER_ADMIN exists (the correct tenant would be ambiguous).
 */
async function run(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const conn = app.get<Connection>(getConnectionToken());

  try {
    const Admin = conn.models['Admin'];
    const supers = await Admin.find({ role: 'SUPER_ADMIN' }).lean();

    if (supers.length === 0) {
      // eslint-disable-next-line no-console
      console.error('No SUPER_ADMIN found — nothing to backfill.');
      process.exitCode = 1;
      return;
    }
    if (supers.length > 1) {
      // eslint-disable-next-line no-console
      console.error('Multiple SUPER_ADMINs exist — backfill is ambiguous. Aborting.');
      process.exitCode = 1;
      return;
    }

    const owner = supers[0]._id as Types.ObjectId;
    const missing = { $or: [{ tenantId: { $exists: false } }, { tenantId: null }] };

    // All admins lacking a tenant belong to this single owner.
    const adminRes = await Admin.updateMany(missing, { $set: { tenantId: owner } });
    // eslint-disable-next-line no-console
    console.log(`Admin: backfilled ${adminRes.modifiedCount}`);

    let total = 0;
    for (const name of Object.keys(conn.models)) {
      if (name === 'Admin') continue;
      const res = await conn.models[name].updateMany(missing, { $set: { tenantId: owner } });
      // eslint-disable-next-line no-console
      console.log(`${name}: backfilled ${res.modifiedCount}`);
      total += res.modifiedCount ?? 0;
    }

    // eslint-disable-next-line no-console
    console.log(`\n✓ Done. Owner tenant = ${owner.toString()} · domain records updated: ${total}`);
  } finally {
    await app.close();
  }
}

void run();
