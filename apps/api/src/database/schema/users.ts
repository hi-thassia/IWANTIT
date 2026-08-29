import { sql } from 'drizzle-orm';
import { boolean, check, index, integer, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { userThemeEnum } from './enums.js';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 120 }).notNull(),
  email: varchar('email', { length: 320 }).notNull(),
  passwordHash: text('password_hash'),
  googleId: varchar('google_id', { length: 255 }),
  avatarUrl: text('avatar_url'),
  twoFactorEnabled: boolean('two_factor_enabled').notNull().default(false),
  twoFactorSecretEncrypted: text('two_factor_secret_encrypted'),
  lastTotpStep: integer('last_totp_step'),
  theme: userThemeEnum('theme').notNull().default('system'),
  onboardingCompletedAt: timestamp('onboarding_completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex('users_email_unique').on(sql`lower(${table.email})`),
  uniqueIndex('users_google_id_unique').on(table.googleId).where(sql`${table.googleId} is not null`),
  index('users_created_at_idx').on(table.createdAt),
  check('users_name_not_blank', sql`length(trim(${table.name})) > 0`),
  check('users_identity_present', sql`${table.passwordHash} is not null or ${table.googleId} is not null`),
  check('users_two_factor_secret_present', sql`${table.twoFactorEnabled} = false or ${table.twoFactorSecretEncrypted} is not null`),
]);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
