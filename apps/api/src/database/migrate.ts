import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { fileURLToPath } from 'node:url';
import { createDatabase } from './client.js';

const database = createDatabase();

try {
  await migrate(database.db, { migrationsFolder: fileURLToPath(new URL('../../drizzle', import.meta.url)) });
  console.info('Database migrations completed.');
} finally {
  await database.close();
}
