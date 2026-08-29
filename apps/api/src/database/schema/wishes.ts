import { sql } from 'drizzle-orm';
import { boolean, check, index, numeric, pgTable, primaryKey, text, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';
import { marketplaces } from './marketplaces.js';
import { users } from './users.js';
import { wishStatusEnum } from './enums.js';
import { alertTypeEnum } from './enums.js';

export const wishes = pgTable('wishes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 240 }).notNull(),
  referenceUrl: text('reference_url'),
  referenceImage: text('reference_image'),
  targetPrice: numeric('target_price', { precision: 14, scale: 2 }).notNull(),
  initialPrice: numeric('initial_price', { precision: 14, scale: 2 }),
  category: varchar('category', { length: 120 }).notNull(),
  brand: varchar('brand', { length: 120 }),
  color: varchar('color', { length: 80 }),
  size: varchar('size', { length: 80 }),
  notes: text('notes'),
  exactMatchOnly: boolean('exact_match_only').notNull().default(true),
  alertType: alertTypeEnum('alert_type').notNull().default('price_target'),
  status: wishStatusEnum('status').notNull().default('active'),
  lastCheckedAt: timestamp('last_checked_at', { withTimezone: true }),
  monitoringStartedAt: timestamp('monitoring_started_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index('wishes_user_status_idx').on(table.userId, table.status),
  index('wishes_user_created_at_idx').on(table.userId, table.createdAt),
  index('wishes_monitoring_due_idx').on(table.status, table.lastCheckedAt),
  unique('wishes_id_user_unique').on(table.id, table.userId),
  check('wishes_name_not_blank', sql`length(trim(${table.name})) > 0`),
  check('wishes_category_not_blank', sql`length(trim(${table.category})) > 0`),
  check('wishes_target_price_positive', sql`${table.targetPrice} > 0`),
  check('wishes_initial_price_positive', sql`${table.initialPrice} is null or ${table.initialPrice} > 0`),
]);

export const wishMarketplaces = pgTable('wish_marketplaces', {
  wishId: uuid('wish_id').notNull().references(() => wishes.id, { onDelete: 'cascade' }),
  marketplaceId: uuid('marketplace_id').notNull().references(() => marketplaces.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [primaryKey({ columns: [table.wishId, table.marketplaceId] })]);

export type Wish = typeof wishes.$inferSelect;
export type NewWish = typeof wishes.$inferInsert;
