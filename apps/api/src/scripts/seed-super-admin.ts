import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AdminsService } from '../modules/admins/admins.service';

/**
 * Manually create a OWNER (a harvester owner / tenant root).
 *
 *   npm run seed:owner -w @wh/api -- <email> <password> <phone> [name]
 *
 * The new owner gets its own tenant (tenantId = its own id) and sees only its
 * own data. Staff admins are then added by that owner from within the app.
 * Phone is optional but, when given, must be a unique 10-digit mobile.
 */
async function run(): Promise<void> {
  const [, , email, password, phone, ...nameParts] = process.argv;
  const name = nameParts.join(' ') || 'Owner';

  if (!email || !password) {
    // eslint-disable-next-line no-console
    console.error('Usage: npm run seed:owner -w @wh/api -- <email> <password> <phone> [name]');
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const admins = app.get(AdminsService);
    const owner = await admins.createOwner(email, password, name, phone);
    // eslint-disable-next-line no-console
    console.log(
      `✓ Created OWNER "${owner.name}" <${owner.email}>${phone ? ' / ' + phone : ''} (tenantId=${owner.tenantId.toString()})`,
    );
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('✗ Failed:', (e as Error).message);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void run();
