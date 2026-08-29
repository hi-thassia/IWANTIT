import { foreignKey, index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { alertTypeEnum } from './enums.js';
import { offers } from './offers.js';
import { users } from './users.js';
import { wishes } from './wishes.js';

export const alerts = pgTable('alerts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  wishId: uuid('wish_id'),
  offerId: uuid('offer_id').references(() => offers.id, { onDelete: 'set null' }),
  type: alertTypeEnum('type').notNull(),
  title: varchar('title', { length: 180 }).notNull(),
  message: text('message').notNull(),
  eventKey: varchar('event_key', { length: 500 }).notNull(),
  metadata: jsonb('metadata').$type<Record<string, string | number | boolean | null>>().notNull().default({}),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('alerts_user_read_created_idx').on(table.userId, table.readAt, table.createdAt),
  index('alerts_wish_idx').on(table.wishId),
  uniqueIndex('alerts_event_key_unique').on(table.eventKey),
  foreignKey({
    name: 'alerts_wish_owner_fk',
    columns: [table.wishId, table.userId],
    foreignColumns: [wishes.id, wishes.userId],
  }).onDelete('cascade'),
]);

export type Alert = typeof alerts.$inferSelect;
export type NewAlert = typeof alerts.$inferInsert;
