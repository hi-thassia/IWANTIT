import { sql } from 'drizzle-orm';
import { boolean, check, index, inet, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const notificationPreferences = pgTable('notification_preferences', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  priceTargetAlert: boolean('price_target_alert').notNull().default(true),
  priceDropAlert: boolean('price_drop_alert').notNull().default(true),
  newLowAlert: boolean('new_low_alert').notNull().default(true),
  stockAlert: boolean('stock_alert').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const loginAttempts = pgTable('login_attempts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  email: varchar('email', { length: 320 }).notNull(),
  ip: inet('ip').notNull(),
  successful: boolean('successful').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('login_attempts_email_created_idx').on(table.email, table.createdAt),
  index('login_attempts_ip_created_idx').on(table.ip, table.createdAt),
]);

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  device: varchar('device', { length: 255 }),
  ip: inet('ip'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex('sessions_token_hash_unique').on(table.tokenHash),
  index('sessions_user_expires_idx').on(table.userId, table.expiresAt),
  index('sessions_active_expiry_idx').on(table.expiresAt).where(sql`${table.revokedAt} is null`),
  check('sessions_expiry_after_creation', sql`${table.expiresAt} > ${table.createdAt}`),
]);

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('password_reset_tokens_hash_unique').on(table.tokenHash),
  index('password_reset_tokens_user_idx').on(table.userId),
  index('password_reset_tokens_active_expiry_idx').on(table.expiresAt).where(sql`${table.usedAt} is null`),
  check('password_reset_tokens_expiry_after_creation', sql`${table.expiresAt} > ${table.createdAt}`),
]);

export const twoFactorChallenges = pgTable('two_factor_challenges', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
  attempts: integer('attempts').notNull().default(0),
  ip: inet('ip').notNull(),
  device: varchar('device', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('two_factor_challenges_hash_unique').on(table.tokenHash),
  index('two_factor_challenges_expiry_idx').on(table.expiresAt),
  check('two_factor_challenges_attempts_range', sql`${table.attempts} >= 0 and ${table.attempts} <= 5`),
]);

export const authEvents = pgTable('auth_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  type: varchar('type', { length: 80 }).notNull(),
  email: varchar('email', { length: 320 }),
  ip: inet('ip'),
  metadata: jsonb('metadata').$type<Record<string, string | number | boolean | null>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('auth_events_user_created_idx').on(table.userId, table.createdAt),
  index('auth_events_type_created_idx').on(table.type, table.createdAt),
]);

export const oauthStates = pgTable('oauth_states', {
  id: uuid('id').primaryKey().defaultRandom(),
  stateHash: text('state_hash').notNull(),
  browserBindingHash: text('browser_binding_hash').notNull(),
  codeVerifierEncrypted: text('code_verifier_encrypted').notNull(),
  nonceEncrypted: text('nonce_encrypted').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('oauth_states_state_hash_unique').on(table.stateHash),
  index('oauth_states_expiry_idx').on(table.expiresAt),
  check('oauth_states_expiry_after_creation', sql`${table.expiresAt} > ${table.createdAt}`),
]);

export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type LoginAttempt = typeof loginAttempts.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type TwoFactorChallenge = typeof twoFactorChallenges.$inferSelect;
export type AuthEvent = typeof authEvents.$inferSelect;
export type OAuthState = typeof oauthStates.$inferSelect;
