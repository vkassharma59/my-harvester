import { createConnection } from 'mysql2/promise';
import { MysqlConfig } from '../config/configuration';

/**
 * Create the application database if it doesn't exist yet, before TypeORM
 * connects. TypeORM's `synchronize` creates the *tables*, but the database
 * (schema) itself must already exist — this makes a fresh local/server setup
 * fully automatic: point at a MySQL server and the app provisions everything.
 */
export async function ensureDatabase(cfg: MysqlConfig): Promise<void> {
  const conn = await createConnection({
    host: cfg.host,
    port: cfg.port,
    user: cfg.username,
    password: cfg.password,
  });
  try {
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${cfg.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
  } finally {
    await conn.end();
  }
}
