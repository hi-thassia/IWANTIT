import { sql } from 'drizzle-orm';
import { check, index, jsonb, numeric, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { offerAvailabilityEnum } from './enums.js';
import { marketplaces } from './marketplaces.js';
import { wishes } from './wishes.js';

export const offers = pgTable('offers', {
  id: uuid('id').primaryKey().defaultRandom(),
  wishId: uuid('wish_id').notNull().references(() => wishes.id, { onDelete: 'cascade' }),
  marketplaceId: uuid('marketplace_id').notNull().references(() => marketplaces.id, { onDelete: 'restrict' }),
  externalId: varchar('external_id', { length: 255 }).notNull(),
  title: varchar('title', { length: 500 }).notNull(),
  url: text('url').notNull(),
  imageUrl: text('image_url'),
  seller: varchar('seller', { length: 255 }),
  attributes: jsonb('attributes').$type<Record<string, string>>().notNull().default({}),
  price: numeric('price', { precision: 14, scale: 2 }).notNull(),
  shippingPrice: numeric('shipping_price', { precision: 14, scale: 2 }),
  totalPrice: numeric('total_price', { precision: 14, scale: 2 }),
  availability: offerAvailabilityEnum('availability').notNull().default('unknown'),
  matchScore: numeric('match_score', { precision: 5, scale: 2 }),
  checkedAt: timestamp('checked_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex('offers_wish_marketplace_external_unique').on(table.wishId, table.marketplaceId, table.externalId),
  index('offers_wish_total_price_idx').on(table.wishId, table.totalPrice),
  index('offers_marketplace_checked_at_idx').on(table.marketplaceId, table.checkedAt),
  check('offers_title_not_blank', sql`length(trim(${table.title})) > 0`),
  check('offers_price_non_negative', sql`${table.price} >= 0`),
  check('offers_shipping_non_negative', sql`${table.shippingPrice} is null or ${table.shippingPrice} >= 0`),
  check('offers_total_non_negative', sql`${table.totalPrice} >= 0`),
  check('offers_total_consistent', sql`${table.totalPrice} >= ${table.price}`),
  check('offers_match_score_range', sql`${table.matchScore} is null or (${table.matchScore} >= 0 and ${table.matchScore} <= 100)`),
]);

export type Offer = typeof offers.$inferSelect;
export type NewOffer = typeof offers.$inferInsert;
