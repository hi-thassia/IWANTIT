import { sql } from 'drizzle-orm';
import { boolean, check, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

export const marketplaces = pgTable('marketplaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull(),
  enabled: boolean('enabled').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex('marketplaces_slug_unique').on(sql`lower(${table.slug})`),
  check('marketplaces_name_not_blank', sql`length(trim(${table.name})) > 0`),
  check('marketplaces_slug_format', sql`${table.slug} ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`),
]);

export type Marketplace = typeof marketplaces.$inferSelect;
