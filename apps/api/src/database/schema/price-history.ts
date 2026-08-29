import { sql } from 'drizzle-orm';
import { check, index, numeric, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { offers } from './offers.js';

export const priceHistory = pgTable('price_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  offerId: uuid('offer_id').notNull().references(() => offers.id, { onDelete: 'cascade' }),
  price: numeric('price', { precision: 14, scale: 2 }).notNull(),
  shippingPrice: numeric('shipping_price', { precision: 14, scale: 2 }),
  totalPrice: numeric('total_price', { precision: 14, scale: 2 }),
  recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('price_history_offer_recorded_idx').on(table.offerId, table.recordedAt),
  uniqueIndex('price_history_offer_timestamp_unique').on(table.offerId, table.recordedAt),
  check('price_history_price_non_negative', sql`${table.price} >= 0`),
  check('price_history_shipping_non_negative', sql`${table.shippingPrice} is null or ${table.shippingPrice} >= 0`),
  check('price_history_total_consistent', sql`${table.totalPrice} >= ${table.price}`),
]);

export type PriceHistory = typeof priceHistory.$inferSelect;
export type NewPriceHistory = typeof priceHistory.$inferInsert;
