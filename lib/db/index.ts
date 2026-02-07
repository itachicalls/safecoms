/**
 * safeComms — Database connection (SQLite)
 * In production, swap to Postgres via Drizzle if needed.
 */

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

const dbPath = process.env.DATABASE_PATH || './data/safecomms.db';

let db: ReturnType<typeof drizzle>;

export function getDb() {
  if (!db) {
    const sqlite = new Database(dbPath);
    db = drizzle(sqlite, { schema });
  }
  return db;
}

export { schema };
