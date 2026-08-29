import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../config/env.js';
import * as schema from './schema/index.js';

export type Database = PostgresJsDatabase<typeof schema>;

export function createDatabase(url = env.DATABASE_URL) {
  const client = postgres(url, { max: 10, prepare: false });
  return { db: drizzle(client, { schema }), close: () => client.end() };
}
